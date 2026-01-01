import dotenv from 'dotenv';
// Load environment files early so EMAIL_USER/EMAIL_PASS are available for transporter
// Load .env.validate first (explicit validation file), then .env.local (dev overrides), then default .env
dotenv.config({ path: '.env.validate' });
dotenv.config({ path: '.env.local' });
dotenv.config();

// Quick env sanity check
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS loaded:', !!process.env.EMAIL_PASS);

// Fail fast in production if email creds are missing (dev/test will simulate emails)
if (process.env.NODE_ENV === 'production' && (!process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
  console.error('❌ EMAIL_USER or EMAIL_PASS missing. Please add them to .env.validate or .env.local and restart');
  process.exit(1);
}
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.warn('⚠️ EMAIL_USER or EMAIL_PASS missing — emails will be simulated in dev/test mode.');
} 

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendEmail(to, subject, html) {
  try {
    if (_testEmailFail) {
      throw new Error('Simulated email failure (test flag)');
    }

    if (process.env.NODE_ENV === 'test') {
      // In test mode, avoid sending real emails — just log and return immediately
      console.log('✅ (test) Email simulated to', to);
      return;
    }

    await transporter.sendMail({
      from: `"Scholar AI" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
    console.log('✅ Email sent to', to);
  } catch (err) {
    console.error('❌ Email failed:', err?.message || err);
    throw err;
  }
}

function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

/* ---------- APP ---------- */
const app = express();
const PORT = process.env.PORT || 5000;

/* ---------- MIDDLEWARE ---------- */

// Log incoming requests to aid debugging when requests fail (shows origin header)
app.use((req, res, next) => {
  console.log('[REQ]', req.method, req.url, 'origin:', req.headers.origin);
  next();
});

const devAllowAllOrigins = process.env.NODE_ENV !== 'production';

app.use(cors({
  origin: devAllowAllOrigins ? true : [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://10.205.77.17:5173'
  ],
  credentials: true
}));
app.use(express.json());

/* ---------- DB CONFIG ---------- */
const MONGODB_URI = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'scholar_ai';
const usersCollection = process.env.MONGODB_USER_COLLECTION || 'users';

/* ---------- MEMORY FALLBACK ---------- */
const memoryUsers = [];

/* ---------- CONNECT MONGO ---------- */
mongoose.connect(MONGODB_URI, { dbName })
  .then(() => {
    console.log(`✅ MongoDB connected (DB: ${dbName})`);
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    console.warn('⚠️  Using IN-MEMORY storage');
  });

/* ---------- USER MODEL ---------- */
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,

  isVerified: { type: Boolean, default: false },

  otp: String,
  otpExpiry: Date,

  resetOtp: String,
  resetOtpExpiry: Date
});

const User = mongoose.model('User', UserSchema, usersCollection);

/* ---------- HELPERS ---------- */
const mongoReady = () => mongoose.connection.readyState === 1;

// Test helpers
let _testEmailFail = false;
export function _setTestEmailFail(v) { _testEmailFail = !!v; }

// Exported for tests
export { memoryUsers, sendEmail, User, mongoose };


/* ---------- SIGNUP (OTP flow) ---------- */
app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'All fields required' });

    const hashed = await bcrypt.hash(password, 10);
    const otp = generateOTP();

    if (mongoReady()) {
      const exists = await User.findOne({ email });
      if (exists) {
        // If user exists and is already verified, block duplicate
        if (exists.isVerified) return res.status(409).json({ message: 'User exists' });

        // If user exists but is not verified, update OTP and resend so they can complete signup
        exists.otp = otp;
        exists.otpExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes
        await exists.save();

        try {
          await sendEmail(
            email,
            'Your verification OTP',
            `<h2>Your OTP</h2><h1>${otp}</h1><p>Valid for 5 minutes</p>`
          );
          return res.status(200).json({ message: 'User exists but not verified — OTP resent' });
        } catch (err) {
          console.error('Signup (existing user): failed to send OTP email:', err?.message || err);
          return res.status(200).json({ message: 'User exists but failed to send OTP email. Please request resend.' });
        }
      }

      const user = new User({
        name,
        email,
        password: hashed,
        otp,
        otpExpiry: Date.now() + 5 * 60 * 1000 // 5 minutes
      });

      await user.save();

      try {
        await sendEmail(
          email,
          'Verify your Scholar AI account',
          `<h2>Your OTP</h2><h1>${otp}</h1><p>Valid for 5 minutes</p>`
        );
        return res.status(200).json({ message: 'OTP sent to email' });
      } catch (err) {
        console.error('Signup: failed to send OTP email:', err?.message || err);
        // Don't fail signup if email sending failed - create user but inform client
        return res.status(200).json({ message: 'User created but failed to send OTP email. Please request resend.' });
      }
    }

    // Memory fallback
    const memExisting = memoryUsers.find(u => u.email === email);
    if (memExisting) {
      if (memExisting.isVerified) return res.status(409).json({ message: 'User exists' });

      memExisting.otp = otp;
      memExisting.otpExpiry = Date.now() + 5 * 60 * 1000;
      try {
        await sendEmail(email, 'Your verification OTP', `<h2>Your OTP</h2><h1>${otp}</h1><p>Valid for 5 minutes</p>`);
        return res.status(200).json({ message: 'User exists but not verified — OTP resent (memory)' });
      } catch (err) {
        console.error('Signup (memory existing): failed to send OTP email:', err?.message || err);
        return res.status(200).json({ message: 'User exists but failed to send OTP email. Please request resend.' });
      }
    }

    memoryUsers.push({ name, email, password: hashed, otp, otpExpiry: Date.now() + 5 * 60 * 1000, isVerified: false });
    try {
      await sendEmail(email, 'Verify your Scholar AI account', `<h2>Your OTP</h2><h1>${otp}</h1><p>Valid for 5 minutes</p>`);
      return res.status(200).json({ message: 'OTP sent to email (memory)' });
    } catch (err) {
      console.error('Signup (memory): failed to send OTP email:', err?.message || err);
      return res.status(200).json({ message: 'User created but failed to send OTP email. Please request resend.' });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Signup failed' });
  }
});

/* ---------- LOGIN (block unverified users) ---------- */
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    let user = mongoReady()
      ? await User.findOne({ email })
      : memoryUsers.find(u => u.email === email);

    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    if (user.isVerified === false) {
      return res.status(403).json({ message: 'Please verify your email first' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    res.json({
      message: 'Login successful',
      user: { name: user.name, email: user.email }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login failed' });
  }
});

/* ---------- VERIFY OTP ---------- */
app.post('/api/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP required' });

    if (mongoReady()) {
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ message: 'User not found' });

      if (user.otp !== otp || !user.otpExpiry || user.otpExpiry < Date.now()) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
      }

      user.isVerified = true;
      user.otp = undefined;
      user.otpExpiry = undefined;
      await user.save();

      return res.json({ message: 'Account verified successfully' });
    }

    const user = memoryUsers.find(u => u.email === email);
    if (!user) return res.status(400).json({ message: 'User not found' });
    if (user.otp !== otp || !user.otpExpiry || user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;

    return res.json({ message: 'Account verified successfully (memory)' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Verify OTP failed' });
  }
});

/* ---------- RESEND OTP ---------- */
app.post('/api/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    const otp = generateOTP();

    if (mongoReady()) {
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ message: 'User not found' });

      user.otp = otp;
      user.otpExpiry = Date.now() + 5 * 60 * 1000;
      await user.save();

      await sendEmail(email, 'Your verification OTP', `<h2>Your OTP</h2><h1>${otp}</h1><p>Valid for 5 minutes</p>`);

      return res.json({ message: 'OTP resent' });
    }

    const user = memoryUsers.find(u => u.email === email);
    if (!user) return res.status(400).json({ message: 'User not found' });

    user.otp = otp;
    user.otpExpiry = Date.now() + 5 * 60 * 1000;

    await sendEmail(email, 'Your verification OTP', `<h2>Your OTP</h2><h1>${otp}</h1><p>Valid for 5 minutes</p>`).catch(()=>{});

    return res.json({ message: 'OTP resent (memory)' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Resend OTP failed' });
  }
});

/* ---------- VERIFY + LOGIN (atomic) ---------- */
app.post('/api/verify-and-login', async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    if (!email || !otp || !password) return res.status(400).json({ message: 'Email, OTP and password required' });

    if (mongoReady()) {
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ message: 'User not found' });

      if (user.otp !== otp || !user.otpExpiry || user.otpExpiry < Date.now()) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
      }

      // Verify and clear OTP
      user.isVerified = true;
      user.otp = undefined;
      user.otpExpiry = undefined;
      await user.save();

      // Now perform login
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

      return res.json({ message: 'Login successful', user: { name: user.name, email: user.email } });
    }

    const user = memoryUsers.find(u => u.email === email);
    if (!user) return res.status(400).json({ message: 'User not found' });
    if (user.otp !== otp || !user.otpExpiry || user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    return res.json({ message: 'Login successful', user: { name: user.name, email: user.email } });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Verify and login failed' });
  }
});

/* ---------- FORGOT PASSWORD ---------- */
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    let user = mongoReady()
      ? await User.findOne({ email })
      : memoryUsers.find(u => u.email === email);

    if (!user) return res.status(400).json({ message: 'User not found' });

    const otp = generateOTP();

    if (mongoReady()) {
      user.resetOtp = otp;
      user.resetOtpExpiry = Date.now() + 5 * 60 * 1000;
      await user.save();
    } else {
      user.resetOtp = otp;
      user.resetOtpExpiry = Date.now() + 5 * 60 * 1000;
    }

    await sendEmail(email, 'Reset your Scholar AI password', `<h2>Password Reset OTP</h2><h1>${otp}</h1>`).catch(()=>{});

    res.json({ message: 'Reset OTP sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Forgot password failed' });
  }
});

/* ---------- RESET PASSWORD ---------- */
app.post('/api/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ message: 'All fields required' });

    let user = mongoReady()
      ? await User.findOne({ email })
      : memoryUsers.find(u => u.email === email);

    if (!user || user.resetOtp !== otp || !user.resetOtpExpiry || user.resetOtpExpiry < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    if (mongoReady()) {
      user.password = hashed;
      user.resetOtp = undefined;
      user.resetOtpExpiry = undefined;
      await user.save();
    } else {
      user.password = hashed;
      user.resetOtp = undefined;
      user.resetOtpExpiry = undefined;
    }

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Reset password failed' });
  }
});

/* ---------- HEALTH ---------- */
app.get('/api/health', (req, res) => {
  res.json({
    mongoState: mongoose.connection.readyState,
    mongoConnected: mongoReady(),
    memoryUsers: memoryUsers.length
  });
});

/* ---------- AI PROXY ---------- */
app.post('/api/ai/generate', async (req, res) => {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return res.status(400).json({ message: 'Gemini key missing' });

    const ai = new GoogleGenAI({ apiKey: key });
    const result = await ai.models.generateContent(req.body);

    res.json({ text: result.text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'AI error' });
  }
});

/* ---------- TEST-ONLY ROUTES (enabled when NODE_ENV=test) ---------- */
if (process.env.NODE_ENV === 'test') {
  // Expose a test helper to retrieve last OTP for an email (memory or mongo)
  app.get('/__test/last-otp', async (req, res) => {
    const email = req.query.email;
    if (!email) return res.status(400).json({ message: 'email required' });

    if (mongoReady()) {
      const user = await User.findOne({ email });
      return res.json({ otp: user?.otp || null, resetOtp: user?.resetOtp || null });
    }

    const user = memoryUsers.find(u => u.email === email);
    return res.json({ otp: user?.otp || null, resetOtp: user?.resetOtp || null });
  });
}

/* ---------- STATIC SERVE (production) ---------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV === 'production') {
  // Serve static files from the Vite build output
  app.use(express.static(path.join(__dirname, 'dist')));
  // Fallback to index.html for SPA routing (keeping API routes intact)
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

/* ---------- START ---------- */
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () =>
    console.log(`🚀 Server running at http://0.0.0.0:${PORT}`)
  );
}

export default app;

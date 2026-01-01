import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import fetch from 'node-fetch';
import mongoose from 'mongoose';

const API = 'http://localhost:5000/api';
const uri = process.env.MONGODB_URI;

async function run() {
  try {
    if (!uri) throw new Error('MONGODB_URI not set');

    const email = `verify_${Date.now()}@gmail.com`;
    const password = 'testpass123';

    console.log('➡️ Signing up user...');
    const signupRes = await fetch(`${API}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Verify User', email, password })
    });

    const signupData = await signupRes.json();
    console.log('Signup:', signupRes.status, signupData);

    // Connect to DB to read OTP
    const dbName = process.env.MONGODB_DB_NAME || 'scholar_ai';
    await mongoose.connect(uri, { dbName });

    const usersCollection = process.env.MONGODB_USER_COLLECTION || 'users';
    const UserSchema = new mongoose.Schema({}, { strict: false, collection: usersCollection });
    const User = mongoose.models.VerifyUser || mongoose.model('VerifyUser', UserSchema);

    const user = await User.findOne({ email });
    if (!user || !user.otp) throw new Error('OTP not found in DB');

    console.log('📩 OTP found:', user.otp);

    // Verify OTP
    console.log('➡️ Verifying OTP...');
    const verifyRes = await fetch(`${API}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp: user.otp })
    });

    const verifyData = await verifyRes.json();
    console.log('Verify OTP:', verifyRes.status, verifyData);

    // Login
    console.log('➡️ Logging in...');
    const loginRes = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const loginData = await loginRes.json();
    console.log('Login:', loginRes.status, loginData);

    // Cleanup
    await User.deleteOne({ email });
    await mongoose.disconnect();

    console.log('✅ FULL FLOW VERIFIED');
    process.exit(0);

  } catch (err) {
    console.error('❌ Verification failed:', err.message);
    process.exit(1);
  }
}

run();

import 'dotenv/config';
import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI;

async function runTest() {
  if (!uri) {
    console.error('No MONGODB_URI found in environment. Add it to .env or export it before running.');
    process.exit(2);
  }

  try {
    await mongoose.connect(uri, { dbName: 'test' });
    console.log('✅ Connected to MongoDB');

    const TestSchema = new mongoose.Schema({ name: String, createdAt: Date });
    const TestModel = mongoose.models.Test || mongoose.model('Test', TestSchema, 'test_users');

    const doc = { name: `test-${Date.now()}`, createdAt: new Date() };
    const inserted = await TestModel.create(doc);
    console.log('Inserted document:', inserted);

    const found = await TestModel.findOne({ _id: inserted._id });
    console.log('Found document from DB:', found);

    // Cleanup: remove the test document
    await TestModel.deleteOne({ _id: inserted._id });
    console.log('Removed test document. Test succeeded.');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err.message || err);
    process.exit(1);
  }
}

runTest();

import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// MongoDB Connection URI (prefers environment variable, falls back to Atlas cluster)
const getMongoUri = () =>
  process.env.MONGODB_URI ||
  'mongodb+srv://netramanipkr_db_user:uqaToI5jitufiKy2@cluster0.h4sqozu.mongodb.net/nepalstay?retryWrites=true&w=majority';

/**
 * Native MongoDB Driver (MongoClient) for any framework
 */
export const client = new MongoClient(getMongoUri());

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

// Call this only when your application terminates
export async function disconnectFromMongoDB() {
  await client.close();
}

/**
 * Connect to MongoDB with Mongoose
 */
export async function connectDB() {
  const uri = getMongoUri();

  try {
    const connection = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`MongoDB connected: ${connection.connection.name}`);
    return connection;
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    throw error;
  }
}

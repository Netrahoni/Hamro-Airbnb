import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load server/.env, then the repository-root .env as a fallback.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Never embed database credentials in source code. The application must
// receive its MongoDB connection string from the deployment environment.
const getMongoUri = () => {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error('MONGODB_URI is required. Configure it in server/.env or the deployment environment.');
  }
  return uri;
};

/**
 * Native MongoDB Driver (retained for existing consumers).
 */
export const client = new MongoClient(getMongoUri());

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log('Native MongoDB client connected.');
    return client;
  } catch (error) {
    console.error('Native MongoDB connection failed:', error.message);
    throw error;
  }
}

// Call this only when your application terminates.
export async function disconnectFromMongoDB() {
  await client.close();
}

/**
 * Connect to MongoDB with Mongoose.
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

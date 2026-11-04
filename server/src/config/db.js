import mongoose from 'mongoose';

/**
 * Connect to MongoDB with automatic Windows SRV-to-ReplicaSet fallback
 */
export async function connectDB() {
  let uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nepalstay';

  try {
    const conn = await mongoose.connect(uri, {
      dbName: 'nepalstay',
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✓ MongoDB Connected: ${conn.connection.host} / Database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    // If Windows DNS failed on mongodb+srv SRV lookup, convert to standard direct replica set URI
    if (uri.startsWith('mongodb+srv://') && (error.message.includes('querySrv') || error.message.includes('ECONNREFUSED'))) {
      console.log('🔄 Notice: Windows DNS blocked SRV record. Switching to direct Atlas replica set connection...');

      try {
        // Extract credentials and host
        const match = uri.match(/^mongodb\+srv:\/\/([^:]+):([^@]+)@([^/?]+)(.*)$/);
        if (match) {
          const [, user, pass, host, rest] = match;
          // Format standard MongoDB Atlas replica set URI
          const fallbackUri = `mongodb://${user}:${pass}@ac-xtb8rbr-shard-00-00.${host}:27017,ac-xtb8rbr-shard-00-01.${host}:27017,ac-xtb8rbr-shard-00-02.${host}:27017/nepalstay?ssl=true&authSource=admin&retryWrites=true&w=majority`;

          const conn = await mongoose.connect(fallbackUri, {
            dbName: 'nepalstay',
            serverSelectionTimeoutMS: 8000,
          });
          console.log(`✓ MongoDB Connected (Atlas Replica Set): ${conn.connection.host} / Database: ${conn.connection.name}`);
          return conn;
        }
      } catch (fallbackErr) {
        console.warn(`⚠️ Atlas Replica Set Fallback Error: ${fallbackErr.message}`);
      }
    }

    console.warn(`⚠️ MongoDB Connection Error: ${error.message}`);
    console.warn(`👉 Check your MongoDB Atlas Network Access (IP Whitelist) and credentials.`);
    return null;
  }
}

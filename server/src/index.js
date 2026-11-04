import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load server/.env first, then fallback to root .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import propertyRoutes from './routes/properties.js';
import bookingRoutes from './routes/bookings.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'NepalStay Backend API',
    adminGmailConfigured: Boolean(process.env.ADMIN_GMAIL),
    adminGmail: process.env.ADMIN_GMAIL || '(not configured yet)',
    time: new Date().toISOString(),
  });
});

// Route Mounts
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/bookings', bookingRoutes);

// 404 handler for API
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: 'API route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🏔️ NepalStay Backend API listening on port ${PORT}`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  if (process.env.ADMIN_GMAIL) {
    console.log(`👑 Designated Platform Admin Gmail: ${process.env.ADMIN_GMAIL}`);
  } else {
    console.log(`ℹ️ No ADMIN_GMAIL set yet in server/.env.`);
  }
  console.log(`===============================================`);
});

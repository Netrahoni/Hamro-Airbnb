import mongoose from 'mongoose';

const verificationCodeSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  purpose: { type: String, enum: ['signup'], required: true },
  codeHash: { type: String, required: true },
  verificationTokenHash: { type: String, default: null },
  verifiedAt: { type: Date, default: null },
  attempts: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

verificationCodeSchema.index({ email: 1, purpose: 1 }, { unique: true });

export const VerificationCode = mongoose.model('VerificationCode', verificationCodeSchema);

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 24,
      match: /^[a-z0-9_]+$/,
      unique: true,
      sparse: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    password: {
      type: String,
    },
    role: {
      type: String,
      enum: ['guest', 'owner', 'admin'],
      default: 'guest',
      index: true,
    },
    authProvider: {
      type: String,
      enum: ['email', 'google', 'phone'],
      default: 'email',
    },
    googleId: {
      type: String,
      sparse: true,
      index: true,
    },
    avatar: {
      type: String,
      default: '',
    },
    // Host specific fields
    propertyName: {
      type: String,
      trim: true,
      default: '',
    },
    propertyType: {
      type: String,
      default: 'Homestay',
    },
    city: {
      type: String,
      default: 'Pokhara',
    },
    propertyCity: {
      type: String,
      default: 'Pokhara',
    },
    province: {
      type: String,
      default: 'Gandaki Province',
    },
    district: {
      type: String,
      default: 'Kaski',
    },
    wardNumber: {
      type: String,
      default: '',
    },
    streetAddress: {
      type: String,
      default: '',
    },
    citizenshipNumber: {
      type: String,
      default: '',
    },
    panNumber: {
      type: String,
      default: '',
    },
    bankDetails: {
      bankName: { type: String, default: '' },
      accountName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      branch: { type: String, default: '' },
    },
    kycStatus: {
      type: String,
      enum: ['none', 'pending', 'approved', 'correction'],
      default: 'none',
    },
    status: {
      type: String,
      enum: ['active', 'restricted', 'suspended'],
      default: 'active',
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    securityClearance: {
      type: String,
      default: '',
    },
    // Password reset fields
    resetPasswordCode: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
    resetPasswordAttempts: {
      type: Number,
      default: 0,
    },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    lastTotpCounter: { type: Number, default: -1 },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    lastIp: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving if modified
userSchema.pre('save', async function (next) {
  if (this.city && !this.propertyCity) {
    this.propertyCity = this.city;
  }
  if (!this.city && this.propertyCity) {
    this.city = this.propertyCity;
  }
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare candidate password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to sanitize sensitive fields when returning user JSON
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetPasswordCode;
  delete obj.resetPasswordExpires;
  delete obj.resetPasswordAttempts;
  delete obj.citizenshipNumber;
  delete obj.panNumber;
  delete obj.bankDetails;
  delete obj.securityClearance;
  delete obj.lastIp;
  delete obj.failedLoginAttempts;
  delete obj.lockUntil;
  delete obj.lastTotpCounter;
  obj.id = obj._id.toString();
  if (!obj.propertyCity && obj.city) {
    obj.propertyCity = obj.city;
  }
  return obj;
};

export const User = mongoose.model('User', userSchema);

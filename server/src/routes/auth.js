import express from 'express';
import { randomInt, randomBytes, createHash, timingSafeEqual, createHmac } from 'node:crypto';
import { User } from '../models/User.js';
import { VerificationCode } from '../models/VerificationCode.js';
import { requireAuth, generateToken } from '../middleware/auth.js';
import { OAuth2Client } from 'google-auth-library';
import { sendPasswordResetEmail } from '../services/email.js';

const router = express.Router();

function decodeBase32Secret(secret) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const normalized = String(secret || '').replace(/\s+/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const character of normalized) {
    const index = alphabet.indexOf(character);
    if (index < 0) return Buffer.alloc(0);
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function verifyAdminTotp(code, secret) {
  if (!/^\d{6}$/.test(String(code || '')) || !secret) return null;
  const key = decodeBase32Secret(secret);
  if (!key.length) return false;
  const counter = Math.floor(Date.now() / 30000);
  for (let window = -1; window <= 1; window += 1) {
    const time = Buffer.alloc(8);
    time.writeBigUInt64BE(BigInt(counter + window));
    const digest = createHmac('sha1', key).update(time).digest();
    const offset = digest[digest.length - 1] & 0x0f;
    const binary = ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff);
    const expected = String(binary % 1000000).padStart(6, '0');
    if (timingSafeEqual(Buffer.from(String(code)), Buffer.from(expected))) return counter + window;
  }
  return null;
}


function normalizePhone(str = '') {
  const digits = str.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

/**
 * GET /api/auth/config
 * Public configuration for frontend
 */
router.get('/config', (req, res) => {
  res.json({
    success: true,
    adminGmailConfigured: false,
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  });
});

/**
 * POST /api/auth/register
 * Register a new Guest or Host
 */
router.post('/register', async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      password,
      role = 'guest',
      // Host details
      propertyName,
      propertyType,
      city,
      propertyCity,
      province,
      district,
      wardNumber,
      streetAddress,
      verificationToken,
    } = req.body;

    if (typeof fullName !== 'string' || fullName.trim().length < 2 || fullName.trim().length > 100 || (!email && !phone)) {
      return res.status(400).json({
        success: false,
        error: 'Full name and at least an email or mobile phone number are required.',
      });
    }

    if (typeof password !== 'string' || password.length < 10 || password.length > 128) return res.status(400).json({ success: false, error: 'Password must be between 10 and 128 characters.' });
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanPhone = typeof phone === 'string' ? phone.trim() : '';
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return res.status(400).json({ success: false, error: 'A valid, verified email address is required.' });
    if (typeof verificationToken !== 'string' || verificationToken.length < 32) {
      return res.status(403).json({ success: false, error: 'Verify your email address before creating an account.' });
    }
    if (cleanPhone && normalizePhone(cleanPhone).length < 10) return res.status(400).json({ success: false, error: 'Enter a valid phone number.' });

    // Check if user already exists
    const queryConditions = [];
    if (cleanEmail) queryConditions.push({ email: cleanEmail });
    if (cleanPhone) {
      queryConditions.push({ phone: cleanPhone });
      const last10 = normalizePhone(cleanPhone);
      if (last10) {
        queryConditions.push({ phone: new RegExp(`${last10}$`) });
      }
    }

    if (queryConditions.length > 0) {
      const existingUser = await User.findOne({ $or: queryConditions });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'An account with this email or mobile phone number already exists.',
        });
      }
    }

    // Public registration may create guests or hosts, never administrators.
    if (!['guest', 'owner'].includes(role)) return res.status(400).json({ success: false, error: 'Invalid account type.' });
    const finalRole = role;

    // Consume the verified token atomically so it cannot be reused.
    const verifiedRecord = await VerificationCode.findOneAndDelete({
      email: cleanEmail,
      purpose: 'signup',
      verificationTokenHash: createHash('sha256').update(verificationToken).digest('hex'),
      verifiedAt: { $ne: null },
      expiresAt: { $gt: new Date() },
    });
    if (!verifiedRecord) {
      return res.status(403).json({ success: false, error: 'Email verification has expired or is invalid. Please verify your email again.' });
    }

    const newUser = new User({
      fullName: fullName.trim(),
      email: cleanEmail,
      phone: cleanPhone || undefined,
      password,
      role: finalRole,
      authProvider: 'email',
      // Host fields if registering as host
      propertyName: propertyName || undefined,
      propertyType: propertyType || 'Homestay',
      city: city || propertyCity || 'Pokhara',
      propertyCity: propertyCity || city || 'Pokhara',
      province: province || 'Gandaki Province',
      district: district || 'Kaski',
      wardNumber: wardNumber || '',
      streetAddress: streetAddress || '',
      kycStatus: finalRole === 'owner' ? 'pending' : 'none',
      status: 'active',
      securityClearance: '',
      twoFactorEnabled: false,
      lastLogin: new Date(),
      lastIp: req.ip || '',
    });

    await newUser.save();
    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: newUser.toJSON(),
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Server error occurred during registration.',
    });
  }
});

/**
 * POST /api/auth/login
 * Standard login via Email or Phone + Password
 */
router.post('/login', async (req, res) => {
  try {
    const { identifier, password, role: expectedRole } = req.body;

    if (typeof identifier !== 'string' || typeof password !== 'string' || !identifier.trim() || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both identifier (email/phone) and password.',
      });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();
    const phoneLast10 = normalizePhone(cleanIdentifier);

    // Search by email, exact phone, or last 10 digits
    const user = await User.findOne({
      $or: [
        { email: cleanIdentifier },
        { phone: cleanIdentifier },
        ...(phoneLast10.length >= 10 ? [{ phone: new RegExp(`${phoneLast10}$`) }] : []),
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Invalid email/phone or password.',
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'This account has been suspended by the platform administrator.',
      });
    }

    // Enforce a short account lockout after repeated incorrect passwords.
    if (user.lockUntil && user.lockUntil > new Date()) return res.status(429).json({ success: false, error: 'Too many failed attempts. Try again in 15 minutes.' });
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.failedLoginAttempts = 0;
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await user.save();
      return res.status(401).json({
        success: false,
        error: 'Incorrect password. Please verify your credentials and try again.',
      });
    }

    if (expectedRole && user.role !== expectedRole && expectedRole !== 'guest') {
      return res.status(403).json({
        success: false,
        error: `This account is registered as a ${user.role}, not an ${expectedRole}. Please switch to the ${user.role} sign-in tab.`,
      });
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLogin = new Date();
    user.lastIp = req.ip || '';
    await user.save();

    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Server error occurred during login.',
    });
  }
});

/**
 * POST /api/auth/google
 * Google Sign In / Registration for Guests or Admin
 */
router.post('/google', async (req, res) => {
  try {
    const { token: googleToken } = req.body;
    if (typeof googleToken !== 'string' || !googleToken || !process.env.GOOGLE_CLIENT_ID) return res.status(400).json({ success: false, error: 'A valid Google ID token is required.' });
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({ idToken: googleToken, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.email || payload.email_verified !== true || !payload.sub) return res.status(401).json({ success: false, error: 'Google account email is not verified.' });
    const email = payload.email;
    const name = payload.name || email.split('@')[0];
    const avatarUrl = payload.picture || '';
    const googleId = payload.sub;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Valid email address is required from Google account.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    let user = await User.findOne({ email: cleanEmail });

    if (user) {
      if (user.status !== 'active') {
        return res.status(403).json({
          success: false,
          error: 'This account has been suspended by the administrator.',
        });
      }

      user.authProvider = 'google';
      if (avatarUrl) user.avatar = avatarUrl;
      if (googleId) user.googleId = googleId;
      user.lastLogin = new Date();
      user.lastIp = req.ip || '';
      await user.save();
    } else {
      // Create new user via Google
      user = new User({
        fullName: name || cleanEmail.split('@')[0],
        email: cleanEmail,
        role: 'guest',
        authProvider: 'google',
        avatar: avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || cleanEmail)}&background=17372f&color=fff`,
        googleId: googleId || undefined,
        status: 'active',
        securityClearance: '',
        twoFactorEnabled: false,
        lastLogin: new Date(),
        lastIp: req.ip || '',
      });

      await user.save();
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'Signed in with Google successfully.',
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('Google Auth error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Server error during Google authentication.',
    });
  }
});

/**
 * POST /api/auth/admin/login
 * Secure Administrator login with Staff ID or Admin Gmail + Password + 2FA TOTP code
 */
router.post('/admin/login', async (req, res) => {
  try {
    const { staffIdOrEmail, password, totpCode } = req.body;
    if (typeof staffIdOrEmail !== 'string' || typeof password !== 'string' || !staffIdOrEmail.trim() || !password) {
      return res.status(400).json({ success: false, error: 'Administrator email and password are required.' });
    }
    if (!process.env.ADMIN_TOTP_SECRET) {
      return res.status(503).json({ success: false, error: 'Administrator TOTP is not configured on the server.' });
    }
    const identifier = staffIdOrEmail.trim().toLowerCase();
    const user = await User.findOne({ $or: [{ email: identifier }, { phone: identifier }] });
    if (!user || user.role !== 'admin') return res.status(403).json({ success: false, error: 'Administrator credentials are invalid.' });
    if (user.status !== 'active') return res.status(403).json({ success: false, error: 'Administrator account is unavailable.' });
    if (user.lockUntil && user.lockUntil > new Date()) return res.status(429).json({ success: false, error: 'Too many failed attempts. Try again in 15 minutes.' });

    const passwordMatches = await user.comparePassword(password);
    const matchedTotpCounter = passwordMatches ? verifyAdminTotp(totpCode, process.env.ADMIN_TOTP_SECRET) : null;
    if (!passwordMatches || matchedTotpCounter === null || matchedTotpCounter <= (user.lastTotpCounter ?? -1)) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.failedLoginAttempts = 0;
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await user.save();
      return res.status(401).json({ success: false, error: 'Administrator credentials or authenticator code are invalid.' });
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLogin = new Date();
    user.lastIp = req.ip || '';
    await user.save();
    const token = generateToken(user);
    return res.json({ success: true, message: 'Administrator authentication successful.', token, user: user.toJSON() });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ success: false, error: 'Unable to authenticate administrator.' });
  }
});

/**
 * GET /api/auth/me
 * Fetch the currently authenticated user
 */
router.get('/me', requireAuth, async (req, res) => {
  res.json({
    success: true,
    user: req.user.toJSON(),
  });
});

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const {
      fullName,
      phone,
      avatar,
    } = req.body;

    if (fullName !== undefined) {
      if (typeof fullName !== 'string' || fullName.trim().length < 2 || fullName.trim().length > 100) return res.status(400).json({ success: false, error: 'Name must be between 2 and 100 characters.' });
      user.fullName = fullName.trim();
    }
    if (phone !== undefined) {
      if (typeof phone !== 'string' || normalizePhone(phone).length < 10) return res.status(400).json({ success: false, error: 'Enter a valid phone number.' });
      user.phone = phone.trim();
    }
    if (avatar !== undefined) {
      if (typeof avatar !== 'string' || avatar.length > 2000 || (avatar && !avatar.startsWith('https://'))) return res.status(400).json({ success: false, error: 'Avatar must be a valid HTTPS URL.' });
      user.avatar = avatar;
    }


    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: user.toJSON(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update profile.',
    });
  }
});

/**
 * POST /api/auth/forgot-password
 * Send password reset code (6-digit OTP) to user's email or mobile
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { identifier } = req.body;
    if (typeof identifier !== 'string' || !identifier.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please enter your registered email address or mobile phone number.',
      });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();
    const phoneLast10 = normalizePhone(cleanIdentifier);

    const user = await User.findOne({
      $or: [
        { email: cleanIdentifier },
        { phone: cleanIdentifier },
        ...(phoneLast10.length >= 10 ? [{ phone: new RegExp(`${phoneLast10}$`) }] : []),
      ],
    });

    if (!user || !user.email) return res.json({ success: true, message: 'If the account supports email recovery, a reset code will be sent.' });

    // Generate 6-digit verification code
    const resetCode = randomInt(100000, 1000000).toString();
    user.resetPasswordCode = createHash('sha256').update(resetCode).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry
    user.resetPasswordAttempts = 0;
    await user.save();


    // Attempt real email delivery via nodemailer/SMTP
    let emailStatus = { sent: false };
    if (user.email) {
      emailStatus = await sendPasswordResetEmail({
        to: user.email,
        code: resetCode,
        name: user.fullName,
      });
    }

    if (!emailStatus.sent) {
      user.resetPasswordCode = null;
      user.resetPasswordExpires = null;
      user.resetPasswordAttempts = 0;
      await user.save();
    }
    return res.json({ success: true, message: 'If an account matches, a password reset code will be sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error processing forgot password request.',
    });
  }
});

/**
 * POST /api/auth/send-verification-code
 * Send verification code for guest or host sign-up
 */
router.post('/send-verification-code', async (req, res) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const fullName = typeof req.body.fullName === 'string' ? req.body.fullName.trim().slice(0, 100) : 'Traveler';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }
    if (await User.exists({ email })) {
      return res.status(409).json({ success: false, error: 'An account already exists with this email address.' });
    }
    const existingCode = await VerificationCode.findOne({ email, purpose: 'signup', expiresAt: { $gt: new Date(Date.now() - 60 * 1000) } });
    if (existingCode && existingCode.createdAt > new Date(Date.now() - 60 * 1000)) {
      return res.status(429).json({ success: false, error: 'Please wait one minute before requesting another code.' });
    }
    const code = randomInt(100000, 1000000).toString();
    await VerificationCode.deleteMany({ email, purpose: 'signup' });
    const record = await VerificationCode.create({
      email,
      purpose: 'signup',
      codeHash: createHash('sha256').update(code).digest('hex'),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    const delivery = await sendPasswordResetEmail({ to: email, code, name: fullName, purpose: 'signup' });
    if (!delivery.sent) {
      await VerificationCode.deleteOne({ _id: record._id });
      return res.status(503).json({ success: false, error: 'Email delivery is unavailable. Please try again later.' });
    }
    return res.json({ success: true, emailSent: true, message: 'A verification code has been sent to your email address.' });
  } catch (error) {
    console.error('Signup verification delivery failed:', error);
    return res.status(500).json({ success: false, error: 'Unable to send a verification code.' });
  }
});

router.post('/verify-email-code', async (req, res) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const code = typeof req.body.code === 'string' ? req.body.code.trim() : '';
    if (!email || !/^\d{6}$/.test(code)) return res.status(400).json({ success: false, error: 'Enter a valid email address and six-digit code.' });
    const record = await VerificationCode.findOne({ email, purpose: 'signup', expiresAt: { $gt: new Date() } });
    if (!record || record.verifiedAt || record.attempts >= 5) return res.status(400).json({ success: false, error: 'Verification code is invalid or expired. Request a new code.' });
    const candidate = Buffer.from(createHash('sha256').update(code).digest('hex'));
    const expected = Buffer.from(record.codeHash);
    if (candidate.length !== expected.length || !timingSafeEqual(candidate, expected)) {
      record.attempts += 1;
      if (record.attempts >= 5) await VerificationCode.deleteOne({ _id: record._id });
      else await record.save();
      return res.status(400).json({ success: false, error: 'Verification code is incorrect.' });
    }
    const verificationToken = randomBytes(32).toString('hex');
    record.verifiedAt = new Date();
    record.verificationTokenHash = createHash('sha256').update(verificationToken).digest('hex');
    record.attempts = 0;
    await record.save();
    return res.json({ success: true, verificationToken, message: 'Email verified successfully.' });
  } catch (error) {
    console.error('Email verification failed:', error);
    return res.status(500).json({ success: false, error: 'Unable to verify email address.' });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password using the 6-digit code
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { identifier, code, newPassword } = req.body;

    if (typeof identifier !== 'string' || typeof code !== 'string' || typeof newPassword !== 'string' || !identifier.trim() || !code.trim() || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Identifier, 6-digit reset code, and new password are required.',
      });
    }

    if (newPassword.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 10 characters.',
      });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();
    const phoneLast10 = normalizePhone(cleanIdentifier);
    const cleanCode = code.trim();

    const user = await User.findOne({
      $or: [
        { email: cleanIdentifier },
        { phone: cleanIdentifier },
        ...(phoneLast10.length >= 10 ? [{ phone: new RegExp(`${phoneLast10}$`) }] : []),
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Account not found.',
      });
    }

    if (!user.resetPasswordCode || !user.resetPasswordExpires || user.resetPasswordAttempts >= 5) {
      return res.status(400).json({
        success: false,
        error: 'No active password reset request. Please request a new code.',
      });
    }

    if (new Date() > new Date(user.resetPasswordExpires)) {
      return res.status(400).json({
        success: false,
        error: 'Password reset code has expired. Please request a new code.',
      });
    }

    if (user.resetPasswordCode !== createHash('sha256').update(cleanCode).digest('hex')) {
      user.resetPasswordAttempts = (user.resetPasswordAttempts || 0) + 1;
      if (user.resetPasswordAttempts >= 5) {
        user.resetPasswordCode = null;
        user.resetPasswordExpires = null;
      }
      await user.save();
      return res.status(400).json({
        success: false,
        error: 'Invalid verification code. Please check the 6-digit code and try again.',
      });
    }

    // Update password (bcrypt pre-save hook will hash it)
    user.password = newPassword;
    user.resetPasswordCode = null;
    user.resetPasswordExpires = null;
    user.resetPasswordAttempts = 0;
    await user.save();

    return res.json({
      success: true,
      message: 'Password reset successfully! You can now sign in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error resetting password.',
    });
  }
});

/**
 * POST /api/auth/logout
 * Client logout acknowledgment
 */
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Signed out successfully.',
  });
});

export default router;


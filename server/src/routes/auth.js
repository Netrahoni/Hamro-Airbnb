import express from 'express';
import { randomInt, createHash, timingSafeEqual, createHmac } from 'node:crypto';
import { User } from '../models/User.js';
import { VerificationCode } from '../models/VerificationCode.js';
import { requireAuth, generateToken } from '../middleware/auth.js';
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
  });
});

/**
 * POST /api/auth/register
 * Register a new Guest or Host
 */
router.post('/register', async (req, res) => {
  try {
    const {
      username, fullName, email, phone, password, role = 'guest',
      propertyName, propertyType, city, propertyCity, province, district, wardNumber, streetAddress,
    } = req.body;

    const cleanUsername = typeof username === 'string' ? username.trim().toLowerCase() : '';
    if (!/^[a-z0-9_]{3,24}$/.test(cleanUsername)) {
      return res.status(400).json({ success: false, error: 'Username must be 3–24 characters using letters, numbers, or underscores.' });
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return res.status(400).json({ success: false, error: 'Password must be between 8 and 128 characters.' });
    }
    if (!['guest', 'owner'].includes(role)) return res.status(400).json({ success: false, error: 'Invalid account type.' });

    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanPhone = typeof phone === 'string' ? phone.trim() : '';
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ success: false, error: 'Enter a valid email address or leave it blank.' });
    }
    if (cleanPhone && normalizePhone(cleanPhone).length < 10) {
      return res.status(400).json({ success: false, error: 'Enter a valid phone number or leave it blank.' });
    }

    const duplicate = await User.findOne({
      $or: [
        { username: cleanUsername },
        ...(cleanEmail ? [{ email: cleanEmail }] : []),
        ...(cleanPhone ? [{ phone: cleanPhone }, { phone: new RegExp(`${normalizePhone(cleanPhone)}$`)] : []),
      ],
    });
    if (duplicate) return res.status(409).json({ success: false, error: 'That username, email, or phone number is already in use.' });

    const newUser = new User({
      username: cleanUsername,
      fullName: typeof fullName === 'string' && fullName.trim() ? fullName.trim().slice(0, 100) : cleanUsername,
      email: cleanEmail || undefined,
      phone: cleanPhone || undefined,
      password,
      role,
      authProvider: 'email',
      propertyName: propertyName || undefined,
      propertyType: propertyType || 'Homestay',
      city: city || propertyCity || 'Pokhara',
      propertyCity: propertyCity || city || 'Pokhara',
      province: province || 'Gandaki Province',
      district: district || 'Kaski',
      wardNumber: wardNumber || '',
      streetAddress: streetAddress || '',
      kycStatus: role === 'owner' ? 'pending' : 'none',
      status: 'active',
      twoFactorEnabled: false,
      lastLogin: new Date(),
      lastIp: req.ip || '',
    });
    await newUser.save();
    const token = generateToken(newUser);
    return res.status(201).json({ success: true, message: 'Account registered successfully.', token, user: newUser.toJSON() });
  } catch (error) {
    console.error('Registration error:', error);
    if (error?.code === 11000) return res.status(409).json({ success: false, error: 'That username is already taken. Choose another.' });
    return res.status(500).json({ success: false, error: error.message || 'Server error occurred during registration.' });
  }
});

/**
 * POST /api/auth/login
 * Guest/host login via Username + Password
 */
router.post('/login', async (req, res) => {
  try {
    const { identifier, username, password, role: expectedRole } = req.body;
    const loginName = typeof username === 'string' ? username : identifier;

    if (typeof loginName !== 'string' || typeof password !== 'string' || !loginName.trim() || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both username and password.',
      });
    }

    const cleanUsername = loginName.trim().toLowerCase();
    const user = await User.findOne({ username: cleanUsername });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Invalid username or password.',
      });
    }
    if (user.role === 'admin') {
      return res.status(403).json({ success: false, error: 'Administrators must use the secure administrator sign-in with authenticator verification.' });
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

    if (expectedRole && user.role !== expectedRole) {
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
        error: 'Enter your username or registered email address for password recovery.',
      });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();
    const phoneLast10 = normalizePhone(cleanIdentifier);

    const user = await User.findOne({
      $or: [
        { username: cleanIdentifier },
        { username: cleanIdentifier },
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
        { username: cleanIdentifier },
        { username: cleanIdentifier },
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


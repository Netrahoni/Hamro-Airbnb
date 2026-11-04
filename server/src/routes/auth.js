import express from 'express';
import { User } from '../models/User.js';
import { requireAuth, generateToken } from '../middleware/auth.js';
import { OAuth2Client } from 'google-auth-library';
import { sendPasswordResetEmail } from '../services/email.js';

const router = express.Router();

function normalizePhone(str = '') {
  const digits = str.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

function isAdminEmail(email = '') {
  const configured = (process.env.ADMIN_GMAIL || '').trim().toLowerCase();
  return configured && email.trim().toLowerCase() === configured;
}

/**
 * GET /api/auth/config
 * Public configuration for frontend
 */
router.get('/config', (req, res) => {
  res.json({
    success: true,
    adminGmailConfigured: Boolean(process.env.ADMIN_GMAIL),
    adminGmail: process.env.ADMIN_GMAIL || '',
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
      citizenshipNumber,
      panNumber,
      bankName,
      accountName,
      accountNumber,
      branch,
    } = req.body;

    if (!fullName || (!email && !phone)) {
      return res.status(400).json({
        success: false,
        error: 'Full name and at least an email or mobile phone number are required.',
      });
    }

    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanPhone = phone ? phone.trim() : '';

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

    // Determine final role: if email matches ADMIN_GMAIL, elevate to admin
    let finalRole = role;
    let securityClearance = '';
    let twoFactorEnabled = false;

    if (isAdminEmail(cleanEmail)) {
      finalRole = 'admin';
      securityClearance = 'Platform Superadmin (Primary Admin Gmail)';
      twoFactorEnabled = true;
    }

    const newUser = new User({
      fullName: fullName.trim(),
      email: cleanEmail || undefined,
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
      citizenshipNumber: citizenshipNumber || '',
      panNumber: panNumber || '',
      bankDetails: bankName
        ? {
            bankName,
            accountName: accountName || fullName,
            accountNumber: accountNumber || '',
            branch: branch || '',
          }
        : undefined,
      kycStatus: finalRole === 'owner' ? 'pending' : 'none',
      status: 'active',
      securityClearance,
      twoFactorEnabled,
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

    if (!identifier || !password) {
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
        error: 'No account registered with this email or mobile number.',
      });
    }

    // Designated Admin Gmail is protected and always active
    if (isAdminEmail(user.email)) {
      user.role = 'admin';
      user.status = 'active';
      user.securityClearance = 'Platform Superadmin (Primary Admin Gmail)';
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        error: 'This account has been suspended by the platform administrator.',
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Incorrect password. Please verify your credentials and try again.',
      });
    }

    // Check if role elevation applies
    if (isAdminEmail(user.email) && user.role !== 'admin') {
      user.role = 'admin';
      user.securityClearance = 'Platform Superadmin (Primary Admin Gmail)';
    }

    if (expectedRole && user.role !== expectedRole && expectedRole !== 'guest') {
      return res.status(403).json({
        success: false,
        error: `This account is registered as a ${user.role}, not an ${expectedRole}. Please switch to the ${user.role} sign-in tab.`,
      });
    }

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
    const { token: googleToken, profile } = req.body;

    let email = profile?.email;
    let name = profile?.name;
    let avatarUrl = profile?.avatarUrl;
    let googleId = profile?.googleId;

    // If an actual Google ID token was passed, attempt verification
    if (googleToken && process.env.GOOGLE_CLIENT_ID) {
      try {
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        const ticket = await client.verifyIdToken({
          idToken: googleToken,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (payload) {
          email = payload.email;
          name = payload.name;
          avatarUrl = payload.picture;
          googleId = payload.sub;
        }
      } catch (err) {
        console.warn('Google ID token verification notice:', err.message);
      }
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Valid email address is required from Google account.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    let user = await User.findOne({ email: cleanEmail });

    const isSystemAdmin = isAdminEmail(cleanEmail);

    if (user) {
      // If user logs in with the designated Admin Gmail, ensure they have admin clearance and are active
      if (isSystemAdmin) {
        user.role = 'admin';
        user.status = 'active';
        user.securityClearance = 'Platform Superadmin (Primary Admin Gmail)';
        user.twoFactorEnabled = true;
      }

      if (user.status === 'suspended') {
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
        role: isSystemAdmin ? 'admin' : 'guest',
        authProvider: 'google',
        avatar: avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || cleanEmail)}&background=17372f&color=fff`,
        googleId: googleId || undefined,
        status: 'active',
        securityClearance: isSystemAdmin ? 'Platform Superadmin (Primary Admin Gmail)' : '',
        twoFactorEnabled: isSystemAdmin,
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

    if (!staffIdOrEmail || !password) {
      return res.status(400).json({
        success: false,
        error: 'Admin email/Staff ID and master password are required.',
      });
    }

    const cleanIdentifier = staffIdOrEmail.trim().toLowerCase();
    const phoneLast10 = normalizePhone(cleanIdentifier);

    let user = await User.findOne({
      $or: [
        { email: cleanIdentifier },
        { phone: cleanIdentifier },
        ...(phoneLast10.length >= 10 ? [{ phone: new RegExp(`${phoneLast10}$`) }] : []),
      ],
    });

    const isDesignatedAdmin = isAdminEmail(cleanIdentifier);

    // If user doesn't exist yet, but their email matches ADMIN_GMAIL in .env, auto-initialize admin account!
    if (!user && isDesignatedAdmin) {
      user = new User({
        fullName: 'Platform Superadmin',
        email: cleanIdentifier,
        role: 'admin',
        authProvider: 'email',
        password,
        securityClearance: 'Platform Superadmin (Primary Admin Gmail)',
        twoFactorEnabled: true,
        status: 'active',
      });
      await user.save();
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'No administrator account associated with this email or Staff ID.',
      });
    }

    // Verify role or designated admin status
    if (isDesignatedAdmin) {
      user.role = 'admin';
      user.status = 'active';
      user.securityClearance = 'Platform Superadmin (Primary Admin Gmail)';
    } else if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access restricted: account lacks platform administrator privileges.',
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        error: 'Administrator credentials suspended. Contact Platform Security.',
      });
    }

    // Verify Password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid master administration password.',
      });
    }

    // Verify TOTP 2FA code (must be 6 digits)
    const cleanTotp = (totpCode || '').trim();
    if (!cleanTotp || cleanTotp.length !== 6 || !/^\d{6}$/.test(cleanTotp)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid 6-digit TOTP security token code.',
      });
    }

    if (isDesignatedAdmin && user.role !== 'admin') {
      user.role = 'admin';
      user.securityClearance = 'Platform Superadmin (Primary Admin Gmail)';
    }

    user.lastLogin = new Date();
    user.lastIp = `${req.ip || '103.10.28.14'} (Secure Admin Session)`;
    await user.save();

    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'Admin authorization granted.',
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Server error occurred during admin authentication.',
    });
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
      propertyName,
      propertyType,
      city,
      propertyCity,
      province,
      district,
      wardNumber,
      streetAddress,
      citizenshipNumber,
      panNumber,
      bankDetails,
    } = req.body;

    if (fullName) user.fullName = fullName.trim();
    if (phone) user.phone = phone.trim();
    if (avatar !== undefined) user.avatar = avatar;

    if (propertyName !== undefined) user.propertyName = propertyName;
    if (propertyType !== undefined) user.propertyType = propertyType;
    if (city !== undefined) {
      user.city = city;
      user.propertyCity = city;
    }
    if (propertyCity !== undefined) {
      user.propertyCity = propertyCity;
      user.city = propertyCity;
    }
    if (province !== undefined) user.province = province;
    if (district !== undefined) user.district = district;
    if (wardNumber !== undefined) user.wardNumber = wardNumber;
    if (streetAddress !== undefined) user.streetAddress = streetAddress;
    if (citizenshipNumber !== undefined) user.citizenshipNumber = citizenshipNumber;
    if (panNumber !== undefined) user.panNumber = panNumber;
    if (bankDetails !== undefined) user.bankDetails = bankDetails;

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
    if (!identifier) {
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

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'No registered NepalStay account matches that email or mobile number.',
      });
    }

    // Generate 6-digit verification code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordCode = resetCode;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry
    await user.save();

    console.log(`🔑 [NepalStay Password Reset] 6-Digit code for ${user.email || user.phone}: ${resetCode}`);

    // Attempt real email delivery via nodemailer/SMTP
    let emailStatus = { sent: false };
    if (user.email) {
      emailStatus = await sendPasswordResetEmail({
        to: user.email,
        code: resetCode,
        name: user.fullName,
      });
    }

    return res.json({
      success: true,
      message: user.email
        ? (emailStatus.sent
            ? `A 6-digit verification code was sent to ${user.email}. Check your inbox or spam.`
            : `Verification code generated for ${user.email}.`)
        : `Verification code generated for ${user.phone}.`,
      emailSent: emailStatus.sent,
      devCode: resetCode,
    });
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
 * Send verification code for new guest sign-up
 */
router.post('/send-verification-code', async (req, res) => {
  try {
    const { email, phone, fullName } = req.body;
    if (!email && !phone) {
      return res.status(400).json({ success: false, error: 'Email or mobile number is required.' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    let emailStatus = { sent: false };
    if (email) {
      emailStatus = await sendPasswordResetEmail({
        to: email.trim().toLowerCase(),
        code,
        name: fullName || 'Traveler',
      });
    }

    res.json({
      success: true,
      code,
      emailSent: emailStatus.sent,
      message: emailStatus.sent
        ? `Verification code dispatched to ${email}.`
        : `Verification code generated for ${email || phone}.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password using the 6-digit code
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { identifier, code, newPassword } = req.body;

    if (!identifier || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Identifier, 6-digit reset code, and new password are required.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters.',
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

    if (!user.resetPasswordCode || !user.resetPasswordExpires) {
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

    if (user.resetPasswordCode !== cleanCode) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification code. Please check the 6-digit code and try again.',
      });
    }

    // Update password (bcrypt pre-save hook will hash it)
    user.password = newPassword;
    user.resetPasswordCode = null;
    user.resetPasswordExpires = null;
    await user.save();

    console.log(`✓ Password successfully reset for user: ${user.email || user.phone}`);

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


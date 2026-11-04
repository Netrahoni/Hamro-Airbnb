import express from 'express';
import { User } from '../models/User.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/users
 * Admin endpoint: List all registered users
 */
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    const userList = users.map((u) => u.toJSON());

    const stats = {
      total: userList.length,
      guests: userList.filter((u) => u.role === 'guest').length,
      hosts: userList.filter((u) => u.role === 'owner').length,
      admins: userList.filter((u) => u.role === 'admin').length,
      kycPending: userList.filter((u) => u.kycStatus === 'pending').length,
    };

    res.json({
      success: true,
      users: userList,
      stats,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/users/:id/status
 * Admin endpoint: Suspend / activate an account
 */
router.patch('/:id/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'restricted', 'suspended'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid user status.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    user.status = status;
    await user.save();

    res.json({
      success: true,
      message: `User status updated to ${status}.`,
      user: user.toJSON(),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/users/:id/kyc
 * Admin endpoint: Review host KYC documents
 */
router.patch('/:id/kyc', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { kycStatus } = req.body;
    if (!['approved', 'pending', 'correction', 'none'].includes(kycStatus)) {
      return res.status(400).json({ success: false, error: 'Invalid KYC status.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    user.kycStatus = kycStatus;
    await user.save();

    res.json({
      success: true,
      message: `Host KYC status updated to ${kycStatus}.`,
      user: user.toJSON(),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


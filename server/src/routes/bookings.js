import express from 'express';
import { Booking } from '../models/Booking.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/bookings
 * Get current user's bookings (guests see their bookings, hosts see bookings for their properties, admins see all)
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'guest') {
      filter = { guest: req.user._id };
    } else if (req.user.role === 'owner') {
      filter = { hostName: req.user.fullName };
    }
    // Admin sees all

    const bookings = await Booking.find(filter).sort({ createdAt: -1 });
    res.json({
      success: true,
      count: bookings.length,
      bookings: bookings.map((b) => b.toJSON()),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/bookings
 * Create a new booking
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const newBooking = new Booking({
      ...req.body,
      guest: req.user._id,
      guestName: req.user.fullName,
      guestEmail: req.user.email || req.body.guestEmail,
      guestPhone: req.user.phone || req.body.guestPhone,
    });
    await newBooking.save();
    res.status(201).json({
      success: true,
      message: 'Booking confirmed successfully.',
      booking: newBooking.toJSON(),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/bookings/:id/cancel
 * Cancel a booking
 */
router.patch('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found.' });
    }

    if (
      req.user.role !== 'admin' &&
      booking.guest.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, error: 'Not authorized to cancel this booking.' });
    }

    booking.bookingStatus = 'cancelled';
    await booking.save();

    res.json({
      success: true,
      message: 'Booking cancelled successfully.',
      booking: booking.toJSON(),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


import express from 'express';
import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import { Booking } from '../models/Booking.js';
import { Property } from '../models/Property.js';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const DAY_MS = 24 * 60 * 60 * 1000;
const SERVICE_FEE_RATE = 0.05;

function validStayDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function dateOnlyUtc() {
  return new Date().toISOString().slice(0, 10);
}

function makeBookingReference(city) {
  const cityCode = String(city || 'NPL').replace(/[^a-z]/gi, '').slice(0, 3).toUpperCase().padEnd(3, 'X');
  return `NS-${new Date().getUTCFullYear()}-${cityCode}-${randomBytes(4).toString('hex').toUpperCase()}`;
}

function canAccessBooking(booking, user) {
  return user.role === 'admin' ||
    booking.guest.toString() === user._id.toString() ||
    (user.role === 'owner' && booking.host.toString() === user._id.toString());
}

// Guests see their bookings; hosts see bookings for their properties; admins see all.
router.get('/', requireAuth, async (req, res) => {
  try {
    let filter;
    if (req.user.role === 'guest') filter = { guest: req.user._id };
    else if (req.user.role === 'owner') filter = { host: req.user._id };
    else if (req.user.role === 'admin') filter = {};
    else return res.status(403).json({ success: false, error: 'Booking access is not available for this account.' });

    const bookings = await Booking.find(filter).sort({ createdAt: -1 }).limit(100);
    return res.json({ success: true, count: bookings.length, bookings: bookings.map(booking => booking.toJSON()) });
  } catch {
    return res.status(500).json({ success: false, error: 'Unable to load bookings.' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, error: 'Booking not found.' });
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found.' });
    if (!canAccessBooking(booking, req.user)) return res.status(403).json({ success: false, error: 'You cannot view this booking.' });
    return res.json({ success: true, booking: booking.toJSON() });
  } catch {
    return res.status(500).json({ success: false, error: 'Unable to load booking.' });
  }
});

// Create a confirmed pay-at-property reservation using server-owned property and price data.
router.post('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'guest') return res.status(403).json({ success: false, error: 'Only guest accounts can create reservations.' });
    const { propertyId, checkIn, checkOut, guests, guestPhone, specialRequests = '' } = req.body || {};
    if (!mongoose.isValidObjectId(propertyId)) return res.status(400).json({ success: false, error: 'Choose a valid property.' });
    if (!validStayDate(checkIn) || !validStayDate(checkOut) || checkIn < dateOnlyUtc() || checkOut <= checkIn) {
      return res.status(400).json({ success: false, error: 'Choose valid future check-in and check-out dates.' });
    }
    const nights = (Date.parse(`${checkOut}T00:00:00.000Z`) - Date.parse(`${checkIn}T00:00:00.000Z`)) / DAY_MS;
    if (!Number.isInteger(nights) || nights < 1 || nights > 365) return res.status(400).json({ success: false, error: 'Reservations can be between 1 and 365 nights.' });
    const guestCount = Number(guests);
    if (!Number.isInteger(guestCount) || guestCount < 1) return res.status(400).json({ success: false, error: 'Enter a valid guest count.' });
    if (typeof guestPhone !== 'string' || guestPhone.replace(/\D/g, '').length < 10 || guestPhone.length > 32) {
      return res.status(400).json({ success: false, error: 'Enter a valid contact phone number.' });
    }
    if (typeof specialRequests !== 'string' || specialRequests.length > 1000) return res.status(400).json({ success: false, error: 'Special requests must be 1,000 characters or fewer.' });
    if (!req.user.email) return res.status(400).json({ success: false, error: 'Add an email address to your account before booking.' });

    const property = await Property.findById(propertyId);
    if (!property || property.status !== 'active') return res.status(404).json({ success: false, error: 'This property is not available for booking.' });
    if (guestCount > property.maxGuests) return res.status(400).json({ success: false, error: `This property allows up to ${property.maxGuests} guests.` });
    const host = await User.findById(property.host).select('status kycStatus');
    if (!host || host.status !== 'active' || host.kycStatus !== 'approved') return res.status(409).json({ success: false, error: 'This property is temporarily unavailable.' });

    const conflict = await Booking.exists({
      property: property._id,
      bookingStatus: { $in: ['confirmed', 'completed'] },
      checkIn: { $lt: checkOut },
      checkOut: { $gt: checkIn },
    });
    if (conflict) return res.status(409).json({ success: false, error: 'Those dates are no longer available. Choose different dates.' });

    const nightlyRate = Math.round(property.pricePerNight);
    const subtotal = nightlyRate * nights;
    const serviceFee = Math.round(subtotal * SERVICE_FEE_RATE);
    const booking = await Booking.create({
      bookingReference: makeBookingReference(property.location.city),
      guest: req.user._id,
      guestName: req.user.fullName,
      guestEmail: req.user.email,
      guestPhone: guestPhone.trim(),
      property: property._id,
      host: property.host,
      propertyTitle: property.title,
      propertyCity: property.location.city,
      propertyImage: property.images?.[0] || '',
      hostName: property.hostName,
      checkIn,
      checkOut,
      nights,
      guests: guestCount,
      nightlyRate,
      subtotal,
      serviceFee,
      totalAmount: subtotal + serviceFee,
      currency: 'NPR',
      paymentMethod: 'pay_at_property',
      paymentStatus: 'pending',
      bookingStatus: 'confirmed',
      specialRequests: specialRequests.trim(),
    });
    return res.status(201).json({ success: true, message: 'Reservation confirmed.', booking: booking.toJSON() });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ success: false, error: 'Please retry your booking.' });
    console.error('Booking creation error:', error);
    return res.status(500).json({ success: false, error: 'Unable to create reservation.' });
  }
});

router.patch('/:id/cancel', requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, error: 'Booking not found.' });
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found.' });
    if (!canAccessBooking(booking, req.user)) return res.status(403).json({ success: false, error: 'Not authorized to cancel this booking.' });
    if (booking.bookingStatus !== 'confirmed') return res.status(409).json({ success: false, error: 'This reservation cannot be cancelled.' });
    if (booking.checkIn <= dateOnlyUtc()) return res.status(409).json({ success: false, error: 'Reservations cannot be cancelled on or after check-in.' });
    booking.bookingStatus = 'cancelled';
    await booking.save();
    return res.json({ success: true, message: 'Reservation cancelled.', booking: booking.toJSON() });
  } catch {
    return res.status(500).json({ success: false, error: 'Unable to cancel reservation.' });
  }
});

export default router;

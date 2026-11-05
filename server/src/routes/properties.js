import express from 'express';
import mongoose from 'mongoose';
import { Property } from '../models/Property.js';
import { requireAuth, requireHost } from '../middleware/auth.js';

const router = express.Router();
const PROPERTY_TYPES = ['Homestay', 'Boutique Hotel', 'Eco Lodge', 'Resort', 'Traditional House'];
const EDITABLE_FIELDS = ['title', 'tagline', 'propertyType', 'location', 'pricePerNight', 'images', 'amenities', 'description', 'houseRules', 'bedrooms', 'bathrooms', 'maxGuests'];

function cleanPropertyInput(body = {}) {
  const data = {};
  for (const key of EDITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, key)) data[key] = body[key];
  }
  if (data.title !== undefined) {
    if (typeof data.title !== 'string' || data.title.trim().length < 5 || data.title.trim().length > 120) throw new Error('Title must be between 5 and 120 characters.');
    data.title = data.title.trim();
  }
  if (data.tagline !== undefined) data.tagline = String(data.tagline).slice(0, 180);
  if (data.description !== undefined) {
    if (typeof data.description !== 'string' || data.description.length > 5000) throw new Error('Description must be 5,000 characters or fewer.');
  }
  if (data.propertyType !== undefined && !PROPERTY_TYPES.includes(data.propertyType)) throw new Error('Unsupported property type.');
  if (data.pricePerNight !== undefined && (!Number.isFinite(Number(data.pricePerNight)) || Number(data.pricePerNight) <= 0 || Number(data.pricePerNight) > 10000000)) throw new Error('Enter a valid nightly price.');
  for (const field of ['bedrooms', 'bathrooms', 'maxGuests']) {
    if (data[field] !== undefined && (!Number.isInteger(Number(data[field])) || Number(data[field]) < 1 || Number(data[field]) > 100)) throw new Error(`Invalid ${field} value.`);
    if (data[field] !== undefined) data[field] = Number(data[field]);
  }
  for (const field of ['images', 'amenities', 'houseRules']) {
    if (data[field] !== undefined && (!Array.isArray(data[field]) || data[field].length > (field === 'images' ? 20 : 50) || data[field].some(v => typeof v !== 'string' || v.length > 1000))) throw new Error(`Invalid ${field} list.`);
  }
  if (data.location !== undefined) {
    const loc = data.location;
    if (!loc || typeof loc !== 'object' || Array.isArray(loc) || typeof loc.city !== 'string' || !loc.city.trim()) throw new Error('A valid location city is required.');
    const coordinates = loc.coordinates || {};
    data.location = {
      city: loc.city.trim().slice(0, 100),
      province: typeof loc.province === 'string' ? loc.province.slice(0, 100) : '',
      district: typeof loc.district === 'string' ? loc.district.slice(0, 100) : '',
      wardNumber: typeof loc.wardNumber === 'string' ? loc.wardNumber.slice(0, 20) : '',
      streetAddress: typeof loc.streetAddress === 'string' ? loc.streetAddress.slice(0, 250) : '',
      region: typeof loc.region === 'string' ? loc.region.slice(0, 100) : '',
      coordinates: {
        lat: Number.isFinite(Number(coordinates.lat)) && Math.abs(Number(coordinates.lat)) <= 90 ? Number(coordinates.lat) : 28.2096,
        lng: Number.isFinite(Number(coordinates.lng)) && Math.abs(Number(coordinates.lng)) <= 180 ? Number(coordinates.lng) : 83.9856,
      },
    };
  }
  return data;
}

function canManage(property, user) {
  return user.role === 'admin' || property.host.toString() === user._id.toString();
}

// Public marketplace: only approved/active listings are discoverable.
router.get('/', async (req, res) => {
  try {
    const filter = { status: 'active' };
    if (typeof req.query.city === 'string' && req.query.city.trim()) {
      const escaped = req.query.city.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter['location.city'] = new RegExp(escaped, 'i');
    }
    if (typeof req.query.type === 'string' && PROPERTY_TYPES.includes(req.query.type)) filter.propertyType = req.query.type;
    const page = Math.max(1, Math.min(1000, Number.parseInt(req.query.page, 10) || 1));
    const limit = Math.max(1, Math.min(50, Number.parseInt(req.query.limit, 10) || 20));
    const [properties, count] = await Promise.all([
      Property.find(filter).sort({ rating: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Property.countDocuments(filter),
    ]);
    return res.json({ success: true, count, page, pages: Math.ceil(count / limit), properties: properties.map(p => p.toJSON()) });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Unable to load properties.' });
  }
});

// Host workspace: only the authenticated host's listings (or all for an admin).
router.get('/mine', requireAuth, requireHost, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { host: req.user._id };
    const properties = await Property.find(filter).sort({ updatedAt: -1 });
    return res.json({ success: true, count: properties.length, properties: properties.map(p => p.toJSON()) });
  } catch {
    return res.status(500).json({ success: false, error: 'Unable to load your listings.' });
  }
});

// Detail route is public for active listings; owners/admins may preview their own unpublished listings.
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid property ID.' });
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ success: false, error: 'Property not found.' });
    if (property.status !== 'active') {
      const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      if (!token) return res.status(404).json({ success: false, error: 'Property not found.' });
      const { default: jwt } = await import('jsonwebtoken');
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'], issuer: 'nepalstay-api', audience: 'nepalstay-client' });
        const user = await (await import('../models/User.js')).User.findById(decoded.id);
        if (!user || (user.role !== 'admin' && property.host.toString() !== user._id.toString())) return res.status(404).json({ success: false, error: 'Property not found.' });
      } catch { return res.status(404).json({ success: false, error: 'Property not found.' }); }
    }
    return res.json({ success: true, property: property.toJSON() });
  } catch {
    return res.status(400).json({ success: false, error: 'Invalid property request.' });
  }
});

router.post('/', requireAuth, requireHost, async (req, res) => {
  try {
    const data = cleanPropertyInput(req.body);
    if (!data.title || !data.location || !data.pricePerNight) return res.status(400).json({ success: false, error: 'Title, location and nightly price are required.' });
    const property = await Property.create({
      ...data,
      host: req.user._id,
      hostName: req.user.fullName,
      status: 'draft',
      featured: false,
      rating: 0,
      reviewCount: 0,
    });
    return res.status(201).json({ success: true, property: property.toJSON() });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message || 'Unable to create property.' });
  }
});

router.put('/:id', requireAuth, requireHost, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid property ID.' });
    const property = await Property.findById(req.params.id);
    if (!property || !canManage(property, req.user)) return res.status(404).json({ success: false, error: 'Property not found.' });
    const data = cleanPropertyInput(req.body);
    Object.assign(property, data);
    if (property.status === 'active') property.status = 'pending_approval';
    await property.save();
    return res.json({ success: true, message: 'Listing updated and submitted for review.', property: property.toJSON() });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message || 'Unable to update property.' });
  }
});

router.patch('/:id/status', requireAuth, requireHost, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid property ID.' });
    const property = await Property.findById(req.params.id);
    if (!property || !canManage(property, req.user)) return res.status(404).json({ success: false, error: 'Property not found.' });
    const { status } = req.body;
    const allowed = req.user.role === 'admin' ? ['active', 'paused', 'unlisted', 'draft', 'pending_approval'] : ['paused', 'unlisted', 'draft', 'pending_approval'];
    if (!allowed.includes(status)) return res.status(400).json({ success: false, error: 'Invalid listing status or insufficient permission to publish.' });
    if (status === 'pending_approval' && (!property.title || !property.location?.city || !property.pricePerNight || !property.description)) return res.status(400).json({ success: false, error: 'Complete the title, location, nightly price and description before submitting.' });
    property.status = status;
    await property.save();
    return res.json({ success: true, property: property.toJSON() });
  } catch {
    return res.status(500).json({ success: false, error: 'Unable to change listing status.' });
  }
});

router.delete('/:id', requireAuth, requireHost, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid property ID.' });
    const property = await Property.findById(req.params.id);
    if (!property || !canManage(property, req.user)) return res.status(404).json({ success: false, error: 'Property not found.' });
    property.status = 'unlisted';
    await property.save();
    return res.json({ success: true, message: 'Listing removed from public search.' });
  } catch {
    return res.status(500).json({ success: false, error: 'Unable to remove listing.' });
  }
});

export default router;

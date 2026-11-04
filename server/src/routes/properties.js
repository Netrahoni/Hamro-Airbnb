import express from 'express';
import { Property } from '../models/Property.js';
import { requireAuth, requireHost } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/properties
 * List active properties (supports filter by city or propertyType)
 */
router.get('/', async (req, res) => {
  try {
    const { city, type } = req.query;
    const filter = { status: 'active' };
    if (city) filter['location.city'] = new RegExp(city, 'i');
    if (type) filter.propertyType = type;

    const properties = await Property.find(filter).sort({ rating: -1, createdAt: -1 });
    res.json({
      success: true,
      count: properties.length,
      properties: properties.map((p) => p.toJSON()),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/properties/:id
 * Get single property
 */
router.get('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found.' });
    }
    res.json({
      success: true,
      property: property.toJSON(),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/properties
 * Create a new property listing (Requires Host or Admin)
 */
router.post('/', requireAuth, requireHost, async (req, res) => {
  try {
    const newProperty = new Property({
      ...req.body,
      host: req.user._id,
      hostName: req.user.fullName,
    });
    await newProperty.save();
    res.status(201).json({
      success: true,
      property: newProperty.toJSON(),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


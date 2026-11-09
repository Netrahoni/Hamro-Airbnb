import mongoose from 'mongoose';

const propertySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    tagline: {
      type: String,
      default: '',
    },
    propertyType: {
      type: String,
      enum: ['Homestay', 'Boutique Hotel', 'Eco Lodge', 'Resort', 'Traditional House'],
      default: 'Homestay',
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    hostName: {
      type: String,
      default: '',
    },
    location: {
      city: { type: String, required: true },
      province: { type: String, default: 'Gandaki Province' },
      district: { type: String, default: '' },
      wardNumber: { type: String, default: '' },
      streetAddress: { type: String, default: '' },
      region: { type: String, default: '' },
      coordinates: {
        lat: { type: Number, default: 28.2096 },
        lng: { type: Number, default: 83.9856 },
      },
    },
    pricePerNight: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'NPR',
    },
    rating: {
      type: Number,
      default: 4.8,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    images: [
      {
        type: String,
      },
    ],
    amenities: [
      {
        type: String,
      },
    ],
    description: {
      type: String,
      default: '',
    },
    houseRules: [
      {
        type: String,
      },
    ],
    bedrooms: {
      type: Number,
      default: 1,
    },
    bathrooms: {
      type: Number,
      default: 1,
    },
    maxGuests: {
      type: Number,
      default: 2,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'pending_approval', 'paused', 'unlisted'],
      default: 'draft',
    },
    bookingLockToken: { type: String, default: '', select: false },
    bookingLockUntil: { type: Date, default: null, select: false },
    featured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

propertySchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.bookingLockToken;
  delete obj.bookingLockUntil;
  obj.id = obj._id.toString();
  return obj;
};

export const Property = mongoose.model('Property', propertySchema);


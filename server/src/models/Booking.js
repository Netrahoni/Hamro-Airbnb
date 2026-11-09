import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    bookingReference: { type: String, required: true, unique: true, index: true },
    guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    guestName: { type: String, required: true, trim: true },
    guestEmail: { type: String, required: true, lowercase: true, trim: true },
    guestPhone: { type: String, required: true, trim: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
    host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    propertyTitle: { type: String, required: true },
    propertyCity: { type: String, required: true },
    propertyImage: { type: String, default: '' },
    hostName: { type: String, default: '' },
    checkIn: { type: String, required: true },
    checkOut: { type: String, required: true },
    nights: { type: Number, required: true, min: 1, max: 365 },
    guests: { type: Number, required: true, min: 1 },
    nightlyRate: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 1 },
    serviceFee: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 1 },
    currency: { type: String, default: 'NPR', enum: ['NPR'] },
    paymentMethod: { type: String, enum: ['pay_at_property'], default: 'pay_at_property' },
    paymentStatus: { type: String, enum: ['paid', 'pending', 'refunded'], default: 'pending' },
    bookingStatus: { type: String, enum: ['confirmed', 'completed', 'cancelled'], default: 'confirmed', index: true },
    specialRequests: { type: String, default: '', maxlength: 1000 },
  },
  { timestamps: true }
);

bookingSchema.index({ property: 1, checkIn: 1, checkOut: 1, bookingStatus: 1 });

bookingSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  return obj;
};

export const Booking = mongoose.model('Booking', bookingSchema);

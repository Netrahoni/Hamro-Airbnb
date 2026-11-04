import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    guestName: {
      type: String,
      required: true,
    },
    guestEmail: {
      type: String,
      required: true,
    },
    guestPhone: {
      type: String,
      required: true,
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
    },
    propertyTitle: {
      type: String,
      required: true,
    },
    propertyCity: {
      type: String,
      required: true,
    },
    propertyImage: {
      type: String,
      default: '',
    },
    hostName: {
      type: String,
      default: '',
    },
    checkIn: {
      type: String,
      required: true,
    },
    checkOut: {
      type: String,
      required: true,
    },
    nights: {
      type: Number,
      required: true,
      min: 1,
    },
    guests: {
      type: Number,
      required: true,
      min: 1,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'NPR',
    },
    paymentMethod: {
      type: String,
      enum: ['esewa', 'khalti', 'card', 'bank_transfer', 'pay_at_property'],
      default: 'pay_at_property',
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'pending', 'refunded'],
      default: 'pending',
    },
    bookingStatus: {
      type: String,
      enum: ['confirmed', 'completed', 'cancelled'],
      default: 'confirmed',
    },
    specialRequests: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

bookingSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  return obj;
};

export const Booking = mongoose.model('Booking', bookingSchema);


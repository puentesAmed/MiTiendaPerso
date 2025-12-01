import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    price: { type: Number, required: true, min: 0 },
    image: { type: String },
    stock: { type: Number, required: true, min: 0 },
    active: { type: Boolean, default: true },
    category: { type: String, trim: true },
  },
  { timestamps: true },
);

export const Product = mongoose.model('Product', productSchema);

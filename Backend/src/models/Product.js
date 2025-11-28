import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    name: { type: String,},
    description: { type: String,},
    price: { type: Number,},
    image: { type: String,},    
    stock: { type: Number,},
    active: { type: Boolean, default: true,},
    category: { type: String,},
}, { timestamps: true});

export const Product = mongoose.model('Product', productSchema)

    

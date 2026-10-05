import mongoose from "mongoose";

const orderSequenceSchema = new mongoose.Schema({
  dateKey: { type: String, required: true, unique: true },
  seq: { type: Number, required: true, default: 0 },
});

export const OrderSequence = mongoose.model("OrderSequence", orderSequenceSchema);

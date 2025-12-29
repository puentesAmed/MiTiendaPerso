import mongoose from "mongoose";

export const affiliateConnection = mongoose.createConnection(
  process.env.MONGO_URI_ALIEXPRESS,
  {
    autoIndex: false,
  }
);

affiliateConnection.on("connected", () => {
  console.log("🟢 Affiliate Mongo connected");
});

affiliateConnection.on("error", (err) => {
  console.error("🔴 Affiliate Mongo error:", err.message);
});

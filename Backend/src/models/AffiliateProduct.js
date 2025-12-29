import mongoose from "mongoose";
import ProductSchema from "./schemas/product.schema.js";
import { affiliateConnection } from "../config/dbAffiliate.js";

export const AffiliateProduct =
  affiliateConnection.model("Product", ProductSchema);

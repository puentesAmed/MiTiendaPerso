import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";

import { connectDB } from "./config/db.js";
import { productsRouter } from "./routes/products.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { ordersRouter } from "./routes/orders.routes.js";
import env from "./config/env.js";


const app = express();

app.use(cors());
app.use(express.json());



app.use("/api/products", productsRouter);
app.use("/api/auth", authRouter);
app.use("/api/orders", ordersRouter);


app.get("/", (req, res) => {
    res.json({ message: "API is running" });
});


mongoose.connect(env.MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.error(err));

app.listen(env.PORT, () =>
    console.log(`Server running on port ${env.PORT}`)
);

// src/routes/uploads.routes.js
import { Router } from "express";
import multer from "multer";
import path from "path";

const uploadRouter = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/customizations");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({ storage });

uploadRouter.post("/image", upload.single("file"), (req, res) => {
  // aquí podrías devolver una URL absoluta si sirves /uploads estático
  res.json({
    ok: true,
    url: `/uploads/customizations/${req.file.filename}`,
  });
});

export { uploadRouter };

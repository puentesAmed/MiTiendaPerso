import test, { before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { createApp } from "../../src/app.js";
import { User } from "../../src/models/User.js";
import { setupTestDB, clearTestDB, teardownTestDB } from "../setup/test-db.js";

const app = createApp();

before(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
  await setupTestDB();
});

beforeEach(async () => {
  await clearTestDB();
});

after(async () => {
  await teardownTestDB();
});

test("register normaliza email con mayúsculas y espacios", async () => {
  const res = await request(app).post("/auth/register").send({
    name: "Usuario Test",
    email: "  USER@MAIL.COM ",
    password: "123456",
  });

  assert.equal(res.status, 201);
  const user = await User.findOne({ email: "user@mail.com" });
  assert.ok(user);
});

test("register con email inválido devuelve 400", async () => {
  const res = await request(app).post("/auth/register").send({
    name: "Usuario Test",
    email: "email-invalido",
    password: "123456",
  });
  assert.equal(res.status, 400);
});

test("login con password vacío devuelve 400", async () => {
  const res = await request(app).post("/auth/login").send({
    email: "user@mail.com",
    password: "",
  });
  assert.equal(res.status, 400);
});

test("login con credenciales inválidas devuelve 401", async () => {
  const res = await request(app).post("/auth/login").send({
    email: "user@mail.com",
    password: "123456",
  });
  assert.equal(res.status, 401);
});


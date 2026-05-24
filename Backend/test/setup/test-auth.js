import jwt from "jsonwebtoken";
import { User } from "../../src/models/User.js";

const TEST_JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";

export async function createUser({ role = "user", email = "user@test.com", name = "Test User" } = {}) {
  return User.create({
    name,
    email,
    passwordHash: "hashed-password",
    role,
  });
}

export function createTokenForUser(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email, role: user.role, name: user.name },
    TEST_JWT_SECRET,
    { expiresIn: "1h" }
  );
}

export async function createAdminAuthHeader() {
  const admin = await createUser({
    role: "admin",
    email: `admin_${Date.now()}@test.com`,
    name: "Admin Test",
  });
  const token = createTokenForUser(admin);
  return `Bearer ${token}`;
}


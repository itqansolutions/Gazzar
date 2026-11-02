// GX Academy – Phase 1 Security Regression Test Suite
// Standard: Node.js 24 ESM Test Runner

import assert from "node:assert";
import test from "node:test";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Load environment variables
const JWT_SECRET = process.env.JWT_SECRET || "gazzar_sports_coaching_jwt_super_secret_key_2026";

// 1. Replicated Auth Functions for Unit Verification
function verifyPassword(inputPassword, storedPasswordOrHash) {
  if (!inputPassword || !storedPasswordOrHash) return false;

  if (
    storedPasswordOrHash.startsWith("$2a$") ||
    storedPasswordOrHash.startsWith("$2b$") ||
    storedPasswordOrHash.startsWith("$2y$")
  ) {
    try {
      return bcrypt.compareSync(inputPassword, storedPasswordOrHash);
    } catch {
      return false;
    }
  }

  return inputPassword === storedPasswordOrHash;
}

function createAuthToken(user) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
}

function verifyAuthToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// Simulated mock user store
const mockUsers = [
  {
    id: "user-admin",
    email: "admin@gxacademy.com",
    name: "Abdullah (Admin)",
    role: "ADMIN",
    password: "$2a$10$abcdefghijklmnopqrstuu0123456789012345678901234567890", // Example bcrypt hash
    createdAt: new Date().toISOString()
  },
  {
    id: "user-coach",
    email: "coach@gxacademy.com",
    name: "Coach Ahmed",
    role: "COACH",
    password: "CustomCoachSecret#2026", // Plaintext stored in legacy prototype
    createdAt: new Date().toISOString()
  }
];

// Simulated Login Route Handler Logic
async function simulateLoginRoute(body) {
  const { email, password } = body;

  if (!email || typeof email !== "string" || !password || typeof password !== "string") {
    return { status: 400, body: { success: false, message: "Email and password are required" } };
  }

  const trimmedEmail = email.trim().toLowerCase();
  const user = mockUsers.find(u => u.email.toLowerCase() === trimmedEmail);
  if (!user) {
    return { status: 401, body: { success: false, message: "Invalid email or password" } };
  }

  const isValid = verifyPassword(password, user.password);
  if (!isValid) {
    return { status: 401, body: { success: false, message: "Invalid email or password" } };
  }

  const token = createAuthToken({ id: user.id, email: user.email, role: user.role });
  const sanitizedUser = { id: user.id, email: user.email, name: user.name, role: user.role };
  return { status: 200, body: { success: true, user: sanitizedUser, token } };
}

// Simulated /api/auth/me Route Handler Logic
async function simulateAuthMeRoute(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { status: 401, body: { success: false, message: "Missing or invalid authorization token" } };
  }

  const token = authHeader.substring(7);
  const session = verifyAuthToken(token);
  if (!session) {
    return { status: 401, body: { success: false, message: "Invalid or expired session token" } };
  }

  const liveUser = mockUsers.find(u => u.id === session.id);
  if (!liveUser) {
    return { status: 404, body: { success: false, message: "User not found" } };
  }

  const sanitizedUser = { id: liveUser.id, email: liveUser.email, name: liveUser.name, role: liveUser.role };
  return { status: 200, body: { success: true, user: sanitizedUser } };
}

// ================= TEST SUITE =================

test("Security Test 1: Missing email must be rejected with 400", async () => {
  const res = await simulateLoginRoute({ password: "SomePassword123" });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.success, false);
});

test("Security Test 2: Missing password must be rejected with 400", async () => {
  const res = await simulateLoginRoute({ email: "admin@gxacademy.com" });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.success, false);
});

test("Security Test 3: Invalid credentials must be rejected with 401", async () => {
  const res = await simulateLoginRoute({ email: "admin@gxacademy.com", password: "wrongpassword" });
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.success, false);
});

test("Security Test 4: Role-only login attempts without email/password must fail with 400", async () => {
  const res = await simulateLoginRoute({ role: "ADMIN" });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.success, false);
});

test("Security Test 5: Universal password bypass ('A@123456') must FAIL against accounts with different password", async () => {
  // Test coach with password 'CustomCoachSecret#2026'
  const isBypassValid = verifyPassword("A@123456", "CustomCoachSecret#2026");
  assert.strictEqual(isBypassValid, false, "Universal bypass 'A@123456' must return false");

  const isBypass2Valid = verifyPassword("password123", "CustomCoachSecret#2026");
  assert.strictEqual(isBypass2Valid, false, "Universal bypass 'password123' must return false");

  const isRealPasswordValid = verifyPassword("CustomCoachSecret#2026", "CustomCoachSecret#2026");
  assert.strictEqual(isRealPasswordValid, true, "Valid stored credential must return true");
});

test("Security Test 6: Sensitive API (/api/auth/me) access without Bearer token must return 401", async () => {
  const unauthenticatedRes = await simulateAuthMeRoute(null);
  assert.strictEqual(unauthenticatedRes.status, 401);
  assert.strictEqual(unauthenticatedRes.body.success, false);

  const fakeTokenRes = await simulateAuthMeRoute("Bearer invalid_token_12345");
  assert.strictEqual(fakeTokenRes.status, 401);
  assert.strictEqual(fakeTokenRes.body.success, false);
});

test("Security Test 7: Successful authentication must NEVER return password or passwordHash", async () => {
  const res = await simulateLoginRoute({ email: "coach@gxacademy.com", password: "CustomCoachSecret#2026" });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.user.password, undefined, "User object must not contain password field");
  assert.strictEqual(res.body.user.passwordHash, undefined, "User object must not contain passwordHash field");
});

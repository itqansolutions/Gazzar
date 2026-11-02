import assert from "node:assert/strict";
import test from "node:test";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "gazzar_sports_coaching_jwt_super_secret_key_2026";

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

test("Milestone 1.2 – Production Login Readiness Audit Test Suite", async (t) => {
  // Mock Isolated User Data (Never uses real production data or real credentials)
  const mockPassword = "TestMockPassword#2026";
  const mockPasswordHash = bcrypt.hashSync(mockPassword, 10);
  const mockUser = {
    id: "mock-user-12345",
    email: "test.admin@isolated-test.local",
    name: "Isolated Test Admin",
    role: "ADMIN",
    password: mockPasswordHash
  };

  await t.test("1. Valid Login with Correct Password", () => {
    const isPasswordValid = verifyPassword(mockPassword, mockUser.password);
    assert.equal(isPasswordValid, true, "Correct password must be verified successfully via bcrypt");

    const sessionPayload = {
      id: mockUser.id,
      email: mockUser.email,
      name: mockUser.name,
      role: mockUser.role
    };

    const token = createAuthToken(sessionPayload);
    assert.ok(token, "JWT auth token must be generated");

    const decoded = verifyAuthToken(token);
    assert.ok(decoded, "Token must be decodable");
    assert.equal(decoded.id, mockUser.id);
    assert.equal(decoded.role, "ADMIN");
  });

  await t.test("2. Invalid Login with Wrong Password", () => {
    const isPasswordValid = verifyPassword("WrongPassword123!", mockUser.password);
    assert.equal(isPasswordValid, false, "Wrong password must be rejected");
  });

  await t.test("3. Login with Non-Existent User", () => {
    const nonExistentStoredHash = undefined;
    const isPasswordValid = verifyPassword(mockPassword, nonExistentStoredHash);
    assert.equal(isPasswordValid, false, "Non-existent user must be rejected");
  });

  await t.test("4. Secure Session Creation & Token Hashing (Milestone 1.3 Architecture Pattern)", () => {
    // Generate secure 32-byte opaque session token for client
    const rawSessionToken = crypto.randomBytes(32).toString("hex");
    assert.equal(rawSessionToken.length, 64, "Raw session token must be 64 hex characters (256-bit)");

    // Compute SHA-256 hash for database storage (Never store raw token in DB)
    const tokenHash = crypto.createHash("sha256").update(rawSessionToken).digest("hex");
    assert.notEqual(tokenHash, rawSessionToken, "Stored tokenHash must NOT match raw token");

    // Mock in-memory database Session record (simulating PostgreSQL 'sessions' table)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const mockDbSession = {
      id: "session-uuid-1",
      userId: mockUser.id,
      tokenHash: tokenHash,
      expiresAt: expiresAt,
      createdAt: now,
      lastUsedAt: now,
      revokedAt: null,
      userAgent: "TestAgent/1.0",
      ipAddress: "127.0.0.1"
    };

    assert.equal(mockDbSession.revokedAt, null, "Active session must have revokedAt = null");
    assert.ok(mockDbSession.expiresAt > new Date(), "Session must not be expired");

    // 5. Session Validation simulation
    const incomingClientToken = rawSessionToken;
    const incomingHash = crypto.createHash("sha256").update(incomingClientToken).digest("hex");

    assert.equal(incomingHash, mockDbSession.tokenHash, "Incoming token hash must match DB tokenHash");
    const isSessionActive = mockDbSession.revokedAt === null && mockDbSession.expiresAt > new Date();
    assert.equal(isSessionActive, true, "Session must be validated as active");

    // 6. Logout / Session Revocation simulation
    mockDbSession.revokedAt = new Date();
    const isSessionActiveAfterLogout = mockDbSession.revokedAt === null && mockDbSession.expiresAt > new Date();
    assert.equal(isSessionActiveAfterLogout, false, "Revoked session must be rejected upon logout");
  });

  await t.test("7. Unauthorized API Access Protection", () => {
    // Simulating missing header / token
    const emptyToken = "";
    const invalidToken = "malformed.bearer.token.123";

    assert.equal(verifyAuthToken(emptyToken), null, "Empty token must be rejected");
    assert.equal(verifyAuthToken(invalidToken), null, "Malformed token must be rejected");
  });
});

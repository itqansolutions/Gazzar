import test from "node:test";
import assert from "node:assert/strict";
import { AdminProvisioningService } from "../src/lib/auth/admin-provisioning.ts";
import { verifyPassword } from "../src/lib/auth/password.ts";

/**
 * In-Memory Mock Repository for Admin Provisioning Tests.
 * Simulates PostgreSQL transactional concurrency and advisory locking.
 */
class InMemoryAdminProvisioningRepository {
  constructor() {
    this.users = new Map();
    this.isLocked = false;
  }

  seedUser(user) {
    this.users.set(user.id, {
      ...user,
      createdAt: user.createdAt || new Date()
    });
  }

  async hasExistingAdmin() {
    for (const user of this.users.values()) {
      if (user.role === "ADMIN") {
        return true;
      }
    }
    return false;
  }

  async findUserByEmail(email) {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return { id: user.id };
      }
    }
    return null;
  }

  async createFirstAdminInTransaction(data) {
    // Simulate transaction-level advisory lock serializing concurrent callers
    while (this.isLocked) {
      await new Promise((r) => setTimeout(r, 5));
    }
    this.isLocked = true;

    try {
      // Check for any existing admin inside the atomic transaction boundary
      const hasAdmin = await this.hasExistingAdmin();
      if (hasAdmin) {
        throw new Error("ADMIN_ALREADY_EXISTS");
      }

      // Check email collision
      const hasEmail = await this.findUserByEmail(data.email);
      if (hasEmail) {
        throw new Error("EMAIL_ALREADY_IN_USE");
      }

      const id = "admin-uuid-" + Math.random().toString(36).substring(2, 9);
      const record = {
        id,
        email: data.email,
        name: data.name,
        passwordHash: data.passwordHash,
        role: "ADMIN",
        phone: data.phone || null,
        createdAt: new Date()
      };

      this.users.set(id, record);

      return {
        id: record.id,
        email: record.email,
        name: record.name,
        role: "ADMIN",
        phone: record.phone,
        createdAt: record.createdAt
      };
    } finally {
      this.isLocked = false;
    }
  }
}

test("Milestone 1.3.3 – First Admin Provisioning Verification Suite", async (t) => {
  const validAdminInput = {
    email: "admin@gxacademy.com",
    name: "Captain Abdullah",
    password: "AdminSuperSecretPassword2026!#",
    phone: "+201012345678"
  };

  // 1. Successful Provisioning Logic Using Mocks
  await t.test("1. Successful Provisioning: Creates first admin with role=ADMIN and sanitized output", async () => {
    const repo = new InMemoryAdminProvisioningRepository();
    const service = new AdminProvisioningService(repo);

    const result = await service.provisionFirstAdmin(validAdminInput);

    assert.equal(result.success, true);
    assert.equal(result.user.email, "admin@gxacademy.com");
    assert.equal(result.user.name, "Captain Abdullah");
    assert.equal(result.user.role, "ADMIN");
    assert.equal(result.user.phone, "+201012345678");
    assert.ok(result.user.id);
    assert.ok(result.user.createdAt instanceof Date);

    // Repository now contains exactly 1 user with role=ADMIN
    assert.equal(repo.users.size, 1);
    const storedUser = Array.from(repo.users.values())[0];
    assert.equal(storedUser.role, "ADMIN");
    assert.equal(storedUser.email, "admin@gxacademy.com");
  });

  // 2. Refusal When An ADMIN Already Exists
  await t.test("2. Refusal When Admin Exists: Aborts immediately and creates zero additional admins", async () => {
    const repo = new InMemoryAdminProvisioningRepository();
    repo.seedUser({
      id: "existing-admin-id",
      email: "existing.admin@gxacademy.com",
      name: "Existing Admin",
      passwordHash: "$2a$10$dummyHashExistingAdmin",
      role: "ADMIN",
      phone: null
    });

    const service = new AdminProvisioningService(repo);

    const result = await service.provisionFirstAdmin({
      email: "second.admin@gxacademy.com",
      name: "Second Admin",
      password: "StrongPassword2026!#",
      phone: null
    });

    assert.equal(result.success, false);
    assert.equal(result.reason, "ADMIN_ALREADY_EXISTS");
    assert.ok(result.message.includes("already exists"));

    // User count remains strictly 1
    assert.equal(repo.users.size, 1);
    assert.equal(Array.from(repo.users.values())[0].id, "existing-admin-id");
  });

  // 3. Password Hashing and No Plaintext Password Persistence
  await t.test("3. Password Hashing & Sanitization: Uses bcrypt cost-10, plain password never stored or returned", async () => {
    const repo = new InMemoryAdminProvisioningRepository();
    const service = new AdminProvisioningService(repo);

    const result = await service.provisionFirstAdmin(validAdminInput);
    assert.equal(result.success, true);

    // Check stored user in DB
    const storedUser = Array.from(repo.users.values())[0];
    assert.ok(storedUser.passwordHash.startsWith("$2a$10$"), "Must use bcrypt with cost factor 10");
    assert.equal(storedUser.password, undefined, "Plaintext password must never be on user record");
    assert.notEqual(storedUser.passwordHash, validAdminInput.password);

    // Verify bcrypt hash matches plain password
    const passwordMatches = verifyPassword(validAdminInput.password, storedUser.passwordHash);
    assert.equal(passwordMatches, true);

    const wrongPasswordMatches = verifyPassword("WrongPassword123!", storedUser.passwordHash);
    assert.equal(wrongPasswordMatches, false);

    // Check returned sanitized user object
    assert.equal(result.user.password, undefined);
    assert.equal(result.user.passwordHash, undefined);
  });

  // 4. Concurrent Provisioning Protection
  await t.test("4. Concurrent Provisioning: Serialized execution ensures exactly one admin is ever created", async () => {
    const repo = new InMemoryAdminProvisioningRepository();
    const service = new AdminProvisioningService(repo);

    // Launch 10 simultaneous provisioning attempts
    const attempts = Array.from({ length: 10 }, (_, i) =>
      service.provisionFirstAdmin({
        email: `candidate-${i}@gxacademy.com`,
        name: `Candidate Admin ${i}`,
        password: `AdminPassword${i}2026!#`,
        phone: null
      })
    );

    const results = await Promise.all(attempts);

    const successes = results.filter((r) => r.success);
    const failures = results.filter((r) => !r.success);

    assert.equal(successes.length, 1, "Exactly one concurrent attempt must succeed");
    assert.equal(failures.length, 9, "All 9 other attempts must fail");

    for (const fail of failures) {
      assert.equal(fail.reason, "ADMIN_ALREADY_EXISTS");
    }

    // Database has strictly 1 admin
    assert.equal(repo.users.size, 1);
    assert.equal(Array.from(repo.users.values())[0].role, "ADMIN");
  });

  // 5. Invalid or Missing Input
  await t.test("5. Input Validation: Rejects malformed payload, invalid email, weak passwords, bad names", async () => {
    const repo = new InMemoryAdminProvisioningRepository();
    const service = new AdminProvisioningService(repo);

    // A. Null or array payload
    const resNull = await service.provisionFirstAdmin(null);
    assert.equal(resNull.success, false);
    assert.equal(resNull.reason, "INVALID_INPUT");

    const resArray = await service.provisionFirstAdmin([]);
    assert.equal(resArray.success, false);
    assert.equal(resArray.reason, "INVALID_INPUT");

    // B. Invalid email
    const resBadEmail = await service.provisionFirstAdmin({
      ...validAdminInput,
      email: "not-an-email"
    });
    assert.equal(resBadEmail.success, false);
    assert.equal(resBadEmail.reason, "INVALID_INPUT");

    // C. Name too short
    const resShortName = await service.provisionFirstAdmin({
      ...validAdminInput,
      name: "A"
    });
    assert.equal(resShortName.success, false);
    assert.equal(resShortName.reason, "INVALID_INPUT");

    // D. Password too short (<12 chars)
    const resShortPass = await service.provisionFirstAdmin({
      ...validAdminInput,
      password: "Short1!"
    });
    assert.equal(resShortPass.success, false);
    assert.equal(resShortPass.reason, "INVALID_INPUT");

    // E. Password missing special character
    const resNoSpecial = await service.provisionFirstAdmin({
      ...validAdminInput,
      password: "NoSpecialCharacter12345"
    });
    assert.equal(resNoSpecial.success, false);
    assert.equal(resNoSpecial.reason, "INVALID_INPUT");

    // F. Password missing uppercase
    const resNoUpper = await service.provisionFirstAdmin({
      ...validAdminInput,
      password: "nouppercasecharacter12345!"
    });
    assert.equal(resNoUpper.success, false);
    assert.equal(resNoUpper.reason, "INVALID_INPUT");

    // G. Password missing number
    const resNoNumber = await service.provisionFirstAdmin({
      ...validAdminInput,
      password: "NoNumbersInPasswordHere!"
    });
    assert.equal(resNoNumber.success, false);
    assert.equal(resNoNumber.reason, "INVALID_INPUT");

    // Zero users created during failed validations
    assert.equal(repo.users.size, 0);
  });

  // 6. No Credential Leakage in Logs or Responses
  await t.test("6. Credential Leakage Prevention: Serialized output and error responses never contain secrets", async () => {
    const repo = new InMemoryAdminProvisioningRepository();
    const service = new AdminProvisioningService(repo);

    const secretPassword = "SuperClassifiedSecret2026!#";
    const result = await service.provisionFirstAdmin({
      ...validAdminInput,
      password: secretPassword
    });

    assert.equal(result.success, true);

    const serialized = JSON.stringify(result);
    assert.equal(serialized.includes(secretPassword), false, "Plain password must never appear in response");
    assert.equal(serialized.includes("passwordHash"), false, "Password hash key must never appear in response");
    assert.equal(serialized.includes("$2a$"), false, "Bcrypt prefix must never appear in response");
  });

  // 7. Email Already In Use Protection
  await t.test("7. Email Collision Protection: Cannot provision admin with email used by another account", async () => {
    const repo = new InMemoryAdminProvisioningRepository();
    repo.seedUser({
      id: "client-user-1",
      email: "client@gxacademy.com",
      name: "Existing Client",
      passwordHash: "$2a$10$dummyHashClient",
      role: "CLIENT",
      phone: null
    });

    const service = new AdminProvisioningService(repo);

    const result = await service.provisionFirstAdmin({
      email: "client@gxacademy.com",
      name: "Attempted Admin",
      password: "ValidPassword2026!#",
      phone: null
    });

    assert.equal(result.success, false);
    assert.equal(result.reason, "EMAIL_ALREADY_IN_USE");
    assert.equal(repo.users.size, 1);
  });
});

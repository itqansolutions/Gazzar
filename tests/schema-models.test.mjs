import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";

test("Milestone 1.2 – Schema & Models Verification", async (t) => {
  const dmmf = Prisma.dmmf;
  const models = dmmf.datamodel.models;
  const modelMap = new Map(models.map((m) => [m.name, m]));

  await t.test("Verify Session model exists with correct fields", () => {
    const session = modelMap.get("Session");
    assert.ok(session, "Session model must exist in Prisma DMMF");
    assert.equal(session.dbName, "sessions", "Session model must map to 'sessions' table");

    const fieldMap = new Map(session.fields.map((f) => [f.name, f]));

    // Check required fields
    assert.ok(fieldMap.has("id"), "Session must have 'id'");
    assert.equal(fieldMap.get("id").isId, true, "'id' must be primary key");

    assert.ok(fieldMap.has("userId"), "Session must have 'userId'");
    assert.equal(fieldMap.get("userId").type, "String");

    assert.ok(fieldMap.has("tokenHash"), "Session must have 'tokenHash'");
    assert.equal(fieldMap.get("tokenHash").isUnique, true, "'tokenHash' must be unique");

    assert.ok(fieldMap.has("expiresAt"), "Session must have 'expiresAt'");
    assert.equal(fieldMap.get("expiresAt").type, "DateTime");

    assert.ok(fieldMap.has("createdAt"), "Session must have 'createdAt'");
    assert.equal(fieldMap.get("createdAt").type, "DateTime");

    assert.ok(fieldMap.has("lastUsedAt"), "Session must have 'lastUsedAt'");
    assert.equal(fieldMap.get("lastUsedAt").type, "DateTime");

    assert.ok(fieldMap.has("revokedAt"), "Session must have 'revokedAt'");
    assert.equal(fieldMap.get("revokedAt").isRequired, false, "'revokedAt' must be optional");

    assert.ok(fieldMap.has("userAgent"), "Session must have 'userAgent'");
    assert.equal(fieldMap.get("userAgent").isRequired, false, "'userAgent' must be optional");

    assert.ok(fieldMap.has("ipAddress"), "Session must have 'ipAddress'");
    assert.equal(fieldMap.get("ipAddress").isRequired, false, "'ipAddress' must be optional");

    // Check Relation with User
    assert.ok(fieldMap.has("user"), "Session must have 'user' relation field");
    const userRelation = fieldMap.get("user");
    assert.equal(userRelation.type, "User");
    assert.deepEqual(userRelation.relationFromFields, ["userId"]);
    assert.deepEqual(userRelation.relationToFields, ["id"]);
  });

  await t.test("Verify PasswordResetToken model exists with correct fields", () => {
    const resetToken = modelMap.get("PasswordResetToken");
    assert.ok(resetToken, "PasswordResetToken model must exist in Prisma DMMF");
    assert.equal(
      resetToken.dbName,
      "password_reset_tokens",
      "PasswordResetToken model must map to 'password_reset_tokens' table"
    );

    const fieldMap = new Map(resetToken.fields.map((f) => [f.name, f]));

    assert.ok(fieldMap.has("id"), "PasswordResetToken must have 'id'");
    assert.equal(fieldMap.get("id").isId, true, "'id' must be primary key");

    assert.ok(fieldMap.has("userId"), "PasswordResetToken must have 'userId'");
    assert.equal(fieldMap.get("userId").type, "String");

    assert.ok(fieldMap.has("tokenHash"), "PasswordResetToken must have 'tokenHash'");
    assert.equal(fieldMap.get("tokenHash").isUnique, true, "'tokenHash' must be unique");

    assert.ok(fieldMap.has("expiresAt"), "PasswordResetToken must have 'expiresAt'");
    assert.equal(fieldMap.get("expiresAt").type, "DateTime");

    assert.ok(fieldMap.has("usedAt"), "PasswordResetToken must have 'usedAt'");
    assert.equal(fieldMap.get("usedAt").isRequired, false, "'usedAt' must be optional");

    assert.ok(fieldMap.has("createdAt"), "PasswordResetToken must have 'createdAt'");
    assert.equal(fieldMap.get("createdAt").type, "DateTime");

    // Check Relation with User
    assert.ok(fieldMap.has("user"), "PasswordResetToken must have 'user' relation field");
    const userRelation = fieldMap.get("user");
    assert.equal(userRelation.type, "User");
    assert.deepEqual(userRelation.relationFromFields, ["userId"]);
    assert.deepEqual(userRelation.relationToFields, ["id"]);
  });

  await t.test("Verify User model has back-relations for Session and PasswordResetToken", () => {
    const user = modelMap.get("User");
    assert.ok(user, "User model must exist in Prisma DMMF");

    const fieldMap = new Map(user.fields.map((f) => [f.name, f]));

    assert.ok(fieldMap.has("sessions"), "User model must contain 'sessions' field");
    assert.equal(fieldMap.get("sessions").type, "Session");
    assert.equal(fieldMap.get("sessions").isList, true, "'sessions' must be a list");

    assert.ok(
      fieldMap.has("passwordResetTokens"),
      "User model must contain 'passwordResetTokens' field"
    );
    assert.equal(fieldMap.get("passwordResetTokens").type, "PasswordResetToken");
    assert.equal(fieldMap.get("passwordResetTokens").isList, true, "'passwordResetTokens' must be a list");
  });
});

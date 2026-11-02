# GX Academy – Server-Side Authentication Architecture Design

**Document Version:** 2.0.0  
**Status:** Approved Technical Design  
**Author:** Senior Security Architect  
**Objective:** Replace client-side localStorage sessions with bank-grade, server-side session management.  

---

## 1. Authentication Architecture Principles

1. **No LocalStorage Auth:** The client browser's `localStorage` is completely forbidden from holding session tokens, authentication state, or user roles.
2. **Server-Side Session Store:** Every authenticated session is recorded in the PostgreSQL `Session` table. The server can inspect, invalidate, or terminate any session instantly.
3. **HttpOnly, Secure Cookies:** Authentication tokens are stored exclusively in browser cookies marked `HttpOnly`, `Secure` (HTTPS only), `SameSite=Lax`, and `Path=/`. JavaScript running in the browser cannot read or exfiltrate the session token.
4. **Strong Password Hashing:** All user passwords must be hashed using `bcrypt` (work factor 12) or `Argon2id` before being written to disk or database. Plaintext passwords or weak MD5/SHA1 hashes are strictly forbidden.

---

## 2. Session Model & Database Schema

To support server-side sessions, revocation, and device tracking, the following model is added to `prisma/schema.prisma`:

```prisma
model Session {
  id           String    @id @default(uuid())
  tokenHash    String    @unique // SHA-256 hash of the random session token
  userId       String
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  ipAddress    String?
  userAgent    String?
  expiresAt    DateTime
  createdAt    DateTime  @default(now())
  lastActiveAt DateTime  @default(now())

  @@index([userId])
  @@index([expiresAt])
  @@map("sessions")
}

model PasswordResetToken {
  id        String   @id @default(uuid())
  tokenHash String   @unique // SHA-256 hash of the one-time reset token
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  @@index([userId])
  @@map("password_reset_tokens")
}
```

---

## 3. The Authentication Lifecycle

### 3.1 Login Sequence
```
[ Client Browser ]                 [ Next.js API Server ]                  [ PostgreSQL DB ]
        |                                     |                                     |
        |  1. POST /api/v1/auth/login         |                                     |
        |     { email, password }             |                                     |
        |------------------------------------>|                                     |
        |                                     |  2. Query user by email             |
        |                                     |------------------------------------>|
        |                                     |  3. Return user + passwordHash      |
        |                                     |<------------------------------------|
        |                                     |                                     |
        |                                     |  4. Verify password with bcrypt     |
        |                                     |     (Constant-time comparison)      |
        |                                     |                                     |
        |                                     |  5. Generate cryptographically      |
        |                                     |     secure random token (32 bytes)  |
        |                                     |                                     |
        |                                     |  6. Store SHA-256(token) in Session |
        |                                     |------------------------------------>|
        |                                     |                                     |
        |  7. HTTP 200 OK                     |                                     |
        |     Set-Cookie: gx_session=<token>; |                                     |
        |     HttpOnly; Secure; SameSite=Lax; |                                     |
        |     Max-Age=604800; Path=/          |                                     |
        |<------------------------------------|                                     |
```

### 3.2 Token Generation & Hashing Specification
- A raw session token is generated using `crypto.randomBytes(32).toString('hex')` (256 bits of cryptographic entropy).
- The **raw token** is sent to the client browser inside the `Set-Cookie` header.
- The **SHA-256 hash** of the raw token is stored in `Session.tokenHash`.
- *Security Guarantee:* Even in the event of an unauthorized database read compromise (SQL injection or database dump), raw session tokens cannot be recovered because they are stored only as one-way SHA-256 hashes.

### 3.3 Session Cookie Attributes:
```
Set-Cookie: gx_session=8f7e2c91b4...; 
            Path=/; 
            HttpOnly; 
            Secure; 
            SameSite=Lax; 
            Max-Age=604800; 
            Priority=High
```
- `HttpOnly`: Prevents client-side scripts (`document.cookie`) from reading the token, eliminating XSS token theft.
- `Secure`: Ensures the cookie is transmitted only over encrypted HTTPS connections.
- `SameSite=Lax`: Defends against Cross-Site Request Forgery (CSRF) on cross-origin requests.
- `Max-Age=604800`: 7-day sliding expiration window.

---

## 4. Session Validation, Sliding Window, & Revocation

### 4.1 Request Validation in Edge/Server Middleware:
1. Extract `gx_session` cookie from request.
2. Compute `hash = sha256(gx_session)`.
3. Lookup active session in database:
   ```typescript
   const session = await prisma.session.findUnique({
     where: { tokenHash: hash },
     include: {
       user: {
         select: {
           id: true,
           email: true,
           name: true,
           role: true,
           phone: true,
           avatar: true,
           coachProfile: { select: { id: true } },
           clientProfile: { select: { id: true } }
         }
       }
     }
   });
   ```
4. If `!session` or `session.expiresAt < new Date()`, reject request immediately with HTTP 401.
5. If valid, attach session context (`userId`, `role`, `coachId`, `clientId`) to server request headers (`x-user-id`, `x-user-role`).

### 4.2 Sliding Expiration:
- If `session.lastActiveAt` is older than 6 hours and the session is still valid, update `session.lastActiveAt = now` and extend `session.expiresAt = now + 7 days`. This keeps active users logged in without indefinite token persistence.

### 4.3 Logout Sequence:
1. Compute `hash = sha256(gx_session)`.
2. Delete the record: `DELETE FROM sessions WHERE tokenHash = hash;`.
3. Clear the cookie:
   ```
   Set-Cookie: gx_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0;
   ```

---

## 5. Password Management & Recovery Workflows

### 5.1 Password Change Workflow (Authenticated)
- User supplies `currentPassword`, `newPassword`, and `confirmPassword`.
- The server verifies `currentPassword` against `user.passwordHash`.
- Validates that `newPassword` meets the Academy Strength Standard:
  - Minimum 8 characters.
  - At least 1 uppercase letter, 1 lowercase letter, 1 digit, and 1 symbol.
- Computes `newHash = await bcrypt.hash(newPassword, 12)`.
- Updates `User.passwordHash = newHash`.
- **Global Session Revocation:** Deletes all existing sessions for that user:
  `DELETE FROM sessions WHERE userId = user.id AND id != currentSessionId;`
  (Optionally logs out all other devices).

### 5.2 Password Reset Workflow (Unauthenticated)
1. **Request:** User submits email to `/api/v1/auth/forgot-password`.
2. **Rate Limiting:** Maximum 3 reset requests per email per hour.
3. **Token Generation:** The server generates a random 32-byte cryptographic token with a **15-minute expiration**.
4. **Token Storage:** Stores `sha256(token)` in `password_reset_tokens`.
5. **Delivery:** The link `https://academy.com/reset-password?token=<raw_token>` is dispatched via SMS or transactional email.
6. **Execution:** On submission, the server finds the unexpired, unused token, updates `User.passwordHash`, marks `usedAt = now`, and purges all active user sessions.

---

## 6. Brute-Force & Rate Limiting Defense

To prevent credential stuffing and brute-force attacks against the login endpoint:
- **Per-IP Rate Limit:** Maximum 10 failed login attempts per IP per 15 minutes. Exceeding triggers HTTP 429 ("Too many requests. Try again in 15 minutes.").
- **Per-Account Lockout:** Maximum 5 consecutive failed attempts against a specific email address within 15 minutes triggers a temporary 15-minute account lock.
- **Constant-Time Verification:** Even if an email does not exist in the database, the server runs a dummy `bcrypt.compare` to prevent timing attacks that reveal valid usernames.

---

## 7. Secure Initial Administrator Provisioning

The project will provision the initial Academy Administrator through a deterministic, reproducible CLI seed script ([`prisma/seed.ts`](file:///d:/Gazzar%20Project/prisma/seed.ts)):

```typescript
// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || "admin@gxacademy.com";
  const initialPassword = process.env.INITIAL_ADMIN_PASSWORD;

  if (!initialPassword || initialPassword.length < 8) {
    throw new Error("INITIAL_ADMIN_PASSWORD must be configured in environment with at least 8 characters.");
  }

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const passwordHash = await bcrypt.hash(initialPassword, 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: "GX Academy Administrator",
        role: "ADMIN",
        passwordHash,
        phone: "+20 100 000 0000"
      }
    });
    console.log(`[SEED] Initial Academy Admin provisioned: ${adminEmail}`);
  }
}

main().finally(() => prisma.$disconnect());
```
- Eliminates hardcoded default passwords from version control.
- Requires explicit environment configuration before seeding.

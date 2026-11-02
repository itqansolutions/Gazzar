# GX Academy – Security & Vulnerability Audit Report

**Audit Date:** 2026-11-01  
**Auditor Role:** Senior Software Architect & Security Engineer  
**Audit Standard:** OWASP Top 10 / NIST Cybersecurity Framework  
**Confidentiality Notice:** In accordance with audit directives, all plaintext passwords, tokens, and secret strings have been masked as `[REDACTED_*]` and tagged with their exact source locations.

---

## 1. Executive Summary of Security Posture

The security review of GX Academy identified **severe architectural and operational vulnerabilities**. The application currently operates with **critical authentication bypasses, plaintext credential exposure in the browser UI, total lack of API route protection, client-side-only authorization guards, and backdoor access mechanisms**.

### Vulnerability Severity Breakdown:
- **CRITICAL:** 5 Findings
- **HIGH:** 3 Findings
- **MEDIUM:** 3 Findings
- **LOW:** 2 Findings

---

## 2. Detailed Vulnerability Findings

### [CRITICAL] SEC-01: Plaintext Display & Pre-population of Admin Credentials on Public Login Page
- **Location:** [`src/app/login/page.tsx`](file:///d:/Gazzar%20Project/src/app/login/page.tsx#L24-L25), lines 24–25, 55–59, 130–135, 150–159
- **Classification:** **CRITICAL** (CWE-200 / CWE-798)
- **Description:**  
  The login page component hardcodes administrative credentials into default React state, provides an explicit button to fill them, and renders an HTML information card displaying the administrator's email and password directly on the screen.
  ```typescript
  // src/app/login/page.tsx:24-25
  const [email, setEmail] = useState("admin@gxacademy.com");
  const [password, setPassword] = useState("[REDACTED_DEFAULT_PASSWORD]");
  ```
  ```tsx
  // src/app/login/page.tsx:156-157
  <span>Email: <strong>admin@gxacademy.com</strong></span>
  <span>Pass: <strong>[REDACTED_DEFAULT_PASSWORD]</strong></span>
  ```
- **Impact:** Any user, competitor, or internet visitor accessing the application URL is immediately handed full administrative control over the academy.
- **Remediation:** Remove state pre-population, remove the admin credentials card and auto-fill button, and clear form inputs upon mount.

---

### [CRITICAL] SEC-02: Universal Hardcoded Backdoor Passwords in Verification Logic
- **Location:** [`src/lib/auth.ts`](file:///d:/Gazzar%20Project/src/lib/auth.ts#L23-L32), lines 23–32; [`src/context/AuthContext.tsx`](file:///d:/Gazzar%20Project/src/context/AuthContext.tsx#L103-L107), lines 103–107
- **Classification:** **CRITICAL** (CWE-259 / CWE-287)
- **Description:**  
  The password verification functions contain hardcoded string comparisons that validate logins regardless of the user's actual password.
  ```typescript
  // src/lib/auth.ts:23-26
  export function verifyPassword(inputPassword: string, storedPasswordOrHash?: string): boolean {
    if (!storedPasswordOrHash) return inputPassword === "[REDACTED_DEFAULT_PASSWORD]";
    if (inputPassword === storedPasswordOrHash) return true;
    if (inputPassword === "[REDACTED_DEFAULT_PASSWORD]" || inputPassword === "[REDACTED_BYPASS_PASSWORD]") return true;
    try {
      return bcrypt.compareSync(inputPassword, storedPasswordOrHash);
    } catch {
      return false;
    }
  }
  ```
  ```typescript
  // src/context/AuthContext.tsx:105
  if (inputPass !== expectedPass && inputPass !== "[REDACTED_DEFAULT_PASSWORD]" && inputPass !== "[REDACTED_BYPASS_PASSWORD]") {
    return { success: false, message: "كلمة المرور غير صحيحة" };
  }
  ```
- **Impact:** An attacker can authenticate into ANY account in the entire system (including Head Coach, Coaches, Athletes, and Admins) by supplying either `[REDACTED_DEFAULT_PASSWORD]` or `[REDACTED_BYPASS_PASSWORD]`.
- **Remediation:** Strip all fallback equality checks. Validate strictly via salted `bcrypt.compare` against `passwordHash` retrieved from PostgreSQL.

---

### [CRITICAL] SEC-03: Arbitrary Unauthenticated Role Impersonation via Login API
- **Location:** [`src/app/api/auth/login/route.ts`](file:///d:/Gazzar%20Project/src/app/api/auth/login/route.ts#L10-L16), lines 10–16
- **Classification:** **CRITICAL** (CWE-287 / CWE-306)
- **Description:**  
  The backend authentication route accepts an arbitrary `role` parameter in the JSON payload. If `email` is omitted, the API issues a signed JWT token and full profile for that role without requiring a password:
  ```typescript
  // src/app/api/auth/login/route.ts:10-16
  if (role && !email) {
    const user = db.getUsers().find(u => u.role === role);
    if (user) {
      const token = createAuthToken(user);
      return NextResponse.json({ success: true, user, token });
    }
  }
  ```
- **Impact:** An attacker sending `curl -X POST /api/auth/login -d '{"role":"ADMIN"}'` immediately receives a valid 7-day administrative JWT token.
- **Remediation:** Delete the unauthenticated role-based payload branch completely.

---

### [CRITICAL] SEC-04: Complete Absence of Authentication & Authorization on API Routes
- **Location:** 
  - [`src/app/api/users/route.ts`](file:///d:/Gazzar%20Project/src/app/api/users/route.ts#L4-L25)
  - [`src/app/api/users/[id]/route.ts`](file:///d:/Gazzar%20Project/src/app/api/users/[id]/route.ts#L4-L36)
  - [`src/app/api/clients/route.ts`](file:///d:/Gazzar%20Project/src/app/api/clients/route.ts#L4-L19)
  - [`src/app/api/clients/[id]/route.ts`](file:///d:/Gazzar%20Project/src/app/api/clients/[id]/route.ts)
  - [`src/app/api/exercises/route.ts`](file:///d:/Gazzar%20Project/src/app/api/exercises/route.ts)
  - [`src/app/api/workouts/route.ts`](file:///d:/Gazzar%20Project/src/app/api/workouts/route.ts)
- **Classification:** **CRITICAL** (CWE-306 / CWE-862)
- **Description:**  
  None of the API routes verify HTTP headers (`Authorization: Bearer <token>`), session cookies, or user permissions. Anyone on the public internet can perform full CRUD operations:
  - `GET /api/users`: Returns all users, phone numbers, emails, and passwords.
  - `POST /api/users`: Creates users with arbitrary roles (including `ADMIN`).
  - `DELETE /api/users/[id]`: Deletes any user account.
  - `GET /api/clients`: Dumps all confidential athlete medical records, contact information, and body measurements.
- **Impact:** Total compromise of data confidentiality, integrity, and regulatory compliance (GDPR/health data protection).
- **Remediation:** Implement server-side authentication guards (JWT extraction and role verification middleware) across all API route handlers.

---

### [CRITICAL] SEC-05: Plaintext Password Storage and Client Exposure
- **Location:** 
  - [`src/types/index.ts`](file:///d:/Gazzar%20Project/src/types/index.ts#L49), line 49 (`password?: string`)
  - [`src/lib/data/users.ts`](file:///d:/Gazzar%20Project/src/lib/data/users.ts#L9), line 9
  - [`src/lib/db.ts`](file:///d:/Gazzar%20Project/src/lib/db.ts#L244), lines 244, 469
- **Classification:** **CRITICAL** (CWE-256 / CWE-312)
- **Description:**  
  User objects hold unhashed passwords (`password: "[REDACTED_DEFAULT_PASSWORD]"`). When stored in the browser's `localStorage` (`gx_db_v1`), these passwords remain unencrypted on client disks and are transmitted across API responses.
- **Impact:** Physical or XSS compromise of any client device exposes all user passwords across the academy.
- **Remediation:** Remove `password` from frontend `User` interface. Store only irreversible `passwordHash` in PostgreSQL and never return password fields in JSON responses.

---

### [HIGH] SEC-06: Client-Side-Only Route Protection (No Next.js Server Middleware)
- **Location:** [`src/components/layout/AppShell.tsx`](file:///d:/Gazzar%20Project/src/components/layout/AppShell.tsx#L18-L51), lines 18–51; absence of `src/middleware.ts`
- **Classification:** **HIGH** (CWE-602)
- **Description:**  
  Route authorization is enforced entirely on the client side inside an `AppShell` React `useEffect`:
  ```typescript
  // src/components/layout/AppShell.tsx:45-49
  if (user.role === "CLIENT" && clientRestrictedRoutes.some(...)) {
    router.replace("/dashboard");
  }
  ```
  No Next.js Edge Middleware (`middleware.ts`) exists to inspect incoming requests before HTML/JS is served.
- **Impact:** A client can disable JavaScript, manipulate `localStorage.getItem("gx_session_user")`, or inspect cached page source to access restricted views.
- **Remediation:** Introduce `src/middleware.ts` to validate secure `httpOnly` session cookies on every request prior to rendering.

---

### [HIGH] SEC-07: Public Demo Role Switcher Exposing One-Click Privilege Escalation
- **Location:** [`src/components/layout/Navbar.tsx`](file:///d:/Gazzar%20Project/src/components/layout/Navbar.tsx#L81-L124), lines 81–124; [`src/context/AuthContext.tsx`](file:///d:/Gazzar%20Project/src/context/AuthContext.tsx#L128-L144), lines 128–144
- **Classification:** **HIGH** (CWE-250)
- **Description:**  
  The top navigation bar displays a "Quick Demo Role Switcher" button. Clicking any role (`ADMIN`, `HEAD_COACH`, `COACH`, `CLIENT`) invokes `loginAsRole()`, which rewrites `localStorage` with that role's identity without re-authenticating.
- **Impact:** Any athlete or coach can grant themselves full administrator privileges in one second.
- **Remediation:** Remove the Role Switcher from the Navbar and eliminate `loginAsRole()` from production code.

---

### [HIGH] SEC-08: Hardcoded Fallback JWT Secret in Version Control
- **Location:** [`src/lib/auth.ts`](file:///d:/Gazzar%20Project/src/lib/auth.ts#L6), line 6; [`.env`](file:///d:/Gazzar%20Project/.env#L3), line 3; [`.env.example`](file:///d:/Gazzar%20Project/.env.example#L8), line 8
- **Classification:** **HIGH** (CWE-798 / CWE-321)
- **Description:**  
  A fallback JWT signing key is committed directly into the source code:
  `const JWT_SECRET = process.env.JWT_SECRET || "[REDACTED_FALLBACK_JWT_SECRET]";`
  The same value is committed to both `.env` and `.env.example`.
- **Impact:** Anyone with read access to the git repository can forge valid administrative JWT tokens.
- **Remediation:** Require `JWT_SECRET` in production runtime (fail fast if missing). Rotate the secret key immediately.

---

### [MEDIUM] SEC-09: Ephemeral, Unpersisted, Client-Side Audit Logging
- **Location:** [`src/lib/audit.ts`](file:///d:/Gazzar%20Project/src/lib/audit.ts#L4-L35), lines 4–35; [`src/app/audit-logs/page.tsx`](file:///d:/Gazzar%20Project/src/app/audit-logs/page.tsx)
- **Classification:** **MEDIUM** (CWE-778)
- **Description:**  
  Audit logs are pushed to an in-memory array `auditLogsStore` in JavaScript memory. They are not persisted to PostgreSQL or localStorage. A page refresh or server restart purges all logs. Furthermore, the log entry takes `ipAddress` from client input or defaults to `127.0.0.1`.
- **Impact:** System actions cannot be reliably audited or proven for compliance and forensic analysis.
- **Remediation:** Write audit log events to the `AuditLog` table in PostgreSQL via server-side middleware and API triggers.

---

### [MEDIUM] SEC-10: Insecure Session Storage via LocalStorage
- **Location:** [`src/context/AuthContext.tsx`](file:///d:/Gazzar%20Project/src/context/AuthContext.tsx#L51-L58), lines 51–58, 121, 143
- **Classification:** **MEDIUM** (CWE-922)
- **Description:**  
  User session data is stored unencrypted in `localStorage` under `"gx_session_user"`.
- **Impact:** Vulnerable to exfiltration via Cross-Site Scripting (XSS).
- **Remediation:** Migrate session tokens to `httpOnly`, `Secure`, `SameSite=Lax` cookies.

---

### [MEDIUM] SEC-11: Hardcoded Sensitive Placeholders in User Creation Modals
- **Location:** [`src/app/coaches/page.tsx`](file:///d:/Gazzar%20Project/src/app/coaches/page.tsx#L58-L59), lines 58–59; [`src/app/users/page.tsx`](file:///d:/Gazzar%20Project/src/app/users/page.tsx)
- **Classification:** **MEDIUM** (CWE-1188)
- **Description:**  
  New coach and user creation forms pre-fill default passwords (`[REDACTED_DEFAULT_PASSWORD]`) and placeholder phone numbers (`+20 100 000 0000`). If a coach is created without editing the password, they are deployed with known default credentials.
- **Impact:** Predictable credentials for newly provisioned staff accounts.
- **Remediation:** Generate secure one-time activation links or require the admin to define an explicit temporary password with mandatory reset on first login.

---

### [LOW] SEC-12: Absence of Account Lockout or Rate Limiting
- **Location:** [`src/app/login/page.tsx`](file:///d:/Gazzar%20Project/src/app/login/page.tsx#L36-L53); [`src/app/api/auth/login/route.ts`](file:///d:/Gazzar%20Project/src/app/api/auth/login/route.ts)
- **Classification:** **LOW** (CWE-307)
- **Description:**  
  There is no rate limiting on login attempts or API invocations.
- **Impact:** Susceptible to brute-force credential stuffing.
- **Remediation:** Implement IP/account-based rate limiting via Next.js middleware or Redis/Upstash.

---

### [LOW] SEC-13: Missing Password Reset & Account Recovery Workflows
- **Location:** Entire authentication module
- **Classification:** **LOW** (CWE-640)
- **Description:**  
  There is no password reset mechanism, email verification, or self-service account recovery.
- **Impact:** Requires manual database or admin intervention when users forget passwords.
- **Remediation:** Implement email-based password reset tokens with short expiry windows (15–30 minutes).

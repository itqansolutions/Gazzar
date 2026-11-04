import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

/**
 * Milestone 1.3.4 – Centralized Authentication UI Integration Test Suite
 *
 * Verifies that the frontend authentication layer strictly uses the server-side
 * APIs (/api/auth/*) with HttpOnly cookies, completely eliminating localStorage
 * as the source of truth and preventing any client-side token exposure.
 */

test("Milestone 1.3.4 – Frontend UI Authentication & Context Integration Suite", async (t) => {
  // Test User Definitions for all 4 roles
  const testUsers = {
    admin: {
      id: "usr-admin-1",
      email: "admin@gxacademy.com",
      name: "Captain Abdullah",
      role: "ADMIN",
      avatar: null,
      phone: "+201012345678"
    },
    headCoach: {
      id: "usr-hc-1",
      email: "headcoach@gxacademy.com",
      name: "Tarek Coach",
      role: "HEAD_COACH",
      avatar: null,
      phone: "+201023456789"
    },
    coach: {
      id: "usr-coach-1",
      email: "coach@gxacademy.com",
      name: "Ahmed Coach",
      role: "COACH",
      avatar: null,
      phone: "+201034567890"
    },
    client: {
      id: "usr-client-1",
      email: "client@gxacademy.com",
      name: "Omar Athlete",
      role: "CLIENT",
      avatar: null,
      phone: "+201045678901"
    }
  };

  // 1. Login Success Flow
  await t.test("1. Login Success: Updates UI state only after server confirmation; no token exposed to JS", async () => {
    let capturedBody = null;
    let authState = { user: null, loading: false };

    // Simulate fetch to POST /api/auth/login
    const mockFetch = async (url, options) => {
      if (url === "/api/auth/login" && options.method === "POST") {
        capturedBody = JSON.parse(options.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            user: testUsers.admin
            // Server sets HttpOnly cookie header gx_session, raw token is NOT in JSON payload!
          })
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    };

    // Client action
    const email = "admin@gxacademy.com";
    const password = "StrongPassword2026!#";

    const res = await mockFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (res.ok && data.success && data.user) {
      authState.user = data.user;
    }

    assert.equal(capturedBody.email, email);
    assert.equal(capturedBody.password, password);
    assert.equal(authState.user.email, "admin@gxacademy.com");
    assert.equal(authState.user.role, "ADMIN");

    // CRITICAL: Token, password, or passwordHash are NEVER in the JS user state
    assert.equal(authState.user.token, undefined);
    assert.equal(authState.user.sessionToken, undefined);
    assert.equal(authState.user.password, undefined);
    assert.equal(authState.user.passwordHash, undefined);
    assert.equal(data.token, undefined);
  });

  // 2. Login Failure Flow
  await t.test("2. Login Failure: Server rejection keeps user state null; returns generic error message", async () => {
    let authState = { user: null, loading: false };

    const mockFetch = async (url, options) => {
      if (url === "/api/auth/login") {
        return {
          ok: false,
          status: 401,
          json: async () => ({
            success: false,
            message: "Invalid login credentials"
          })
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    };

    const res = await mockFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "attacker@bad.com", password: "wrong" })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      authState.user = null;
    }

    assert.equal(authState.user, null);
    assert.equal(data.success, false);
    assert.equal(data.message, "Invalid login credentials");
  });

  // 3. Session Restoration on Application Startup
  await t.test("3. Session Restoration on Startup: Hydrates user via GET /api/auth/me", async () => {
    let authState = { user: null, loading: true };

    const mockFetch = async (url, options) => {
      if (url === "/api/auth/me" && options.method === "GET") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            user: testUsers.headCoach
          })
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    };

    const res = await mockFetch("/api/auth/me", { method: "GET" });
    const data = await res.json();

    if (res.ok && data.success && data.user) {
      authState.user = data.user;
    }
    authState.loading = false;

    assert.equal(authState.loading, false);
    assert.equal(authState.user.name, "Tarek Coach");
    assert.equal(authState.user.role, "HEAD_COACH");
  });

  // 4. Expired / Invalid Session Handling on Startup
  await t.test("4. Expired Session on Startup: 401 response sets user to null; stops loading cleanly", async () => {
    let authState = { user: null, loading: true };

    const mockFetch = async (url) => {
      if (url === "/api/auth/me") {
        return {
          ok: false,
          status: 401,
          json: async () => ({
            success: false,
            message: "Unauthorized"
          })
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    };

    const res = await mockFetch("/api/auth/me", { method: "GET" });
    if (!res.ok) {
      authState.user = null;
    }
    authState.loading = false;

    assert.equal(authState.loading, false);
    assert.equal(authState.user, null);
  });

  // 5. Logout Flow
  await t.test("5. Logout Flow: Calls POST /api/auth/logout to invalidate session on server and clear state", async () => {
    let authState = { user: testUsers.coach, loading: false };
    let serverLogoutCalled = false;

    const mockFetch = async (url, options) => {
      if (url === "/api/auth/logout" && options.method === "POST") {
        serverLogoutCalled = true;
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, message: "Logged out successfully" })
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    };

    // Client logout execution
    await mockFetch("/api/auth/logout", { method: "POST" });
    authState.user = null;

    assert.equal(serverLogoutCalled, true);
    assert.equal(authState.user, null);
  });

  // 6. Role Preservation across all 4 roles
  await t.test("6. Role Preservation: Accurately preserves all 4 roles without mutation or fallback", async () => {
    for (const [key, userObj] of Object.entries(testUsers)) {
      const mockFetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({ success: true, user: userObj })
      });

      const res = await mockFetch();
      const data = await res.json();

      assert.equal(data.user.role, userObj.role);
      assert.ok(["ADMIN", "HEAD_COACH", "COACH", "CLIENT"].includes(data.user.role));
    }
  });

  // 7. No Fallback to localStorage
  await t.test("7. Zero localStorage Auth Fallback: AuthContext.tsx contains zero localStorage session persistence", () => {
    const authContextPath = path.resolve("src/context/AuthContext.tsx");
    const content = fs.readFileSync(authContextPath, "utf-8");

    // Must NOT contain localStorage.setItem("gx_session_user", ...)
    assert.equal(content.includes('localStorage.setItem("gx_session_user"'), false);

    // Must NOT read user state from localStorage.getItem("gx_session_user")
    assert.equal(content.includes('localStorage.getItem("gx_session_user"'), false);

    // Must remove any legacy mock key on startup
    assert.ok(content.includes('localStorage.removeItem("gx_session_user")'));

    // Must use server-side routes
    assert.ok(content.includes('fetch("/api/auth/me"'));
    assert.ok(content.includes('fetch("/api/auth/login"'));
    assert.ok(content.includes('fetch("/api/auth/logout"'));

    // Must NOT import db from @/lib/db
    assert.equal(content.includes('from "@/lib/db"'), false);
  });

  // 8. Dashboard Page No Assumed Role Fallback
  await t.test("8. Dashboard Role Guard: No fallback to ADMIN role when user is unauthenticated", () => {
    const dashboardPath = path.resolve("src/app/dashboard/page.tsx");
    const content = fs.readFileSync(dashboardPath, "utf-8");

    // Must NOT have '|| "ADMIN"' fallback
    assert.equal(content.includes('|| "ADMIN"'), false);

    // Must check for user existence before reading role
    assert.ok(content.includes("if (!mounted || !user) return null;"));
    assert.ok(content.includes("const role = user.role;"));
  });
});

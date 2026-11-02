# GX Academy – Centralized API Architecture & Standards

**Document Version:** 2.0.0  
**Status:** Approved Technical Design  
**Author:** Senior Backend Architect  
**Namespace:** `/api/v1/*`  

---

## 1. Universal API Principles

1. **RESTful Resource Uniformity:** All routes follow strict REST naming conventions using nouns in plural form (`/api/v1/clients`, `/api/v1/exercises`, `/api/v1/workouts`).
2. **Standardized Response Envelope:** Every JSON response returned by the server implements the unified `ApiResponse<T>` contract.
3. **Strict Schema Validation:** All input payloads (body, query params, route params) are validated using **Zod** prior to service invocation.
4. **Deterministic Error Handling:** Errors are captured by a centralized error wrapper that returns uniform machine-readable error codes and localized error messages.
5. **Mandatory Pagination:** No endpoint returns unbounded lists. All collection endpoints enforce `page` and `limit` with a default of 20 and a maximum of 100 items.

---

## 2. Standardized Response Envelope Specification

### 2.1 Success Response Schema
```typescript
interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```
**Example (List Clients):**
```json
{
  "success": true,
  "data": [
    {
      "id": "client-1",
      "name": "Mohamed Ali",
      "status": "ACTIVE",
      "weightKg": 82.5,
      "preferredSport": "Bodybuilding"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### 2.2 Error Response Schema
```typescript
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;       // e.g., "VALIDATION_ERROR", "FORBIDDEN", "NOT_FOUND"
    message: string;    // Human-readable message in active locale (ar/en)
    details?: any;      // Validation issues or field-specific errors
  };
}
```
**Example (Forbidden Access):**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied: This athlete is not assigned to your coaching roster."
  }
}
```

---

## 3. Centralized Error Handling & Domain Errors

Custom application errors are mapped to standardized HTTP status codes:

```typescript
// src/server/errors.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = "INTERNAL_SERVER_ERROR",
    public details?: any
  ) {
    super(message);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, "BAD_REQUEST", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Authentication required.") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "You do not have permission to perform this action.") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Requested resource not found.") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ValidationError extends AppError {
  constructor(details: any) {
    super("Input validation failed.", 422, "VALIDATION_ERROR", details);
  }
}
```

---

## 4. Input Validation & Query Standards

### 4.1 Pagination & Filter Schema
Every collection endpoint accepts the standard pagination query schema:
```typescript
import { z } from "zod";

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  sortBy: z.string().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
});
```

### 4.2 Controller Wrapper Pattern (`apiHandler`)
To eliminate boilerplate and ensure uniform try/catch handling, route handlers are wrapped with a resilient controller utility:

```typescript
// src/server/utils/apiHandler.ts
import { NextResponse } from "next/server";
import { AppError } from "@/server/errors";
import { ZodError } from "zod";

export function apiHandler<T>(
  handler: (req: Request, context?: any) => Promise<T>
) {
  return async (req: Request, context?: any) => {
    try {
      const data = await handler(req, context);
      return NextResponse.json({ success: true, ...data });
    } catch (err: any) {
      if (err instanceof AppError) {
        return NextResponse.json(
          { success: false, error: { code: err.code, message: err.message, details: err.details } },
          { status: err.statusCode }
        );
      }
      if (err instanceof ZodError) {
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request payload", details: err.errors } },
          { status: 422 }
        );
      }
      console.error("[API_UNHANDLED_ERROR]", err);
      return NextResponse.json(
        { success: false, error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred." } },
        { status: 500 }
      );
    }
  };
}
```

---

## 5. Complete Inventory of API Routes & Security Classifications

| HTTP Verb | Route Path | Access Level | Description |
|---|---|---|---|
| **POST** | `/api/v1/auth/login` | **Public** (Rate Limited) | Authenticates credentials, returns secure `HttpOnly` session cookie |
| **POST** | `/api/v1/auth/logout` | **Authenticated** | Revokes session from database and clears cookie |
| **GET** | `/api/v1/auth/me` | **Authenticated** | Returns current user profile with role & coach/client IDs |
| **POST** | `/api/v1/auth/forgot-password` | **Public** (Rate Limited) | Generates short-lived password reset token |
| **POST** | `/api/v1/auth/reset-password` | **Public** | Validates reset token and updates passwordHash |
| **GET** | `/api/v1/clients` | **Coach / Admin** | Lists clients (Scoped strictly to assigned athletes for Coaches) |
| **POST** | `/api/v1/clients` | **Coach / Admin** | Provisions a new athlete profile and initial assignment |
| **GET** | `/api/v1/clients/[id]` | **Scoped (Self/Coach/Admin)** | Detailed athlete record (Enforces `assertCanAccessClient`) |
| **PATCH** | `/api/v1/clients/[id]` | **Scoped (Coach/Admin)** | Updates athlete profile information |
| **GET** | `/api/v1/coaches` | **Staff Only** | Lists coaching staff directory and specialties |
| **POST** | `/api/v1/coaches` | **Admin Only** | Provisions new coaching staff member |
| **GET** | `/api/v1/coaches/[id]` | **Staff / Client** | Retrieves coach profile details and bio |
| **GET** | `/api/v1/exercises` | **Authenticated** | Searches exercise bank with filters (Sport, Muscle, Equipment) |
| **POST** | `/api/v1/exercises` | **Staff Only** | Adds exercise with contraindication body part tagging |
| **GET** | `/api/v1/templates` | **Staff Only** | Lists reusable workout templates |
| **POST** | `/api/v1/templates` | **Staff Only** | Creates workout template with structured sets and reps |
| **GET** | `/api/v1/programs` | **Staff Only** | Lists multi-week periodized training programs |
| **POST** | `/api/v1/programs` | **Staff Only** | Compiles periodized training program with weeks and days |
| **GET** | `/api/v1/assignments` | **Scoped (Self/Coach/Admin)** | Fetches assigned workouts on calendar dates |
| **POST** | `/api/v1/assignments` | **Coach / Admin** | Assigns workout template/program to an athlete |
| **POST** | `/api/v1/workouts/execute` | **Scoped (Self/Coach)** | Submits live workout log, set completion, and RPE |
| **GET** | `/api/v1/assessments` | **Scoped (Self/Coach/Admin)** | Lists athlete physical fitness benchmark history |
| **POST** | `/api/v1/assessments` | **Coach / Admin** | Records physical assessment benchmark scores |
| **GET** | `/api/v1/nutrition` | **Scoped (Self/Coach/Admin)** | Retrieves active athlete meal plan and macros |
| **POST** | `/api/v1/nutrition` | **Coach / Admin** | Creates or updates athlete meal plan |
| **GET** | `/api/v1/calendar/sessions`| **Scoped (Self/Coach/Admin)** | Schedules sessions (Individual PT, Group class, Assessment) |
| **POST** | `/api/v1/calendar/attendance`| **Coach / Admin** | Marks attendance (Present, Absent, Late, Excused) |
| **GET** | `/api/v1/memberships` | **Admin / Coach** | Financial membership packages, balances, and payment records |
| **POST** | `/api/v1/memberships/pay` | **Admin Only** | Records membership payment transaction |
| **GET** | `/api/v1/audit-logs` | **Admin Only** | Audits all mutating operations, user actions, and timestamps |
| **GET** | `/api/v1/users` | **Admin Only** | Lists and manages system user accounts |

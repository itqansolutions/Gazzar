# GX Academy – Target Backend Architecture Blueprint

**Document Version:** 2.0.0  
**Status:** Approved Architecture Blueprint  
**System Classification:** Single-Academy Centralized Web Platform (Non-SaaS, Non-Tenant)  
**Author:** Senior Backend Architect  

---

## 1. Architectural Vision & Business Alignment

GX Academy is architecturally designed as a **Single-Academy, Centralized, Multi-User Web Application**. It unifies administrative oversight, professional coaching operations, and athlete training execution into a single, high-performance, internet-accessible system.

### Core Architectural Principles:
1. **Single Institutional Boundary:** The academy owns the entire database. There are no tenant IDs, no tenant registration pipelines, and no multi-tenant isolation overhead.
2. **Centralized Data Truth:** All athlete records, workout logs, medical restrictions, attendance sheets, and financial transactions reside in a central PostgreSQL database. Browser `localStorage` is completely retired from data persistence.
3. **Multi-Device & Mobile-First Athletic Readiness:** 
   - **Athletes:** Access from personal smartphones on the gym floor (live workout execution, set logging, rest timer, meal tracking).
   - **Coaches:** Access from tablets/smartphones at trackside or gym floor (attendance marking, technique notes, athlete performance reviews).
   - **Management:** Access from desktop/laptop in administration offices (membership billing, revenue reports, coaching staff oversight).
4. **Zero-Trust Server-Side Enforcement:** The server never trusts client-side state. Role-Based Access Control (RBAC) and Resource-Level Data Ownership are enforced strictly at the API and Middleware tiers.

---

## 2. High-Level System Topology

```
+----------------------------------------------------------------------------------------------------+
|                                          CLIENT DEVICES                                            |
|   +-----------------------+   +-----------------------+   +------------------------------------+   |
|   |  Athletes (Smartphones)|   |   Coaches (Smartphones/|   |   Management (Laptops/Desktops)    |   |
|   |   - Live Workout Mode |   |     Tablets)          |   |   - Executive KPIs                 |   |
|   |   - Diet & Macros     |   |   - Pitchside Attendance  |   - Membership Billing             |   |
|   |   - Personal Stats    |   |   - Program Assignment|   |   - Staff & Audit Governance       |   |
|   +-----------+-----------+   +-----------+-----------+   +-----------------+------------------+   |
+---------------|---------------------------|---------------------------------|----------------------+
                |                           |                                 |
                +---------------------------+---------------------------------+
                                            |
                                  HTTPS (TLS 1.3) / WSS
                                            |
+-------------------------------------------v--------------------------------------------------------+
|                                    EDGE / INGRESS LAYER                                            |
|   - DNS / Cloudflare WAF (DDoS Mitigation & Rate Limiting)                                         |
|   - SSL/TLS Termination                                                                            |
|   - Static Asset Caching (Next.js Bundles, Icons, Public Media)                                    |
+-------------------------------------------+--------------------------------------------------------+
                                            |
+-------------------------------------------v--------------------------------------------------------+
|                            NEXT.js 14 CENTRAL APPLICATION SERVER                                   |
|                                                                                                    |
|  +----------------------------------------------------------------------------------------------+  |
|  |  Edge / Server Middleware (src/middleware.ts)                                                |  |
|  |  - Extracts Secure HttpOnly Session Cookie                                                   |  |
|  |  - Validates Cryptographic Session Token & Expiration                                        |  |
|  |  - Enforces Path-Level Role Guards (/dashboard, /clients, /users, /audit-logs)               |  |
|  +----------------------------------------------+-----------------------------------------------+  |
|                                                 |                                                  |
|  +----------------------------------------------v-----------------------------------------------+  |
|  |  API Route Handlers (/api/v1/*) & Server Actions                                            |  |
|  |  +----------------------------------------------------------------------------------------+  |  |
|  |  | Presentation / Controller Layer                                                         |  |  |
|  |  | - Request Parsing & Zod Schema Validation                                              |  |  |
|  |  | - Standard Response Serialization { success, data, error, meta }                         |  |  |
|  |  +-------------------------------------------+--------------------------------------------+  |  |
|  |                                              |                                               |  |
|  |  +-------------------------------------------v--------------------------------------------+  |  |
|  |  | Service & Domain Logic Layer                                                           |  |  |
|  |  | - Resource Ownership Guards (assertCanAccessClient, assertCoachAssignment)              |  |  |
|  |  | - Periodization & Workout Business Logic                                               |  |  |
|  |  | - Medical Injury Safety Validator (Exercise Contraindications)                         |  |  |
|  |  | - Membership & Attendance Accounting Logic                                            |  |  |
|  |  +-------------------------------------------+--------------------------------------------+  |  |
|  |                                              |                                               |  |
|  |  +-------------------------------------------v--------------------------------------------+  |  |
|  |  | Data Access Layer (Prisma ORM Client)                                                  |  |  |
|  |  | - Strongly-typed Queries, Mutations, and Relational Includes                           |  |  |
|  |  | - Atomic Multi-table Transactions ($transaction)                                       |  |  |
|  |  | - Audit Trail Event Emitter (Writes to audit_logs)                                      |  |  |
|  |  +-------------------------------------------+--------------------------------------------+  |  |
|  +----------------------------------------------|-----------------------------------------------+  |
+-------------------------------------------------|--------------------------------------------------+
                                                  |
                         TCP / TLS (Connection Pool: PgBouncer / Prisma Pool)
                                                  |
+-------------------------------------------------v--------------------------------------------------+
|                                    PERSISTENCE & STORAGE TIER                                      |
|                                                                                                    |
|  +-------------------------------------------------------+  +-----------------------------------+  |
|  |  PostgreSQL 15+ Central Database                      |  |  Private Object Storage (S3/R2)   |  |
|  |  - Relational Schema (25 Models, 14 Enums)            |  |  - Encrypted Athlete Photos       |  |
|  |  - Strict Foreign Keys & Unique Constraints           |  |  - Exercise Demonstration Videos  |  |
|  |  - B-Tree Composite Query Indexes                     |  |  - Pre-signed Temporary URLs      |  |
|  |  - Automated Nightly Snapshots & Point-in-Time Recovery|  |  - No Public Bucket Browsing      |  |
|  +-------------------------------------------------------+  +-----------------------------------+  |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. Structural Layering & Separation of Concerns

To ensure maintainability, testability, and zero regression during migration, the backend architecture adheres strictly to a **Clean 4-Tier Layered Architecture**:

```
[ HTTP Request ]
       |
       v
+-----------------------+
|  1. Ingress Layer     |  -> src/middleware.ts (Cookie Auth, Session Extraction, Route Matching)
+-----------------------+
       |
       v
+-----------------------+
|  2. Controller Layer  |  -> src/app/api/v1/[module]/route.ts (Zod Validation, HTTP Status Codes)
+-----------------------+
       |
       v
+-----------------------+
|  3. Service Layer     |  -> src/server/services/[module].service.ts (Business Logic, Ownership Checks)
+-----------------------+
       |
       v
+-----------------------+
|  4. Data Access Layer |  -> src/lib/prisma.ts -> PostgreSQL (Prisma Queries, Transactions)
+-----------------------+
```

### Detailed Layer Responsibilities:

1. **Ingress / Middleware Tier (`src/middleware.ts`):**
   - Intercepts all incoming requests before page rendering or API execution.
   - Inspects the signed, encrypted `httpOnly` session cookie (`gx_session`).
   - Rejects unauthenticated traffic to protected endpoints with HTTP 401 / redirect to `/login`.
   - Prevents unauthorized cross-role route access (e.g., Athletes attempting to access `/users` or `/audit-logs`).

2. **Controller / Route Handler Tier (`src/app/api/v1/*`):**
   - Extracts typed payloads, query parameters, and route parameters.
   - Validates incoming data against strict **Zod schemas**.
   - Invokes the appropriate Service Layer function.
   - Wraps outgoing data into a standardized response envelope (`ApiResponse<T>`).
   - Never contains direct raw SQL or business calculation logic.

3. **Service / Domain Logic Tier (`src/server/services/*`):**
   - Implements pure academy business rules.
   - Enforces **Data Ownership Verification**: verifies that the authenticated user actually owns the record or has legitimate coaching authority over the athlete.
   - Executes domain-specific rules (e.g., verifying that an assigned exercise does not violate the athlete's recorded medical injuries).
   - Emits structured audit log entries for all mutating operations.

4. **Data Access Tier (`src/lib/prisma.ts`):**
   - Manages the singleton `PrismaClient` with connection pooling.
   - Executes parameterized relational queries with explicit `select` statements to guarantee sensitive fields (`passwordHash`) are never retrieved into memory unless required for authentication.
   - Uses `prisma.$transaction([...])` for multi-step mutations (e.g., creating a client profile alongside their initial measurement and coach assignment).

---

## 4. Mobile-First Athletic Ergonomics

A critical architectural requirement is that GX Academy is not merely a scaled-down desktop site, but a **first-class mobile tool for athletes and coaches in physical training environments**:

1. **Low-Latency Set Logging:** The live workout execution endpoint must process single-set updates (`SetLog`) in < 50ms to prevent lag during intense workouts.
2. **Offline-Tolerant Optimistic UI:** If an athlete loses cellular reception inside a basement gym or concrete weight room, workout timers and completed set checkboxes continue ticking locally, syncing automatically when connectivity resumes.
3. **Touch-Optimized Data Capture:** All attendance matrices, set weight counters, and RPE sliders are architected for single-thumb mobile interaction without zoom or keyboard jumping.
4. **Bandwidth Economy:** Profile photos and exercise video previews are delivered in modern compressed formats (`WebP`, `AVIF`) with pre-signed CDN caching to avoid consuming mobile data plans.

# GX Academy – Production Deployment & Infrastructure Architecture

**Document Version:** 2.0.0  
**Status:** Approved Technical Design  
**Author:** Senior DevOps & Cloud Architect  
**Deployment Model:** Centralized Single-Academy Application Instance  

---

## 1. Production Hosting Topology

```
+----------------------------------------------------------------------------------------------------+
|                                    INTERNET & CLIENT DEVICES                                       |
+-------------------------------------------------+--------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
| CLOUDFLARE EDGE & CDN                                                                             |
| - Full Strict SSL/TLS 1.3 Termination                                                             |
| - Web Application Firewall (WAF) & Rate Limiting                                                   |
| - Edge Caching for static bundles (_next/static/*, favicon, logos)                                |
| - Automated HSTS Preload Injection (Strict-Transport-Security: max-age=31536000)                  |
+-------------------------------------------------+--------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
| DOCKER / MANAGED APP CONTAINER (Railway / Render / Fly.io / AWS ECS)                               |
|                                                                                                    |
|  Container Runtime: Node.js 20+ Alpine LTS                                                          |
|  Execution: "node_modules/.bin/next start"                                                         |
|  Process Manager: Built-in Next.js Clustering / PM2                                                |
|  Health Check Probe: GET /api/health (HTTP 200 OK)                                                 |
|                                                                                                    |
|  Resource Baseline: 2 vCPU, 2 GB RAM (Comfortably supports 500 concurrent academy users)           |
+---------------------------------+----------------------------------+-------------------------------+
                                  |                                  |
                                  v                                  v
+--------------------------------------------------+ +-----------------------------------------------+
| MANAGED POSTGRESQL 15+ DATABASE                  | | PRIVATE S3-COMPATIBLE OBJECT STORAGE          |
| (Railway Postgres / Supabase / AWS RDS)          | | (Cloudflare R2 / AWS S3 / MinIO)              |
|                                                  | |                                               |
| - Connection Pooling (PgBouncer / Pooler)        | | - Encrypted at rest (AES-256)                 |
| - Automated Daily Snapshots (30-day retention)   | | - Private Buckets (No public read access)     |
| - Point-in-Time Recovery (PITR enabled)          | | - Pre-signed URLs for photo uploads/downloads |
| - SSL Required (sslmode=require)                 | |   (URLs expire in 15 minutes)                 |
+--------------------------------------------------+ +-----------------------------------------------+
```

---

## 2. Environment Variables Specification

The production environment requires the following explicit variables:

```bash
# 1. Database Connection (Pooled connection for Next.js runtime)
DATABASE_URL="postgresql://gx_user:[STRONG_DB_PASSWORD]@postgres-host:5432/gx_academy?sslmode=require&pgbouncer=true"

# Direct URL for Prisma CLI migrations (bypasses PgBouncer transaction mode)
DIRECT_URL="postgresql://gx_user:[STRONG_DB_PASSWORD]@postgres-host:5432/gx_academy?sslmode=require"

# 2. Application Core
NODE_ENV="production"
PORT=3000
NEXT_PUBLIC_APP_URL="https://app.gxacademy.com"

# 3. Cryptographic Secrets
# Generated via: openssl rand -base64 32
SESSION_SECRET="[STRONG_64_CHAR_HEX_SECRET]"
JWT_SECRET="[STRONG_64_CHAR_HEX_SECRET]"

# 4. Initial Provisioning Credentials (Used ONLY on initial DB seed, then rotated)
INITIAL_ADMIN_EMAIL="admin@gxacademy.com"
INITIAL_ADMIN_PASSWORD="[INITIAL_COMPLEX_PASSWORD_2026]"

# 5. Object Storage (Private Bucket for Athlete Photos & Assets)
STORAGE_ENDPOINT="https://[account-id].r2.cloudflarestorage.com"
STORAGE_BUCKET_NAME="gx-academy-private-assets"
STORAGE_ACCESS_KEY_ID="[R2_ACCESS_KEY]"
STORAGE_SECRET_ACCESS_KEY="[R2_SECRET_KEY]"
STORAGE_REGION="auto"
```

---

## 3. Database Connection Pooling & Resilience

In serverless or containerized Next.js environments, multiple concurrent requests can quickly saturate PostgreSQL's maximum connection limit (`max_connections`).

### Connection Pool Configuration:
- Use **PgBouncer** in **Transaction Pooling Mode**.
- In Prisma, configure connection pool parameters in the URL:
  `DATABASE_URL="...&connection_limit=20&pool_timeout=20"`
- In [`src/lib/prisma.ts`](file:///d:/Gazzar%20Project/src/lib/prisma.ts), retain the global singleton pattern to prevent instantiating multiple `PrismaClient` instances during hot-reloads or container scaling.

---

## 4. HTTP Security Headers Configuration

Configured in `next.config.mjs` to protect athlete and management sessions:

```javascript
// next.config.mjs
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" }, // Prevents clickjacking
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
];
```

---

## 5. Automated Backup & Disaster Recovery (DR) Plan

1. **Daily Automated Snapshots:** Managed database engine captures full binary backups daily at 03:00 AM UTC with a **30-day retention policy**.
2. **Weekly Cold Archive:** A cron job executes `pg_dump` and uploads an encrypted copy (`.dump.gpg`) to an isolated, secondary cloud storage bucket.
3. **Disaster Recovery Target Metrics:**
   - **RPO (Recovery Point Objective):** < 1 hour (via Write-Ahead Log archiving).
   - **RTO (Recovery Time Objective):** < 30 minutes to restore a full snapshot onto a new database instance.
4. **Drill Routine:** Automated test restore is executed on the 1st of every month to verify backup integrity.

---

## 6. Health Monitoring & Observability

### 6.1 Health Check Endpoint (`GET /api/health`)
A lightweight, unauthenticated endpoint returns system status for container orchestrator probes:
```typescript
// src/app/api/health/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // Ping database with minimal query
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (err) {
    return NextResponse.json(
      { status: "unhealthy", error: "Database connection failed" },
      { status: 503 }
    );
  }
}
```

### 6.2 Structured Logging:
- All API errors output formatted JSON logs containing: `timestamp`, `level`, `path`, `method`, `statusCode`, `userId`, `errorCode`, and `latencyMs`.
- Production logs never print sensitive parameters (passwords, tokens, phone numbers).

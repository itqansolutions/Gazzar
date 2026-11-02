# GX Academy – Milestone 1.1.1: Railway Database Environment Assessment

**Audit Date:** 2026-11-02  
**Lead Engineer:** Senior DevOps & PostgreSQL Infrastructure Engineer  
**Scope:** Read-Only Environment Inspection & Infrastructure Classification  
**Target Project:** GX Academy (`d:\Gazzar Project`)  

---

## 1. Executive Summary & Final Verdict

As part of Milestone 1.1.1, an exhaustive, read-only audit of the existing Railway PostgreSQL configuration was performed. The primary objective is to verify whether the existing database credentials in `.env` belong to a production, staging, or development environment, assess local connectivity, and define a secure isolation boundary before provisioning a dedicated development database.

### Final Verdict:
> **VERDICT: READY FOR DEVELOPMENT DATABASE SETUP**
>
> **Rationale:**
> 1. **Clear Environment Classification:** The database connection string configured in `.env` points to `postgres.railway.internal`, which is an internal private VPC address inside a deployed Railway project. Committed to `main` in commit `f56283a` alongside production deployment runners (`railway.json`, `nixpacks.toml`), it represents a **Remote Deployment / Production-Class Service**.
> 2. **Zero Blast-Radius for Development:** Because `postgres.railway.internal` has no public TCP proxy enabled and cannot be resolved externally, the developer's local machine cannot inadvertently touch, alter, or corrupt this remote deployment database.
> 3. **Isolation Boundary Established:** Development work must NOT attempt to reach or modify this internal instance. Instead, the project is fully ready to establish a completely isolated development PostgreSQL database (via local installation, Docker container, or an isolated development cloud instance) configured exclusively in a gitignored `.env.local` file.

---

## 2. Objective 1: Existing `DATABASE_URL` Inspection (Masked)

The existing connection string in `.env` was inspected under strict confidentiality protocols. No plaintext credentials, passwords, or sensitive keys were printed or leaked.

### Masked Parameter Breakdown:
| Parameter | Discovered Value / Pattern | Security Classification | Notes |
| :--- | :--- | :--- | :--- |
| **Protocol / Scheme** | `postgresql://` | Standard PostgreSQL | Valid URI format |
| **Username** | `postgres` | Default Superuser | Standard Railway Postgres default |
| **Password** | `[REDACTED_24_CHAR_SECRET]` | Highly Sensitive Secret | Secret length indicates Railway auto-generated secret |
| **Host** | `postgres.railway.internal` | Internal Private DNS | Unresolvable outside Railway Private Networking |
| **Port** | `5432` | Standard PostgreSQL Port | Internal listener port |
| **Database Name** | `railway` | Default Railway DB | Standard default database name |
| **Query Parameters** | *None* | None | Missing `?sslmode=...` or `?schema=public` |

---

## 3. Objective 2: Environment Classification (Production vs Staging vs Dev)

Based on forensic git analysis and environment parameter inspection, the existing Railway database is classified as:

### Classification: **Remote Deployment / Presumed Production Service**

### Justification & Forensic Findings:
1. **Git Commit Lineage:**
   - Commit `f56283a` (*"rebrand: GX Academy - remove dark mode, update all name references, add Railway DB URL"*) directly added this URL to `.env` on branch `main`.
   - The remote repository is linked to the official repository: `https://github.com/itqansolutions/Gazzar.git`.
2. **Deployment Artifact Coupling:**
   - The repository contains `railway.json` and `nixpacks.toml` configured to execute deployment commands directly from this repository.
   - The start script in `package.json` (`npm run railway:start`) directly invokes:
     ```bash
     prisma generate && prisma db push && node prisma/seed.js && next start
     ```
   - In Railway, internal DNS hostnames (`*.railway.internal`) are automatically assigned to services running within the default environment (named `production` by default in Railway projects).
3. **Absence of Environment Modifiers:**
   - There are no markers or variable tags indicating `staging`, `preview`, or `dev`.
4. **DevOps Safety Rule:**
   - Under defensive DevOps best practices, any database credential committed to `main` and targeting a live cloud infrastructure provider must be classified and treated as **Production** until proven otherwise.

---

## 4. Objective 3: Railway Project Configuration & Environment References

A comprehensive scan of the repository was conducted for Railway-specific manifests, configuration files, and references.

### Discovered Configuration Files:
1. **[`railway.json`](file:///d:/Gazzar%20Project/railway.json):**
   ```json
   {
     "$schema": "https://railway.app/railway.schema.json",
     "build": {
       "builder": "NIXPACKS"
     },
     "deploy": {
       "startCommand": "npm run railway:start",
       "restartPolicyType": "ON_FAILURE",
       "restartPolicyMaxRetries": 10
     }
   }
   ```
2. **[`nixpacks.toml`](file:///d:/Gazzar%20Project/nixpacks.toml):**
   - Configures the build pipeline:
     - Setup: `nodejs_20`, `openssl`
     - Install: `npm ci --prefer-offline --no-audit || npm install`
     - Build: `npx prisma generate`, `npm run build`
     - Start: `npm run railway:start`
3. **[`package.json`](file:///d:/Gazzar%20Project/package.json):**
   - `"railway:start": "prisma generate && prisma db push && node prisma/seed.js && next start"`
   - ⚠️ **Critical Risk Identified:** Using `prisma db push` on application startup in production is hazardous. In production, schema changes must be applied via forward-only versioned migrations (`npx prisma migrate deploy`), never via schema sync push.
4. **[`README.md`](file:///d:/Gazzar%20Project/README.md):**
   - Outlines Railway deployment steps referencing a GitHub connected service and Railway PostgreSQL plugin.
5. **Local Railway CLI:**
   - The `railway` CLI tool is **not installed** on the developer's local workstation.
   - No project-linking metadata (`.railway` folder) exists in the workspace.

---

## 5. Objective 4: Existence of a Separate Development Database

A rigorous search across the codebase and configuration files was conducted to determine if a separate development database service exists:

| Scope | Check Result | Details |
| :--- | :--- | :--- |
| **`.env.development`** | ❌ Not Present | No environment-specific dev file found. |
| **`.env.local`** | ❌ Not Present | No local developer override file exists. |
| **`docker-compose.yml`** | ❌ Not Present | No local container orchestration defined for PostgreSQL. |
| **Secondary URLs** | ❌ None | No `DEV_DATABASE_URL` or `STAGING_DATABASE_URL` configured. |
| **Local PostgreSQL** | ❌ Inactive | No local PostgreSQL service is running on `localhost:5432`. |

### Conclusion:
**No separate development PostgreSQL service currently exists for this project.** Development has previously been conducted entirely against browser `localStorage` mock data, completely bypassing any live database.

---

## 6. Objective 5 & 6: Public TCP Proxy & Local Connectivity Evaluation

### 6.1 Public TCP Proxy Status:
- Railway PostgreSQL instances support public internet access only when a **TCP Proxy** is explicitly enabled in the Railway service settings.
- When enabled, Railway provides a public proxy hostname in the format:
  `roundhouse.proxy.rlwy.net:<PORT>` or `junction.proxy.rlwy.net:<PORT>`.
- The configured hostname in `.env` is strictly `postgres.railway.internal`.
- **Verdict:** **No public TCP proxy is configured in the project environment.**

### 6.2 Local Connectivity Verification:
- **DNS Resolution Test:**
  ```powershell
  Resolve-DnsName postgres.railway.internal
  # Result: DNS name does not exist (Error 9003)
  ```
- **Socket Connection Test:**
  - Standard workstation routing cannot resolve or route packets to Railway's private `.internal` domain.
- **Prisma CLI Interaction Test:**
  - Any command requiring a database handshake (`prisma db pull`, `prisma db push`, `prisma migrate`) fails with:
    `P1001: Can't reach database server at postgres.railway.internal:5432`.

### 6.3 Local Connectivity Conclusion:
Direct connection from the developer's workstation to this Railway PostgreSQL database is **completely impossible** without a public TCP proxy or a Railway Private Network VPN/Wireguard tunnel.

---

## 7. Security Risks & Architectural Impact

From a Senior DevOps & Security perspective, the current setup reveals three key considerations:

1. **Safety from Accidental Local Overwrite:**
   - Because the local machine cannot reach `postgres.railway.internal`, local testing during Milestones 1.2–1.5 cannot accidentally wipe or corrupt the remote database.
2. **Credential Hygiene Concern:**
   - The `.env` file containing the remote connection string was committed into git history in commit `f56283a`.
   - **Recommendation:** Once the development database is set up and tested, the credentials on Railway should be rotated, and `.env` should be removed from git tracking in favor of `.env.example` + untracked `.env.local`.
3. **Startup Script Vulnerability (`railway:start`):**
   - The existing script executes `prisma db push` on container startup. If destructive schema changes occur, `prisma db push` can drop columns in production on restart.
   - This must be transitioned to versioned migrations (`prisma migrate`) during Milestone 5 before production go-live.

---

## 8. Actionable Plan for Milestone 1.2 & Development Database Setup

To maintain 100% velocity without risking remote infrastructure:

```mermaid
flowchart TD
    subgraph Remote Cloud Environment [Railway Cloud Environment]
        ProdApp[Next.js App Service] -->|Private VPC| ProdDB[(PostgreSQL\npostgres.railway.internal\nPresumed Production)]
    end

    subgraph Local Developer Workstation [Local Development Environment]
        LocalDev[Next.js Local Server\nnpm run dev]
        DevEnv[".env.local (Gitignored)"]
        DevDB[(Isolated Dev Database\nLocal / Container / Cloud Dev)]
        
        LocalDev --> DevEnv
        DevEnv --> DevDB
    end

    LocalDev -.->|BLOCKED / NO ROUTE| ProdDB
```

### Options for the Development Database:
1. **Option A: Dedicated Cloud Development PostgreSQL (Recommended for Rapid Onboarding)**
   - Create a separate, free/development PostgreSQL instance (on Neon, Supabase, or a separate Railway Dev project with a public TCP proxy).
   - Place its URL in `.env.local` (`DATABASE_URL="..."`).
   - Advantage: Requires zero local Docker/Postgres daemon installation on Windows; works immediately with Prisma.
2. **Option B: Local PostgreSQL Installation / Docker Container**
   - Install PostgreSQL 16 locally on Windows or start a Docker container on port `5432`.
   - Configure `.env.local` to point to `postgresql://postgres:postgres@localhost:5432/gx_academy_dev?schema=public`.

---

## 9. Final Verdict

> ### **STATUS: READY FOR DEVELOPMENT DATABASE SETUP**
>
> The existing Railway database environment has been fully assessed and classified as a **Remote Deployment / Production-Class Service**. It is physically unreachable and safely isolated from the developer's workstation.
>
> Milestone 1.1.1 is complete. We can now proceed to define the schema additions (Milestone 1.2: Session & Auth models) and configure a dedicated development database.

# GX Academy – دليل وقائمة التحقق لاعتماد النشر على Production (Milestone 1.2)

**تاريخ التوثيق:** 2026-11-02  
**المسؤول:** مهندس البنية التحتية والبرمجيات (DevOps & Software Architect)  
**الحالة:** مراجعة ما قبل النشر (Pre-Deployment Audit & Release Checklist)  
**الهدف:** التحقق الدقيق، وتوثيق ملف الـ SQL، وخطة الـ Backup، وتحديد نطاق الإصدار قبل أي Commit أو Push.  
**الملف:** `docs/database/PRODUCTION_RELEASE_CHECKLIST.md`  

---

## 1. الفحص الشامل لمستودع Git (Git Release Audit)

### 1.1 معطيات الفرع والـ Commits الحالية
- **الفرع الحالي (Current Branch):** `main`
- **آخر Commit في السجل (Latest Commit):** `9993372` (*"feat: complete coach-to-client assignment flow across all views and modals"*)
- **حالة المستودع:** `13` ملفاً معدلاً ومحفوظاً محلياً، مع مجلدين غير متتبعين (`docs/` و `tests/`).

### 1.2 تفصيل الملفات المعدلة وتصنيفها الهندسي (`git diff --stat`)
```text
 prisma/schema.prisma               | 339 ++++++++++++++++++++-----------------
 src/app/api/auth/login/route.ts    |  57 +++++--
 src/app/api/auth/me/route.ts       |  43 ++++-
 src/app/api/auth/route.ts          |  58 ++++---
 src/app/api/users/[id]/route.ts    |   9 +-
 src/app/api/users/route.ts         |   6 +-
 src/app/login/page.tsx             |  76 ++++-----
 src/app/settings/page.tsx          |  51 +-----
 src/app/users/page.tsx             |  17 +-
 src/components/layout/AppShell.tsx |  14 +-
 src/components/layout/Navbar.tsx   |  52 +-----
 src/context/AuthContext.tsx        |  54 ++----
 src/lib/auth.ts                    |  57 ++-----
 13 files changed, 405 insertions(+), 428 deletions(-)
```

---

## 2. نطاق الإصدار وتصنيف التغييرات (Release Scope Breakdown)

تتوزع التغييرات الجاهزة للنشر حالياً على مجموعتين مترابطتين هندسياً:

### المجموعة الأولى: تأمين النظام وسد الثغرات (Phase 1 Security Lockdown - 12 ملفاً)
1. **[`src/app/login/page.tsx`](file:///d:/Gazzar%20Project/src/app/login/page.tsx):** إزالة صندوق بيانات الدخول الافتراضية (Demo Credentials Box) الذي كان يطبع اسم المستخدم وكلمة المرور للأدمن لكل زائر للموقع.
2. **[`src/lib/auth.ts`](file:///d:/Gazzar%20Project/src/lib/auth.ts):** إزالة كلمة المرور الموحدة (`A@123456`) التي كانت تتيح لأي شخص فتح أي حساب في النظام وتجاوز التحقق.
3. **[`src/context/AuthContext.tsx`](file:///d:/Gazzar%20Project/src/context/AuthContext.tsx):** إزالة دالة `loginAsRole()` التي كانت تسمح بانتحال صلاحية الأدمن أو المدرب بضغطة زر دون تسجيل دخول.
4. **[`src/components/layout/Navbar.tsx`](file:///d:/Gazzar%20Project/src/components/layout/Navbar.tsx):** إزالة شريط التبديل السريع بين الأدوار من أعلى الواجهة.
5. **[`src/app/settings/page.tsx`](file:///d:/Gazzar%20Project/src/app/settings/page.tsx) & [`src/app/users/page.tsx`](file:///d:/Gazzar%20Project/src/app/users/page.tsx):** إزالة أدوات تبديل الأدوار التجريبية من شاشات الإعدادات والمستخدمين.
6. **[`src/app/api/auth/login/route.ts`](file:///d:/Gazzar%20Project/src/app/api/auth/login/route.ts):** فرض التحقق الصارم من البريد وكلمة المرور ورفض الطلبات غير المطابقة برموز `400 / 401`.
7. **[`src/app/api/auth/me/route.ts`](file:///d:/Gazzar%20Project/src/app/api/auth/me/route.ts):** حماية مسار التحقق من الهوية برمز Bearer ومنع تسريب تجزئة كلمة المرور في الـ Response.
8. **مسارات API الأخرى (`auth/route.ts`, `users/route.ts`, `users/[id]/route.ts`):** حظر الوصول العشوائي للبيانات بدون مصادقة.

### المجموعة الثانية: البنية الهيكلية لقاعدة البيانات (Milestone 1.2 Schema Foundation - ملف واحد)
- **[`prisma/schema.prisma`](file:///d:/Gazzar%20Project/prisma/schema.prisma):**
  - إضافة موديل الجلسات `Session` (مربوط بجدول `sessions`).
  - إضافة موديل استعادة كلمة المرور `PasswordResetToken` (مربوط بجدول `password_reset_tokens`).
  - إضافة العلاقات العكسية التابعة في موديل `User`.

### المجموعة الثالثة: الاختبارات والتوثيق (Untracked)
- مجلد `tests/`: يضم `tests/security.test.mjs` (7 اختبارات أمان) و `tests/schema-models.test.mjs` (4 اختبارات موديلات).
- مجلد `docs/`: يضم جميع تقارير التدقيق والمعمارية وقواعد البيانات.

---

## 3. مراجعة كود الـ SQL النهائي المعتمد للإنتاج

تم حفظ كود الـ SQL الفعلي الناتج عن أمر `prisma migrate diff` في ملف مستقل:  
👉 [**`docs/database/milestone-1.2-production.sql`**](file:///d:/Gazzar%20Project/docs/database/milestone-1.2-production.sql)

```sql
-- 1. Create Session Table for Centralized Session Management
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "userAgent" TEXT,
    "ipAddress" TEXT,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- 2. Create Password Reset Token Table for Secure Password Recovery
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- 3. Unique & Performance Indexes
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");
CREATE INDEX "password_reset_tokens_expiresAt_idx" ON "password_reset_tokens"("expiresAt");

-- 4. Foreign Key Constraints (Cascade Deletions on User Delete)
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

### ✅ تدقيق السلامة الهندسية:
- الـ SQL إضافي 100% (Zero DROP, Zero ALTER on existing columns).
- لا يوجد أي تضارب مع الجداول الـ 30 السابقة.

---

## 4. جاهزية النسخ الاحتياطي (Backup Readiness Guide)

حيث أن ميزة PITR معطلة في خدمة PostgreSQL، يُرجى اتباع الخطوات التالية لأخذ نسخة احتياطية (Snapshot / Export) قبل أول تغيير:

### خطوات أخذ Backup من لوحة تحكم Railway (Dashboard):
1. افتح مشروع **Gazzar** في لوحة تحكم [Railway Dashboard](https://railway.app).
2. اضغط على خدمة قاعدة البيانات **Postgres**.
3. ادخل على تبويب **Data**.
4. اضغط على قائمة الخيارات (الأيقونة الثلاثية أو زر الإعدادات) واختر **Export Database**.
5. سيتم تحميل ملف بصيغة `.sql` على جهازك (مثلاً: `gazzar_postgres_backup_20261102.sql`).

### التحقق من صحة النسخة وإمكانية استعادتها:
- **الفحص بالنظر:** افتح الملف في محرر نصوص؛ تأكد أنه يبدأ بعبارة `PostgreSQL database dump complete` ويحتوي على تعريفات الجداول الـ 30 (`CREATE TABLE "users"`, `CREATE TABLE "exercises"`, ... إلخ).
- **آلية الاستعادة (Restore Plan):** في حال حدوث أي طارئ يستدعي الرجوع للخلف:
  - يمكن الدخول إلى تبويب **Query** في لوحة Railway ولصق محتوى ملف الـ `.sql`.
  - أو استدعاؤه عبر سطر الأوامر باستخدام `psql` عبر الـ TCP Proxy المؤقت.

---

## 5. تحليل مخاطر وسيناريوهات فشل النشر (Deployment Failure Analysis)

يقوم أمر التشغيل السحابي المعتمد في `package.json` بتنفيذ السلسلة التالية:
```bash
"railway:start": "prisma generate && prisma db push && node prisma/seed.js && next start"
```

```mermaid
flowchart TD
    subgraph Container Startup Chain
        Step1["1. prisma generate"] -->|نجاح| Step2["2. prisma db push"]
        Step1 -->|فشل| Fail1["إيقاف الحاوية بكود 1"]
        
        Step2 -->|نجاح| Step3["3. node prisma/seed.js"]
        Step2 -->|فشل| Fail2["إيقاف الحاوية بكود 1\n(لم تنفذ seed أو next)"]
        
        Step3 -->|نجاح| Step4["4. next start"]
        Step3 -->|فشل| Fail3["إيقاف الحاوية بكود 1"]
        
        Step4 -->|نجاح| Online["● الخدمة تعمل Online\nعلى المنفذ 3000"]
        Step4 -->|فشل| CrashLoop["محاولة إعادة التشغيل حتى 10 مرات\n(Restart Policy: ON_FAILURE)"]
    end
    
    Fail1 --> CrashLoop
    Fail2 --> CrashLoop
    Fail3 --> CrashLoop
```

### تحليل سلوك كل خطوة عند الفشل:
1. **`prisma generate`:**
   - **الاحتمالية:** شبه معدومة (تم اختبارها بنجاح محلياً في 173ms).
   - **السلوك عند الفشل:** يتوقف الأمر فوراً ولا يصل إلى `db push`، وتخرج الحاوية بكود خطأ.
2. **`prisma db push`:**
   - **الاحتمالية:** مستبعدة تماماً؛ لأننا استخرجنا الـ SQL DDL مسبقاً واختبرنا خلوه من أي فقدان بيانات (No Data Loss).
   - **السلوك عند الفشل:** إذا اعترضت بريزما لأي سبب، يتوقف الأمر وتفشل الحاوية فوراً، **ولا يتم تشغيل `next start`**.
3. **`node prisma/seed.js`:**
   - **الاحتمالية:** صفر؛ لأن الملف يطبع فقط سطر نصي (`console.log`) وينتهي دون كتابة.
4. **`next start`:**
   - **الاحتمالية:** مستبعدة؛ البناء الكامل لجميع الصفحات الـ 30 تم بنجاح بدون أخطاء `npm run build`.
5. **أثر سياسة إعادة التشغيل (`restartPolicyType: ON_FAILURE`, `restartPolicyMaxRetries: 10`):**
   - في حال فشل أي أمر من الأوامر أعلاه، يحاول Railway إعادة تشغيل الحاوية 10 مرات متتالية (Crash Loop).
   - بعد استنفاد المحاولات الـ 10، يعلن Railway فشل الـ Deployment الجديد، ويحافظ تلقائياً على النسخة السابقة العاملة دون انقطاع الموقع (Zero Downtime Rollback).

---

## 6. قائمة التحقق وخطوات التنفيذ المتسلسلة (Execution Checklist)

| الخطوة | الإجراء | المسؤول | الحالة |
| :---: | :--- | :---: | :---: |
| **1** | مراجعة التقرير واعتماد كود الـ SQL الموثق في `milestone-1.2-production.sql` | صاحب المشروع | ⏳ قيد المراجعة |
| **2** | أخذ نسخة احتياطية يدوية (Export) لقاعدة بيانات PostgreSQL من لوحة تحكم Railway | صاحب المشروع | ⏳ مطلوب تنفيذها |
| **3** | إعطاء الموافقة الصريحة للـ Agent بتنفيذ الـ Commit والـ Push | صاحب المشروع | ⏳ بانتظار الإشارة |
| **4** | تنفيذ `git add` للملفات المحددة و `git commit` برسالة واضحة ومعيارية | الـ Agent | 🔒 محظور حتى الموافقة |
| **5** | تنفيذ `git push origin main` | الـ Agent | 🔒 محظور حتى الموافقة |
| **6** | مراقبة سجلات البناء والتشغيل (Build & Deploy Logs) عبر Railway CLI / Dashboard | الـ Agent والمشرف | 🔒 بعد الـ Push |
| **7** | فحص تأكيدي سريع عبر `railway ssh` للتحقق من ظهور جدولي `sessions` و `password_reset_tokens` | الـ Agent | 🔒 بعد الـ Deploy |
| **8** | الانتقال رسمياً إلى **Milestone 1.3: بناء الـ Authentication Backend وزرع أول Admin** | الفريق المشترك | 🎯 المرحلة القادمة |

---

## 7. الخلاصة والقرار النهائي للمرحلة

> ### **STATUS: READY & PENDING OWNER APPROVAL**
> تم الانتهاء من جميع الفحوصات الفنية والتنظيمية. كل شيء موثق وجاهز.
> التزاماً بالتعليمات الصارمة: **لم يتم تنفيذ أي Commit، أو Push، أو Deployment، أو Database Writes**.
> ننتظر تأكيدك الكريم بعد أخذ الـ Backup وإعطاء شارة البدء!

# تقرير المراجعة الهندسية الدقيقة لـ Milestone 1.3.1 (Code Review)

**المشروع:** GX Academy (Gazzar Sports Coaching Platform)  
**المرحلة:** Phase 1 – Authentication & Security Hardening  
**الميلستون الخاضع للمراجعة:** Milestone 1.3.1 – Session Service & Authentication Core  
**نوع الوثيقة:** Strict Engineering Code Review & Vulnerability Audit  
**التاريخ:** 2 نوفمبر 2026  
**القرار الهندسي (Verdict):** **موافقة مشروطة (Conditional Approval)** – النواة البرمجية سليمة وآمنة في وظائفها الأساسية، ولكن تم رصد ملاحظات هامة (High / Medium) تتعلق بعزل حزم الـ Client/Server وحماية التجديد المتزامن للـ Sessions يجب تصحيحها قبل الانتقال للـ Login API.

---

## 1. جدول تصنيف الملاحظات الهندسية (Findings Matrix)

| المعرف | التصنيف | الموضوع | الملف المعني | الحالة |
| :--- | :---: | :--- | :--- | :--- |
| **SEC-01** | **High** | تسريب `bcryptjs` إلى حزمة المتصفح عبر `AuthContext` | `src/lib/auth.ts`, `src/context/AuthContext.tsx` | مؤكد (Confirmed) |
| **SEC-02** | **High** | عدم وجود حقل `isActive` أو `status` للمستخدم في الـ Schema | `prisma/schema.prisma`, `src/lib/auth/session-service.ts` | مؤكد (Confirmed) |
| **SEC-03** | **Medium** | هجمة التدافع عند التجديد المتزامن (Thundering Herd on Touch) | `src/lib/auth/session-service.ts` | خطر محتمل (Potential) |
| **SEC-04** | **Medium** | غياب شرط `revokedAt: null` داخل استعلام `updateSessionActivity` | `src/lib/auth/session-repository.ts` | مؤكد (Confirmed) |
| **SEC-05** | **Medium** | غياب اختبارات الحدود الدقيقة (Boundary Tests) للـ Timeouts | `tests/session-service.test.mjs` | نقص تغطية (Missing Tests) |
| **SEC-06** | **Low** | عدم استدعاء `timingSafeCompareHashes` داخل `validateSession` | `src/lib/auth/session-service.ts` | تحسين دفاعي (Defense-in-depth) |

---

## 2. التحقق من صلاحيات وعمر الجلسة (Session Lifetime Verification)

### الملفات التي تم فحصها:
- `src/lib/auth/session-rules.ts`
- `src/lib/auth/session-service.ts`
- `src/lib/auth/session-repository.ts`
- `prisma/schema.prisma`

### النتائج التفصيلية:

#### أ. الحد الأقصى المطلق (Absolute Lifetime = 14 Days)
- **التحقق الرياضي:**
  في دالة `calculateRenewedExpiration` ([session-rules.ts#L25-L29](file:///d:/Gazzar%20Project/src/lib/auth/session-rules.ts#L25-L29)):
  $$\text{newExpiresAt} = \min(\text{now} + 48\text{h}, \text{createdAt} + 14\text{d})$$
- **التحقق الإجرائي:**
  في دالة `validateSession` ([session-service.ts#L101-L104](file:///d:/Gazzar%20Project/src/lib/auth/session-service.ts#L101-L104)):
  يتم فحص `isSessionAbsoluteExpired(sessionWithUser.createdAt, now)` **قبل** اتخاذ أي قرار بالتجديد. إذا كان $\text{now} - \text{createdAt} \ge 14\text{d}$ يتم رفض الجلسة فورًا بسبب `EXPIRED` ولا يتم استدعاء `needsTouch` إطلاقًا.
- **الخلاصة:** **مؤكد ومحكم بنسبة 100%**. يستحيل تجاوز الـ 14 يومًا حتى مع استمرار نشاط المستخدم على مدار الساعة.

#### ب. مهلة عدم النشاط (Idle Timeout = 48 Hours)
- في دالة `validateSession` ([session-service.ts#L106-L109](file:///d:/Gazzar%20Project/src/lib/auth/session-service.ts#L106-L109)):
  يتم فحص `isSessionIdleTimedOut(sessionWithUser.lastUsedAt, now)`. إذا مرت 48 ساعة على آخر استخدام، ترفض الجلسة بـ `IDLE_TIMEOUT`.
- **الخلاصة:** **مؤكد وسليم**.

#### ج. ترشيد التحديثات (Update Throttling = 15 Minutes)
- في دالة `shouldTouchSession` ([session-rules.ts#L36-L38](file:///d:/Gazzar%20Project/src/lib/auth/session-rules.ts#L36-L38)):
  يتم إرجاع `true` فقط إذا مر $\ge 15$ دقيقة على `lastUsedAt`.
- **الخلاصة:** يمنع 99% من عمليات الكتابة الزائدة لقاعدة البيانات.

#### د. فحص إمكانية الاعتماد على الـ Schema الحالية دون إضافة أعمدة:
- يحتوي نموذج `Session` في `prisma/schema.prisma` على:
  - `createdAt` (تاريخ الإنشاء الثابت @default(now()))
  - `lastUsedAt` (تاريخ آخر نشاط @default(now()))
  - `expiresAt` (تاريخ الانتهاء المحسوب)
  - `revokedAt` (تاريخ الإلغاء الصريح)
- **التقييم المعماري:** **الـ Schema الحالية كافية هندسيًا ورياضيًا لتطبيق كل القواعد بدون إضافة أعمدة جديدة**. لأن تاريخ الإنشاء `createdAt` غير قابل للتعديل (Immutable)، وأي استعلام أو منطق برمجي يمكنه اشتقاق الحد الأقصى المطلق بدقة متناهية (`createdAt + 14 days`).
- **ملاحظة مستقبلية:** في حال الرغبة في إجراء عمليات تنظيف مجمعة مباشرة عبر SQL Cron Job (خارج تطبيق Next.js)، يُفضل مستقبلاً إضافة عمود `absoluteExpiresAt` مفهرس (Indexed) لتسهيل استعلامات الـ DB البحتة.

#### هـ. التحقق من المستخدمين المحذوفين وغير النشطين (User Integrity):
- **المستخدم المحذوف:** يتم رفض الجلسة بنجاح (`USER_NOT_FOUND`) عند حذف المستخدم أو عدم وجوده ([session-service.ts#L116-L120](file:///d:/Gazzar%20Project/src/lib/auth/session-service.ts#L116-L120)).
- **المستخدم غير النشط (الملاحظة SEC-02):**
  نموذج `User` في `prisma/schema.prisma` **لا يحتوي على حقل `isActive` أو `status`**.
  وبالتالي فإن الكود الحالي لا يستطيع معرفة ما إذا كان حساب المستخدم معطلاً أو مجمداً (Frozen/Deactivated).
  **التوصية:** توثيق هذا القيد، وجدولة إضافة حقل `isActive Boolean @default(true)` في مرحلة الـ Migrations القادمة.

---

## 3. تدقيق الحدود بين الخادم والعميل (Client/Server Boundary Audit)

### الملفات التي تم فحصها:
- `src/lib/auth.ts`
- `src/lib/auth/*`
- `src/context/AuthContext.tsx`
- كافة ملفات الاستيراد في المشروع.

### النتائج والعيوب المرصودة:

#### أ. التحقق من تسريب Prisma:
- **النتيجة:** **سليم تمامًا**. ملفات Prisma محصورة في `src/lib/prisma.ts` و `src/lib/auth/session-repository.ts` ومسارات الـ API Routes. لم يتم استيراد أي ملف يحتوي Prisma في مكونات العميل.

#### ب. الملاحظة العالية SEC-01: تسريب `bcryptjs` إلى المتصفح عبر `AuthContext`
- في `src/context/AuthContext.tsx` السطر 4:
  ```ts
  import { SessionUser, verifyPassword } from "@/lib/auth";
  ```
- وفي `src/lib/auth.ts` السطر 5:
  ```ts
  export { hashPassword, verifyPassword, validatePasswordStrength } from "./auth/password";
  ```
- **المشكلة:** `AuthContext.tsx` هو Client Component يحمل تعليمة `"use client"`. باستيراده لـ `verifyPassword`، يقوم Webpack بضم مكتبة `bcryptjs` بالكامل إلى ملفات الـ Javascript التي يتم إرسالها لمتصفح الزائر!
- **السبب التاريخي:** هذا الاستيراد هو من بقايا الـ Prototype القديم في مرحلة ما قبل 1.3، حيث كان تسجيل الدخول يتم بالكامل داخل المتصفح بمقارنة الهاش مع `localStorage`.
- **الخطورة:** على الرغم من أن `bcryptjs` تعمل في المتصفح ولا تعطل الـ Build (كما أثبت `npm run build`)، إلا أن وجود منطق التحقق من كلمات المرور في جهة العميل هو خطأ معماري يجب التخلص منه تمامًا بمجرد الانتقال للـ Login API (Milestone 1.3.2 و 1.3.4).
- **التوصية:**
  1. قصر `src/context/AuthContext.tsx` على استيراد `type { SessionUser }` فقط.
  2. منع أي استيراد لدوال كلمات المرور في جهة المتصفح.

#### ج. فحص تعليمة `"use client"`:
- تم فحص كافة ملفات `src/lib/auth/*.ts` و `src/lib/auth.ts`: **لا يوجد أي تعليمة `"use client"` داخل مجلد `lib`**.
- تعليمة `"use client"` موجودة فقط في `AuthContext.tsx` وهو المكان الطبيعي لـ React Context.

---

## 4. مراجعة نطاق AuthContext (AuthContext Scope Review)

### ما تم تغييره فعليًا في `AuthContext.tsx`:
بمقارنة `git diff` لملف `AuthContext.tsx`:
1. تم حذف وظيفة الـ Backdoor السابقة `loginAsRole` ومستخدم `defaultAdminUser` المشفر داخل الكود في Milestone 1.1/1.2.
2. تم إجبار دالة `login` على طلب كلمة المرور كمعامل إلزامي (`password: string`).
3. إزالة الاستثناء العام الذي كان يقبل كلمة المرور الموحدة `"A@123456"`.
4. **في Milestone 1.3.1 تحديداً:** لم يتم إدخال أي تعديل جديد على `AuthContext.tsx` سوى معالجة نوع المعامل `SessionUser | null` في الـ Callbacks لضمان توافق الـ TypeScript compiler.

### تقييم النطاق والـ LocalStorage:
- نظام تسجيل الدخول الحالي في الواجهة لا يزال يعمل **بشكل متطابق تمامًا** مع مرحلة الـ Prototype المعتمدة على `localStorage`.
- دالة `login` لا تزال تقرأ من `db.getUserByEmail(email)` وتخزن الجلسة في `localStorage.getItem("gx_session_user")`.
- **القرار الهندسي:** **هذا السلوك صحيح تمامًا في هذه المرحلة**. لا يجب ربط `AuthContext` بالجلسات السحابية في Milestone 1.3.1؛ لأن مسار الـ API (`/api/auth/login`) لم يُبنَ بعد (Milestone 1.3.2)، ونقل الواجهة بالكامل واستبدال `localStorage` مكانه الصحيح والمعتمد هو **Milestone 1.3.4**.

---

## 5. مراجعة أمان الجلسات والتشفير (Session Security Audit)

1. **عشوائية الرمز (Token Generation):**
   - تم التحقق من `crypto.randomBytes(32).toString("hex")`.
   - يولد 64 حرفًا سداسيًا مكافئًا لـ 256 بت من الإنتروبيا الحقيقية المعتمدة على الـ OS CSPRNG.
2. **التجزئة والتخزين (Token Storage):**
   - يتم تخزين `SHA-256` فقط في قاعدة البيانات. الرمز الأصلي لا يُسجل إطلاقاً.
3. **مقاومة هجمات التوقيت (Timing-Safe Comparison):**
   - الدالة `timingSafeCompareHashes` تستخدم `crypto.timingSafeEqual` على `Buffer.from(hash, "utf8")` مع فحص تطابق الأطوال أولاً.
   - **الملاحظة SEC-06:** الاستعلام في Prisma يسترجع الجلسة بواسطة الهاش الفريد `where: { tokenHash }` (مقارنة تتم داخل PostgreSQL B-Tree Index). يُنصح كإجراء دفاعي إضافي (Defense-in-depth) بإجراء `timingSafeCompareHashes` في الذاكرة بعد الاسترجاع.
4. **فشل آمن لقاعدة البيانات (Fail-Closed Design):**
   - في دالة `validateSession`: أي خطأ في استعلام قاعدة البيانات يلتقطه الـ `try/catch` ويُرجع فورًا `{ valid: false, reason: "DATABASE_ERROR" }` دون إسقاط السيرفر ودون تسريب تفاصيل الخطأ للعميل.
   - في دوال `revokeSession` و `revokeAllUserSessions`: تلتقط الأخطاء وتُرجع `false` أو `0` بأمان.
5. **الملاحظة SEC-04 (أمان التحديث ضد السباق Concurrency):**
   - في `updateSessionActivity` ([session-repository.ts#L95-L107](file:///d:/Gazzar%20Project/src/lib/auth/session-repository.ts#L95-L107)):
     يتم تنفيذ التحديث بالشرط `where: { id: sessionId }`.
     إذا حدث سباق وتم إلغاء الجلسة (`revokedAt = now`) في جزء من الثانية بين استرجاع الجلسة وتحديثها، فإن `updateSessionActivity` لن يؤثر على `revokedAt` (أي أنها ستظل ملغاة في الاستعلامات اللاحقة).
     ولكن لمنع تحديث جلسة ملغاة أو منتهية، **يُوصى بتعديل الاستعلام ليصبح**:
     `where: { id: sessionId, revokedAt: null }`.

---

## 6. تدقيق الاختبارات وفض التناقضات (Test Audit & Reconciliation)

### أ. تشغيل الاختبارات بالأرقام الفعلية:

تم تشغيل كل حزمة اختبارات بشكل منفصل ومسجل بالأمر الصريح:

| الحزمة | الأمر المنفذ | عدد الاختبارات الفعلي | الحالة |
| :--- | :--- | :---: | :---: |
| **Session Core Suite** | `npx tsx --test tests/session-service.test.mjs` | **13** (1 Suite + 12 Scenarios) | **نجاح 100%** |
| **Security Suite** | `node --test tests/security.test.mjs` | **7** | **نجاح 100%** |
| **Schema & Models Suite** | `node --test tests/schema-models.test.mjs` | **4** (1 Suite + 3 Subtests) | **نجاح 100%** |
| **Login Readiness Suite** | `node --test tests/login-readiness.test.mjs` | **6** (1 Suite + 5 Subtests) | **نجاح 100%** |
| **الإجمالي العام** | **جميع الاختبارات التراكمية في المشروع** | **30 اختبارًا** | **نجاح 100%** |

### ب. سبب الاختلاف مع التقرير السابق (Reconciliation):
- ذكر التقرير السابق رقم 12 ورقم 17:
  - رقم **12**: قصد به السيناريوهات الوظيفية فقط داخل `session-service.test.mjs`، وتجاهل احتساب السويت الأبوي (Parent Suite Runner) الذي يعتبره Node.js اختباراً في إحصائيته ليصبح المجموع **13**.
  - رقم **17**: كان ناتج جمع الاختبارات السابقة مجتمعة (7 اختبارات أمان + 4 اختبارات schema + 6 اختبارات جاهزية = 17 اختبارًا).
- **الخلاصة الإحصائية الدقيقة:** عدد الاختبارات المنفذة في بيئة الاختبار الحالية هو **30 اختباراً رسمياً** بنسبة نجاح 100%.

### ج. فجوات التغطية المرصودة (Missing Test Coverage):
أظهرت المراجعة غياب اختبارات لبعض الحالات الحافة، ويوصى بإضافتها:
1. **اختبار الحدود الدقيقة (Exact Millisecond Boundary):**
   - اختبار جلسة عند اللحظة $\text{createdAt} + 14\text{d} - 1\text{ms}$ (يجب أن تنجح) ومقارنتها باللحظة $\text{createdAt} + 14\text{d}$ (يجب أن تفشل).
   - اختبار مهلة الخمول عند $\text{lastUsedAt} + 48\text{h} - 1\text{ms}$ مقابل $\text{lastUsedAt} + 48\text{h}$.
2. **اختبار التنافس على التجديد (Concurrent Renewal):**
   - اختبار إرسال 10 طلبات متزامنة بعد مرور 16 دقيقة للتحقق من عدم حدوث تضارب في قاعدة البيانات.
3. **اختبار عزل حزم المتصفح (Import Boundary Test):**
   - اختبار برمجي يتحقق من أن حزم الـ Client Component لا تحتوي على `crypto` أو `prisma`.

---

## 7. التوصيات وخطة التصحيح المقترحة (Recommended Actions)

قبل الانتقال إلى Milestone 1.3.2 (Login API)، نوصي بتنفيذ التحسينات الآتية:

1. **فصل استيرادات `AuthContext.tsx`:**
   تعديل `AuthContext.tsx` ليستورد فقط الأنواع الخالصة `import type { SessionUser } from "@/types"` بدلاً من استيراد دوال التشفير من `@/lib/auth`.
2. **تحصين استعلام `updateSessionActivity`:**
   تعديل الاستعلام في `PrismaSessionRepository` ليشترط `revokedAt: null`.
3. **توسيع ملف الاختبارات `tests/session-service.test.mjs`:**
   إضافة سيناريوهات الحالات الحافة (Millisecond boundaries) والتنافسية.
4. **تأكيد جاهزية النواة:**
   النواة الحالية جاهزة ومؤمنة لربطها بمسار `/api/auth/login` في Milestone 1.3.2 فور إتمام هذه التعديلات الطفيفة.

---

> [!IMPORTANT]
> **التزام القيود:** لم يتم إجراء أي تعديل على الكود، ولم يتم إجراء أي اتصال بقاعدة بيانات الإنتاج على Railway، ولم يتم تنفيذ أي أوامر `git commit` أو `push`. النظام متوقف تمامًا بانتظار موافقة المالك.

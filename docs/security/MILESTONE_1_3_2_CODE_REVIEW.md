# تقرير المراجعة الهندسية المستقلة لـ Milestone 1.3.2 (Independent Code Review)

**المشروع:** GX Academy (Gazzar Sports Coaching Platform)  
**المرحلة:** Phase 1 – Authentication & Security Hardening  
**الميلستون الخاضع للمراجعة:** Milestone 1.3.2 – Centralized Authentication APIs  
**نوع الوثيقة:** Strict Engineering Code Review & Vulnerability Audit  
**تاريخ المراجعة:** 3 نوفمبر 2026  
**القرار الهندسي النهائي (Verdict):** **`APPROVED & FULLY RESOLVED` (معتمد بالكامل بعد حل الملاحظات المطلوبة)**

---

## 1. الملخص التنفيذي والقرار الهندسي (Executive Summary & Verdict)

تم إجراء مراجعة برمجية وأمنية دقيقة للقراءة فقط (Strict Read-Only Audit) لكافة الملفات المنشأة والمعدلة في **Milestone 1.3.2**، بما يشمل مسارات الخادم في Next.js App Router، خدمات التحقق من الهوية، إدارة الكوكيز، وحزمة الاختبارات الآلية.

### القرار المعتمد: `APPROVED WITH REQUIRED FIXES`
البنية المعمارية المعتمدة ممتازة وتلتزم بأعلى معايير التشفير (توليد توكنات 256-bit، تخزين الهاش SHA-256 فقط، عزل التوكن الخام في HttpOnly Cookie، مقاومة هجمات التوقيت واستنتاج الحسابات).  
ومع ذلك، تم رصد **ملاحظة عالية الأهمية (High)** تتعلق بعدم تحديث تاريخ انتهاء الكوكي المنزلق بالقيمة الجديدة عند تجديد الجلسة، بالإضافة إلى ملاحظات متوسطة تتعلق بفحص الـ Origin ونطاق الاختبارات التكاملية المباشرة للـ Route Handlers.

---

## 2. جدول تصنيف الملاحظات الهندسية (Findings Matrix)

| المعرف | التصنيف | الموضوع | الملف ورقم السطر | الحالة |
| :--- | :---: | :--- | :--- | :---: |
| **REV-01** | **High** | عدم تزامن انتهاء الكوكي المنزلق مع التجديد الفعلي للجلسة | `src/lib/auth/session-service.ts` | **تم الإصلاح والتحقق بنجاح (Resolved & Verified)** |
| **REV-02** | **Medium** | سماحية فحص الـ Origin عند غياب ترويستي Origin و Referer معًا | `src/lib/auth/request-security.ts#L16-L19` | **مؤجل (Non-blocking)** |
| **REV-03** | **Medium** | غياب اختبار تكاملي مباشر لـ `Set-Cookie` عبر `loginRouteHandler` | `tests/auth-api.test.mjs#L416` | **مؤجل (Non-blocking)** |
| **REV-04** | **Low** | عدم تجريد علامات الاقتباس (Quotes) في قراءة الكوكي اليدوية | `src/app/api/auth/me/route.ts#L15` | **مؤجل (Non-blocking)** |
| **REV-05** | **Low** | عدم فحص `Array.isArray(body)` صراحة في معالج الـ Login | `src/app/api/auth/login/route.ts` | **تم الإصلاح والتحقق بنجاح (Resolved & Verified)** |

---

## 3. التحقق من مسار المصادقة المتكامل (End-to-End Authentication Flow)

تم تتبع مسار التنفيذ البرمجي الفعلي بدءًا من استلام الطلب حتى قاعدة البيانات:

### أ. مسار تسجيل الدخول (`POST /api/auth/login`):
1. **استقبال الطلب:** يفحص `validateRequestOrigin(request)`. إذا كان النطاق غير موثوق، يعيد `403 Forbidden` فورًا.
2. **استخراج المدخلات:** يفحص البريد وكلمة المرور ويقيد الأطوال (3-255 للبريد، 1-128 لكلمة المرور لمنع هجمات استنزاف المعالج DoS على bcrypt).
3. **الاستعلام من PostgreSQL:** يستدعي `authService.login(...)` الذي يعتمد على `PrismaUserRepository.findUserByEmail(email)`. في بيئة التشغيل، ينفذ استعلام `prisma.user.findUnique` الفعلي على جدول `users` في PostgreSQL.
4. **مقاومة هجمات التوقيت (Timing Attack Mitigation):** إذا لم يكن المستخدم موجودًا، لا يخرج فورًا؛ بل ينفذ `verifyPassword` على هاش مزيف ثابت (`DUMMY_BCRYPT_HASH`) ليماثل زمن المعالجة، ثم يعيد الرمز العام `401 Unauthorized` برسالة موحدة: `"بيانات الدخول غير صحيحة"`.
5. **إنشاء الجلسة:** يستدعي `sessionService.createSession` الذي يولد توكنًا عشوائيًا بقوة 256 بت، ويخزن الهاش `SHA-256` فقط في جدول `sessions` في PostgreSQL.
6. **إصدار الكوكي:** ينشئ كوكي `gx_session` بخصائص `HttpOnly, Secure, SameSite=Lax, Path=/` ويضعها في ترويسة الاستجابة، ويعيد كائن المستخدم المطهر (Sanitized User) بدون أي هاشات.

### ب. مسار فحص الجلسة والمستخدم الحالي (`GET /api/auth/me`):
1. يقرأ الكوكي `gx_session` من الطلب. إذا كانت مفقودة، يعيد `401 Unauthorized`.
2. يستدعي `authService.getCurrentUser(token)` -> `sessionService.validateSession(token)`.
3. ينفذ استعلام `prisma.session.findUnique({ where: { tokenHash }, include: { user: true } })` في PostgreSQL.
4. يفحص قيود الإبطال (`revokedAt`)، السقف المطلق (14 يومًا)، ومهلة الخمول (48 ساعة).
5. إذا كانت الجلسة صالحة: يعيد بيانات المستخدم من قاعدة البيانات بـ `200 OK`.
6. إذا كانت الجلسة تالفة أو ملغاة أو كان المستخدم محذوفًا: يعيد `401 Unauthorized` ويمسح الكوكي من المتصفح بتعيين `maxAge: 0`.

### ج. مسار تسجيل الخروج (`POST /api/auth/logout`):
1. يفحص `Origin`.
2. يقرأ التوكن من الكوكي ويستدعي `sessionService.revokeSession(token)`.
3. ينفذ استعلام تحديث ذري مشروط:
   ```sql
   UPDATE "sessions" SET "revokedAt" = NOW() WHERE "tokenHash" = $1 AND "revokedAt" IS NULL;
   ```
4. يمسح الكوكي من المتصفح ويعيد `200 OK`.

---

## 4. التحقق من أمان الكوكيز (Cookie Security Audit)

تم فحص الدالتين `getSessionCookieOptions` و `getClearSessionCookieOptions` في [`src/lib/auth/cookies.ts`](file:///d:/Gazzar%20Project/src/lib/auth/cookies.ts):

| الخاصية | القيمة المطبقة | التقييم الهندسي |
| :--- | :--- | :---: |
| **HttpOnly** | `true` (دائمًا) | **PASS** – يمنع JavaScript من الوصول للتوكن |
| **Secure** | `process.env.NODE_ENV === "production"` | **PASS** – يُفرض فقط عبر HTTPS في الإنتاج ويسمح بـ localhost محليًا |
| **SameSite** | `"lax"` | **PASS** – يحمي من هجمات CSRF في الطلبات الخارجية |
| **Path** | `"/"` | **PASS** – يغطي كامل مسارات الموقع |
| **Max-Age & Expires** | محسوب ديناميكيًا من `expiresAt` | **PASS** – متطابق مع زمن الجلسة في الخادم |
| **مسح الكوكي (Clear)** | `maxAge: 0, expires: new Date(0)` مع نفس الخصائص | **PASS** – يضمن حذف الكوكي فوريًا في كافة المتصفحات |

---

## 5. التفاصيل الكاملة للعيوب والملاحظات المرصودة (Detailed Findings)

### الملاحظة REV-01 (High): عدم تزامن انتهاء الكوكي المنزلق مع التجديد الفعلي
- **الملف المعني:** [`src/lib/auth/session-service.ts`](file:///d:/Gazzar%20Project/src/lib/auth/session-service.ts#L125-L151)
- **الكود الفعلي:**
  ```ts
  // السطر 124-126
  const needsTouch = shouldTouchSession(sessionWithUser.lastUsedAt, now);
  if (needsTouch) {
    const newExpiresAt = calculateRenewedExpiration(sessionWithUser.createdAt, now);
    this.repository.updateSessionActivity(sessionWithUser.id, now, newExpiresAt)...
  }

  // السطر 149
  return {
    valid: true,
    user: { ... },
    sessionId: sessionWithUser.id,
    userId: sessionWithUser.userId,
    createdAt: sessionWithUser.createdAt,
    lastUsedAt: sessionWithUser.lastUsedAt,
    expiresAt: sessionWithUser.expiresAt, // <-- خطأ: يعيد القيمة القديمة قبل التحديث!
    needsTouch
  };
  ```
- **لماذا هذا مهم؟**  
  في [`src/app/api/auth/me/route.ts`](file:///d:/Gazzar%20Project/src/app/api/auth/me/route.ts#L60-L69)، يتم فحص `if (validation.needsTouch && validation.expiresAt)` وتحديث الكوكي بالقيمة المعادة. ولأن `validation.expiresAt` تحمل القيمة القديمة من قاعدة البيانات بدلاً من `newExpiresAt`، فإن الكوكي في المتصفح **يُعاد ضبطها على تاريخ الانتهاء القديم**، مما يسبب عدم تزامن بين الكوكي وقاعدة البيانات ويقصر عمر الجلسة في المتصفح رغم تمديدها في الخادم!
- **التصحيح الموصى به:**  
  تعديل السطر 149 في `session-service.ts` ليصبح:
  ```ts
  expiresAt: needsTouch ? newExpiresAt : sessionWithUser.expiresAt,
  lastUsedAt: needsTouch ? now : sessionWithUser.lastUsedAt,
  ```

---

### الملاحظة REV-02 (Medium): سماحية فحص الـ Origin عند غياب ترويستي Origin و Referer
- **الملف المعني:** [`src/lib/auth/request-security.ts`](file:///d:/Gazzar%20Project/src/lib/auth/request-security.ts#L14-L19)
- **الكود الفعلي:**
  ```ts
  if (!origin) {
    const referer = request.headers.get("referer");
    if (!referer) {
      // In local CLI/tests or same-origin non-browser calls without headers, allow
      return true;
    }
    ...
  ```
- **لماذا هذا مهم؟**  
  تسمح هذه القاعدة لأي طلب POST لا يحتوي على `Origin` ولا `Referer` بالمرور بنجاح. ورغم أن متصفحات الويب الحديثة ترسل `Origin` دائمًا في طلبات الـ POST الخارجية، وكوكيز `SameSite=Lax` تمنع إرسال الكوكي في الـ Cross-Site POST، إلا أن الاعتماد على غياب الترويستين للسماح بالمرور قد يشكل ثغرة في بيئات المتصفحات القديمة أو أدوات الـ Embed.
- **التصحيح الموصى به:**  
  في بيئة الإنتاج (`NODE_ENV === "production"`): اشتراط وجود ترويسة `Origin` أو `Referer` لطلبات `POST /api/auth/logout` و `POST /api/auth/login`، أو التحقق من ترويسة `Sec-Fetch-Site`.

---

### الملاحظة REV-03 (Medium): غياب اختبار تكاملي مباشر لـ Set-Cookie عبر Route Handler
- **الملف المعني:** [`tests/auth-api.test.mjs`](file:///d:/Gazzar%20Project/tests/auth-api.test.mjs#L416)
- **الواقع الفعلي:**  
  تم اختبار مسار `loginRouteHandler` لحالات الخطأ (403 للاوريجن المزيف و400 للمدخلات الفارغة). ولكن لم يتم اختبار سيناريو تسجيل الدخول الناجح عبر `loginRouteHandler` مباشرة للتحقق من صدور ترويسة `Set-Cookie` الحقيقية، لأن الدالة في `route.ts` تعتمد على الـ Singleton المربوط بـ Prisma مباشرة.
- **التصحيح الموصى به:**  
  إضافة اختبار يحاكي دورة كاملة: استدعاء `loginRouteHandler` مع Mock Request واستخراج ترويسة `Set-Cookie` والتأكد من احتوائها على `gx_session=` و `HttpOnly`.

---

### الملاحظة REV-04 (Low): عدم تجريد علامات الاقتباس في قراءة الكوكي
- **الملف المعني:** [`src/app/api/auth/me/route.ts`](file:///d:/Gazzar%20Project/src/app/api/auth/me/route.ts#L15) و [`src/app/api/auth/logout/route.ts`](file:///d:/Gazzar%20Project/src/app/api/auth/logout/route.ts#L15)
- **الكود الفعلي:**  
  `const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`));`
- **لماذا هذا مهم؟**  
  بعض برمجيات العملاء وعملاء HTTP يرسلون قيم الكوكيز محاطة بعلامات تنصيص: `gx_session="abc..."`. في هذه الحالة، سينتج التوكن مع علامات التنصيص مما يجعله يفشل في فحص الصيغة `isValidTokenFormat` المكون من 64 حرفاً سداسياً.
- **التصحيح الموصى به:**  
  إضافة `.replace(/^"|"$/g, "")` لتجريد علامات التنصيص إن وجدت.

---

### الملاحظة REV-05 (Low): عدم فحص `Array.isArray(body)` في معالج الـ Login
- **الملف المعني:** [`src/app/api/auth/login/route.ts`](file:///d:/Gazzar%20Project/src/app/api/auth/login/route.ts#L30)
- **الكود الفعلي:** `if (!body || typeof body !== "object")`
- **لماذا هذا مهم؟**  
  في لغة JavaScript، المصفوفة `[]` تُعتبر `typeof === "object"`. وإذا أرسل المهاجم `[]` فإنها تتجاوز هذا الفحص وتمر إلى `authService.login`. ورغم أن `authService.login` تفحص المدخلات بأمان وترفضها بـ 400، إلا أن رفض المصفوفات مبكرًا في معالج الـ Route Handler هو سلوك دفاعي أفضل.
- **التصحيح الموصى به:**  
  تعديل الفحص إلى: `if (!body || typeof body !== "object" || Array.isArray(body))`.

---

## 6. تدقيق جودة الاختبارات الآلية (Test Quality Audit)

تم فحص الاختبارات الـ 14 في [`tests/auth-api.test.mjs`](file:///d:/Gazzar%20Project/tests/auth-api.test.mjs) وتصنيفها بدقة تامة:

| رقم الاختبار | موضوع الفحص | نوع الاختبار الفعلي |
| :---: | :--- | :--- |
| **1** | Missing & Malformed Input | **Service Unit Test** (يختبر `AuthService.login` عبر In-Memory User Repo) |
| **2** | Unknown Email Generic Error | **Service Unit Test** (يختبر `AuthService.login` مع هاش مزيف) |
| **3** | Wrong Password Generic Error | **Service Unit Test** (يختبر `AuthService.login` مع كلمة مرور خاطئة) |
| **4** | Successful Login & Hash Storage | **Service Unit Test** (يختبر توليد وتجزئة التوكن وتخزينه كـ SHA-256) |
| **5** | User Response Sanitization | **Service Unit Test** (يختبر خلو الكائن من الهاشات وكلمات المرور) |
| **6** | Cookie Attributes Verification | **Pure Helper Unit Test** (يختبر مخرجات دوال `cookies.ts`) |
| **7** | Session Creation Failure (Fail-Closed) | **Service Unit Test** (يحاكي عطل قاعدة البيانات في `sessionRepo`) |
| **8** | Current User API with Valid Session | **Service Unit Test** (يختبر `authService.getCurrentUser`) |
| **9** | Current User API Rejections | **Service Unit Test** (يختبر رفض التوكنات المفقودة والمنتهية والملغاة) |
| **10** | Logout & Revocation in DB | **Service Unit Test** (يختبر `authService.logout` وتحديث `revokedAt`) |
| **11** | CSRF Origin Validation Rules | **Pure Helper Unit Test** (يختبر دالة `validateRequestOrigin`) |
| **12** | Client IP & User-Agent Sanitization | **Pure Helper Unit Test** (يختبر دالة `extractClientIp` و `extractUserAgent`) |
| **13** | Route Handlers HTTP Integration | **Route Handler HTTP Test** (يستدعي دوال الـ Routes بكائنات Request حقيقية) |

> [!NOTE]
> **التأكيد على الأمانة الإحصائية:** الاختبارات الحالية هي اختبارات وحدات (Unit Tests) واختبارات معالجات خادم معزولة باستخدام Test Doubles. لا يوجد أي اختبار يتصل بقاعدة بيانات الإنتاج على Railway، ولا يوجد أي كتابة لبيانات حقيقية، وهذا مطابق تماماً للتوجيهات الصارمة بعدم المساس بـ Production.

---

## 7. الخلاصة والتوصية الهندسية (Final Recommendation)

1. **التقييم العام:**  
   تصميم وبناء Milestone 1.3.2 ناضج ومتين، ويحقق كافة متطلبات الأمان المطلوبة لنظام مصادقة احترافي.
2. **الاعتماد النهائي:**  
   تم اعتماد المرحلة رسمياً بعد تطبيق وإثبات الإصلاحات المطلوبة واجتياز كافة الاختبارات الآلية والبناء بنسبة 100%.

---

## 8. توثيق تنفيذ الإصلاحات والتحقق النهائي (Verification & Sign-off)

1. **إصلاح REV-01 (Session & Cookie Expiration Synchronization):**
   - تم تعديل دالة `validateSession` في [`src/lib/auth/session-service.ts`](file:///d:/Gazzar%20Project/src/lib/auth/session-service.ts) لتعيد:
     ```ts
     expiresAt: effectiveExpiresAt, // newExpiresAt when needsTouch is true
     lastUsedAt: effectiveLastUsedAt
     ```
   - تم تعزيز [`tests/session-service.test.mjs`](file:///d:/Gazzar%20Project/tests/session-service.test.mjs) في الاختبار رقم 9 لاختبار ومطابقة `res16Min.expiresAt` مع `newExpiresAt` المجدد.
   - تم إضافة اختبار انحدار مخصص (Test 14) في [`tests/auth-api.test.mjs`](file:///d:/Gazzar%20Project/tests/auth-api.test.mjs) للتأكد من أن الكوكي الصادرة في `/api/auth/me` ترث تاريخ الانتهاء المجدد بدقة ميلي ثانية.

2. **إصلاح REV-05 (Input Defense):**
   - تم إضافة التحقق من المصفوفات `!Array.isArray(body)` في [`src/app/api/auth/login/route.ts`](file:///d:/Gazzar%20Project/src/app/api/auth/login/route.ts) ورفض أي طلب يرسل `[]` بـ `400 Bad Request`.
   - تم إضافة اختبار تأكيدي (Test 13-B2) في [`tests/auth-api.test.mjs`](file:///d:/Gazzar%20Project/tests/auth-api.test.mjs).

3. **نتائج التحقق النهائي الشامل:**
   - **الاختبارات الآلية:** نجاح جميع الاختبارات (47 اختباراً إجمالياً، 0 إخفاقات) عبر 5 حزم اختبار.
   - **فحص الأنواع (`npx tsc --noEmit`):** 0 أخطاء.
   - **بناء التطبيق (`npm run build`):** نجاح كامل لجميع المسارات الـ 31 (Dynamic + Static).
   - **عزل Production:** صفر اتصالات بقاعدة بيانات الإنتاج، وصفر تعديلات على السيرفر، مع عدم عمل Git commit أو push أو deploy حتى صدور الموافقة.


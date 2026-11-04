# DESIGN.md — GX Fitness Academy

> مصدر الحقيقة الوحيد للتصميم. أي agent أو مطوّر **يقرأ الملف ده قبل أي تعديل UI**.
> الصورة المرجعية = هدف بصري. الملف ده = العقد اللي الكود بيتبنى عليه.
> القيم المعلّمة بـ `~` تقريبية من الصورة المرجعية ولازم تتأكد بالـ Eyedropper قبل التثبيت.

---

## 0. قواعد صارمة (Hard Rules)

1. **ممنوع تغيير**: Prisma schema، الـ auth، الـ API routes، منطق جلب البيانات، الـ props الحالية للمكونات.
2. **ممنوع hardcoded hex / px** في أي component. كل لون/مسافة/radius/ظل من الـ tokens فقط.
3. **Component واحد = Task واحد = Commit واحد.** مفيش "اعمل الصفحة كلها".
4. الواجهة **English-only**.
5. **ممنوع إعادة رسم الشعار** بالخطوط أو الـ CSS. الشعار = ملف SVG فقط (قسم 2).
6. **ممنوع أي فلتر/تعديل على وجه أو جسم المدرب.** التأثيرات (overlay، gradient، vignette) CSS فوق الصورة.
7. أي تفصيلة مش موجودة في المرجع ولا في الملف ده: **اسأل أو اذكرها كـ deviation**، ماترتجلش.
8. قبل ما تقول "خلصت": شغّل التطبيق، خد screenshot (1440px و390px × Dark/Light)، قارن بالمرجع، واكتب الفروقات الباقية.

---

## 1. الأصول (Assets) — الوضع الحالي بصراحة

### 1.1 الشعار
الملفين `GX-Fitness-Academy-logo-dark.svg` و `…-light.svg` **تتبّع آلي (vector trace) من صورة**، مش الملف الأصلي. الوصف جوه الـ SVG نفسه بيقول كده.

| الاستخدام | الحكم |
|---|---|
| Sidebar، Header، Login، Favicon، Mobile top bar (حتى ~320px عرض) | ✅ مقبول |
| Hero كبير، طباعة، شاشة Splash كاملة | ⚠️ حواف مسنّنة وتأثير "رش" ظاهر على كلمة Fitness عند التكبير |
| مواد تسويقية | ❌ اطلب الأصلي من المصمم (SVG/AI/PDF) |

- **ألوان الشعار الحقيقية** (مستخرجة من الـ SVG، دي أدق من أي تقدير من الصورة):
  - أحمر: Dark `#F01425` / Light `#E20D1B`
  - داكن (Light theme): `#171E24`
  - أبيض (Dark theme): `#FFFFFF`
- التسمية في المشروع: `public/brand/gx-logo-dark.svg` (للخلفيات الداكنة، نصه أبيض) و `gx-logo-light.svg` (للخلفيات الفاتحة، نصه داكن).
- Component: `<Logo variant="auto|dark|light" height={n} />`. `auto` يتبع الثيم. حافظ على الـ viewBox (`20 20 518 445`، نسبة ≈ 1.16:1).
- **Mark فقط** (الكيتل بيل + GX) لازم يتقصّ كـ SVG منفصل (`gx-mark.svg`) للـ favicon وتطبيق الموبايل والـ collapsed sidebar. الـ viewBox التقريبي للـ mark: `150 28 245 185` (من إحداثيات المسارات: x≈158–387، y≈35–204؛ يتأكد بصرياً).
- Clear space حوالين الشعار = ارتفاع حرف "G" في الشعار. أقل ارتفاع: 40px للشعار الكامل، 24px للـ mark.

### 1.2 صور المدرب (ZIP — 9 صور)
**فحص حقيقي للملفات:** كلها WhatsApp-compressed (أقصى بُعد 1600px، 57–188KB).

| الاستخدام | الحكم |
|---|---|
| Avatar، thumbnails، كروت صغيرة | ✅ |
| Hero عريض / full-bleed على desktop (≥1440px) | ❌ دقة غير كافية |
| Cutout مدمج مع عناصر حمراء (زي المرجع) | ❌ بدون صور أعلى دقة + خلفية نظيفة |

**مشاكل لازم تتحل قبل الاستخدام:**
- **علامات مائية/ شعارات رعاة** على أغلب الصور (ELFIT / EXPLODE / توقيع مصوّر). دي صور فعاليات، **حقوقها غالباً للمصوّر أو المنظّم**. لازم إذن كتابي أو استلام النسخ الأصلية من المصوّرين.
- صورة واحدة **لقطة شاشة Instagram** (فيها واجهة التطبيق) → تُستبعد نهائياً.
- صورة عليها **نص عربي** وبانر → تُستبعد (الواجهة English-only).
- الصور في المرجع (وش بدقة عالية، إضاءة استوديو، خلفية داكنة/فاتحة نظيفة) **مش موجودة في الـ ZIP**. المرجع كان مولّد بالـ AI، فالصور دي مش مصدره.

**المطلوب من العميل (Abdullah):** جلسة تصوير قصيرة أو نسخ أصلية بدقة ≥ 3000px على الضلع الطويل، خلفية بسيطة، بدون watermarks، بنفس الإضاءة، بوضعين: (1) بورتريه نص جسم بخلفية داكنة، (2) بوضع مبتسم/خفيف لخلفية فاتحة. لحد وقتها نستخدم placeholder.

**كيف تُعالج الصور في الكود:**
- `public/coach/` بصيغ WebP/AVIF، `next/image` مع `sizes`، و`priority` للـ hero فقط.
- `object-position` مضبوط على الوش. لا crop يقطع الوش.
- Overlay بالـ CSS: `linear-gradient(90deg, rgb(10 10 11 / .85), transparent 60%)` + شريط أحمر مائل كـ decorative element (CSS clip-path/SVG)، مش مدموج في الصورة.

---

## 2. الخطوط (Typography)

| الدور | الخط | ملاحظات |
|---|---|---|
| عناوين الواجهة / Hero / أرقام كبيرة | **Barlow Condensed** 700 Italic | uppercase في الـ hero فقط (`MANAGE / TRAIN / TRACK / PERFORM`)؛ في عناوين الصفحات sentence case |
| الـ Dashboard والنصوص والجداول والفورم | **Inter** 400/500/600/700 | `font-feature-settings: "tnum"` للأرقام في الجداول والـ KPI |
| كلمة "ACADEMY" (لو اتكتبت نص) | **Montserrat** 500 | `letter-spacing: .4em`، uppercase |
| توقيع "By Abdullah Elgazzar" (لو اتكتب نص) | **Caveat** 600 | زينة فقط |

**تنبيه مهم:** كلمتي "Academy" والتوقيع **موجودين جوه الـ SVG كمسارات**، يعني الخطوط دي **مش بتتطبق على الشعار**. استخدام Montserrat/Caveat مفيد بس لو احتجنا lockup نصي (مثلاً شاشة تحميل، فوتر، إيميل). Caveat أبسط وأقل حدة من التوقيع الحقيقي، فمتحطوش جنب الشعار كبديل ليه. **الشعار الرسمي هو الأولوية دايماً.**

```ts
// app/fonts.ts
import { Inter, Barlow_Condensed, Montserrat, Caveat } from "next/font/google";

export const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
export const barlow = Barlow_Condensed({
  subsets: ["latin"], weight: ["600", "700"], style: ["normal", "italic"],
  variable: "--font-display", display: "swap",
});
export const montserrat = Montserrat({ subsets: ["latin"], weight: ["500"], variable: "--font-brand", display: "swap" });
export const caveat = Caveat({ subsets: ["latin"], weight: ["600"], variable: "--font-script", display: "swap" });
```

```ts
// tailwind.config.ts → theme.extend.fontFamily
fontFamily: {
  sans: ["var(--font-inter)", "system-ui", "sans-serif"],
  display: ["var(--font-display)", "Impact", "sans-serif"],
  brand: ["var(--font-brand)", "sans-serif"],
  script: ["var(--font-script)", "cursive"],
}
```

### Type scale
| Token | Size / Line | Weight | الاستخدام |
|---|---|---|---|
| `display` | 48/48 (mobile 36/36) | Barlow 700 italic | Hero فقط |
| `h1` | 28/34 | Inter 700 | عنوان الصفحة ("Dashboard") |
| `h2` | 18/24 | Inter 600 | عنوان كارت |
| `kpi` | 32/36 (mobile 26/30) | Inter 700, tnum | أرقام الـ KPI |
| `body` | 14/20 | Inter 400 | |
| `label` | 12/16 | Inter 500 | labels، trend badges |
| `micro` | 11/14 | Inter 500 | أقل مقاس مسموح |

---

## 3. Design Tokens

### 3.1 الألوان (CSS variables — الثيم هو مصدر الحقيقة)

```css
:root {                       /* LIGHT */
  --brand:           #E20D1B; /* من الشعار (حقيقي) */
  --brand-hover:     #C40A17;
  --brand-contrast:  #FFFFFF; /* نص على زر أحمر */
  --brand-soft:      rgb(226 13 27 / .08);
  --brand-text:      #C40A17; /* أحمر كنص صغير: contrast 6.17 على الأبيض */

  --bg:              #F4F5F7; /* ~ */
  --surface:         #FFFFFF;
  --surface-raised:  #F9FAFB;
  --border:          #E6E8EC; /* ~ */
  --text:            #0F1115;
  --text-muted:      #5B6370; /* ≥ 4.5:1 على --bg */
  --ink:             #171E24; /* داكن الشعار */

  --success: #16A34A;  --warning: #D97706;  --danger: #DC2626;  --info: #2563EB;

  --shadow-card: 0 1px 2px rgb(16 24 40 / .04), 0 8px 24px rgb(16 24 40 / .06);
  --shadow-glow: none;
}

.dark {                       /* DARK */
  --brand:           #F01425; /* من الشعار (حقيقي) */
  --brand-hover:     #FF2D3B;
  --brand-contrast:  #FFFFFF;
  --brand-soft:      rgb(240 20 37 / .14);
  --brand-text:      #FF4D57; /* أحمر كنص صغير: contrast 5.65 على الكارت */

  --bg:              #0A0A0B; /* ~ */
  --surface:         #141416; /* ~ */
  --surface-raised:  #1C1C1F; /* ~ */
  --border:          #26262A; /* ~ */
  --text:            #F5F5F6;
  --text-muted:      #9A9AA3;
  --ink:             #FFFFFF;

  --success: #22C55E;  --warning: #F59E0B;  --danger: #F87171;  --info: #3B82F6;

  --shadow-card: 0 8px 24px rgb(0 0 0 / .35);
  --shadow-glow: 0 0 24px rgb(240 20 37 / .35);
}
```

**ملاحظة contrast (محسوبة):** الأحمر `#F01425` على `#141416` = 4.23:1، يعني **مناسب للأيقونات والعناصر الكبيرة والأزرار، مش للنص الصغير**. النص الأحمر الصغير في Dark يستخدم `--brand-text`.

ألوان أيقونات الـ KPI (من المرجع، تتأكد بالـ Eyedropper): أحمر = brand، بنفسجي `~#8B5CF6`، أزرق `~#3B82F6`، رمادي `~--text-muted`.

### 3.2 Spacing / Radius / Motion
- Spacing: شبكة 4px. المسموح: 4, 8, 12, 16, 20, 24, 32, 40, 48.
- Radius: `--r-card: 16px`، `--r-control: 12px`، `--r-chip: 8px`، `--r-pill: 999px`.
- Layout desktop: Sidebar 240px، padding المحتوى 24–32px، gap الكروت 16px، max-width المحتوى 1440px.
- Motion: 150ms للـ hover، 250ms للـ transitions، `cubic-bezier(.2,.8,.2,1)`. احترم `prefers-reduced-motion`.

### 3.3 Tailwind mapping (semantic، مش hex)

```ts
colors: {
  brand: { DEFAULT: "var(--brand)", hover: "var(--brand-hover)", soft: "var(--brand-soft)", text: "var(--brand-text)", contrast: "var(--brand-contrast)" },
  app: "var(--bg)", card: "var(--surface)", raised: "var(--surface-raised)",
  line: "var(--border)", fg: "var(--text)", muted: "var(--text-muted)",
},
borderRadius: { card: "var(--r-card)", control: "var(--r-control)", chip: "var(--r-chip)" },
boxShadow: { card: "var(--shadow-card)", glow: "var(--shadow-glow)" },
```
الكلاسات: `bg-app`, `bg-card`, `text-fg`, `text-muted`, `border-line`, `bg-brand text-brand-contrast`. **مفيش `dark:` variants للألوان** (الثيم بيتبدّل من الـ variables)؛ `dark:` مسموح بس للفروق الهيكلية (زي glow).

### 3.4 الثيم
`next-themes` مع `attribute="class"`، `defaultTheme="system"`، `enableSystem`. لازم `suppressHydrationWarning` على `<html>`. الـ toggle ثلاث حالات: Light / Dark / System.

---

## 4. Component Specs

### 4.1 Sidebar (desktop ≥ 1024px)
- عرض 240px، خلفية `--surface`، border-right `--border`.
- أعلى: `<Logo>` (ارتفاع ~56px)، تحته فاصل.
- عنصر nav: ارتفاع 44px، radius 12px، أيقونة 20px (stroke 1.75، مكتبة واحدة: lucide-react) + label 14/500.
- **Active:** خلفية `--brand`، نص `--brand-contrast`، + نقطة صغيرة (كما في المرجع). Hover: `--surface-raised`.
- العناصر الحالية: Dashboard, Members, Programs, Workouts, Classes, Coaches, Nutrition, Reports, Settings — **تتفلتر حسب الدور (ADMIN/HEAD_COACH/COACH/CLIENT) بنفس المنطق الموجود. ماتغيّرش الصلاحيات.**
- < 1024px: يتحول لـ drawer؛ على الموبايل الأساسي Bottom Nav.

### 4.2 Top Bar
- عنوان الصفحة h1 + سطر ترحيب muted ("Welcome back, {name}").
- يمين: زر Search، زر Notifications (نقطة حمراء 8px لو فيه جديد)، Avatar 36px + الاسم + chevron.
- Sticky، خلفية `--bg` مع `backdrop-blur` خفيف.

### 4.3 KPI Card
- Padding 16–20px، radius 16px، border 1px `--border`، `shadow-card`.
- أيقونة داخل دايرة 40px (لون accent/14% للخلفية، الأيقونة بلون accent كامل).
- الرقم: `kpi` (Inter 700 tnum). label: `label` muted. Trend badge: `label`، أخضر/أحمر، مع سهم، `+12%`.
- Dark: gradient خفيف جداً `linear-gradient(180deg, rgb(255 255 255 / .03), transparent)`. Light: ظل ناعم بدون gradient.
- Grid: desktop 4 أعمدة، tablet 2، mobile 2×2.
- Props: `{ label, value, delta?, icon, accent }` — القيم من الـ data الحالية.

### 4.4 Chart Card (Recharts)
- نفس شكل الكارت، عنوان h2 + فلتر اختياري.
- **Area chart** (Members Activity): stroke `--brand` 2px، fill gradient من `--brand` 35% → 0%، grid أفقي فقط بلون `--border` متقطع، محاور 11px muted، بدون axis lines، tooltip في كارت `--surface-raised` + border + radius 12px.
- **Bar chart** (Progress Overview): أعمدة radius أعلى 6px، الأعمدة الأقدم رمادي خفيف، الأحدث `--brand`.
- **Donut** (Memberships 76%): سمك 10–12px، track `--border`، progress `--brand`، الرقم في المنتصف `kpi`.
- الألوان تُقرأ من CSS variables (`getComputedStyle`) أو `fill="var(--brand)"`، مش hex.
- لازم `ResponsiveContainer` وحالة empty/loading لكل chart.

### 4.5 Class Row (Today's Classes)
- ارتفاع ~64px، radius 12px، خلفية `--surface-raised`، أيقونة في مربع 36px بـ `--brand-soft`.
- سطر 1: اسم الحصة (14/600)، سطر 2: `10:00 AM · 18 Members` (12 muted)، chevron يمين.
- الصف كله clickable (`<a>`/`<Link>`)، focus ring واضح.

### 4.6 Mobile (< 768px) — layout مستقل، مش مجرد responsive
- **Top:** Hero صغير بصورة المدرب (cutout أو بورتريه) + "Good Morning, {name}" بـ Barlow، الشعار الصغير (mark).
- **KPIs:** شبكة 2×2.
- **Today's Classes:** قائمة رأسية.
- **Bottom Nav:** 4 تبويبات (Home، Workouts، Classes، Profile)، ارتفاع 64px + safe-area، active بلون brand.
- أهداف اللمس ≥ 44×44px. لا hover-only interactions.

### 4.7 Buttons / Inputs / Badges
- Button: ارتفاع 40/44px، radius 12px. Primary = `--brand`، Secondary = border `--border`، Ghost. Disabled opacity .5. Loading = spinner + نفس العرض.
- Input: ارتفاع 44px، border `--border`، focus: ring 2px `--brand` عند 40% opacity.
- Badge: radius pill، خلفية 14% من اللون الدلالي، نص باللون الكامل.
- **Focus ring** لكل العناصر التفاعلية، مرئي في الثيمين.

### 4.8 Hero / Marketing Banner (اختياري)
المرجع فيه Banner (صورة مدرب + شعار + MANAGE/TRAIN/TRACK/PERFORM). ده **عنصر تسويقي** مش جزء من الـ app shell. يُنفَّذ فقط في Login/Landing لو اتطلب، وبعد توفر صور بدقة كافية (قسم 1.2).

---

## 5. حالات إلزامية لكل Component
Default · Hover · Focus · Active · Disabled · Loading (skeleton بنفس الأبعاد) · Empty · Error. في Dark و Light.

## 6. الـ Accessibility
- Contrast ≥ 4.5:1 للنص، ≥ 3:1 للأيقونات والعناصر الكبيرة. (الأرقام المحسوبة في قسم 3.1.)
- اللون وحده لا يحمل المعنى (الـ trend له سهم + علامة +/−).
- Keyboard navigation كامل، `aria-label` للأزرار الأيقونية، `aria-current="page"` للـ nav النشط.
- Charts: ملخص نصي أو جدول بديل (`sr-only`).

## 7. خطة التنفيذ (Vertical Slice)
1. Fonts + tokens + theme provider (بدون تغيير أي صفحة).
2. `<Logo>` + `<Mark>` + favicon.
3. App shell: Sidebar + Top Bar + Bottom Nav.
4. KPI Card → Chart Cards → Class Row.
5. Dashboard كامل (4 حالات: Desktop/Mobile × Dark/Light) ومقارنته بالمرجع.
6. استخراج المكتبة + Storybook.
7. باقي الشاشات واحدة واحدة.

## 8. التحقق (Definition of Done لكل Component)
- [ ] screenshots عند 1440px و 390px، Dark و Light، جنب المرجع.
- [ ] لا hex/px خارج الـ tokens (`grep -rE "#[0-9a-fA-F]{3,8}" components/` لازم يرجّع صفر خارج ملف الـ tokens والشعار).
- [ ] كل الحالات في قسم 5.
- [ ] `tsc` و `eslint` و الـ build ناجحين، والـ props لم تتغيّر.
- [ ] قائمة صريحة بالفروقات المتبقية عن المرجع.

## 9. قرارات مفتوحة (محتاجة رد من صاحب المشروع)
1. الصور الأصلية (دقة عالية، بدون watermark) + إذن الاستخدام.
2. الشعار الأصلي SVG من المصمم (نسخة التتبّع الحالية مؤقتة).
3. هل Banner الـ Hero جزء من الـ app (Login/Landing) ولا للتسويق بره؟
4. الشاشات الخالية من مرجع (Members table، Programs، Nutrition...) — نصمّمها بنفس اللغة ونعرضها للموافقة قبل التعميم؟
5. تأكيد قيم الألوان المعلّمة بـ `~` بالـ Eyedropper من نسخة المرجع الأصلية (مش من لقطة مضغوطة).

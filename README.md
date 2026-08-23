# Gazzar Coaching & Academy Management System 🏆

نظام متكامل لإدارة الأكاديميات الرياضية والكباتن والمشتركين مبني بـ Next.js 14 App Router, TypeScript, TailwindCSS, Prisma ORM, PostgreSQL, و Recharts.

## 🚀 التشغيل المحلي (Local Development)

```bash
# تثبيت الحزم
npm install

# توليد عميل بريزما
npx prisma generate

# تشغيل خادم التطوير
npm run dev
```

افتح المتصفح على [http://localhost:3000](http://localhost:3000)

## 🚢 النشر على Railway (Railway Deployment)

1. ارفع الكود إلى مستودع GitHub.
2. أنشئ مشروعاً جديداً على [Railway.app](https://railway.app) وأضف قاعدة بيانات **PostgreSQL**.
3. أضف خدمة جديدة من مستودع GitHub.
4. أضف متغير البيئة `DATABASE_URL` برابط البوستجريس.
5. سيقوم Railway بالبناء التلقائي وتشغيل التطبيق.
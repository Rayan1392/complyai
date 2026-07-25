# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## اجراهای حسابرسی (Audit Runs)

این پروتوتایپ اجراهای حسابرسی بلادرنگ و تاریخی/گروهی را به صورت شبیه‌سازی درون‌مرورگر (Mock) پیاده کرده است. وضعیت هر اجرا در یک Store سراسری نگهداری و در `localStorage` (کلید `dideban.auditRuns.v1`) پایدار می‌شود، تا با تغییر مسیر یا بازخوانی صفحه، پیشرفت براساس زمان سپری‌شده بازسازی گردد.

> در نسخهٔ واقعی، اجرای حسابرسی نباید در مرورگر انجام شود. اسکن اسناد، ارزیابی کنترل‌ها، تحلیل AI و تولید یافته‌ها باید توسط **Background Worker**ها روی سرور اجرا شوند و از یک **Message Queue** (مانند RabbitMQ، Kafka یا Redis Streams) برای صف‌بندی هر سند/مرحله استفاده شود. وضعیت اجرا، Checkpointها و رویدادها در پایگاه‌داده ذخیره و از طریق WebSocket/SSE به فرانت‌اند Stream می‌شوند. عملیات‌های Pause / Resume / Cancel / Retry باید به‌صورت پیام کنترلی به Worker ارسال شوند.

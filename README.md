# NestJS Telegram Multi-Bot Backend API

A production-ready **NestJS Backend API** for managing multiple Telegram bots, real-time customer support chat, background worker queues, and API Gateway capabilities for external integrations.

---

## 🚀 Key Features

- **Multi-Bot Management:** Register, manage, and configure webhooks dynamically for multiple Telegram bots.
- **API Gateway & Microservices:** Dedicated endpoints (`/client/service` and `/api/services`) with Bearer token authentication, permissions, IP allowlisting, rate-limiting, daily quotas, and audit logging.
- **Real-time WebSockets:** Integrated with **Pusher** for instantaneous message broadcasting.
- **Background Queue Processing:** Uses **BullMQ** and Redis for asynchronous background tasks (video processing, email queues).
- **Database & ORM:** Powered by **MySQL** and **Prisma ORM** for fully typed models.
- **Daily Rotating Logs:** Built-in Winston logging with log streaming endpoints for dashboard log viewers.

---

## 🛠️ Technology Stack

- **Framework:** NestJS 11 (Express platform)
- **Database ORM:** Prisma ORM & MySQL
- **Queues:** BullMQ & Redis
- **Telegram Wrapper:** Telegraf
- **WebSockets:** Pusher Server SDK
- **Logging:** Winston & winston-daily-rotate-file

---

## 📦 Getting Started

### Prerequisites

- **Node.js** (v18+ or v20+)
- **MySQL** (v8.0+) running locally or on a remote host
- **Redis** (v7+) running locally or on a remote host
- A Telegram account and Bot Token from [@BotFather](https://t.me/botfather)

### Installation & Local Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/nest-learn.git
   cd nest-learn
   ```

2. **Configure Environment:**
   Copy the sample `.env.example` to `.env` and set your database, Redis, and Telegram credentials:

   ```bash
   cp .env.example .env
   ```

3. **Install Dependencies:**

   ```bash
   npm install
   ```

4. **Run Database Migrations & Prisma Generation:**

   ```bash
   npx prisma db push
   npx prisma generate
   ```

5. **Start Development Server:**
   ```bash
   npm run start:dev
   ```
   The API will start at `http://localhost:3000`.

---

## 🏗️ Project Structure

```text
├── prisma/                 # Database Schema, Migrations & Seeds
│   └── schema.prisma       # Prisma data models
├── src/                    # NestJS Backend API
│   ├── admin/              # Admin CRUD endpoints (bots, users, messages, agents)
│   ├── admin-clients/      # Client API token management & audit logs
│   ├── api-services/       # Secret-authenticated service dispatcher
│   ├── auth/               # Passport JWT authentication
│   ├── client-service/     # Modern API Gateway (Bearer tokens, Quotas, Rate limits)
│   ├── common/             # Global interceptors, filters, and Winston logger
│   ├── emails/             # BullMQ email queue & processor
│   ├── logs/               # Rotating file logs endpoint
│   ├── pusher/             # Real-time WebSocket broadcasting
│   ├── telegram/           # Multi-bot management, webhook handlers & media handling
│   └── videos/             # BullMQ video processing queue & worker
├── storage/                # Media uploads and daily rotating log files
└── deploy.sh               # Node.js / PM2 deployment script
```

---

## 📝 License

This project is licensed under the MIT License.

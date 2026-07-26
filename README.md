# NestJS Telegram Multi-Bot Dashboard

A comprehensive, production-ready platform for managing multiple Telegram bots from a single, unified web dashboard. Built with a powerful **NestJS** backend and a reactive **Vue 3** frontend, this system allows you to manage users, send text and media messages, process background jobs, and monitor system health all in one place.

---

## 🚀 Key Features

* **Multi-Bot Management:** Add and manage multiple Telegram bots simultaneously using their bot tokens. Webhooks are automatically configured.
* **Unified Chat Interface:** A beautiful Vue 3 frontend dashboard to interact with users across all your bots. Send text, images, videos, and documents seamlessly.
* **Real-time Updates:** Powered by **Pusher**, incoming Telegram messages instantly appear in the web dashboard without needing to refresh.
* **Database & ORM:** Built on **MySQL** and **Prisma ORM** for type-safe, robust data modeling (Users, Bots, Messages, etc.).
* **Background Processing:** Integrated with **BullMQ** and Redis to handle heavy tasks (like video processing and email queuing) asynchronously without blocking the main event loop.
* **Built-in Log Viewer:** Uses **Winston** for daily rotating file logs, which are accessible directly through a beautiful custom UI built into the dashboard.

## 🛠️ Technology Stack

### Backend
- **NestJS** (Node.js Framework)
- **Prisma** (Next-generation ORM)
- **MySQL** (Relational Database)
- **BullMQ & Redis** (Background Jobs & Message Queues)
- **Telegraf** (Telegram Bot API Wrapper)
- **Winston** (Advanced Logging)

### Frontend
- **Vue 3** (Composition API)
- **Vite** (Next Generation Frontend Tooling)
- **TailwindCSS** (Utility-first CSS framework)

---

## 📦 Getting Started

### Prerequisites
Make sure you have the following installed on your system:
- **Node.js** (v18 or higher)
- **Docker** and **Docker Compose** (for easy database and redis setup)
- A Telegram account (to create bots via [@BotFather](https://t.me/botfather))

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/nest-telegram-dashboard.git
   cd nest-telegram-dashboard
   ```

2. **Environment Configuration:**
   Copy the `.env.example` file to `.env` and fill in your details:
   ```bash
   cp .env.example .env
   ```
   *Make sure to set `TELEGRAM_WEBHOOK_DOMAIN` to your public URL (e.g., ngrok URL for local development) so Telegram can send updates to your backend.*

3. **Start the Infrastructure (Database & Redis):**
   ```bash
   docker-compose up -d
   ```

4. **Install Dependencies:**
   ```bash
   # Install backend dependencies
   npm install

   # Install frontend dependencies
   cd client && npm install && cd ..
   ```

5. **Run Database Migrations:**
   ```bash
   npx prisma db push
   npx prisma generate
   ```

6. **Build the Frontend:**
   ```bash
   cd client && npm run build && cd ..
   ```

7. **Start the Application:**
   ```bash
   npm run start:dev
   ```

---

## 💻 Usage

1. Open your browser and navigate to `http://localhost:3000`.
2. Click on the **"Add Bot"** button in the sidebar.
3. Paste the Bot Token provided by Telegram's BotFather.
4. The system will automatically register the bot, set up the webhook, and start listening for messages!
5. When a user messages your bot on Telegram, they will appear in the dashboard where you can chat with them directly.
6. Click **"System Logs"** at the bottom of the sidebar to view backend activity and errors in real-time.

---

## 🏗️ Project Structure

```text
├── client/                 # Vue 3 Frontend SPA
│   ├── src/components/     # UI Components (ChatArea, Sidebar, LogsViewer)
│   └── src/services/       # API integration
├── prisma/                 # Database Schema & Migrations
│   └── schema.prisma       # Prisma data models
├── src/                    # NestJS Backend
│   ├── telegram/           # Telegram core logic & webhook handlers
│   ├── logs/               # Log serving endpoints
│   ├── emails/             # Email services
│   ├── videos/             # Video processing & BullMQ workers
│   └── pusher/             # Websocket event broadcasting
└── storage/                # Local file storage (Media & Logs)
```

## 📝 License

This project is licensed under the MIT License. Feel free to use it, modify it, and contribute!

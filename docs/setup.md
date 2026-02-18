# 🛠️ Local Development Setup

This guide walks you through setting up the High-Concurrency Flash Sale Engine locally.

## Prerequisites

- **Node.js**: v18 or higher (LTS recommended)
- **PostgreSQL**: A running instance (or use Neon/Supabase)
- **Redis**: A running instance (or use Upstash)
- **Git**: For version control

## Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/flash-sale-engine.git
    cd flash-sale-engine
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

## Configuration (.env)

Create a `.env` file in the root directory with the following variables:

```env
# Database Connection String (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/flash_sale_db"

# Redis Connection URL
REDIS_URL="redis://default:password@localhost:6379"

# API Base URL for Frontend (Vite)
VITE_API_URL="http://127.0.0.1:3000"

# Server Port
PORT=3000
```

## Running the Application

Start both the frontend (Vite) and backend (Express + Worker) concurrently:

```bash
npm run dev
```

-   **Frontend**: http://127.0.0.1:5173
-   **Backend**: http://127.0.0.1:3000

## Database Initialization

To seed the initial product data (ID: `sneaker-001`, Stock: 100):

```bash
npm run db:init
# Or manually run the script:
# npx tsx server/scripts/initDb.ts
```

## Admin Commands

The backend exposes hidden endpoints for controlling the sale simulation. You can trigger these via curl or Postman:

### **1. Open Sale** (Start Traffic)
```bash
curl -X POST http://127.0.0.1:3000/api/admin/open
```

### **2. Close Sale** (Stop Traffic)
```bash
curl -X POST http://127.0.0.1:3000/api/admin/close
```

### **3. Restock Inventory** (Reset to 100)
```bash
curl -X POST http://127.0.0.1:3000/api/admin/restock \
  -H "Content-Type: application/json" \
  -d '{"productId": "sneaker-001", "amount": 100}'
```

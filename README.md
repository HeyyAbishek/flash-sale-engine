# Flash Sale Engine - High-Concurrency E-Commerce Backend

![Status](https://img.shields.io/badge/Status-Production-success)
![Concurrency](https://img.shields.io/badge/Concurrency-10k%2B_Concurrent-blueviolet)
![Latency](https://img.shields.io/badge/Latency-%3C50ms-green)
![Architecture](https://img.shields.io/badge/Architecture-Event--Driven-orange)
![Database](https://img.shields.io/badge/Database-PostgreSQL%20%7C%20Prisma-blue)
![Queue](https://img.shields.io/badge/Queue-Redis%20%7C%20BullMQ-red)
![Realtime](https://img.shields.io/badge/Realtime-Socket.io-orange)

**Flash Sale Engine** is a production-grade, high-concurrency backend engineered to handle extreme traffic spikes and prevent overselling during limited-inventory flash sales. It guarantees inventory consistency using **PostgreSQL row-level locking** and transactional processing, while **Redis** and **BullMQ** handle asynchronous workloads and **Socket.io** delivers real-time inventory updates to connected clients.

<img width="1919" height="1021" alt="Screenshot 2026-03-09 004514" src="https://github.com/user-attachments/assets/5a0b5355-a81f-4ce8-933d-305f73b08cb3" />



## 🚀 Live Demo


https://github.com/user-attachments/assets/f04bbc7d-021c-4757-b223-1a69ff2d48e9










**[👉 View Live Deployment](https://flash-sale-engine-chi.vercel.app/)**
*(Open this in two different tabs to see the real-time stock sync in action!)*

## 📚 Documentation

I have documented the engineering decisions and system design in detail:

* **[System Architecture](./docs/architecture.md):** Breakdown of the Hybrid Cloud setup (Vercel + Render), Redis Queues, and Database Locking strategies.
* **[Technical Challenges](./docs/challenges.md):** Deep dive into preventing Race Conditions, handling the "Thundering Herd," and optimizing latency.
* **[Local Setup Guide](./docs/setup.md):** Instructions to run the engine locally with Docker or Node.js.

## ✨ Key Features

* **Concurrency Control:** Uses `SELECT ... FOR UPDATE` (Pessimistic Locking) to strictly prevent negative stock.
* **Idempotency:** Prevents accidental duplicate orders caused by network retries or "double-clicking" using unique request keys (Redis-backed).
* **Traffic Throttling:** Implements a **Redis Message Queue (BullMQ)** to serialize thousands of concurrent requests.
* **Real-Time Sync:** **Socket.io** broadcasts inventory changes to all connected clients in <50ms.
* **Bot Protection:** Custom rate-limiting middleware to block aggressive scripts.
* **Admin Dashboard:** Real-time control panel to Open/Close sales and Restock inventory live.

---

*Built by [Abishek Jha](https://github.com/HeyyAbishek)*

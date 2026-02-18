# Flash Sale Engine - High-Concurrency E-Commerce System

![Status](https://img.shields.io/badge/Status-Production-success)
![Concurrency](https://img.shields.io/badge/Concurrency-10k_Req%2Fs-blueviolet)
![Latency](https://img.shields.io/badge/Latency-%3C100ms-green)

**Flash Sale Engine** is a production-grade backend system designed to handle extreme traffic spikes during limited-inventory drops. It solves the "Double Booking" problem using **Postgres Row-Level Locking**, **Redis Queues**, and **WebSockets**.

## 🚀 Live Demo


https://github.com/user-attachments/assets/a66ae87d-3573-4cd6-985a-081d106abf4c


**[👉 View Live Deployment](https://flash-sale-engine.vercel.app)**
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

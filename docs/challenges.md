# 💥 Technical Challenges & Solutions

Handling flash sales presents unique engineering challenges due to extreme concurrency and the potential for severe data inconsistencies. This document outlines the key problems encountered and their robust solutions.

## 1. The Race Condition (Overselling)

### **The Problem**
In a traditional web application, multiple users might attempt to buy the last item simultaneously. If two requests read the stock as `1` at the same time, both might decrement it to `0` and successfully place an order. This results in **overselling**, where you sell more inventory than you physically possess.

### **The Solution: Pessimistic Locking**
We employ **Pessimistic Locking** at the database level using PostgreSQL's `SELECT ... FOR UPDATE` clause.

-   When a worker processes a purchase job, it opens a transaction.
-   It selects the product row and locks it exclusively.
-   Other transactions attempting to read or modify this row must wait until the first transaction commits or rolls back.
-   This serializes access to the critical inventory counter, guaranteeing atomicity and preventing race conditions entirely.

---

## 2. The Thundering Herd

### **The Problem**
When a highly anticipated sale opens, thousands of users click "Buy" within milliseconds. Directly hitting the database with thousands of concurrent write operations would instantly exhaust connection pools, cause timeouts, and potentially crash the entire database service. This is known as the "Thundering Herd" problem.

### **The Solution: Redis Queue as a Shock Absorber**
We introduced a **Redis-based Job Queue (BullMQ)** between the API and the Database.

-   **Decoupling**: The API simply validates the request and pushes a lightweight job to Redis (an O(1) operation).
-   **Throughput**: Redis can handle tens of thousands of writes per second with sub-millisecond latency.
-   **Controlled Processing**: A separate Worker process consumes jobs from the queue at a manageable rate (e.g., 50 jobs/sec).
-   **Backpressure**: If the queue fills up, the API can quickly return a `429 Too Many Requests` or `503 Service Unavailable` without impacting the database.

---

## 3. Real-Time State Desynchronization

### **The Problem**
In a fast-moving sale, stock levels change hundreds of times per second. Traditional polling (client asking "Is it sold out yet?" every 2 seconds) is too slow and creates unnecessary server load. Users might see "In Stock" when the item is actually gone, leading to frustration and failed checkout attempts.

### **The Solution: WebSockets (Socket.io)**
We utilize **Socket.io** for persistent, bidirectional communication.

-   **Event-Driven Updates**: The server pushes a `stock-update` event immediately after a successful purchase transaction.
-   **Latency**: Updates reach the client in sub-50ms (network dependent), ensuring the UI reflects the true state of the inventory in near real-time.
-   **Efficiency**: Eliminates the overhead of HTTP headers and connection establishment for every single status check.
-   **Global State Management**: Allows instant broadcasting of "Sale Closed" or "Restock" events to all connected clients simultaneously.

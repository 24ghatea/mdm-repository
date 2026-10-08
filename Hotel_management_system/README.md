# 🌿 Verdanté Hotel — Room Booking & Property Management System

A boutique full-stack **Hotel Room Booking System** built with **Node.js, Express.js, SQLite**, and modern **Vanilla HTML5/CSS3/JavaScript**. This project demonstrates clean RESTful API design, database schema constraints, atomic double-booking prevention, dynamic asynchronous UI updates via the Fetch API, and a boutique hospitality design system.

---

## 📸 Key Features

- **Executive Property Dashboard**:
  - Live KPI metrics (Total Rooms, Available Today, Occupied/Booked, Total Reservations, Estimated Revenue).
  - Quick availability search widget with real-time period filtering.
  - Recent guest reservations table with instant status actions.
  - Live visual room inventory snapshot.
- **Complete Room Management (CRUD)**:
  - Add, View, Edit, and Delete hotel rooms.
  - Room categories: *Single*, *Double*, *Deluxe*, and *Presidential Suite*.
  - Live filtering by room type and availability status (*Available*, *Booked*, *Maintenance*).
  - Instant toggle between **Card/Grid View** and **Data Table View**.
  - Quick-book modal triggered directly from any room card.
- **Reservation & Booking Management (CRUD)**:
  - Create guest bookings with automated stay duration & total charge calculation.
  - Search reservations by guest name, email, phone, room number, or folio ID.
  - Filter bookings by status (*Confirmed*, *Completed*, *Cancelled*).
  - Cancel and Delete actions with custom confirmation dialogs.
  - **Guest Folio & Statement Generator**: View and print itemized guest receipts.
- **Double-Booking Overlap Prevention Engine**:
  - Implements backend mathematical date collision algorithm:
    $$\text{requested\_checkin} < \text{existing\_checkout} \quad\land\quad \text{requested\_checkout} > \text{existing\_checkin}$$
  - Returns `409 Conflict` with clear explanation if a date conflict occurs.
  - Seamlessly allows adjacent check-ins (e.g., Guest A checks out Oct 15, Guest B checks in Oct 15).
  - Re-activates room availability immediately when bookings are cancelled.
- **Design System & UX**:
  - Warm luxury boutique aesthetic (Ivory, Deep Charcoal, Muted Emerald, Champagne Gold).
  - Responsive design across desktop, tablet, and mobile with animated slide-in drawer menu.
  - Custom toast notifications, glassmorphism modal dialogs, loading spinners, and empty states.
  - Zero third-party frontend frameworks (pure Vanilla JS and CSS3).

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript | Native DOM manipulation, CSS Variables, Fetch API |
| **Backend** | Node.js, Express.js (v5) | RESTful API, validation middleware, routing |
| **Database** | SQLite3 (`better-sqlite3`) | High-performance embedded relational database |
| **Testing** | Native Node.js Test Runner | 17-point automated API and business logic test suite |

---

## 📂 Project Architecture

```
hotel-management-system/
│
├── frontend/                     # Client-side presentation layer
│   ├── index.html                # Executive Dashboard & Search page
│   ├── rooms.html                # Room Inventory Management (Grid/Table)
│   ├── bookings.html             # Reservations, Folios & Bookings page
│   ├── css/
│   │   ├── style.css             # Design tokens, boutique UI styling & components
│   │   └── responsive.css        # Responsive layouts & mobile drawer navigation
│   └── js/
│       ├── app.js                # Dashboard controller & availability search
│       ├── rooms.js              # Room CRUD controller & view toggles
│       ├── bookings.js           # Bookings controller & Folio generator
│       └── utils.js              # Fetch API wrapper, toasts, modals, formatters
│
├── backend/                      # Server-side business logic & REST API
│   ├── server.js                 # Express server configuration & static server
│   ├── database/
│   │   ├── db.js                 # SQLite connection, pragmas, and auto-seeder
│   │   └── schema.sql            # Table definitions, constraints, and indexes
│   ├── routes/
│   │   ├── roomRoutes.js         # /api/rooms router
│   │   ├── bookingRoutes.js      # /api/bookings router
│   │   └── dashboardRoutes.js    # /api/dashboard router
│   ├── controllers/
│   │   ├── roomController.js     # Room CRUD & date availability query
│   │   ├── bookingController.js  # Booking CRUD & cancellation logic
│   │   └── dashboardController.js# KPI aggregations & live metrics
│   ├── middleware/
│   │   ├── validation.js         # Input validation & sanitization
│   │   └── errorHandler.js       # Centralized error handler
│   └── utils/
│       └── bookingUtils.js       # Overlap collision logic & status sync
│
├── database/
│   └── hotel.db                  # Persistent SQLite database file
│
├── test/
│   └── api.test.js               # Comprehensive 17-step automated test suite
│
├── package.json                  # Dependencies & execution scripts
├── README.md                     # Comprehensive project documentation
└── .gitignore                    # Version control ignore definitions
```

---

## 🗄️ Database Schema

### 1. `rooms` Table
```sql
CREATE TABLE rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_number TEXT NOT NULL UNIQUE COLLATE NOCASE,
    type TEXT NOT NULL CHECK(type IN ('Single', 'Double', 'Deluxe', 'Suite')),
    price REAL NOT NULL CHECK(price > 0),
    status TEXT NOT NULL DEFAULT 'Available' CHECK(status IN ('Available', 'Booked', 'Maintenance')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2. `bookings` Table
```sql
CREATE TABLE bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    guest_name TEXT NOT NULL,
    guest_email TEXT NOT NULL,
    guest_phone TEXT NOT NULL,
    check_in TEXT NOT NULL,  -- Format: YYYY-MM-DD
    check_out TEXT NOT NULL, -- Format: YYYY-MM-DD
    status TEXT NOT NULL DEFAULT 'Confirmed' CHECK(status IN ('Confirmed', 'Cancelled', 'Completed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT
);
```

---

## 📡 RESTful API Endpoints

### 🏨 Rooms API
| Method | Endpoint | Description | Status Codes |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/rooms` | Retrieve all rooms (supports `?type=`, `?status=`, `?search=`) | `200` |
| `GET` | `/api/rooms/available` | Search available rooms (`?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD&type=`) | `200`, `400` |
| `GET` | `/api/rooms/:id` | Get room details with recent reservation history | `200`, `400`, `404` |
| `POST` | `/api/rooms` | Create a new room | `201`, `400`, `409` |
| `PUT` | `/api/rooms/:id` | Update an existing room | `200`, `400`, `404`, `409` |
| `DELETE`| `/api/rooms/:id` | Delete a room (blocked if active bookings exist) | `200`, `400`, `404`, `409` |

### 📅 Bookings API
| Method | Endpoint | Description | Status Codes |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/bookings` | List all bookings (supports `?status=`, `?search=`, `?roomId=`) | `200` |
| `GET` | `/api/bookings/:id` | Get booking details with room rates & stay totals | `200`, `400`, `404` |
| `POST` | `/api/bookings` | Create new reservation (validates overlap & constraints) | `201`, `400`, `404`, `409` |
| `PUT` | `/api/bookings/:id` | Update reservation details/dates | `200`, `400`, `404`, `409` |
| `PATCH`| `/api/bookings/:id/cancel` | Cancel booking and release room | `200`, `400`, `404` |
| `DELETE`| `/api/bookings/:id` | Permanently delete booking record | `200`, `400`, `404` |

### 📊 Dashboard API
| Method | Endpoint | Description | Status Codes |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/dashboard/stats` | Retrieve aggregated KPIs, revenue, breakdown, & recent stays | `200` |

---

## ⚡ Quick Start & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18.x or higher)
- npm (version 9.x or higher)

### 1. Installation
Open your terminal in the project root directory and run:
```bash
npm install
```

### 2. Run the Application
Start the backend server:
```bash
npm start
```
*Or run with auto-reload during development:*
```bash
npm run dev
```

### 3. Open in Browser
Visit **[http://localhost:3000](http://localhost:3000)** in any modern web browser.

The database auto-initializes on startup with 12 sample luxury rooms (Single, Double, Deluxe, Suite) and active/historical reservations.

---

## 🧪 Running Automated Tests

A comprehensive 17-point test suite is included to verify all REST endpoints, constraint validations, and double-booking collision rules:

```bash
npm test
```

### Verified Test Cases:
1. Health check endpoint responds `200 UP`
2. Dashboard metrics and revenue calculation
3. Room creation (`201 Created`)
4. Duplicate room number rejection (`409 Conflict`)
5. Negative/zero room price validation (`400 Bad Request`)
6. Room query filtering by type
7. Room details update (`200 OK`)
8. Initial booking creation (`201 Created`)
9. **Overlap collision rejection** (e.g. 10th-15th blocked by 12th-17th with `409 Conflict`)
10. **Internal overlap rejection** (e.g. 11th-14th blocked with `409 Conflict`)
11. **Adjacent check-in accepted** (New check-in on existing check-out date succeeds)
12. **Adjacent check-out accepted** (New check-out on existing check-in date succeeds)
13. Invalid email syntax rejection (`400 Bad Request`)
14. Reversed dates check-out $\le$ check-in rejection (`400 Bad Request`)
15. Booking cancellation (`200 OK`)
16. **Post-cancellation re-booking**: Previously blocked dates become available
17. Date-range room availability search

---

## 🎓 Academic Concepts Demonstrated

- **Full-Stack Architecture**: Clean decoupling of UI presentation (`frontend/`), Express REST routing (`backend/routes/`), controllers (`backend/controllers/`), and persistent data layer (`backend/database/`).
- **RESTful API Principles**: Proper semantic HTTP verbs (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`), accurate status codes (`200`, `201`, `400`, `404`, `409`), and standard JSON error response structures.
- **Relational Database Design**: Foreign key referential integrity between `bookings.room_id` and `rooms.id`, check constraints, collations, and B-tree indexes.
- **Double-Booking Collision Algorithm**: Mathematical range intersection logic executed on the backend to enforce zero room overbooking.
- **Dynamic Frontend**: Modern asynchronous AJAX data fetching via the native `Fetch API`, DOM manipulation without full-page reloads, custom modal lifecycles, and toast notifications.

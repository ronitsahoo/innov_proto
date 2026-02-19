# ARIA - Academic Registration Intelligence Assistant

Detailed monorepo setup for ARIA.

## Structure

- **frontend/**: React + Vite application
- **backend/**: Node.js + Express + MongoDB application

## Setup Instructions

### 1. Backend Setup

```bash
cd backend
npm install
# Make sure your MongoDB is running or update .env with valid MONGO_URI
npm run dev
```

The backend server will start on port 5000.

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on http://localhost:5173 (or similar).

## Environment Variables

Check `backend/.env` and `frontend/.env` for configuration.

## Features

- JWT Authentication (HttpOnly Cookies)
- Role-based Access Control (Student, Admin, Staff)
- Student Profile & Document Uploads
- Razorpay Payment Integration
- Admin Dashboard with Analytics

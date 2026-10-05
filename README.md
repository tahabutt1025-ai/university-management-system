# 🎓 UniManage — University Management System

A full-stack web application with AI-powered analytics for university/academy academic management.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://your-project.vercel.app)
[![Backend](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render)](https://your-api.onrender.com/api/health)

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js 19 + Vite + Recharts |
| Backend | Node.js + Express.js 5 |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| AI | Rule-based engine + OpenAI API (optional) |

---

## ✨ Features

- 👑 **Admin Dashboard** — Manage users, departments, fees, analytics
- 👨‍🏫 **Teacher Panel** — Attendance, grades, assignments
- 👨‍🎓 **Student Portal** — View grades, attendance, fees, assignments
- 📊 **AI Analytics** — At-risk student detection, automated alerts
- 💰 **Fee Management** — Track and record fee payments
- 🔔 **Notifications** — Real-time notification system
- 🔐 **Role-based Access** — Admin / Teacher / Student roles

---

## 📦 Project Structure

```
university-management-system/
├── server.js              # Express server entry point
├── seed.js                # Database seeder (demo data)
├── .env.example           # Environment variable template
├── render.yaml            # Render.com deployment config
├── models/                # Mongoose models
│   ├── User.js, Student.js, Teacher.js
│   ├── Course.js, Attendance.js, Grade.js
│   ├── Assignment.js, Fee.js, Notification.js
├── routes/                # API routes (11 modules)
├── middleware/            # JWT auth middleware
└── client/                # React frontend (Vite)
    ├── vercel.json        # Vercel deployment config
    └── src/
        ├── pages/         # Admin, Teacher, Student pages
        ├── context/       # Auth context
        ├── api/           # Axios API client
        └── components/    # Reusable components
```

---

## 🔑 Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| 👑 Admin | admin@university.edu | Admin@123 |
| 👨‍🏫 Teacher | ali@university.edu | Teacher@123 |
| 👨‍🎓 Student | ahmed1@student.edu | Student@123 |

---

## ⚙️ Local Setup

### Prerequisites
- Node.js v16+
- MongoDB running locally **OR** MongoDB Atlas account

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/university-management-system.git
cd university-management-system
```

### 2. Backend Setup
```bash
# Install dependencies
npm install

# Copy env template and fill in your values
cp .env.example .env

# Seed demo data
npm run seed

# Start backend (port 5000)
npm run dev
```

### 3. Frontend Setup
```bash
cd client
npm install

# Copy env template
cp .env.example .env.local
# Edit .env.local and set VITE_API_URL=http://localhost:5000/api

npm run dev   # Starts on http://localhost:3000
```

---

## 🌐 Deployment Guide

### 🗄️ Step 1: MongoDB Atlas (Free Database)
1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → Create free account
2. Create a **free M0 cluster**
3. Create a **database user** (save username & password)
4. Get connection string: `mongodb+srv://user:pass@cluster.mongodb.net/university_management`
5. In **Network Access**, allow `0.0.0.0/0` (all IPs)

### ⚙️ Step 2: Deploy Backend on Render.com (Free)
1. Go to [render.com](https://render.com) → Sign up with GitHub
2. Click **New → Web Service** → Connect your GitHub repo
3. Set these settings:
   - **Root Directory**: ` ` (leave empty, it's the repo root)
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
4. Add **Environment Variables**:
   ```
   NODE_ENV=production
   MONGO_URI=<your Atlas connection string>
   JWT_SECRET=<any long random string>
   JWT_EXPIRE=7d
   CLIENT_URL=https://your-project.vercel.app
   ```
5. Deploy → Copy your backend URL (e.g., `https://university-management-api.onrender.com`)

### 🖥️ Step 3: Deploy Frontend on Vercel (Free)
1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
2. Click **Add New → Project** → Import your GitHub repo
3. Set **Root Directory** to `client`
4. Add **Environment Variable**:
   ```
   VITE_API_URL=https://your-backend.onrender.com/api
   ```
5. Deploy → Your app is live! 🎉

### 🔄 Step 4: Update CORS
After Vercel deploys, go back to Render and update:
```
CLIENT_URL=https://your-actual-vercel-url.vercel.app
```

---

## 🌐 API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/login | Login |
| POST | /api/auth/register | Register |
| GET | /api/students | List students (Admin/Teacher) |
| POST | /api/attendance | Mark attendance |
| POST | /api/grades/bulk | Bulk grade upload |
| GET | /api/analytics/at-risk | Get at-risk students |
| POST | /api/analytics/send-alerts | Send AI alerts |
| GET | /api/health | Health check |

---

## 📊 Role Permissions

| Feature | Admin | Teacher | Student |
|---------|-------|---------|---------|
| Manage Users | ✅ | ❌ | ❌ |
| View All Students | ✅ | ✅ | ❌ |
| Mark Attendance | ✅ | ✅ | ❌ |
| Upload Grades | ✅ | ✅ | ❌ |
| View Own Grades | ✅ | N/A | ✅ |
| AI Analytics | ✅ | ✅ | ❌ |
| Fee Management | ✅ | ❌ | View only |

---

## 🤖 AI Analytics Features

- **Rule-based Pattern Detection**: Auto-detects attendance drops, grade decline, day-of-week patterns
- **OpenAI Integration**: Add `OPENAI_API_KEY` to `.env` for natural language AI insights
- **Automated Alerts**: One-click to notify all at-risk students and admins

---

## 📝 License

This project is for educational and commercial use. Feel free to customize and sell to academies/universities.

---

**Made with ❤️ | University Management System v1.0**

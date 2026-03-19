# LikeCircle - Anonymous Discussion Forum

<p align="center">
  <img src="https://img.shields.io/badge/React-19.2.3-61DAFB?style=flat-square&logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.8.2-3178C6?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Node.js-Express.js-339933?style=flat-square&logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=flat-square&logo=postgresql" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Real%20Time-Socket.IO-010101?style=flat-square&logo=socket.io" alt="Socket.IO">
  <img src="https://img.shields.io/badge/Auth-Google%20OAuth-4285F4?style=flat-square&logo=google" alt="Google OAuth">
  <img src="https://img.shields.io/badge/Deployment-Render-46E3B7?style=flat-square&logo=render" alt="Render">
  <img src="https://img.shields.io/badge/Frontend-Vercel-000000?style=flat-square&logo=vercel" alt="Vercel">
</p>

> A minimalist anonymous discussion platform where identity is replaced by context-aware aliases within private and public circles.

## 🎯 Overview

LikeCircle is a full-stack real-time forum application that enables anonymous discussions through randomly-generated aliases. Users can create or join topic-based circles (communities), participate in threaded conversations, and interact in real-time with other anonymous members.

### Key Features

- **🔐 Anonymous Identity System**: Users participate under randomly-generated aliases (e.g., "BraveOtter4521") that provide privacy while maintaining accountability
- **🌐 Real-time Messaging**: Instant message delivery and user presence via WebSocket connections
- **📁 Circle-based Communities**: Public and private circles for topic-specific discussions
- **🔒 Password-protected Circles**: Private circles with optional password protection
- **💬 Threaded Discussions**: Nested message replies with a 10-minute edit window
- **📱 Responsive Design**: Mobile-first, minimalist aesthetic with glassmorphism UI
- **🔄 JWT Authentication**: Secure token-based authentication with Google OAuth
- **☁️ Cloud-Native Architecture**: Deployed on Vercel (frontend) and Render (backend)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client (Browser)                       │
│                   React 19 + TypeScript                  │
│                  Vite Build System                       │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS + WebSocket
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   Backend Server                         │
│           Node.js + Express.js + Socket.IO              │
│                  Render Cloud Service                    │
└────────────────────────┬────────────────────────────────┘
                         │ PostgreSQL Connection
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                   │
│              Supabase Cloud (Free Tier)                 │
│                    5 Core Tables                        │
└─────────────────────────────────────────────────────────┘
```

## 🗂️ Project Structure

```
LikeCircle/
├── 📄 App.tsx                    # Main React application entry
├── 📄 index.tsx                  # React DOM rendering entry point
├── 📄 index.html                 # HTML template
│
├── 📁 pages/                     # Route-level page components
│   ├── Login.tsx                 # Google OAuth authentication page
│   ├── Dashboard.tsx             # User's home - circle grid overview
│   ├── CircleView.tsx            # Real-time discussion page
│   ├── Discover.tsx              # Browse/search public circles
│   └── Settings.tsx              # User preferences and account settings
│
├── 📁 components/               # Reusable UI components
│   ├── CreateCircleModal.tsx     # Modal for creating new circles
│   ├── Post.tsx                  # Individual message/post component
│   └── Metaballs.tsx             # Animated background effect
│
├── 📁 services/                  # Business logic and external integrations
│   ├── authService.ts            # Google OAuth + JWT token management
│   ├── circleService.ts          # Circle CRUD operations
│   ├── socketService.ts          # WebSocket real-time communication
│   ├── apiClient.ts              # HTTP client with token refresh
│   └── tokenRefreshService.ts    # JWT refresh token lifecycle
│
├── 📄 types.ts                   # TypeScript interfaces and enums
├── 📄 constants.ts               # Color palette and alias generation words
│
├── 📄 server.cjs                 # Express.js backend + Socket.IO (801 lines)
├── 📄 db.cjs                     # PostgreSQL connection + schema initialization
├── 📄 migrate-aliases.cjs        # Database migration scripts
│
├── 📁 node_modules/              # Dependencies
├── 📄 package.json                # Project metadata and scripts
├── 📄 vite.config.ts             # Vite build configuration
└── 📄 tsconfig.json              # TypeScript configuration
```

## 🛠️ Tech Stack

### Frontend
- **React 19.2.3** - UI library
- **TypeScript 5.8.2** - Type safety
- **Vite 6.2.0** - Build tool and dev server
- **React Router 7.11.0** - Client-side routing
- **Socket.IO Client 4.7.0** - Real-time communication
- **@react-oauth/google 0.13.4** - Google OAuth integration

### Backend
- **Node.js** - JavaScript runtime
- **Express.js 5.2.1** - REST API framework
- **Socket.IO 4.7.0** - WebSocket server
- **PostgreSQL** - Relational database
- **JWT (jsonwebtoken 9.0.3)** - Token authentication
- **Google Auth Library 10.5.0** - OAuth token verification
- **pg 8.16.3** - PostgreSQL client
- **cors 2.8.5** - Cross-origin resource sharing
- **dotenv 17.2.3** - Environment variable management

### Deployment
- **Vercel** - Frontend hosting
- **Render** - Backend service hosting
- **Supabase** - PostgreSQL database (free tier)

## 📊 Database Schema

### Users Table
```sql
users (
  id SERIAL PRIMARY KEY,
  google_sub VARCHAR(255) UNIQUE,
  email VARCHAR(255),
  name VARCHAR(255),
  avatar TEXT,
  alias VARCHAR(255),           -- Randomly generated anonymous identity
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Circles Table
```sql
circles (
  id SERIAL PRIMARY KEY,
  created_by INTEGER REFERENCES users(id),
  name VARCHAR(255),
  description TEXT,
  type VARCHAR(20),             -- 'public' or 'private'
  is_private BOOLEAN,
  password_hash VARCHAR(255),    -- For private circles
  member_count INTEGER,          -- Denormalized for performance
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Memberships Table
```sql
memberships (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  circle_id INTEGER REFERENCES circles(id),
  alias VARCHAR(255),           -- Per-circle unique alias
  joined_at TIMESTAMP,
  UNIQUE(user_id, circle_id)
)
```


## 🔐 Security Features

### Authentication
- **Google OAuth 2.0** for user authentication
- **JWT Access Tokens** (15-minute expiry) for API authorization
- **JWT Refresh Tokens** (7-day expiry) for seamless re-authentication
- **Token rotation** with revocation support

### Authorization
- **Circle membership validation** for all operations
- **Message ownership verification** for edit/delete actions
- **Time-limited edits** (10-minute window) to prevent abuse
- **Password hashing** for private circles using bcrypt (implicit)

### Privacy
- **Anonymous aliases** replace real identities in discussions
- **Per-circle alias system** prevents cross-circle identification
- **No real names exposed** in public or private circles

## ⚡ Real-time Features

### WebSocket Events

**Client → Server:**
- `join-circle` - User enters a circle room
- `send-message` - Post new message or reply

**Server → Client:**
- `new-message` - Broadcast new message to all members
- `user-joined` - Notify when member enters circle
- `user-left` - Notify when member leaves
- `message-updated` - Broadcast edit notifications
- `message-error` - Error handling for failed operations

### User Presence
- Real-time active user count per circle
- Join/leave notifications
- Connection status monitoring

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+ (or Supabase account)
- Google Cloud Console project (for OAuth credentials)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/roshanimmanuel792/LikeCircle_v1.git
cd LikeCircle_v1
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment setup**
```bash
cp .env.example .env
# Edit .env with your credentials:
# - GOOGLE_CLIENT_ID
# - GOOGLE_CLIENT_SECRET
# - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
# - APP_JWT_SECRET, APP_REFRESH_SECRET
```

4. **Database setup**
```bash
# Ensure PostgreSQL is running and accessible
# Schema auto-initializes on first server start
```

5. **Start development server**
```bash
# Terminal 1: Backend
npm run server

# Terminal 2: Frontend
npm run dev
```

6. **Access application**
- Frontend: http://localhost:3000
- Backend: http://localhost:4000

### Build for Production

```bash
npm run build
npm start
```

## 📝 API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/google` | Verify Google token, return JWTs |
| POST | `/auth/refresh` | Refresh expired access token |

### Circles
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/circles` | Get user's circles |
| GET | `/api/circles/discover` | Browse public circles |
| GET | `/api/circles/:id` | Get circle details |
| POST | `/api/circles` | Create new circle |
| POST | `/api/circles/:id/join` | Join a circle |
| DELETE | `/api/circles/:id/leave` | Leave a circle |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/circles/:id/messages` | Get all messages |
| POST | `/api/circles/:id/messages` | Post new message |
| PUT | `/api/messages/:id` | Edit message |
| DELETE | `/api/messages/:id` | Delete message |
| POST | `/api/messages/:id/report` | Report message |

## 🎨 Design System

### Color Palette
| Color | Hex | Usage |
|-------|-----|-------|
| Primary | `#d4a373` | Buttons, accents, highlights |
| Secondary | `#a98467` | Hover states, secondary actions |
| Accent | `#ccd5ae` | Tags, badges, success states |
| Background | `#f5f2e8` | Main background (warm beige) |
| Text | `#432818` | Primary text (dark brown) |

### Typography
- **Font Family**: System fonts with fallback stack
- **Headings**: Bold weight, larger sizes
- **Body**: Regular weight, readable line height
- **Code**: Monospace for technical content

### UI Components
- Glass morphism cards with `backdrop-filter: blur()`
- Rounded corners (xl to 2xl radius)
- Subtle shadows with color tinting
- Animated transitions (300ms duration)
- Hover states with translate and color shifts

## 🔧 Development Highlights

### Performance Optimizations
- **Socket.IO polling fallback** for unreliable connections
- **Token refresh interceptor** prevents sudden logouts
- **Message tree building** with O(n) complexity
- **Connection pooling** via Supabase pooler

### Error Handling
- **Graceful token refresh** on 401 responses
- **Socket reconnection** with exponential backoff
- **Database connection retry** logic
- **User-friendly error messages** in UI

### Code Quality
- **TypeScript strict mode** enabled
- **Consistent naming conventions** (camelCase for variables, PascalCase for components)
- **Separation of concerns** (services, pages, components)
- **Centralized API client** with interceptors

## 📈 Scalability Considerations

### Current Architecture
- **Free tier**: Suitable for personal projects, small communities
- **Supabase limits**: 500MB storage, connection pooling included

### Future Enhancements
- **Redis adapter** for Socket.IO (multi-instance support)
- **CDN integration** for static assets
- **Database read replicas** for read-heavy workloads
- **File upload support** (profile pictures, attachments)
- **Email notifications** for mentions and replies

## 🌐 Deployment

### Frontend (Vercel)
```bash
# Automatic deployment on push to main branch
# Environment variables configured in Vercel dashboard
# Custom domain support available
```

### Backend (Render)
```bash
# Automatic deployment on push to main branch
# Environment variables in Render dashboard
# Free tier: sleeps after 15 min inactivity
# Auto-wake on request
```

### Database (Supabase)
```bash
# Free tier: 500MB storage
# Automatic daily backups
# Connection pooling via Supavisor
# SSL enforced for all connections
```

## 👨‍💻 Author

**Roshan Immanuel**
- GitHub: [@roshanimmanuel792](https://github.com/roshanimmanuel792)
- Email: roshanimmanuel24@karunya.edu.in

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Vercel** for frontend hosting
- **Render** for backend hosting
- **Supabase** for PostgreSQL database
- **Google** for OAuth authentication
- **Socket.IO** for real-time capabilities
- **React Team** for the incredible UI library

---

<p align="center">
  Made with ❤️ for anonymous discussions
</p>

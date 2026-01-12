# LikeCircle - A Minimalist Discussion Forum

> A clean, anonymous discussion platform where you can create and join interest-based circles without the noise of traditional social media.

---

## 🎯 Features

### 🔐 Authentication & Security
- **Google OAuth 2.0** - Sign in with your Google account
- **JWT Tokens** - Access tokens (15 min) + Refresh tokens (7 days) with database persistence
- **Secure Backend** - Server-side token verification using google-auth-library

### 💬 Circles & Messaging
- **Public Circles** - Anyone can join and see messages
- **Private Circles** - Password-protected communities
- **Message Threading** - Reply to specific messages with nested conversations
- **Message Deletion** - Authors can delete their own messages (soft delete)
- **Search & Discovery** - Find circles by name or description

### 👤 User Profiles
- **Anonymous Aliases** - Auto-generated unique usernames (e.g., "BraveLion4821")
- **Profile Pictures** - Upload custom avatars (stored as base64)
- **User Settings** - View your circles, messages, and profile info

### 📊 Dashboard
- **My Circles** - Only shows circles you created or joined
- **Explore Circles** - Discover and join new communities
- **Seamless UX** - Direct access to joined circles without re-joining

---

## 🛠️ Tech Stack

### Frontend
- **React 19.2.3** - UI framework with hooks
- **TypeScript 5.8.2** - Type-safe development
- **Vite 6.2.0** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling
- **React Router 7.11.0** - Client-side routing
- **@react-oauth/google** - Google OAuth integration

### Backend
- **Node.js** - JavaScript runtime
- **Express.js 5.2.1** - API framework
- **PostgreSQL 16+** - Relational database
- **jsonwebtoken 9.0.3** - JWT generation & verification
- **google-auth-library 10.5.0** - Google token verification
- **CORS 2.8.5** - Cross-origin requests

### Deployment
- **Vercel** - Frontend hosting (auto-deploy on git push)
- **Render** - Backend + PostgreSQL hosting (free tier)

---

## 📦 Project Structure

```
LikeCircle_v1/
├── pages/
│   ├── Login.tsx          # Google OAuth sign-in
│   ├── Dashboard.tsx      # User's circles & explore
│   ├── CircleView.tsx     # Chat interface
│   ├── Discover.tsx       # Search & join new circles
│   └── Settings.tsx       # Profile, circles, messages
├── components/
│   ├── Post.tsx           # Message rendering with threading
│   ├── CreateCircleModal.tsx
│   └── Metaballs.tsx      # Background animation
├── services/
│   ├── authService.ts     # Google OAuth + token management
│   ├── apiClient.ts       # API wrapper with Bearer tokens
│   ├── circleService.ts   # Circle & message APIs
│   └── tokenRefreshService.ts
├── server.cjs             # Express backend (558 lines)
├── db.cjs                 # PostgreSQL schema & connection
├── App.tsx                # Route configuration
├── types.ts               # TypeScript interfaces
├── index.tsx              # Entry point
└── vite.config.ts         # Vite configuration
```

---

## 🚀 Getting Started

### Local Development

1. **Clone & install:**
   ```bash
   git clone https://github.com/roshanimmanuel792/LikeCircle_v1.git
   cd LikeCircle_v1
   npm install
   ```

2. **Set up PostgreSQL locally:**
   ```bash
   createdb likecircle
   psql likecircle < schema.sql  # If you have a schema file
   ```

3. **Create `.env` file:**
   ```env
   PORT=4000
   CORS_ORIGIN=http://localhost:3000
   GOOGLE_CLIENT_ID=741981987144-as7mv4idmm6a00l151iabi7n2bg7oau2.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET
   APP_JWT_SECRET=your-secret-key
   APP_REFRESH_SECRET=your-refresh-key
   ACCESS_TTL=15m
   REFRESH_TTL=7d
   
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=likecircle
   DB_USER=postgres
   DB_PASSWORD=postgres
   ```

4. **Run both servers:**
   ```bash
   # Terminal 1: Backend
   npm run server
   
   # Terminal 2: Frontend
   npm run dev
   ```

5. **Open:** `http://localhost:3000`

---

## 🌐 Deployment (Render + Vercel)

### Backend (Render)

1. Create PostgreSQL database on Render
2. Create Web Service → connect GitHub repo
3. Build: `npm install`
4. Start: `node server.cjs`
5. Add all environment variables from `.env`
6. Deploy → Get backend URL

### Frontend (Vercel)

1. Create project → import GitHub repo
2. Add environment variables:
   - `VITE_GOOGLE_CLIENT_ID`
   - `VITE_API_BASE_URL` (your Render backend URL)
3. Deploy → Get frontend URL

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. APIs & Services → Credentials → Your OAuth Client
3. Add to **Authorized JavaScript origins:**
   - `https://your-vercel-domain.vercel.app`
4. Save

### Auto-Deploy

Every `git push` automatically redeploys on Vercel + Render! 🚀

---

## 📖 API Endpoints

### Authentication
- `POST /api/verify` - Verify Google token & return JWT

### Circles
- `GET /api/circles` - Get user's circles (created + joined)
- `GET /api/circles/discover` - Search public circles
- `POST /api/circles` - Create new circle
- `POST /api/circles/:id/join` - Join circle (with password if private)

### Messages
- `GET /api/circles/:id/messages` - Get messages with threading
- `POST /api/circles/:id/messages` - Post new message
- `DELETE /api/messages/:id` - Delete message (soft delete)

### Profile
- `GET /api/me/profile` - Get user profile with avatar
- `PUT /api/me/profile` - Update profile picture
- `GET /api/me/circles` - Get user's circles
- `GET /api/me/messages` - Get user's messages

---

## 🎨 Key Features Explained

### Anonymous Aliases
Users get unique auto-generated usernames like "BraveLion4821" combining:
- Adjective (Brave, Calm, Swift, etc.)
- Noun (Lion, Fox, Owl, etc.)
- Random 4-digit number

### Message Threading
Messages support nested replies showing conversation context. Click "Reply" on any message to respond.

### Private Groups
Create password-protected circles. Others must know the password to join. Non-members won't see them in search results.

### Profile Pictures
Upload JPG/PNG images from your device. Images are converted to base64 and stored in the database.

---

## 🔒 Security

- OAuth tokens verified server-side
- JWT tokens with short expiry (15 min access, 7 days refresh)
- CORS configured for frontend domain only
- Passwords hashed with bcrypt (future enhancement)
- Database connections use environment variables (never hardcoded)

---

## 📝 Environment Variables

| Variable | Frontend | Backend | Description |
|----------|----------|---------|-------------|
| `VITE_GOOGLE_CLIENT_ID` | ✅ | ❌ | Google OAuth Client ID |
| `VITE_API_BASE_URL` | ✅ | ❌ | Backend API URL |
| `GOOGLE_CLIENT_SECRET` | ❌ | ✅ | Google OAuth secret |
| `APP_JWT_SECRET` | ❌ | ✅ | JWT signing key |
| `DB_*` | ❌ | ✅ | PostgreSQL connection |

---

## 🛣️ Roadmap

- [ ] WebSockets for real-time messaging
- [ ] Message editing
- [ ] User blocking/reporting
- [ ] Circle moderation tools
- [ ] Dark mode
- [ ] Mobile app

---

## 📄 License

MIT - Feel free to use this for personal or commercial projects!

---

## 🤝 Contributing

Found a bug? Have a feature idea? Create an issue or submit a PR!

---

**Made with ❤️ by Roshan**
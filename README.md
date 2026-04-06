# Clario AI

Clario AI is a full-stack AI chat application with a React + Vite frontend and an Express + MongoDB backend. It includes authentication, Google sign-in, profile avatars, saved chat threads, streaming AI replies, image generation, voice transcription, theme switching, and a polished responsive dashboard.

## Highlights

- Email/password authentication with protected routes
- Google OAuth login
- Cookie-based sessions
- Direct in-app verification fallback when email delivery is unavailable
- Profile updates with avatar upload support
- Threaded chat history with save and delete actions
- Streaming text responses
- Image generation
- PDF and image attachments in chat
- Voice-to-text transcription
- Light and dark themes with dynamic favicon updates
- Mobile-friendly dashboard with subtle GSAP animations

## Tech Stack

### Frontend

- React 19
- Vite
- Redux Toolkit
- React Router
- Axios
- SCSS
- GSAP
- Socket.IO client

### Backend

- Node.js
- Express 5
- MongoDB + Mongoose
- JWT
- Cookie Parser
- Multer
- Nodemailer
- Google Auth Library
- LangChain
- Socket.IO

## Repository Structure

```text
Clario-AI/
|- Backend/
|  |- server.js
|  |- package.json
|  `- src/
|     |- app.js
|     |- config/
|     |  |- cors.js
|     |  `- database.js
|     |- controllers/
|     |  |- auth.controller.js
|     |  `- chat.controller.js
|     |- middleware/
|     |- models/
|     |- routes/
|     |  |- auth.routes.js
|     |  `- chat.routes.js
|     |- services/
|     |  |- ai.service.js
|     |  |- attachment.service.js
|     |  |- image.service.js
|     |  |- mail.service.js
|     |  `- voice.service.js
|     |- sockets/
|     |  `- server.socket.js
|     `- validators/
|- Frontend/
|  |- index.html
|  |- vercel.json
|  |- package.json
|  |- public/
|  `- src/
|     |- App.jsx
|     |- app/
|     |  |- api.base.js
|     |  `- app.store.js
|     |- features/
|     |  |- auth/
|     |  |  |- components/
|     |  |  |- hook/
|     |  |  |- layouts/
|     |  |  |- pages/
|     |  |  `- service/
|     |  `- chat/
|     |     |- components/
|     |     |- hook/
|     |     |- pages/
|     |     |  `- dashboard/
|     |     `- service/
|     |- styles/
|     |  |- abstracts/
|     |  |- base/
|     |  `- components/
|     `- utils/
|- PROJECT_DESIGN.md
|- render.yaml
`- README.md
```

## How The App Is Organized

### Backend

- `server.js` boots the HTTP server, initializes Socket.IO, and connects MongoDB.
- `src/app.js` configures Express middleware, CORS, file serving, and API routes.
- `src/controllers/` contains auth and chat request handlers.
- `src/services/` contains AI, mail, image, voice, and attachment logic.
- `src/models/` stores MongoDB schemas for users, chats, and messages.
- `src/routes/` defines the REST API surface.

### Frontend

- `src/App.jsx` mounts the router and triggers the initial auth check.
- `src/app.routes.jsx` defines public and protected routes.
- `src/app/app.store.js` configures Redux state.
- `src/features/auth/` contains login, register, profile, route guards, and auth API logic.
- `src/features/chat/pages/dashboard/` contains the main dashboard UI, sidebar, composer, conversation list, and mobile behavior.
- `src/styles/` contains global styles, tokens, auth styling, and dashboard styling.
- `src/utils/` contains theme, avatar, and favicon helpers.

## Features In The Current Build

### Authentication

- Register with username, email, and password
- Login with email/password
- Google sign-in flow
- Protected dashboard route
- Logout endpoint and frontend session cleanup
- Profile editing with avatar upload

### Chat Experience

- New threads
- Existing thread history
- Saved chats and recent chats separation
- Delete chat threads
- Streaming AI text output
- PDF and image attachment support
- Voice transcription
- Image generation mode
- Copy and PDF export from the dashboard

### UI and UX

- Light and dark theme toggle
- Dynamic favicon that changes with theme
- Responsive mobile dashboard
- Glassmorphism-inspired dashboard UI
- Subtle GSAP reveal animations

## Local Development

### Prerequisites

- Node.js 20+ recommended
- MongoDB Atlas or a local MongoDB instance

### 1. Start the Backend

```powershell
cd Backend
npm install
```

Create `Backend/.env` and add the variables you need.

Minimum backend variables:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
FRONTEND_URL=http://localhost:5173
SERVER_URL=http://localhost:5000
```

Useful optional backend variables:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback

GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-2.5-flash

CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_MODEL=@cf/qwen/qwen3-30b-a3b-fp8
CLOUDFLARE_TRANSCRIBE_MODEL=@cf/openai/whisper

POLLINATIONS_API_KEY=your_pollinations_key
POLLINATIONS_MODEL=flux

CHAT_TEMPERATURE=0.7
CHAT_TOP_P=0.9
CHAT_MAX_TOKENS=2048
ALLOWED_ORIGINS=http://localhost:5173
GOOGLE_USER=your_email_sender
GOOGLE_APP_PASSWORD=your_google_app_password
```

Run the backend:

```powershell
npm run dev
```

### 2. Start the Frontend

```powershell
cd Frontend
npm install
```

Create `Frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000
```

Run the frontend:

```powershell
npm run dev
```

Frontend runs on `http://localhost:5173` by default.

## Available Scripts

### Backend

- `npm start` starts the production server
- `npm run dev` starts the backend in watch mode

### Frontend

- `npm run dev` starts the Vite dev server
- `npm run build` creates a production build
- `npm run preview` previews the production build locally
- `npm run lint` runs ESLint

## Environment Variables

### Backend

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | No | Backend server port |
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | JWT signing secret |
| `CLIENT_URL` | Yes | Frontend URL used for redirects |
| `FRONTEND_URL` | Yes | Allowed frontend origin |
| `SERVER_URL` | Yes | Public backend URL |
| `ALLOWED_ORIGINS` | No | Extra comma-separated CORS origins |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | No | OAuth callback URL |
| `GOOGLE_USER` | No | SMTP sender email |
| `GOOGLE_APP_PASSWORD` | No | SMTP app password |
| `GEMINI_API_KEY` | No | Gemini chat provider key |
| `GEMINI_MODEL` | No | Gemini model name |
| `CLOUDFLARE_ACCOUNT_ID` | No | Cloudflare account ID |
| `CLOUDFLARE_API_TOKEN` | No | Cloudflare API token |
| `CLOUDFLARE_MODEL` | No | Cloudflare chat model |
| `CLOUDFLARE_TRANSCRIBE_MODEL` | No | Cloudflare voice model |
| `POLLINATIONS_API_KEY` | No | Pollinations image API key |
| `POLLINATIONS_MODEL` | No | Pollinations image model |
| `CHAT_TEMPERATURE` | No | AI generation temperature |
| `CHAT_TOP_P` | No | AI top-p setting |
| `CHAT_MAX_TOKENS` | No | AI output token limit |

### Frontend

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Yes | Base URL for backend API requests |

## API Overview

### Auth Routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/verify-account`
- `POST /api/auth/resend-verification`
- `GET /api/auth/google`
- `GET /api/auth/google/callback`
- `GET /api/auth/verify-email`
- `GET /api/auth/get-me`
- `PUT /api/auth/profile`
- `POST /api/auth/logout`

### Chat Routes

- `GET /api/chats`
- `GET /api/chats/models`
- `GET /api/chats/:chatId/messages`
- `DELETE /api/chats/:chatId`
- `PATCH /api/chats/:chatId/save`
- `POST /api/chats/voice/transcribe`
- `POST /api/chats/image`
- `POST /api/chats/message`
- `POST /api/chats/message/stream`

## Deployment

### Backend on Render

The repository already includes [render.yaml](render.yaml).

Recommended settings:

- Root directory: `Backend`
- Build command: `npm install`
- Start command: `npm start`

Important production variables:

```env
NODE_ENV=production
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
SERVER_URL=https://your-backend.onrender.com
CLIENT_URL=https://your-frontend.vercel.app
FRONTEND_URL=https://your-frontend.vercel.app
ALLOWED_ORIGINS=https://your-frontend.vercel.app
GOOGLE_REDIRECT_URI=https://your-backend.onrender.com/api/auth/google/callback
```

### Frontend on Vercel

The frontend already includes [vercel.json](Frontend/vercel.json) for SPA rewrites.

Recommended settings:

- Framework preset: `Vite`
- Root directory: `Frontend`
- Build command: `npm run build`
- Output directory: `dist`

Frontend environment variable:

```env
VITE_API_BASE_URL=https://your-backend.onrender.com
```

### Google OAuth Setup

If Google sign-in is enabled, add these in Google Cloud Console:

- Authorized JavaScript origin:
  - `https://your-frontend.vercel.app`
- Authorized redirect URI:
  - `https://your-backend.onrender.com/api/auth/google/callback`

## Notes

- Uploaded avatars can be served from the backend `/uploads` path.
- Chat replies are generated through the AI service layer in `Backend/src/services/ai.service.js`.
- Voice transcription uses Cloudflare AI.
- Image generation uses Pollinations.
- The frontend uses cookie-based auth, so frontend and backend CORS settings must stay aligned.

## Related Files

- [PROJECT_DESIGN.md](PROJECT_DESIGN.md)
- [render.yaml](render.yaml)
- [Frontend/vercel.json](Frontend/vercel.json)

## License And Author
## Vineet Dwivedi

This project is licensed under the [MIT License](./LICENSE).


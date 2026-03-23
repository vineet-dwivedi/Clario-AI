# Project Design

## Project Overview

This project is a full-stack authentication-focused app with:

- a React + Vite frontend
- an Express + MongoDB backend
- email verification during registration
- Redux for auth state
- a custom SCSS-based auth UI with light and dark themes

The current work is centered around the authentication experience, including UI design, backend integration, and email verification.

## Tech Stack

### Frontend

- React
- Vite
- React Router DOM
- Redux Toolkit
- React Redux
- Axios
- SCSS

### Backend

- Express
- MongoDB with Mongoose
- JWT
- Nodemailer
- Google OAuth2 / Gmail mail transport
- Express Validator

## Current Architecture

### Frontend Structure

- `Frontend/src/App.jsx`
  - mounts the router
- `Frontend/src/app.routes.jsx`
  - defines `/login` and `/register`
- `Frontend/src/app/app.store.js`
  - configures Redux store
- `Frontend/src/features/auth/auth.slice.js`
  - stores `user`, `loading`, and `error`
- `Frontend/src/features/auth/hook/useAuth.js`
  - connects UI to auth API calls and Redux updates
- `Frontend/src/features/auth/service/auth.api.js`
  - contains Axios calls for register, login, and get-me
- `Frontend/src/features/auth/pages/Login.jsx`
  - login form page
- `Frontend/src/features/auth/pages/Register.jsx`
  - register form page
- `Frontend/src/features/auth/components/AuthCard.jsx`
  - reusable auth card UI
- `Frontend/src/features/auth/layouts/AuthLayout.jsx`
  - shared auth layout with theme toggle
- `Frontend/src/styles/`
  - SCSS tokens, globals, and auth page styles

### Backend Structure

- `Backend/server.js`
  - loads env, connects DB, starts server
- `Backend/src/app.js`
  - express app setup, middleware, CORS, routes
- `Backend/src/routes/auth.routes.js`
  - auth routes
- `Backend/src/controllers/auth.controller.js`
  - register, verify-email, login, get-me logic
- `Backend/src/models/user.model.js`
  - user schema and password hashing
- `Backend/src/services/mail.service.js`
  - Gmail transport and sendEmail helper
- `Backend/src/config/database.js`
  - MongoDB connection

## Authentication Flow

### Register

1. User fills username, email, password, and confirm password.
2. Frontend validates:
   - terms accepted
   - password matches confirm password
3. Frontend sends:
   - `{ username, email, password }`
4. Backend creates user.
5. Backend generates email verification token.
6. Backend sends verification email.
7. Frontend redirects user to `/login` with a note to verify email first.

### Verify Email

1. User clicks verification link from email.
2. Backend verifies token.
3. Backend sets `user.verified = true`.
4. Backend sends a simple success page with a link back to login.

### Login

1. User enters email and password.
2. Frontend sends:
   - `{ email, password }`
3. Backend checks:
   - user exists
   - password matches
   - email is verified
4. Backend sends auth cookie and user payload.
5. Frontend stores user in Redux.

## Design System

The auth UI now uses a shared SCSS system with:

- reusable spacing and timing tokens
- soft glass card layout
- smooth hover and transition effects
- light and dark themes
- floating theme toggle
- shared status message styles for success and error feedback

The design is intentionally centralized so the login and register pages stay visually consistent.

## What We Completed Today

### UI and Styling

- installed and structured SCSS for the frontend
- created reusable auth UI components
- built login and register pages in the same visual style
- added SVG icons
- added light and dark mode
- added smoother hover and transition effects
- added animated theme switching
- added status banners for auth feedback

### Frontend Auth Integration

- connected login page to backend through existing hook/service layer
- connected register page to backend through existing hook/service layer
- updated register flow to use `username` because backend expects `username`
- kept confirm password validation on the frontend
- kept register success flow aligned with backend email verification requirement
- normalized backend auth errors for easier UI messages
- normalized backend `userrname` typo safely in the frontend hook

### State and Routing

- fixed Redux store setup import
- kept auth state in the existing auth slice
- used route state to pass the "verify your email first" message from register to login

### Backend Integration

- verified backend register route works
- added CORS support for common local frontend origins
- added `cors` package to backend dependencies
- verified browser-style preflight for local dev origins

### Mail and Verification

- checked the mail service and verified transporter setup
- confirmed direct mail sending works with the current Gmail config
- confirmed verification emails are sent to the email used during registration

## Important Notes

### Email Verification Behavior

- Registration does not auto-login.
- Users must verify email before login works.
- The register controller currently returns success even if the email send fails internally, because email sending is wrapped in a `try/catch`.

### Local Development CORS

The backend currently allows these local frontend origins:

- `http://localhost:3000`
- `http://localhost:5173`
- `http://localhost:5174`
- `http://127.0.0.1:3000`
- `http://127.0.0.1:5173`
- `http://127.0.0.1:5174`

You can still override this with `FRONTEND_URL` in backend env if you want a single explicit origin.

## Documentation Added in Code

- `Frontend/src/features/auth/.md`
  - auth flow notes
- inline comments were added in a few places where behavior was not obvious

## Known Follow-Up Ideas

- make registration fail loudly if verification email cannot be sent
- replace the simple backend verify-email success page with a frontend route
- add logout flow and protected routes
- add forgot-password backend and frontend flow
- store backend API URL in frontend env instead of hardcoding localhost

## Quick Run Checklist

### Backend

1. Set env values in `Backend/.env`
2. Run backend
3. Confirm server runs on port `5000`

### Frontend

1. Run frontend dev server
2. Open `/register`
3. Create account
4. Check email for verification link
5. Open `/login`
6. Login after verification

## Summary

The project now has a working auth foundation with:

- custom polished auth UI
- connected login and register forms
- Redux-backed auth state
- backend validation and email verification
- working Gmail transporter
- local-development CORS support

This markdown file is the current project design snapshot based on the work completed today.

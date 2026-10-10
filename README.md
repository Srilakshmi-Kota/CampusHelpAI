# CampusHelp AI — Updated Student Helpdesk

A single-page college helpdesk application with:
- Student registration and login
- Admin login and role-based access
- AI-style FAQ assistant using custom JavaScript rules (no external AI API key)
- College FAQs and exam information
- Complaint creation and tracking
- Admin ticket management and status updates
- Ticket statistics
- MongoDB Atlas persistence

## Requirements
- Node.js and npm
- MongoDB Atlas account and connection string
- VS Code

## 1. Configure MongoDB Atlas
1. Create a free cluster in MongoDB Atlas.
2. Under **Database Access**, create a database user and password.
3. Under **Network Access**, add your current IP address. For a temporary local demo, Atlas allows `0.0.0.0/0`, but restrict this afterward.
4. Open **Connect → Drivers** and copy the Node.js connection string.
5. Replace `<db_password>` with the database user's password. URL-encode special characters in the password if necessary.

## 2. Configure the backend
Open a VS Code terminal and run:

```cmd
cd D:\CampusHelpAI_Updated\server
copy .env.example .env
```

Edit `server\.env` and set:
- `MONGO_URI` to your Atlas connection string
- `JWT_SECRET` to a long random secret (at least 32 characters)
- `ADMIN_EMAIL` to the email you want to use for the initial admin account
- `ADMIN_PASSWORD` to a strong initial admin password

Install and run:

```cmd
npm install
npm run dev
```

On startup, the server creates the configured initial admin account if it does not already exist. Keep this terminal open.

**Important:** The app is configured to require MongoDB Atlas. It will stop with a clear error if `MONGO_URI` is missing or the database cannot be reached; it does not silently fall back to local storage.

## 3. Configure and run the frontend
Open a second VS Code terminal:

```cmd
cd D:\CampusHelpAI_Updated\client
npm install
npm run dev
```

Open the URL Vite prints, usually `http://localhost:5173`.

## 4. Use the application
- Register a student account from the login screen.
- Log in as the admin using `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env`.
- Students can use the assistant, browse FAQs, submit complaints, and view their own tickets.
- Admins can view all tickets and update status/priority.

## API overview
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/faqs`
- `POST /api/agent/chat` (authenticated)
- `GET /api/tickets` (student sees own tickets; admin sees all)
- `POST /api/tickets`
- `PATCH /api/tickets/:id` (admin only)
- `GET /api/stats`

## Security notes
- Passwords are hashed with bcrypt.
- JWTs are signed with `JWT_SECRET`.
- Admin role is **never** accepted from public registration.
- Ticket routes enforce role-based access.
- For production, use HTTPS, rotate secrets, add rate limiting, and configure Atlas network access narrowly.
- The assistant is a rule-based FAQ helper, not a general-purpose LLM. Replace the sample FAQs with verified information from your college.

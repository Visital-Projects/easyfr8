# EasyFr8 Admin Console Portal

This is a production-ready Next.js React App Router application migrated from static templates of the EasyFr8 Admin Panel.

---

## Technical Stack
* **Framework**: Next.js 16 (App Router)
* **Library**: React 19 (Hooks, Functional Components, Context)
* **Styling**: Vanilla CSS (Global variables, components-based stylesheets)
* **Central API Layer**: Centralized Axios client under `services/` with mock support for complete out-of-the-box local operations.
* **Environment Configuration**: المركزي .env variable file configuration.

---

## Folders Structure
```text
easyfr8-next-app/
├── app/                  # Routing entrypages
│   ├── (dashboard)/      # Common Sidebar/Header layout group
│   ├── documentation/    # Complete isolated user manual route
│   ├── login/            # Authentication form page
│   ├── layout.tsx        # Global data context & styles setup
│   └── page.tsx          # Client redirect gateway
├── components/           # Reusable widgets (Sidebar, Header, Toasts)
├── context/              # Central DataProvider State Sync Context
├── lib/                  # Seed database store & interfaces definitions
├── postman/              # Postman collection & environment scripts
├── public/               # Images, PDF guides, and screens snapshots
├── services/             # Axios request interfaces & API endpoints
├── styles/               # Copied vanilla stylesheet files
├── .env.example          # Environment variables example template
├── API_DOCUMENTATION.md  # REST API Integration Guide
└── README.md             # Developer instruction handbook
```

---

## Setup & Running Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` into a local `.env` file:
```bash
cp .env.example .env
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

### 4. Create Production Build
Verify compilation:
```bash
npm run build
```
The server output is compiled and optimized inside `.next/`.

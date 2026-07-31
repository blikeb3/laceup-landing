# LaceUP

A professional networking platform for student-athletes, connecting them with mentors, employers, and peers. Built with React, TypeScript, and Supabase.

## Features

- **User Profiles** - Create and customize your professional profile with skills, degrees, experience, and resume uploads
- **Connections** - Send, accept, and manage connection requests; endorsements and referrals
- **Messaging** - Real-time 1:1 and group messaging with image and file attachments
- **Opportunities** - Browse and post job opportunities and mentorship programs
- **Notifications** - Real-time notifications for likes, comments, mentions, connections, and jobs
- **LaceHub** - Curated resource library
- **MyHub** - Personal dashboard for managing your connections and groups
- **Security** - TOTP two-factor authentication with backup codes, breached-password checks
- **Admin** - User management, role-change approvals, badges, resources, and feedback triage

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (Auth, Database, Storage, Realtime, Edge Functions)
- **State Management**: TanStack React Query
- **Routing**: React Router v6

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Bun](https://bun.sh/) (optional, for faster package management)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for database migrations)

## Getting Started

### 1. Clone the repository

```sh
git clone https://github.com/blikeb3/laceup-landing.git
cd laceup-landing
```

### 2. Install dependencies

```sh
npm install
# or with bun
bun install
```

### 3. Set up environment variables

Copy `.env.example` to `.env` and fill in your Supabase project's values:

```env
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_URL=https://your_project_id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

`.env` is gitignored — never commit it. Server-side secrets (Brevo, service role key) belong only in Supabase Edge Function secrets; see [docs/API_KEY_SECURITY.md](docs/API_KEY_SECURITY.md).

Note: the Content-Security-Policy in `public/_headers` allowlists the Supabase project host. If you point the app at a different Supabase project, update `_headers` too.

### 4. Start the development server

```sh
npm run dev
```

The app will be available at `http://localhost:8080` (see `vite.config.ts`).

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run build:dev` | Build for development |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |

## Supabase Setup

> **Important:** the repo is not currently linked to the Supabase project (`supabase/config.toml` does not exist), and most of the live schema — including the notifications DDL, most RPC functions, and all Edge Function source (`send-referral`, `referral-joined`, `notify-job-application`) — exists only in the hosted project, not in this repo. Historically, migrations were applied by pasting SQL into the dashboard SQL Editor. To bring the repo and database back in sync, link the project and pull:

```sh
npx supabase link --project-ref your-project-ref
npx supabase db pull                 # capture the live schema as a migration
npx supabase functions download send-referral
npx supabase functions download referral-joined
npx supabase functions download notify-job-application
```

### Push database migrations

```sh
npx supabase db push
```

### Generate TypeScript types from database schema

```sh
npx supabase gen types typescript --project-id your-project-id > src/integrations/supabase/types.ts
```

### Referral email invites (Brevo)

- Deploy Edge Functions: `supabase functions deploy send-referral` and `supabase functions deploy referral-joined`.
- Configure function secrets (Supabase Dashboard → Edge Functions → Manage secrets):
	- `SUPABASE_SERVICE_ROLE_KEY`
	- `BREVO_API_KEY`
	- `BREVO_REFERRAL_TEMPLATE_ID` (Brevo template that supports params: `referrerName`, `invitedName`, `personalMessage`, `ctaUrl`)
	- `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`
	- `REFERRAL_SIGNUP_URL` (e.g., `https://app.laceup.com/auth?tab=signup` — `?ref=` is appended automatically)
- The `send-referral` function enforces 20 invites per user per 24 hours and blocks duplicate invites to the same email.

### Create a new migration

```sh
npx supabase db diff -f migration_name
# or create a blank migration
npx supabase migration new migration_name
```

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── landing-page/ # Public landing page sections
│   ├── messages/     # Messaging-related components
│   └── ui/           # shadcn/ui components
├── contexts/         # React contexts (auth)
├── hooks/            # Custom React hooks
├── integrations/     # Third-party integrations (Supabase)
├── lib/              # Utility functions
├── pages/            # Page components
├── types/            # TypeScript type definitions
└── constants/        # App constants

supabase/
├── functions/        # Edge Functions (source currently lives only in the hosted project)
└── migrations/       # Database migrations

docs/                 # Feature and security documentation
```

## Documentation

Feature and security docs live in [docs/](docs/):

- [CONNECTION_REQUESTS.md](docs/CONNECTION_REQUESTS.md) / [DATA_MIGRATION_GUIDE.md](docs/DATA_MIGRATION_GUIDE.md) — connection request system and data migration
- [NOTIFICATION_ARCHITECTURE.md](docs/NOTIFICATION_ARCHITECTURE.md) / [NOTIFICATION_USER_GUIDE.md](docs/NOTIFICATION_USER_GUIDE.md) — notification system
- [2FA_IMPLEMENTATION.md](docs/2FA_IMPLEMENTATION.md) / [2FA_QUICK_START.md](docs/2FA_QUICK_START.md) — two-factor auth
- [API_KEY_SECURITY.md](docs/API_KEY_SECURITY.md), [SECURE_ERROR_HANDLING.md](docs/SECURE_ERROR_HANDLING.md), [SECURITY_AUDIT_REPORT.md](docs/SECURITY_AUDIT_REPORT.md), [SECURITY_REVIEW.md](docs/SECURITY_REVIEW.md) — security

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.

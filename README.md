# LaceUP

A professional networking platform connecting mentors, employers, and peers. Built with React, TypeScript, and Supabase.

## Features

- **User Profiles** - Create and customize your professional profile with skills, experience, and resume uploads
- **Messaging** - Real-time messaging with image and file attachments
- **Opportunities** - Browse and post job opportunities and mentorship programs
- **LaceHub** - Community hub for networking and collaboration
- **MyHub** - Personal dashboard for managing your connections and activity

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (Auth, Database, Storage, Realtime)
- **State Management**: TanStack React Query
- **Routing**: React Router v6

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Bun](https://bun.sh/) (optional, for faster package management)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for database migrations)

## Getting Started

### 1. Clone the repository

```sh
git clone https://github.com/BlakeHerring13/LaceUP.git
cd LaceUP
```

### 2. Install dependencies

```sh
npm install
# or with bun
bun install
```

### 3. Set up environment variables

The `.env` file in the root directory has our project's Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Start the development server

```sh
npm run dev
```

The app will be available at `http://localhost:5173`

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

### Link to your Supabase project

```sh
npx supabase link --project-ref your-project-ref
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

- Run migrations to add the `referrals` table: `npx supabase db push`.
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
│   ├── messages/     # Messaging-related components
│   └── ui/           # shadcn/ui components
├── hooks/            # Custom React hooks
├── integrations/     # Third-party integrations (Supabase)
├── lib/              # Utility functions
├── pages/            # Page components
├── types/            # TypeScript type definitions
└── constants/        # App constants

supabase/
├── config.toml       # Supabase configuration
└── migrations/       # Database migrations
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.


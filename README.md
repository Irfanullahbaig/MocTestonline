# MocTest — Online Test Platform

A full-featured online test-taking web app for teachers and students. Teachers create tests with MCQs, short answers, and long answers. Students take tests via a public link with an approval password — no account required.

## Tech Stack

- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS 4**
- **Supabase** — Auth (teachers) + Storage (question images)
- **Prisma** — PostgreSQL database
- **bcryptjs** — Secure approval password hashing

## Features

### Teacher
- Sign up / sign in via Supabase Auth
- Dashboard with all tests (draft, active, completed)
- Step-by-step test creation: details → questions → settings → publish
- MCQ, short answer, and long answer questions with optional images
- Per-question or uniform timers, skip/return settings
- Public test URL generation with copy button
- View submissions, auto-grade MCQs, manually grade text answers
- Export results to CSV
- Anti-cheating options: copy/paste disable, tab switch tracking, fullscreen

### Student
- Access test via `/test/[testId]` with approval password
- One question at a time with timers
- Autosave for text answers
- Review screen before submission
- Confirmation after submit
- Duplicate submission prevention (by roll number)

## Setup

### 1. Clone and install

```bash
cd Moctestonline
npm install
```

### 2. Supabase project

1. Create a project at [supabase.com](https://supabase.com)
2. Enable Email auth under Authentication → Providers
3. Create a Storage bucket named `question-images` (public)
4. Copy your project URL, anon key, and service role key

### 3. Environment variables

```bash
cp .env.example .env.local
```

Fill in all values in `.env.local`:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side uploads) |
| `DATABASE_URL` | Pooled Postgres connection (port 6543) |
| `DIRECT_URL` | Direct Postgres connection (port 5432) |
| `NEXT_PUBLIC_APP_URL` | App URL, e.g. `http://localhost:3000` |

Get database URLs from Supabase → Project Settings → Database.

### 4. Database

```bash
npm run db:push
npm run db:seed
```

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Quick Test

After seeding:

| Item | Value |
|------|-------|
| Public test URL | `http://localhost:3000/test/seed-test-math-quiz` |
| Approval password | `demo1234` |
| Sample student | Roll `101` already submitted — use roll `102` to test fresh |

Sign up as a teacher at `/login` to access the dashboard.

## Project Structure

```
src/
├── app/
│   ├── dashboard/          # Teacher dashboard & test management
│   ├── login/              # Teacher auth
│   ├── test/[testId]/      # Public student test page
│   └── api/student/        # Student attempt API
├── components/
│   ├── dashboard/          # Teacher UI components
│   ├── student/            # Student test UI
│   └── ui/                 # Shared UI primitives
└── lib/
    ├── actions/            # Server actions
    ├── supabase/           # Supabase clients & storage
    ├── auth.ts             # Teacher auth helpers
    ├── password.ts         # bcrypt helpers
    └── prisma.ts           # Prisma client
prisma/
├── schema.prisma           # Database schema
└── seed.ts                 # Sample data
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed sample data |
| `npm run db:generate` | Generate Prisma client |

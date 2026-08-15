# Cizre Paintball

A neon-themed multiplayer paintball game built with Next.js 16, React Three Fiber, and Supabase Realtime.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-blue)
![Three.js](https://img.shields.io/badge/Three.js-0.185-green)
![Supabase](https://img.shields.io/badge/Supabase-Realtime-3ECF8E)

## Setup Guide

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- [pnpm](https://pnpm.io) (`npm install -g pnpm`)
- A free [Supabase](https://supabase.com) account

### 1. Clone the repository

```bash
git clone https://github.com/tushar-alt/ballgame.git
cd ballgame
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once it's ready, go to **Project Settings → API** and copy:
   - **Project URL** (e.g. `https://abcdefg.supabase.co`)
   - **anon public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`)

### 3. Set up the database

Go to the **SQL Editor** in your Supabase dashboard and run the contents of:

```
scripts/001_init_schema.sql
```

This creates all the tables, row-level security policies, and realtime subscriptions the game needs (profiles, lobbies, friends, invites, chat).

### 4. Configure environment variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 5. Install and run

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Playing with Friends

For multiplayer, everyone needs to:
- Follow the setup steps above
- Use the **same Supabase project** (same `.env.local` values)

The game uses Supabase Realtime to sync lobbies, invites, friends, and chat between players.

## Tech Stack

- **Next.js 16** — React framework with Turbopack
- **React Three Fiber / Three.js** — 3D WebGL rendering
- **@react-three/postprocessing** — Bloom, vignette effects
- **Supabase** — Auth, database, realtime multiplayer
- **Tailwind CSS v4** — Styling
- **shadcn/ui** — UI components

## Project Structure

```
app/                  # Next.js app router pages and API routes
components/
  game/               # 3D game canvas, HUD, player controller, weapons
  ui/                 # shadcn UI primitives
  auth-screen.tsx     # Login/signup screen
  lobby-screen.tsx    # Lobby UI with realtime player list
  main-menu.tsx       # Main menu with friend invites
  friends-panel.tsx   # Friends list and requests
  leaderboard-screen.tsx
lib/
  game/               # Game engine, maps, sound, config
  supabase/           # Supabase client and admin helpers
  auth-context.tsx    # Auth state provider
  lobby-api.ts        # Lobby CRUD operations
  friends-api.ts      # Friend request operations
  invite-api.ts       # Game invite operations
scripts/
  001_init_schema.sql # Database schema — run this in Supabase SQL editor
```

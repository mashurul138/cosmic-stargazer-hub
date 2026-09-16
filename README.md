# Cosmic Event & Stargazer Hub

Cosmic Event & Stargazer Hub is a full-stack stargazing companion for planning observations, tracking celestial events, recording night-sky logs, assessing live viewing conditions, and receiving concise guidance from an AI astronomy assistant.

## Tech stack

- Next.js 14 App Router (the Phase 1 target; this repository currently runs the newer, compatible Next.js 16.3.5 release)
- TypeScript
- Tailwind CSS
- Supabase Auth, Postgres, and Row Level Security
- Groq API for the Cosmic AI Guide
- NASA Astronomy Picture of the Day API
- Open-Meteo weather API
- Zod for runtime validation
- Vitest for unit testing

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- A Supabase project
- A Groq API key for live AI responses

## Environment variables

Create a `.env.local` file in the repository root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
NASA_API_KEY=DEMO_KEY
GROQ_API_KEY=your-groq-api-key
```

`NASA_API_KEY` is optional because the application falls back to NASA's `DEMO_KEY`; use a personal NASA key in production to avoid the shared demo rate limit. `GROQ_API_KEY` is optional for local UI development, but the AI Guide will return a fallback response until a valid key is configured.

Never commit `.env.local`, Supabase secrets, or API keys.

## Installation and local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure `.env.local` using the variables above.

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open `http://localhost:3000` in a browser.

5. Run unit tests:

   ```bash
   npm run test
   ```

Useful production checks:

```bash
npm run lint
npm run build
```

## Database setup

The Supabase schema is defined in `schema.sql`. In the Supabase dashboard, open **SQL Editor**, paste the complete contents of `schema.sql`, and run it against the target project before using the application.

The schema creates the `user_role` enum, `profiles`, `observations`, and `saved_events` tables; creates a profile when an Auth user signs up; and enables Row Level Security policies.

For astronomers to remove community observations, add an astronomer DELETE policy for `public.observations` in addition to the global astronomer SELECT policy. The API performs the application-level role check, but Supabase RLS remains the final authorization layer.

## Feature overview

### Authentication and roles

- Email and password sign-up/sign-in with Supabase Auth
- A profile record for every authenticated user
- `stargazer` and `astronomer` roles
- Dashboard and admin-route protection through server-side session checks

### External data integrations

- NASA Astronomy Picture of the Day card with a cached daily response and a resilient fallback
- Open-Meteo live weather data for Greenwich Observatory by default
- Stargazing weather measurements for temperature, cloud cover, humidity, wind speed, and visibility

### Observation logging and visibility engine

- Validated observation logs with target, location, notes, and a one-to-five rating
- Personal observation archive with delete controls
- Astronomer global-view mode for community observations
- Stargazing Visibility Score Engine that evaluates cloud cover, humidity, wind, and visibility and produces an actionable recommendation

### Celestial events and exporter tools

- Curated upcoming celestial events
- Saved Events Hub persisted in Supabase
- One-click iCalendar (`.ics`) export for calendar applications
- Markdown event-card export for observing notes

### Cosmic AI Guide

- Authenticated Groq-powered astronomy chat endpoint
- Preset questions for beginner equipment, Saturn observations, and astrophotography
- Concise advice about stargazing, equipment, and observational planning
- Safe fallback advice when Groq is unavailable or no API key is configured

## Project scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local Next.js development server. |
| `npm run lint` | Run ESLint across the project. |
| `npm run test` | Run the Vitest unit suite once. |
| `npm run build` | Create and validate the production build. |
| `npm start` | Start the built production application. |

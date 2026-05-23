# Performance Management System — Workout Tracker

A Next.js workout tracking app for Deepak. Logs sets, reps, and weights across a 6-day push/pull/legs/core split. Data is stored in Supabase with a fully normalized schema.

## Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, React
- **Database**: Supabase (PostgreSQL)

## Database Schema

Three normalized tables — no JSON blobs:

- `workout_sessions` — one row per completed workout (date, day, type, focus)
- `workout_exercises` — one row per exercise done in a session
- `workout_sets` — one row per set logged (weight_kg, reps, set_number)

## Local Storage (browser only)
- In-progress draft (mid-workout state)
- Timer settings (rest, HIIT work/rest durations)
- Used quotes tracker (anti-repeat)

## Getting Started

```bash
npm install
# Add your .env.local with:
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
npm run dev
```

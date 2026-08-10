# Any Given Sunday — Week 1 Build

Private league NFL pick'em. This is the **foundation phase**: league creation,
join-by-code, nickname login, and the database schema for the entire Year 1
feature set (picks, tiebreakers, payments, pot tracking).

## What's built so far
- Dark, mobile-first theme (shield logo, ESPN/FanDuel-style palette)
- Create a league (get a join code + commissioner PIN)
- Join a league by code + nickname
- Full database schema for the rest of the season (weeks, games, picks,
  tiebreakers, payments) — ready for Week 2's build (pick submission,
  scoring, leaderboard)
- PWA manifest so it's installable on iPhone

## What's next (Week 2–4)
- Auto-load NFL schedule + scores (free ESPN JSON feed)
- Pick submission UI, locks at kickoff
- MNF total-points tiebreaker
- Commissioner dashboard: approve payments, view picks, start new week
- Auto scoring + leaderboard + winner celebration screen

---

## Deploying this for free (Vercel + Supabase)

### 1. Database — Supabase (free tier)
1. Go to supabase.com → New Project (pick any name/region, save the DB password somewhere).
2. Once it's created, go to **SQL Editor → New query**, paste in the contents
   of `supabase/schema.sql`, and run it. This creates all the tables.
3. Go to **Project Settings → API**. You'll need three values for the next step:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep this one secret — never put it in frontend code)

### 2. Hosting — Vercel (free tier)
1. Push this project to a GitHub repo (create a new repo, upload these files).
2. Go to vercel.com → New Project → import that repo.
3. In the "Environment Variables" step, add the three values from Supabase above.
4. Deploy. Vercel gives you a live URL like `any-given-sunday.vercel.app`.

### 3. Try it
- Open the URL → "Start a League" → save the join code + commissioner PIN it gives you.
- Open it again (or send the code to a friend) → "Join League" with that code + a nickname.

---

## Local development
```bash
npm install
cp .env.example .env.local   # fill in your Supabase values
npm run dev
```

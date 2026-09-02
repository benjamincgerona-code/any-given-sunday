# Any Given Sunday — Week 2 Build

Private league NFL pick'em. League creation, join-by-code, nickname login,
pick submission, auto-scoring, and the commissioner dashboard are all live.

## What's built so far
- Dark, mobile-first theme (shield logo, ESPN/FanDuel-style palette)
- Create a league (get a join code + commissioner PIN)
- Join a league by code + nickname
- Full database schema for the season (weeks, games, picks, tiebreakers,
  payments)
- Commissioner: start a week, which auto-loads that week's NFL schedule from
  ESPN's free public scoreboard feed (no API key needed) and flags the
  latest-kickoff game as the MNF tiebreaker game
- Players: pick a winner for every game, submit an MNF total-points
  tiebreaker guess, picks lock automatically at the first kickoff of the week
- Players: mark themselves paid; commissioner approves payments, which adds
  to the week's pot
- Commissioner: "Sync Scores & Run Scoring" pulls final scores from ESPN,
  grades every pick, and — once every game in the week is final — crowns the
  week's winner (most correct picks, MNF tiebreaker breaks ties)
- Season-long standings (total correct picks, weeks won)
- PWA manifest so it's installable on iPhone

## What's next (Week 3–4)
- Commissioner: edit league announcement, adjust entry fee
- Winner celebration screen
- Push/SMS reminders before lock
- Multi-season history

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

# Kidszone leaderboard: actives + last played sort

These changes belong in **huzaifahp1989/Kidszone** (not the advert app).

## Apply to Kidszone

From the Kidszone repo root:

```bash
git checkout -b cursor/leaderboard-actives-last-played-1704
git apply ../advert/patches/kidszone-leaderboard-actives-last-played.patch
# or copy files from patches/kidszone-leaderboard/ into src/
```

## What changed

1. **Actives column** — weekly leaderboard table shows each learner's activity count (`weeklyActivityCount`).
2. **Last played on top** — API sorts by most recent `last_earned_date` first, then actives and other tie-breakers.
3. **Column order** — Last played is the first stat column after the learner name.

Files:

- `src/app/leaderboard/LeaderboardClient.tsx`
- `src/app/api/leaderboard/public/route.ts`

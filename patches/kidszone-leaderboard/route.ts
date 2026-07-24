import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isTestModeEmail } from '@/lib/test-mode';
import { isEligibleForWeeklyDraw } from '@/lib/leaderboard-rules';
import {
  getAllScoreWeekActiveUserIds,
  getScoreWeekRangeUtc,
  getWeeklyScoresForUsers,
  MAX_WEEKLY_SCORE,
} from '@/lib/weekly-score';
import { getWeeklyActivityCountsForUsers } from '@/lib/weekly-activity';

import { POINTS_DAILY_CAP, resolveTodayPoints } from '@/lib/points-policy';

export const dynamic = 'force-dynamic';

const sanitizeName = (name: string | null | undefined, uid?: string | null) => {
  const t = (name ?? '').trim();
  if (!t) return 'Friend';
  if (uid && t === uid) return 'Friend';
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(t);
  if (isUuid) return 'Friend';
  return t;
};

const firstString = (...values: any[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

const firstAge = (...values: any[]) => {
  for (const value of values) {
    if (value == null || value === '') continue;
    const n = typeof value === 'number' ? value : parseInt(String(value).trim(), 10);
    if (Number.isFinite(n) && n > 0 && n <= 120) return n;
  }
  return null;
};

const parseDateOnlyUtc = (value: string | null | undefined) => {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value).trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mm = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mm) || !Number.isFinite(d)) return null;
  return Date.UTC(y, mm - 1, d);
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tab = (url.searchParams.get('tab') || 'weekly').toLowerCase();
    const isMonthly = tab === 'monthly';
    const orderField = isMonthly ? 'monthly_points' : 'weekly_points';
    const { weekStartIso, weekEndIso, weekStartDate } = getScoreWeekRangeUtc();

    const activeUserIds = isMonthly ? [] : await getAllScoreWeekActiveUserIds(weekStartIso, weekEndIso);

    const { data: scoredRows, error: scoredError } = await supabaseAdmin
      .from('users_points')
      .select('user_id,total_points,weekly_points,monthly_points,today_points,badges,level,last_earned_date,users(name,email,points,weeklypoints,monthlypoints)')
      .gt(orderField, 0)
      .order(orderField, { ascending: false, nullsFirst: false })
      .limit(100);

    if (scoredError) {
      console.error('Leaderboard API error:', scoredError);
      return NextResponse.json({ entries: [], lastWinner: null, error: scoredError.message }, { status: 500 });
    }

    const mergedUserIds = new Set<string>(activeUserIds);
    for (const row of scoredRows || []) {
      if (row?.user_id) mergedUserIds.add(String(row.user_id));
    }

    const missingUserIds = [...mergedUserIds].filter(
      (userId) => !(scoredRows || []).some((row: any) => String(row.user_id) === userId)
    );

    let extraRows: any[] = [];
    if (missingUserIds.length > 0) {
      const { data: extraData, error: extraError } = await supabaseAdmin
        .from('users_points')
        .select('user_id,total_points,weekly_points,monthly_points,today_points,badges,level,last_earned_date,users(name,email,points,weeklypoints,monthlypoints)')
        .in('user_id', missingUserIds);

      if (extraError) {
        console.error('Leaderboard extra users error:', extraError);
      } else {
        extraRows = extraData || [];
      }
    }

    const allRows = [...(scoredRows || []), ...extraRows];
    const filteredRows = allRows.filter((row: any) => !isTestModeEmail(row.users?.email));

    const profilesByUid = new Map<string, any>();
    const rawUserIds = filteredRows.map((row: any) => row.user_id).filter(Boolean);
    if (rawUserIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('users')
        .select('*')
        .in('uid', rawUserIds);

      if (profilesError) {
        console.error('Leaderboard users profile lookup error:', profilesError);
      } else {
        for (const profile of profiles || []) {
          profilesByUid.set(String((profile as any).uid), profile);
        }
      }
    }

    const metadataByUserId = new Map<string, any>();
    try {
      const { data: authUsers, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      if (authUsersError) {
        console.warn('Leaderboard auth metadata lookup error:', authUsersError.message);
      } else {
        for (const authUser of authUsers?.users || []) {
          metadataByUserId.set(String((authUser as any).id), (authUser as any).user_metadata || {});
        }
      }
    } catch (authUsersException: any) {
      console.warn('Leaderboard auth metadata lookup threw:', authUsersException?.message || authUsersException);
    }

    const userIds = filteredRows.map((row: any) => String(row.user_id)).filter(Boolean);
    const weeklyScoreByUser = isMonthly
      ? new Map<string, number>()
      : await getWeeklyScoresForUsers(userIds, weekStartIso, weekEndIso);
    const weeklyActivityByUser = isMonthly
      ? new Map()
      : await getWeeklyActivityCountsForUsers(userIds, weekStartIso, weekEndIso);

    const winnerTickByUser = new Set<string>();
    if (userIds.length > 0) {
      const { data: winnerRows, error: winnerErr } = await supabaseAdmin
        .from('featured_winners')
        .select('user_id')
        .in('user_id', userIds);

      if (winnerErr) {
        if (winnerErr.code !== '42P01') {
          console.warn('Leaderboard featured winners lookup error:', winnerErr.message);
        }
      } else {
        for (const row of winnerRows || []) {
          const uid = String((row as any).user_id || '');
          if (uid) winnerTickByUser.add(uid);
        }
      }
    }

    const entriesBase = filteredRows.map((row: any) => {
      const displayName = sanitizeName(row.users?.name, row.user_id);
      const userProfile = profilesByUid.get(String(row.user_id)) || {};
      const userMeta = metadataByUserId.get(String(row.user_id)) || {};
      const madrasahName = firstString(
        userProfile.madrasahName,
        userProfile.madrasahname,
        userProfile.madrasah_name,
        userProfile.masjidName,
        userProfile.masjid_name,
        userProfile.masjid,
        userMeta.madrasahName,
        userMeta.madrasahname,
        userMeta.madrasah_name,
        userMeta.masjidName,
        userMeta.masjid_name,
        userMeta.masjid
      );
      const city = firstString(
        userProfile.city,
        userProfile.town,
        userProfile.location,
        userProfile.city_name,
        userProfile.address_city,
        userMeta.city,
        userMeta.town,
        userMeta.location,
        userMeta.cityName,
        userMeta.addressCity,
        userMeta.address_city
      );
      const age = firstAge(
        userProfile.age,
        userProfile.childAge,
        userProfile.child_age,
        userMeta.age,
        userMeta.childAge,
        userMeta.child_age
      );
      const totalPoints = Number(row.total_points ?? row.users?.points ?? 0);
      const rawWeeklyPoints = Number(row.weekly_points ?? row.users?.weeklypoints ?? 0);
      const rawMonthlyPoints = Number(row.monthly_points ?? row.users?.monthlypoints ?? 0);
      const weeklyPoints = Number.isFinite(rawWeeklyPoints) ? Math.max(0, rawWeeklyPoints) : 0;
      const monthlyPoints = Number.isFinite(rawMonthlyPoints) ? Math.max(0, rawMonthlyPoints) : 0;
      const weeklyScore = weeklyScoreByUser.get(String(row.user_id)) || 0;
      const todayPoints = resolveTodayPoints(row.today_points, row.last_earned_date);
      const activity = weeklyActivityByUser.get(String(row.user_id)) || {
        quizCount: 0,
        gameCount: 0,
        pledgeCount: 0,
        recordingCount: 0,
        totalCount: 0,
      };

      return {
        uid: row.user_id,
        name: displayName,
        madrasahName,
        city,
        age,
        level: row.level ?? 1,
        points: totalPoints,
        weeklyPoints,
        monthlyPoints,
        todayPoints,
        weeklyScore,
        maxWeeklyScore: MAX_WEEKLY_SCORE,
        badges: row.badges ?? 0,
        lastPlayedDate: row.last_earned_date ?? null,
        weeklyActivityCount: activity.totalCount,
        weeklyQuizAttempts: activity.quizCount,
        weeklyChallengeDone: isEligibleForWeeklyDraw(weeklyPoints),
        drawEligible: isEligibleForWeeklyDraw(weeklyPoints),
      };
    });

    const entriesWithFlags = entriesBase.map((entry: any) => ({
      ...entry,
      winnerTick: winnerTickByUser.has(String(entry.uid)),
    }));

    const compareLastPlayedDesc = (a: any, b: any) => {
      const aDate = parseDateOnlyUtc(a.lastPlayedDate);
      const bDate = parseDateOnlyUtc(b.lastPlayedDate);
      if (aDate !== null && bDate !== null && aDate !== bDate) return bDate - aDate;
      if (aDate === null && bDate !== null) return 1;
      if (aDate !== null && bDate === null) return -1;
      return 0;
    };

    entriesWithFlags.sort((a: any, b: any) => {
      const byLastPlayed = compareLastPlayedDesc(a, b);
      if (byLastPlayed !== 0) return byLastPlayed;

      if (isMonthly) {
        const aMonthly = Number(a.monthlyPoints || 0);
        const bMonthly = Number(b.monthlyPoints || 0);
        if (aMonthly !== bMonthly) return bMonthly - aMonthly;
        return String(a.name || '').localeCompare(String(b.name || ''));
      }

      const aActives = Number(a.weeklyActivityCount || 0);
      const bActives = Number(b.weeklyActivityCount || 0);
      if (aActives !== bActives) return bActives - aActives;

      const aScore = Number(a.weeklyScore || 0);
      const bScore = Number(b.weeklyScore || 0);
      if (aScore !== bScore) return bScore - aScore;

      const aDraw = Boolean(a.drawEligible);
      const bDraw = Boolean(b.drawEligible);
      if (aDraw !== bDraw) return aDraw ? -1 : 1;

      const aWeeklyPoints = Number(a.weeklyPoints || 0);
      const bWeeklyPoints = Number(b.weeklyPoints || 0);
      if (aWeeklyPoints !== bWeeklyPoints) return bWeeklyPoints - aWeeklyPoints;

      return String(a.name || '').localeCompare(String(b.name || ''));
    });

    const entries = entriesWithFlags
      .filter((entry: any) =>
        isMonthly
          ? Number(entry.monthlyPoints || 0) > 0
          : Number(entry.weeklyScore || 0) > 0 || Number(entry.weeklyPoints || 0) > 0
      )
      .slice(0, 100);

    const { data: winnerData } = await supabaseAdmin
      .from('weekly_winners')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let lastWinner: any = null;
    if (winnerData?.user_id) {
      const { data: userData } = await supabaseAdmin.from('users').select('name,email').eq('uid', winnerData.user_id).maybeSingle();
      if (!isTestModeEmail((userData as any)?.email)) {
        const winnerName = sanitizeName(userData?.name, winnerData.user_id) || 'Champion';
        lastWinner = {
          uid: winnerData.user_id,
          name: winnerName,
          level: winnerData.level ?? 1,
          points: Number(winnerData.weekly_points ?? 0),
          badges: winnerData.badges ?? 0,
        };
      }
    }

    const res = NextResponse.json({
      entries,
      lastWinner,
      scoreWeekStart: weekStartDate,
      maxWeeklyScore: MAX_WEEKLY_SCORE,
      dailyCap: POINTS_DAILY_CAP,
      error: null,
    });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
    return res;
  } catch (e: any) {
    console.error('Leaderboard API exception:', e);
    return NextResponse.json({ entries: [], lastWinner: null, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createAuthClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    // Client sends its local YYYY-MM-DD and getTimezoneOffset() (minutes ahead of UTC)
    const clientDate = searchParams.get('date');
    const tzOffset = parseInt(searchParams.get('tz') ?? '0', 10); // minutes (positive = behind UTC, e.g. EST=300)

    // Compute UTC bounds for the client's local calendar day
    const dateStr = clientDate ?? new Date().toISOString().slice(0, 10);
    const localMidnightUTC = new Date(`${dateStr}T00:00:00Z`);
    const todayStart = new Date(localMidnightUTC.getTime() + tzOffset * 60000).toISOString();
    const todayEnd   = new Date(localMidnightUTC.getTime() + tzOffset * 60000 + 86400000 - 1).toISOString();

    // 7 days ago (from the start of the client's today)
    const sevenDaysAgo = new Date(localMidnightUTC.getTime() + tzOffset * 60000 - 7 * 86_400_000).toISOString();

    // Today's logs
    const { data: todayLogs, error: todayErr } = await supabase
      .from('nutrition_logs')
      .select('meal_type, total_calories, protein_g, carbs_g, fat_g, logged_at, description')
      .eq('user_id', user.id)
      .gte('logged_at', todayStart)
      .lte('logged_at', todayEnd)
      .order('logged_at', { ascending: false });

    if (todayErr) throw todayErr;

    // Last 7 days of logs (for averages)
    const { data: weekLogs, error: weekErr } = await supabase
      .from('nutrition_logs')
      .select('logged_at, total_calories, protein_g, carbs_g, fat_g')
      .eq('user_id', user.id)
      .gte('logged_at', sevenDaysAgo)
      .order('logged_at', { ascending: false });

    if (weekErr) throw weekErr;

    // Recent meals (last 20, with items)
    const { data: recentLogs, error: recentErr } = await supabase
      .from('nutrition_logs')
      .select(`
        id, logged_at, meal_type, description, total_calories, protein_g, carbs_g, fat_g, source,
        nutrition_log_items ( name, quantity, calories )
      `)
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false })
      .limit(20);

    if (recentErr) throw recentErr;

    // Compute today totals
    const todayTotals = (todayLogs ?? []).reduce(
      (acc, r) => ({
        calories: acc.calories + (r.total_calories ?? 0),
        protein:  acc.protein  + (r.protein_g ?? 0),
        carbs:    acc.carbs    + (r.carbs_g ?? 0),
        fat:      acc.fat      + (r.fat_g ?? 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    // Group week logs by date and compute daily totals
    const byDate: Record<string, { calories: number; protein: number }> = {};
    for (const r of weekLogs ?? []) {
      const date = r.logged_at.slice(0, 10);
      if (!byDate[date]) byDate[date] = { calories: 0, protein: 0 };
      byDate[date].calories += r.total_calories ?? 0;
      byDate[date].protein  += r.protein_g ?? 0;
    }
    const dayTotals = Object.values(byDate);
    const weekAvgCalories = dayTotals.length
      ? Math.round(dayTotals.reduce((s, d) => s + d.calories, 0) / dayTotals.length)
      : 0;
    const weekAvgProtein = dayTotals.length
      ? Math.round(dayTotals.reduce((s, d) => s + d.protein, 0) / dayTotals.length)
      : 0;

    return NextResponse.json({
      today: {
        calories: Math.round(todayTotals.calories),
        protein_g: Math.round(todayTotals.protein),
        carbs_g: Math.round(todayTotals.carbs),
        fat_g: Math.round(todayTotals.fat),
        meal_count: (todayLogs ?? []).length,
      },
      week: {
        avg_calories: weekAvgCalories,
        avg_protein_g: weekAvgProtein,
        days_logged: dayTotals.length,
      },
      recent: recentLogs ?? [],
    });
  } catch (err: any) {
    console.error('[nutrition/summary]', err);
    return NextResponse.json({ error: 'Failed to load summary', detail: err?.message }, { status: 500 });
  }
}

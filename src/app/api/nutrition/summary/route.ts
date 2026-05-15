import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createServerClient();
    const now = new Date();

    // Today's bounds (local midnight → end of day in UTC)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

    // 7 days ago
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();

    // Today's logs
    const { data: todayLogs, error: todayErr } = await supabase
      .from('nutrition_logs')
      .select('meal_type, total_calories, protein_g, carbs_g, fat_g, logged_at, description')
      .eq('user_id', 'default')
      .gte('logged_at', todayStart)
      .lte('logged_at', todayEnd)
      .order('logged_at', { ascending: false });

    if (todayErr) throw todayErr;

    // Last 7 days of logs (for averages)
    const { data: weekLogs, error: weekErr } = await supabase
      .from('nutrition_logs')
      .select('logged_at, total_calories, protein_g, carbs_g, fat_g')
      .eq('user_id', 'default')
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
      .eq('user_id', 'default')
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

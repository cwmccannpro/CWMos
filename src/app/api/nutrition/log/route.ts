import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

const MEAL_TYPES = new Set(['breakfast', 'lunch', 'dinner', 'snack', 'unknown']);

function authError() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function validationError(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

export async function POST(req: Request) {
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return authError();
  const bearerKey = authHeader.slice(7);

  // ── Resolve user from their personal nutrition API key ────────────────────
  const supabase = await createServerClient();

  const { data: integration } = await supabase
    .from('user_integrations')
    .select('user_id')
    .eq('provider', 'nutrition-chatgpt')
    .eq('enabled', true)
    // credentials->api_key must match the bearer token
    .filter('credentials->>api_key', 'eq', bearerKey)
    .single();

  if (!integration) return authError();
  const targetUserId = integration.user_id;

  // ── Parse ──────────────────────────────────────────────────────────────────
  let body: any;
  try { body = await req.json(); } catch {
    return validationError('Invalid JSON body');
  }

  // ── Validate ───────────────────────────────────────────────────────────────
  if (!body.logged_at || isNaN(Date.parse(body.logged_at)))
    return validationError('logged_at must be a valid ISO datetime');
  if (!body.meal_type || !MEAL_TYPES.has(body.meal_type))
    return validationError(`meal_type must be one of: ${[...MEAL_TYPES].join(', ')}`);
  if (!Array.isArray(body.items) || body.items.length === 0)
    return validationError('items must be a non-empty array');
  if (!body.totals || typeof body.totals !== 'object')
    return validationError('totals object is required');

  const totals = body.totals;

  // ── Persist ────────────────────────────────────────────────────────────────
  try {
    const { data: log, error: logError } = await supabase
      .from('nutrition_logs')
      .insert({
        user_id:        targetUserId,
        logged_at:      body.logged_at,
        meal_type:      body.meal_type,
        description:    body.description ?? null,
        total_calories: totals.calories ?? null,
        protein_g:      totals.protein_g ?? null,
        carbs_g:        totals.carbs_g ?? null,
        fat_g:          totals.fat_g ?? null,
        fiber_g:        totals.fiber_g ?? null,
        sugar_g:        totals.sugar_g ?? null,
        sodium_mg:      totals.sodium_mg ?? null,
        source:         body.source ?? 'chatgpt',
        confidence:     body.confidence ?? null,
        notes:          body.notes ?? null,
      })
      .select('id')
      .single();

    if (logError) throw logError;

    const items = (body.items as any[]).map(item => ({
      log_id:     log.id,
      name:       item.name,
      quantity:   item.quantity ?? null,
      calories:   item.calories ?? null,
      protein_g:  item.protein_g ?? null,
      carbs_g:    item.carbs_g ?? null,
      fat_g:      item.fat_g ?? null,
      fiber_g:    item.fiber_g ?? null,
      sugar_g:    item.sugar_g ?? null,
      sodium_mg:  item.sodium_mg ?? null,
      confidence: item.confidence ?? null,
    }));

    const { error: itemsError } = await supabase.from('nutrition_log_items').insert(items);
    if (itemsError) throw itemsError;

    return NextResponse.json({ success: true, log_id: log.id }, { status: 201 });
  } catch (err: any) {
    console.error('[nutrition/log]', err);
    return NextResponse.json({ error: 'Database error', detail: err?.message }, { status: 500 });
  }
}

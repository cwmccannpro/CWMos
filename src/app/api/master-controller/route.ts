import { NextRequest, NextResponse } from 'next/server';
import { processMessage } from '@/lib/orchestrator';

// Import bootstrap so modules are registered when this route handler runs.
// Each API route file has its own module graph, so bootstrap must be imported
// explicitly here — it cannot be assumed to have run from a client import.
import '@/lib/modules';

export async function POST(req: NextRequest) {
  let body: { message?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { message } = body;
  if (!message || typeof message !== 'string') {
    return NextResponse.json(
      { error: 'Request body must include a "message" string field.' },
      { status: 400 }
    );
  }

  const response = await processMessage(message);

  // Serialize Dates before sending (JSON.stringify drops non-serializable fields)
  return NextResponse.json({
    message: {
      ...response.message,
      timestamp: response.message.timestamp.toISOString(),
    },
    intent: response.intent ?? null,
  });
}

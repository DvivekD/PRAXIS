import { NextRequest, NextResponse } from "next/server";

// In-memory global store for active phone proctor streams
declare global {
  // eslint-disable-next-line no-var
  var __praxis_phone_streams:
    | Map<string, { previewUrl: string; timestamp: number }>
    | undefined;
}

if (!globalThis.__praxis_phone_streams) {
  globalThis.__praxis_phone_streams = new Map();
}

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, previewUrl, timestamp } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    if (previewUrl) {
      globalThis.__praxis_phone_streams!.set(sessionId, {
        previewUrl,
        timestamp: timestamp || Date.now(),
      });
    }

    // Clean up stale entries older than 2 minutes if map grows large
    if (globalThis.__praxis_phone_streams!.size > 50) {
      const now = Date.now();
      for (const [key, value] of globalThis.__praxis_phone_streams!.entries()) {
        if (now - value.timestamp > 120000) {
          globalThis.__praxis_phone_streams!.delete(key);
        }
      }
    }

    return NextResponse.json({ ok: true, timestamp: Date.now() });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process stream" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json(
      { connected: false, error: "Missing sessionId" },
      { status: 400 }
    );
  }

  const stream = globalThis.__praxis_phone_streams?.get(sessionId);

  if (!stream) {
    return NextResponse.json({ connected: false, previewUrl: null });
  }

  const isFresh = Date.now() - stream.timestamp < 10000;

  return NextResponse.json({
    connected: isFresh,
    previewUrl: stream.previewUrl,
    timestamp: stream.timestamp,
  });
}

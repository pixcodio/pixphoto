import { subscribeSSE, updatePing } from '@/lib/room-store';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const cleanId = id.toUpperCase().trim();
  const url = new URL(request.url);
  const peerId = url.searchParams.get('peerId') || '';

  if (peerId) {
    updatePing(cleanId, peerId);
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let keepAliveTimer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Initial connection ping
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ time: Date.now(), peerId })}\n\n`)
      );

      // Subscribe to room broadcast events
      unsubscribe = subscribeSSE(cleanId, (event) => {
        // If event has a targetId and it's not this peer, skip
        if (event.targetId && peerId && event.targetId !== peerId) {
          return;
        }

        try {
          controller.enqueue(
            encoder.encode(`event: message\ndata: ${JSON.stringify(event)}\n\n`)
          );
        } catch {
          // Stream closed or disconnected
        }
      });

      // Keep connection alive with periodic comment pings
      keepAliveTimer = setInterval(() => {
        try {
          if (peerId) updatePing(cleanId, peerId);
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          if (keepAliveTimer) clearInterval(keepAliveTimer);
        }
      }, 15000);
    },
    cancel() {
      if (unsubscribe) unsubscribe();
      if (keepAliveTimer) clearInterval(keepAliveTimer);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

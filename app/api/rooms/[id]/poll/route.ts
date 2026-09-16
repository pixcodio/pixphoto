import { NextResponse } from 'next/server';
import { getEventsSince, getRoom, updatePing } from '@/lib/room-store';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const cleanId = id.toUpperCase().trim();
  const room = getRoom(cleanId);

  if (!room) {
    return NextResponse.json(
      { error: 'Room tidak ditemukan' },
      { status: 404 }
    );
  }

  const url = new URL(request.url);
  const peerId = url.searchParams.get('peerId') || '';
  const since = parseInt(url.searchParams.get('since') || '0', 10);

  if (peerId) {
    updatePing(cleanId, peerId);
  }

  const events = getEventsSince(cleanId, since).filter(
    (e) => !e.targetId || e.targetId === peerId
  );

  return NextResponse.json({
    events,
    timestamp: Date.now(),
    room: {
      template: room.template,
      activeFilter: room.activeFilter,
      participants: room.participants,
      capturedPhotos: room.capturedPhotos,
      countdown: room.countdown,
    },
  });
}

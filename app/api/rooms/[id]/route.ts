import { NextResponse } from 'next/server';
import { getRoom } from '@/lib/room-store';

export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const room = getRoom(id);

  if (!room) {
    return NextResponse.json(
      { error: 'Room tidak ditemukan' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    id: room.id,
    createdAt: room.createdAt,
    participantCount: Object.keys(room.participants).length,
    participants: room.participants,
    template: room.template,
    activeFilter: room.activeFilter,
    countdown: room.countdown,
    capturedPhotos: room.capturedPhotos,
    lastCapturedAt: room.lastCapturedAt,
    isFull: Object.keys(room.participants).length >= 4,
  });
}

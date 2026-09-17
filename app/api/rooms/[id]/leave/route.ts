import { NextResponse } from 'next/server';
import { leaveRoom } from '@/lib/room-store';

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const cleanId = id.toUpperCase().trim();

    const body = await request.json().catch(() => ({}));
    const peerId = body.peerId;

    if (peerId) {
      leaveRoom(cleanId, peerId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error leaving room:', error);
    return NextResponse.json(
      { error: 'Gagal memproses keluar room' },
      { status: 500 }
    );
  }
}

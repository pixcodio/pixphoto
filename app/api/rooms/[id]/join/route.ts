import { NextResponse } from 'next/server';
import { joinRoom } from '@/lib/room-store';

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const body = await request.json();
    const { peerId, name, isHost } = body;

    if (!peerId) {
      return NextResponse.json(
        { error: 'peerId diperlukan' },
        { status: 400 }
      );
    }

    const result = joinRoom(id, peerId, name || '', !!isHost);

    if (!result.success) {
      if (result.error === 'ROOM_FULL') {
        return NextResponse.json(
          {
            error: 'ROOM_FULL',
            message: 'Room ini sudah penuh (maksimal 4 orang).',
          },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: result.error || 'Gagal bergabung dengan room' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      room: result.room,
    });
  } catch (error) {
    console.error('Error joining room:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat bergabung' },
      { status: 500 }
    );
  }
}

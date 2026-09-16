import { NextResponse } from 'next/server';
import { createRoom } from '@/lib/room-store';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const customId = body.roomId;
    const room = createRoom(customId);
    return NextResponse.json({
      success: true,
      roomId: room.id,
      room,
    });
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json(
      { error: 'Gagal membuat room' },
      { status: 500 }
    );
  }
}

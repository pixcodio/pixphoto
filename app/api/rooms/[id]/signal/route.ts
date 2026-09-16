import { NextResponse } from 'next/server';
import {
  broadcastEvent,
  getRoom,
  setRoomTemplate,
  setRoomFilter,
  resetBooth,
  updatePing,
} from '@/lib/room-store';
import { SignalEvent } from '@/lib/types';

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const cleanId = id.toUpperCase().trim();
    const room = getRoom(cleanId);

    if (!room) {
      return NextResponse.json(
        { error: 'Room tidak ditemukan' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { type, senderId, targetId, payload } = body;

    if (!type || !senderId) {
      return NextResponse.json(
        { error: 'type dan senderId diperlukan' },
        { status: 400 }
      );
    }

    updatePing(cleanId, senderId);

    // Handle high-level synchronized actions
    if (type === 'change-template' && payload?.template) {
      setRoomTemplate(cleanId, payload.template, senderId);
      return NextResponse.json({ success: true });
    }

    if (type === 'change-filter' && payload?.filter) {
      setRoomFilter(cleanId, payload.filter, senderId);
      return NextResponse.json({ success: true });
    }

    if (type === 'reset-booth') {
      resetBooth(cleanId, senderId);
      return NextResponse.json({ success: true });
    }

    if (type === 'start-countdown') {
      room.countdown = {
        active: true,
        secondsLeft: payload?.durationSec || 3,
        startedAt: Date.now(),
        totalShots: payload?.totalShots || 1,
        currentShot: payload?.currentShot || 1,
      };
    }

    const signalEvent: SignalEvent = {
      id: `sig-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      senderId,
      targetId,
      payload,
      timestamp: Date.now(),
    };

    broadcastEvent(cleanId, signalEvent);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in signal route:', error);
    return NextResponse.json(
      { error: 'Gagal memproses sinyal' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { getRoom, recordCapturedPhoto } from '@/lib/room-store';

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
    const { peerId, photoDataUrl } = body;

    if (!peerId || !photoDataUrl) {
      return NextResponse.json(
        { error: 'peerId dan photoDataUrl diperlukan' },
        { status: 400 }
      );
    }

    recordCapturedPhoto(cleanId, peerId, photoDataUrl);

    return NextResponse.json({
      success: true,
      capturedCount: Object.keys(room.capturedPhotos).length,
      totalParticipants: Object.keys(room.participants).length,
      allPhotos: room.capturedPhotos,
    });
  } catch (error) {
    console.error('Error uploading photo:', error);
    return NextResponse.json(
      { error: 'Gagal mengunggah foto' },
      { status: 500 }
    );
  }
}

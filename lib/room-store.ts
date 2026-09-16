import { RoomState, Participant, SignalEvent, TemplateType, FilterType } from './types';

// Global store to survive hot-module reloading in Next.js development
declare global {
  var __pixphoto_rooms: Map<string, RoomState> | undefined;
  var __pixphoto_events: Map<string, SignalEvent[]> | undefined;
  var __pixphoto_sse: Map<string, Set<(event: SignalEvent) => void>> | undefined;
}

const rooms = globalThis.__pixphoto_rooms ?? new Map<string, RoomState>();
const eventLogs = globalThis.__pixphoto_events ?? new Map<string, SignalEvent[]>();
const sseListeners = globalThis.__pixphoto_sse ?? new Map<string, Set<(event: SignalEvent) => void>>();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__pixphoto_rooms = rooms;
  globalThis.__pixphoto_events = eventLogs;
  globalThis.__pixphoto_sse = sseListeners;
}

// Generate stylish magazine-like room codes, e.g. VOGUE-481, STUDIO-924, CHIC-305
export function generateRoomCode(): string {
  const prefixes = ['VOGUE', 'STUDIO', 'CHIC', 'REVERIE', 'ATELIER', 'ARCHIVE', 'NOIR', 'DAZED'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const num = Math.floor(100 + Math.random() * 900); // 3-digit number
  return `${prefix}-${num}`;
}

export function createRoom(customId?: string): RoomState {
  const id = (customId || generateRoomCode()).toUpperCase().trim();
  const room: RoomState = {
    id,
    createdAt: Date.now(),
    participants: {},
    template: 'editorial-haute',
    activeFilter: 'normal',
    countdown: null,
    capturedPhotos: {},
    lastCapturedAt: null,
  };
  rooms.set(id, room);
  eventLogs.set(id, []);
  sseListeners.set(id, new Set());
  return room;
}

export function getRoom(id: string): RoomState | undefined {
  const cleanId = id.toUpperCase().trim();
  cleanupStaleParticipants(cleanId);
  return rooms.get(cleanId);
}

export function cleanupStaleParticipants(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  const now = Date.now();
  const timeoutMs = 18000; // 18 seconds timeout for inactive peers
  let changed = false;

  for (const [peerId, participant] of Object.entries(room.participants)) {
    if (now - participant.lastPing > timeoutMs) {
      delete room.participants[peerId];
      if (room.capturedPhotos[peerId]) {
        delete room.capturedPhotos[peerId];
      }
      changed = true;
      broadcastEvent(roomId, {
        id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        type: 'peer-left',
        senderId: peerId,
        timestamp: now,
        payload: { peerId, reason: 'timeout', roomParticipants: room.participants },
      });
    }
  }

  // If room has been empty for > 2 hours, clean up
  if (Object.keys(room.participants).length === 0 && now - room.createdAt > 2 * 60 * 60 * 1000) {
    rooms.delete(roomId);
    eventLogs.delete(roomId);
    sseListeners.delete(roomId);
  }

  return changed;
}

export function joinRoom(
  roomId: string,
  peerId: string,
  name: string,
  isHost: boolean
): { success: boolean; room?: RoomState; error?: string } {
  const cleanId = roomId.toUpperCase().trim();
  let room = rooms.get(cleanId);

  if (!room) {
    // If room does not exist, create it if it has a valid format
    room = createRoom(cleanId);
  }

  cleanupStaleParticipants(cleanId);

  // Check if peer is already in room
  if (room.participants[peerId]) {
    room.participants[peerId].lastPing = Date.now();
    if (name) room.participants[peerId].name = name;

    // Broadcast to other peers so they can re-establish WebRTC connection
    broadcastEvent(cleanId, {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'peer-joined',
      senderId: peerId,
      timestamp: Date.now(),
      payload: { participant: room.participants[peerId], roomParticipants: room.participants },
    });

    return { success: true, room };
  }

  // Check room capacity limit: Maximum 4 people!
  const currentCount = Object.keys(room.participants).length;
  if (currentCount >= 4) {
    return {
      success: false,
      error: 'ROOM_FULL',
    };
  }

  const isFirst = currentCount === 0;
  const participant: Participant = {
    id: peerId,
    name: name || `Guest ${currentCount + 1}`,
    isHost: isHost || isFirst,
    joinedAt: Date.now(),
    lastPing: Date.now(),
  };

  room.participants[peerId] = participant;

  // Broadcast to other peers
  broadcastEvent(cleanId, {
    id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type: 'peer-joined',
    senderId: peerId,
    timestamp: Date.now(),
    payload: { participant, roomParticipants: room.participants },
  });

  return { success: true, room };
}

export function leaveRoom(roomId: string, peerId: string) {
  const cleanId = roomId.toUpperCase().trim();
  const room = rooms.get(cleanId);
  if (!room) return;

  if (room.participants[peerId]) {
    delete room.participants[peerId];
    if (room.capturedPhotos[peerId]) {
      delete room.capturedPhotos[peerId];
    }
    broadcastEvent(cleanId, {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'peer-left',
      senderId: peerId,
      timestamp: Date.now(),
      payload: { peerId, roomParticipants: room.participants },
    });
  }
}

export function updatePing(roomId: string, peerId: string) {
  const cleanId = roomId.toUpperCase().trim();
  const room = rooms.get(cleanId);
  if (room && room.participants[peerId]) {
    room.participants[peerId].lastPing = Date.now();
  }
}

export function setRoomTemplate(roomId: string, template: TemplateType, senderId: string) {
  const cleanId = roomId.toUpperCase().trim();
  const room = rooms.get(cleanId);
  if (!room) return;
  room.template = template;
  broadcastEvent(cleanId, {
    id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type: 'change-template',
    senderId,
    timestamp: Date.now(),
    payload: { template },
  });
}

export function setRoomFilter(roomId: string, filter: FilterType, senderId: string) {
  const cleanId = roomId.toUpperCase().trim();
  const room = rooms.get(cleanId);
  if (!room) return;
  room.activeFilter = filter;
  broadcastEvent(cleanId, {
    id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type: 'change-filter',
    senderId,
    timestamp: Date.now(),
    payload: { filter },
  });
}

export function recordCapturedPhoto(roomId: string, peerId: string, photoDataUrl: string) {
  const cleanId = roomId.toUpperCase().trim();
  const room = rooms.get(cleanId);
  if (!room) return;

  room.capturedPhotos[peerId] = photoDataUrl;
  const participantIds = Object.keys(room.participants);
  const capturedIds = Object.keys(room.capturedPhotos);

  // If all participants have uploaded, or at least this peer uploaded
  broadcastEvent(cleanId, {
    id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type: 'photo-captured',
    senderId: peerId,
    timestamp: Date.now(),
    payload: {
      peerId,
      allCaptured: capturedIds.length >= participantIds.length,
      photos: room.capturedPhotos,
    },
  });
}

export function resetBooth(roomId: string, senderId: string) {
  const cleanId = roomId.toUpperCase().trim();
  const room = rooms.get(cleanId);
  if (!room) return;

  room.capturedPhotos = {};
  room.countdown = null;
  room.lastCapturedAt = null;

  broadcastEvent(cleanId, {
    id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type: 'reset-booth',
    senderId,
    timestamp: Date.now(),
    payload: {},
  });
}

export function broadcastEvent(roomId: string, event: SignalEvent) {
  const cleanId = roomId.toUpperCase().trim();
  let logs = eventLogs.get(cleanId);
  if (!logs) {
    logs = [];
    eventLogs.set(cleanId, logs);
  }

  logs.push(event);
  if (logs.length > 200) {
    logs.splice(0, logs.length - 200); // Keep last 200
  }

  // Push to active SSE clients
  const listeners = sseListeners.get(cleanId);
  if (listeners) {
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Error notifying SSE listener:', err);
      }
    }
  }
}

export function subscribeSSE(roomId: string, listener: (event: SignalEvent) => void): () => void {
  const cleanId = roomId.toUpperCase().trim();
  let listeners = sseListeners.get(cleanId);
  if (!listeners) {
    listeners = new Set();
    sseListeners.set(cleanId, listeners);
  }

  listeners.add(listener);
  return () => {
    listeners?.delete(listener);
  };
}

export function getEventsSince(roomId: string, since: number): SignalEvent[] {
  const cleanId = roomId.toUpperCase().trim();
  const logs = eventLogs.get(cleanId) || [];
  return logs.filter((e) => e.timestamp > since);
}

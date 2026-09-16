export type TemplateType = 'editorial-haute' | 'indie-archive';
export type FilterType = 'normal' | 'bw' | 'warm' | 'cool' | 'grain';

export interface Participant {
  id: string; // peerId
  name: string;
  isHost: boolean;
  joinedAt: number;
  lastPing: number;
  photoDataUrl?: string | null;
}

export interface CountdownState {
  active: boolean;
  secondsLeft: number;
  startedAt: number;
  totalShots?: number;
  currentShot?: number;
}

export interface RoomState {
  id: string;
  createdAt: number;
  participants: Record<string, Participant>;
  template: TemplateType;
  activeFilter: FilterType;
  countdown: CountdownState | null;
  capturedPhotos: Record<string, string>; // peerId -> dataUrl
  lastCapturedAt: number | null;
}

export type SignalEventType =
  | 'peer-joined'
  | 'peer-left'
  | 'webrtc-offer'
  | 'webrtc-answer'
  | 'webrtc-ice'
  | 'change-template'
  | 'change-filter'
  | 'start-countdown'
  | 'photo-captured'
  | 'reset-booth'
  | 'ping';

export interface SignalEvent {
  id: string;
  type: SignalEventType;
  senderId: string;
  targetId?: string;
  payload?: unknown;
  timestamp: number;
}

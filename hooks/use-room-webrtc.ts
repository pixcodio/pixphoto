'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FilterType, Participant, RoomState, SignalEvent, TemplateType } from '@/lib/types';
import { playCountdownBeep, playShutterSound, playSuccessChime } from '@/lib/audio';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

interface UseRoomWebRTCOptions {
  roomId: string;
  userName: string;
}

export function useRoomWebRTC({ roomId, userName }: UseRoomWebRTCOptions) {
  const [peerId] = useState(() => `peer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [participants, setParticipants] = useState<Record<string, Participant>>({});
  const [isFull, setIsFull] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Booth States
  const [template, setTemplate] = useState<TemplateType>('editorial-haute');
  const [activeFilter, setActiveFilter] = useState<FilterType>('normal');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<Record<string, string>>({});
  const [isCapturing, setIsCapturing] = useState(false);
  const [isMirrored, setIsMirrored] = useState(true);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastEventTimeRef = useRef<number>(0);
  const isHostRef = useRef<boolean>(false);

  // Helper to send signals to API
  const sendSignal = useCallback(
    async (type: SignalEvent['type'], payload?: unknown, targetId?: string) => {
      try {
        await fetch(`/api/rooms/${roomId}/signal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            senderId: peerId,
            targetId,
            payload,
          }),
        });
      } catch (err) {
        console.error('Failed to send signal:', err);
      }
    },
    [roomId, peerId]
  );

  // Capture local camera snapshot frame
  const captureLocalSnapshot = useCallback(async (): Promise<string | null> => {
    if (!localVideoRef.current) return null;
    const video = localVideoRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    if (isMirrored) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    return dataUrl;
  }, [isMirrored]);

  // Execute synchronized countdown
  const triggerLocalCountdown = useCallback(
    (durationSec: number = 3) => {
      setIsCapturing(true);
      let sec = durationSec;
      setCountdown(sec);
      playCountdownBeep(false);

      const interval = setInterval(async () => {
        sec -= 1;
        if (sec > 0) {
          setCountdown(sec);
          playCountdownBeep(false);
        } else {
          clearInterval(interval);
          setCountdown(0);
          playCountdownBeep(true);

          // Flash effect & shutter click
          setIsFlashing(true);
          playShutterSound();
          setTimeout(() => setIsFlashing(false), 500);

          // Capture photo immediately at flash
          try {
            const myPhoto = await captureLocalSnapshot();
            if (myPhoto) {
              setCapturedPhotos((prev) => ({ ...prev, [peerId]: myPhoto }));

              // Upload snapshot to server
              await fetch(`/api/rooms/${roomId}/photo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  peerId,
                  photoDataUrl: myPhoto,
                }),
              });
            }
          } catch (e) {
            console.error('Error capturing snapshot:', e);
          } finally {
            setTimeout(() => {
              setCountdown(null);
              setIsCapturing(false);
            }, 600);
          }
        }
      }, 1000);
    },
    [captureLocalSnapshot, peerId, roomId]
  );

  // Setup PeerConnection for a specific remote peer
  const createPeerConnection = useCallback(
    (remotePeerId: string) => {
      if (peerConnections.current.has(remotePeerId)) {
        return peerConnections.current.get(remotePeerId)!;
      }

      const pc = new RTCPeerConnection(RTC_CONFIG);
      peerConnections.current.set(remotePeerId, pc);

      // Add local stream tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal('webrtc-ice', { candidate: event.candidate }, remotePeerId);
        }
      };

      // Handle incoming remote stream
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStreams((prev) => ({
            ...prev,
            [remotePeerId]: event.streams[0],
          }));
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setRemoteStreams((prev) => {
            const next = { ...prev };
            delete next[remotePeerId];
            return next;
          });
        }
      };

      return pc;
    },
    [sendSignal]
  );

  // Initiate WebRTC offer to another peer
  const initiateOffer = useCallback(
    async (remotePeerId: string) => {
      try {
        const pc = createPeerConnection(remotePeerId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendSignal('webrtc-offer', { sdp: offer }, remotePeerId);
      } catch (err) {
        console.error('Error creating offer:', err);
      }
    },
    [createPeerConnection, sendSignal]
  );

  // Handle incoming signals
  const handleSignalEvent = useCallback(
    async (event: SignalEvent) => {
      if (event.senderId === peerId) return;

      switch (event.type) {
        case 'peer-joined': {
          const newPeerId = event.senderId;
          const payload = event.payload as { participant?: Participant; roomParticipants?: Record<string, Participant> } | undefined;
          if (payload?.roomParticipants) {
            setParticipants(payload.roomParticipants);
          } else if (payload?.participant) {
            setParticipants((prev) => ({ ...prev, [newPeerId]: payload.participant! }));
          }

          // Existing peer creates offer to newly arrived peer
          initiateOffer(newPeerId);
          break;
        }

        case 'peer-left': {
          const leftPeerId = event.senderId;
          setParticipants((prev) => {
            const next = { ...prev };
            delete next[leftPeerId];
            return next;
          });
          setRemoteStreams((prev) => {
            const next = { ...prev };
            delete next[leftPeerId];
            return next;
          });
          const pc = peerConnections.current.get(leftPeerId);
          if (pc) {
            pc.close();
            peerConnections.current.delete(leftPeerId);
          }
          break;
        }

        case 'webrtc-offer': {
          try {
            const payload = event.payload as { sdp: RTCSessionDescriptionInit };
            const pc = createPeerConnection(event.senderId);
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await sendSignal('webrtc-answer', { sdp: answer }, event.senderId);
          } catch (err) {
            console.error('Error handling offer:', err);
          }
          break;
        }

        case 'webrtc-answer': {
          try {
            const payload = event.payload as { sdp: RTCSessionDescriptionInit };
            const pc = peerConnections.current.get(event.senderId);
            if (pc) {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            }
          } catch (err) {
            console.error('Error handling answer:', err);
          }
          break;
        }

        case 'webrtc-ice': {
          try {
            const payload = event.payload as { candidate: RTCIceCandidateInit };
            const pc = peerConnections.current.get(event.senderId);
            if (pc && payload.candidate) {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            }
          } catch (err) {
            console.error('Error handling ICE candidate:', err);
          }
          break;
        }

        case 'change-template': {
          const payload = event.payload as { template?: TemplateType };
          if (payload?.template) {
            setTemplate(payload.template);
          }
          break;
        }

        case 'change-filter': {
          const payload = event.payload as { filter?: FilterType };
          if (payload?.filter) {
            setActiveFilter(payload.filter);
          }
          break;
        }

        case 'start-countdown': {
          const payload = event.payload as { durationSec?: number };
          const duration = payload?.durationSec || 3;
          triggerLocalCountdown(duration);
          break;
        }

        case 'photo-captured': {
          const payload = event.payload as { photos?: Record<string, string> };
          if (payload?.photos) {
            setCapturedPhotos(payload.photos);
            playSuccessChime();
          }
          break;
        }

        case 'reset-booth': {
          setCapturedPhotos({});
          setCountdown(null);
          setIsFlashing(false);
          setIsCapturing(false);
          break;
        }
      }
    },
    [peerId, createPeerConnection, initiateOffer, sendSignal, triggerLocalCountdown]
  );

  // Broadcast start countdown to everyone
  const startPhotoSession = useCallback(() => {
    sendSignal('start-countdown', { durationSec: 3 });
    triggerLocalCountdown(3);
  }, [sendSignal, triggerLocalCountdown]);

  // Broadcast template change
  const selectTemplate = useCallback(
    (newTemplate: TemplateType) => {
      setTemplate(newTemplate);
      sendSignal('change-template', { template: newTemplate });
    },
    [sendSignal]
  );

  // Broadcast filter change
  const selectFilter = useCallback(
    (newFilter: FilterType) => {
      setActiveFilter(newFilter);
      sendSignal('change-filter', { filter: newFilter });
    },
    [sendSignal]
  );

  // Broadcast reset
  const resetSession = useCallback(() => {
    setCapturedPhotos({});
    setCountdown(null);
    sendSignal('reset-booth');
  }, [sendSignal]);

  // Initialize Camera
  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: true,
        });
      } catch {
        // Fallback to video only if audio permission rejected
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      }

      localStreamRef.current = stream;
      setLocalStream(stream);

      // Attach to any existing peer connections
      peerConnections.current.forEach((pc) => {
        const senders = pc.getSenders();
        stream.getTracks().forEach((track) => {
          const sender = senders.find((s) => s.track?.kind === track.kind);
          if (sender) {
            sender.replaceTrack(track);
          } else {
            pc.addTrack(track, stream);
          }
        });
      });

      return stream;
    } catch (err: unknown) {
      console.error('Camera access error:', err);
      setError('Tidak dapat mengakses kamera. Pastikan izin kamera telah diaktifkan di browser.');
      return null;
    }
  }, []);

  const toggleCameraFacing = useCallback(() => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    setIsMirrored(nextFacing === 'user');
    startCamera(nextFacing);
  }, [facingMode, startCamera]);

  const toggleMirror = useCallback(() => {
    setIsMirrored((prev) => !prev);
  }, []);

  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((t) => {
        t.enabled = !t.enabled;
      });
      setIsAudioMuted(!audioTracks[0]?.enabled);
    }
  }, []);

  // Main lifecycle setup
  useEffect(() => {
    let isMounted = true;
    const pcs = peerConnections.current;

    async function initRoom() {
      setIsLoading(true);
      setError(null);

      // 1. Check room status first
      try {
        const res = await fetch(`/api/rooms/${roomId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.isFull && !data.participants[peerId]) {
            setIsFull(true);
            setIsLoading(false);
            return;
          }
          if (data.template) setTemplate(data.template);
          if (data.activeFilter) setActiveFilter(data.activeFilter);
        }
      } catch (err) {
        console.warn('Status check warning:', err);
      }

      // 2. Start Camera
      const stream = await startCamera(facingMode);
      if (!stream && !isMounted) return;

      // 3. Join Room API
      try {
        const joinRes = await fetch(`/api/rooms/${roomId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            peerId,
            name: userName,
            isHost: false,
          }),
        });

        const joinData = await joinRes.json();
        if (!joinRes.ok) {
          if (joinData.error === 'ROOM_FULL') {
            setIsFull(true);
            setIsLoading(false);
            return;
          }
          throw new Error(joinData.message || 'Gagal bergabung dengan room');
        }

        const room: RoomState = joinData.room;
        setParticipants(room.participants);
        if (room.participants[peerId]?.isHost) {
          isHostRef.current = true;
        }

        // 4. Connect to SSE
        const sse = new EventSource(`/api/rooms/${roomId}/events?peerId=${peerId}`);
        sseRef.current = sse;

        sse.addEventListener('message', (e) => {
          try {
            const event: SignalEvent = JSON.parse(e.data);
            lastEventTimeRef.current = event.timestamp;
            handleSignalEvent(event);
          } catch (err) {
            console.error('SSE JSON error:', err);
          }
        });

        sse.onerror = () => {
          // SSE error; fallback polling will take care of signals
        };

        // 5. Setup polling fallback
        pollIntervalRef.current = setInterval(async () => {
          try {
            const pollRes = await fetch(
              `/api/rooms/${roomId}/poll?peerId=${peerId}&since=${lastEventTimeRef.current}`
            );
            if (pollRes.ok) {
              const pollData = await pollRes.json();
              if (pollData.events && Array.isArray(pollData.events)) {
                for (const ev of pollData.events) {
                  lastEventTimeRef.current = Math.max(lastEventTimeRef.current, ev.timestamp);
                  handleSignalEvent(ev);
                }
              }
              if (pollData.room?.participants) {
                setParticipants(pollData.room.participants);
              }
            }
          } catch {}
        }, 3000);

        setIsLoading(false);
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Gagal terhubung ke room';
          setError(msg);
          setIsLoading(false);
        }
      }
    }

    initRoom();

    return () => {
      isMounted = false;
      // Cleanup
      if (sseRef.current) sseRef.current.close();
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      pcs.forEach((pc) => pc.close());
      pcs.clear();

      // Notify departure
      fetch(`/api/rooms/${roomId}/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'peer-left',
          senderId: peerId,
        }),
      }).catch(() => {});
    };
  }, [roomId, userName, peerId, facingMode, handleSignalEvent, startCamera]);

  return {
    peerId,
    localStream,
    remoteStreams,
    participants,
    participantCount: Object.keys(participants).length || 1,
    isFull,
    isLoading,
    error,
    localVideoRef,
    // Booth controls
    template,
    selectTemplate,
    activeFilter,
    selectFilter,
    countdown,
    isFlashing,
    isCapturing,
    capturedPhotos,
    hasCapturedPhotos: Object.keys(capturedPhotos).length > 0,
    startPhotoSession,
    resetSession,
    // Device controls
    isMirrored,
    toggleMirror,
    isAudioMuted,
    toggleAudio,
    toggleCameraFacing,
    facingMode,
  };
}

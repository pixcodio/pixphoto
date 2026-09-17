'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FilterType, Participant, RoomState, SignalEvent, TemplateType } from '@/lib/types';
import { playCountdownBeep, playShutterSound, playSuccessChime } from '@/lib/audio';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:openrelay.metered.ca:80' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
};

interface UseRoomWebRTCOptions {
  roomId: string;
  userName: string;
}

export function useRoomWebRTC({ roomId, userName }: UseRoomWebRTCOptions) {
  const [peerId] = useState(() => {
    if (typeof window !== 'undefined') {
      const storageKey = `pixphoto_peer_${roomId}`;
      let stored = sessionStorage.getItem(storageKey);
      if (!stored) {
        stored = `peer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        sessionStorage.setItem(storageKey, stored);
      }
      return stored;
    }
    return `peer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  });
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
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const iceCandidatesQueue = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastEventTimeRef = useRef<number>(0);
  const isHostRef = useRef<boolean>(false);
  const isMirroredRef = useRef<boolean>(isMirrored);
  useEffect(() => {
    isMirroredRef.current = isMirrored;
  }, [isMirrored]);

  const isAudioMutedRef = useRef<boolean>(true);
  useEffect(() => {
    isAudioMutedRef.current = isAudioMuted;
  }, [isAudioMuted]);

  // Forward ref for initiateOffer to resolve circular dependency with createPeerConnection
  const initiateOfferRef = useRef<(remotePeerId: string, iceRestart?: boolean) => Promise<void>>(async () => {});

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

    if (isMirroredRef.current) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    return dataUrl;
  }, []);

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

  // Helper to flush queued ICE candidates once remoteDescription is set
  const flushQueuedIceCandidates = useCallback(async (remotePeerId: string, pc: RTCPeerConnection) => {
    const queue = iceCandidatesQueue.current.get(remotePeerId);
    if (queue && queue.length > 0) {
      for (const candidate of queue) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Error adding queued ICE candidate for peer:', remotePeerId, err);
        }
      }
      iceCandidatesQueue.current.delete(remotePeerId);
    }
  }, []);

  // Setup PeerConnection for a specific remote peer
  const createPeerConnection = useCallback(
    (remotePeerId: string) => {
      const existing = peerConnections.current.get(remotePeerId);
      if (existing && existing.signalingState !== 'closed') {
        return existing;
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

      // Handle incoming remote stream (support fallback if streams[0] is absent)
      pc.ontrack = (event) => {
        let stream = event.streams && event.streams[0];
        if (!stream) {
          stream = new MediaStream([event.track]);
        }
        setRemoteStreams((prev) => {
          const existingStream = prev[remotePeerId];
          if (existingStream) {
            if (!existingStream.getTracks().some((t) => t.id === event.track.id)) {
              existingStream.addTrack(event.track);
            }
            return { ...prev, [remotePeerId]: existingStream };
          }
          return { ...prev, [remotePeerId]: stream };
        });
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed') {
          console.warn(`[WebRTC] Peer ${remotePeerId} connection failed, attempting ICE restart...`);
          initiateOfferRef.current(remotePeerId, true);
        } else if (pc.connectionState === 'closed') {
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
    async (remotePeerId: string, iceRestart = false) => {
      try {
        const pc = createPeerConnection(remotePeerId);
        const offer = await pc.createOffer(iceRestart ? { iceRestart: true } : undefined);
        await pc.setLocalDescription(offer);
        await sendSignal('webrtc-offer', { sdp: offer }, remotePeerId);
      } catch (err) {
        console.error('Error creating offer for peer:', remotePeerId, err);
      }
    },
    [createPeerConnection, sendSignal]
  );
  useEffect(() => {
    initiateOfferRef.current = initiateOffer;
  }, [initiateOffer]);

  // Handle incoming signals
  const handleSignalEvent = useCallback(
    async (event: SignalEvent) => {
      if (event.senderId === peerId) return;

      switch (event.type) {
        case 'peer-joined': {
          const newPeerId = event.senderId;
          const payload = event.payload as {
            participant?: Participant;
            roomParticipants?: Record<string, Participant>;
          } | undefined;

          if (payload?.roomParticipants) {
            setParticipants(payload.roomParticipants);
          } else if (payload?.participant) {
            setParticipants((prev) => ({ ...prev, [newPeerId]: payload.participant! }));
          }

          // If an old closed/failed connection exists for this peerId, recreate it
          const oldPc = peerConnections.current.get(newPeerId);
          if (oldPc && (oldPc.signalingState === 'closed' || oldPc.connectionState === 'failed')) {
            oldPc.close();
            peerConnections.current.delete(newPeerId);
          }

          // Existing peer creates offer to newly arrived / refreshed peer
          initiateOffer(newPeerId);
          break;
        }

        case 'peer-left': {
          const leftPeerId = event.senderId;
          const payload = event.payload as { roomParticipants?: Record<string, Participant> } | undefined;
          if (payload?.roomParticipants) {
            setParticipants(payload.roomParticipants);
          } else {
            setParticipants((prev) => {
              const next = { ...prev };
              delete next[leftPeerId];
              return next;
            });
          }
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
          iceCandidatesQueue.current.delete(leftPeerId);
          break;
        }

        case 'webrtc-offer': {
          try {
            const payload = event.payload as { sdp: RTCSessionDescriptionInit };
            if (!payload?.sdp) return;

            const pc = createPeerConnection(event.senderId);

            // Handle signaling collision (glare)
            if (pc.signalingState !== 'stable') {
              try {
                await Promise.all([
                  pc.setLocalDescription({ type: 'rollback' }),
                  pc.setRemoteDescription(new RTCSessionDescription(payload.sdp)),
                ]);
              } catch {
                await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
              }
            } else {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            }

            // Flush queued ICE candidates now that remote description is set
            await flushQueuedIceCandidates(event.senderId, pc);

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
            if (!payload?.sdp) return;

            const pc = peerConnections.current.get(event.senderId);
            if (pc && pc.signalingState === 'have-local-offer') {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
              // Flush queued ICE candidates now that remote description is set
              await flushQueuedIceCandidates(event.senderId, pc);
            }
          } catch (err) {
            console.error('Error handling answer:', err);
          }
          break;
        }

        case 'webrtc-ice': {
          try {
            const payload = event.payload as { candidate: RTCIceCandidateInit };
            if (!payload?.candidate) return;

            const remoteId = event.senderId;
            const pc = peerConnections.current.get(remoteId);

            if (pc && pc.remoteDescription && pc.remoteDescription.type) {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } else {
              // Queue candidate until remote description is ready
              const queue = iceCandidatesQueue.current.get(remoteId) || [];
              queue.push(payload.candidate);
              iceCandidatesQueue.current.set(remoteId, queue);
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
    [peerId, createPeerConnection, flushQueuedIceCandidates, initiateOffer, sendSignal, triggerLocalCountdown]
  );

  // Signal handler ref to prevent effect recreation
  const handleSignalEventRef = useRef(handleSignalEvent);
  useEffect(() => {
    handleSignalEventRef.current = handleSignalEvent;
  }, [handleSignalEvent]);

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

  // Leave room explicitly
  const exitRoom = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(`pixphoto_peer_${roomId}`);
    }
    fetch(`/api/rooms/${roomId}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ peerId }),
    }).catch(() => {});
  }, [roomId, peerId]);

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

      // Ensure initial audio tracks follow isAudioMutedRef (starts muted by default)
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !isAudioMutedRef.current;
      });

      localStreamRef.current = stream;
      setLocalStream(stream);

      // Attach or replace tracks on any existing peer connections
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
      if (audioTracks.length > 0) {
        const nextEnabled = !audioTracks[0].enabled;
        audioTracks.forEach((t) => {
          t.enabled = nextEnabled;
        });
        setIsAudioMuted(!nextEnabled);
      } else {
        setIsAudioMuted((prev) => !prev);
      }
    }
  }, []);

  // Main lifecycle setup
  useEffect(() => {
    let isMounted = true;
    const pcs = peerConnections.current;
    const iceQueue = iceCandidatesQueue.current;

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
      const stream = await startCamera('user');
      if (!stream && !isMounted) return;

      // 3. Connect to SSE BEFORE /join so no events (offers/answers) are missed
      const sse = new EventSource(`/api/rooms/${roomId}/events?peerId=${peerId}`);
      sseRef.current = sse;

      sse.addEventListener('message', async (e) => {
        try {
          const event: SignalEvent = JSON.parse(e.data);
          lastEventTimeRef.current = Math.max(lastEventTimeRef.current, event.timestamp);
          await handleSignalEventRef.current(event);
        } catch (err) {
          console.error('SSE JSON error:', err);
        }
      });

      sse.onerror = () => {
        // SSE error; fallback polling will take care of signals
      };

      // 4. Join Room API
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

        // If existing participants are already in the room, ensure connection is negotiated
        Object.keys(room.participants).forEach((otherPeerId) => {
          if (otherPeerId !== peerId) {
            setTimeout(() => {
              const pc = peerConnections.current.get(otherPeerId);
              if (!pc || pc.connectionState === 'new' || pc.connectionState === 'failed') {
                initiateOffer(otherPeerId);
              }
            }, 1200);
          }
        });

        // 5. Setup polling fallback
        pollIntervalRef.current = setInterval(async () => {
          try {
            const pollRes = await fetch(
              `/api/rooms/${roomId}/poll?peerId=${peerId}&since=${lastEventTimeRef.current}`
            );
            if (pollRes.ok) {
              const pollData = await pollRes.json();
              if (pollData.events && Array.isArray(pollData.events)) {
                // Await sequentially to preserve signal order (offer -> ice)
                for (const ev of pollData.events) {
                  lastEventTimeRef.current = Math.max(lastEventTimeRef.current, ev.timestamp);
                  await handleSignalEventRef.current(ev);
                }
              }
              if (pollData.room?.participants) {
                setParticipants(pollData.room.participants);
                // Proactively connect to any participant missing an active connection
                Object.keys(pollData.room.participants).forEach((pId) => {
                  if (pId !== peerId) {
                    const pc = peerConnections.current.get(pId);
                    if (!pc || pc.connectionState === 'failed') {
                      initiateOffer(pId);
                    }
                  }
                });
              }
            }
          } catch {}
        }, 2500);

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
      iceQueue.clear();

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
  }, [roomId, userName, peerId, startCamera, initiateOffer]);

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
    exitRoom,
    // Device controls
    isMirrored,
    toggleMirror,
    isAudioMuted,
    toggleAudio,
    toggleCameraFacing,
    facingMode,
  };
}

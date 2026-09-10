import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  addDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { CallSession, CallStatus, IceCandidatePayload, UserProfile } from '../types';
import { getLocalMediaStream, RTC_CONFIG, stopMediaStream } from '../lib/webrtc';
import { soundManager } from '../lib/sound';

interface CallContextType {
  activeCall: CallSession | null;
  incomingCall: CallSession | null;
  callStatus: CallStatus | 'idle';
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMicMuted: boolean;
  isVideoMuted: boolean;
  isFrontCamera: boolean;
  callDuration: number;
  error: string | null;
  startCall: (callee: UserProfile) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMicrophone: () => void;
  toggleCamera: () => void;
  switchCamera: () => Promise<void>;
  clearError: () => void;
}

const CallContext = createContext<CallContextType | null>(null);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();

  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus | 'idle'>('idle');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const activeCallDocRef = useRef<string | null>(null);
  const callTimerRef = useRef<number | null>(null);
  const ringTimeoutRef = useRef<number | null>(null);

  // Keep localStreamRef synced
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Duration timer when connected
  useEffect(() => {
    if (callStatus === 'connected') {
      setCallDuration(0);
      callTimerRef.current = window.setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
      setCallDuration(0);
    }
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    };
  }, [callStatus]);

  // Clean cleanup function
  const cleanupCall = (playEnded = true) => {
    soundManager.stopRingtone();
    if (playEnded) soundManager.playEndedTone();

    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      stopMediaStream(localStreamRef.current);
      localStreamRef.current = null;
      setLocalStream(null);
    }

    setRemoteStream(null);
    setActiveCall(null);
    setIncomingCall(null);
    setCallStatus('idle');
    activeCallDocRef.current = null;
    setIsMicMuted(false);
    setIsVideoMuted(false);
  };

  // Listen for incoming calls
  useEffect(() => {
    if (!user) return;

    // Listen to calls where calleeId == user.uid and status == 'ringing'
    const q = query(
      collection(db, 'calls'),
      where('calleeId', '==', user.uid),
      where('status', '==', 'ringing')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        if (incomingCall && callStatus === 'idle') {
          soundManager.stopRingtone();
          setIncomingCall(null);
        }
        return;
      }

      // Pick the newest ringing call
      const docSnap = snapshot.docs[0];
      const callData = { id: docSnap.id, ...docSnap.data() } as CallSession;

      // Check if not expired (> 45s old)
      if (Date.now() - callData.createdAt > 45000) {
        updateDoc(doc(db, 'calls', callData.id), { status: 'missed' }).catch(() => {});
        return;
      }

      // If already in call, auto-reject as busy
      if (activeCallDocRef.current) {
        if (callData.id !== activeCallDocRef.current) {
          updateDoc(doc(db, 'calls', callData.id), { status: 'rejected' }).catch(() => {});
        }
        return;
      }

      setIncomingCall(callData);
      soundManager.startIncomingRingtone();

      // Trigger Web Notification if allowed
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(`Incoming Video Call`, {
            body: `${callData.callerName} is calling you...`,
            icon: callData.callerPhoto || '/icon.png',
          });
        } catch {}
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user, incomingCall, callStatus]);

  // Request browser Notification permission once
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // START CALL (Caller)
  const startCall = async (callee: UserProfile) => {
    if (!user || !profile) return;
    setError(null);

    // 1. Get media stream
    const { stream, error: mediaError } = await getLocalMediaStream({
      video: true,
      audio: true,
      facingMode: isFrontCamera ? 'user' : 'environment',
    });

    if (mediaError) {
      setError(mediaError);
      if (!stream) return;
    }

    setLocalStream(stream);
    localStreamRef.current = stream;

    // 2. Initialize Peer Connection
    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionRef.current = pc;

    // Stream for remote participant
    const remoteMediaStream = new MediaStream();
    setRemoteStream(remoteMediaStream);

    stream?.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        remoteMediaStream.addTrack(track);
      });
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        setError('Call connection lost. Check your network.');
      }
    };

    // 3. Create call doc in Firestore
    const callDocRef = doc(collection(db, 'calls'));
    const callId = callDocRef.id;
    activeCallDocRef.current = callId;

    const callData: CallSession = {
      id: callId,
      callerId: user.uid,
      callerName: profile.displayName || profile.username,
      callerPhoto: profile.photoURL,
      calleeId: callee.uid,
      calleeName: callee.displayName || callee.username,
      calleePhoto: callee.photoURL,
      type: 'video',
      status: 'ringing',
      createdAt: Date.now(),
    };

    setActiveCall(callData);
    setCallStatus('ringing');
    soundManager.startOutgoingRingtone();

    // 4. Candidate exchange
    const callerCandidatesCol = collection(db, 'calls', callId, 'callerCandidates');
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(callerCandidatesCol, event.candidate.toJSON()).catch(() => {});
      }
    };

    // 5. Create Offer
    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);

    const callPayload = {
      ...callData,
      offer: {
        type: offerDescription.type,
        sdp: offerDescription.sdp,
      },
    };

    await setDoc(callDocRef, callPayload);

    // Ringing timeout (35 seconds)
    ringTimeoutRef.current = window.setTimeout(async () => {
      if (activeCallDocRef.current === callId) {
        await updateDoc(callDocRef, { status: 'missed', endedAt: Date.now() }).catch(() => {});
        cleanupCall(true);
        setError(`${callee.displayName || callee.username} did not answer.`);
      }
    }, 35000);

    // 6. Listen for Callee's answer and state updates
    const unsubCall = onSnapshot(callDocRef, async (snapshot) => {
      const data = snapshot.data() as CallSession | undefined;
      if (!data) return;

      if (data.status === 'rejected') {
        cleanupCall(true);
        setError(`${callee.displayName || callee.username} declined the call.`);
        unsubCall();
      } else if (data.status === 'ended') {
        cleanupCall(true);
        unsubCall();
      } else if (data.status === 'connected' && data.answer && !pc.currentRemoteDescription) {
        if (ringTimeoutRef.current) {
          clearTimeout(ringTimeoutRef.current);
          ringTimeoutRef.current = null;
        }
        soundManager.stopRingtone();
        soundManager.playConnectedTone();
        const answerDescription = new RTCSessionDescription(data.answer);
        await pc.setRemoteDescription(answerDescription);
        setCallStatus('connected');
      }
    });

    // 7. Listen for Callee candidates
    const calleeCandidatesCol = collection(db, 'calls', callId, 'calleeCandidates');
    const unsubCandidates = onSnapshot(calleeCandidatesCol, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const candidateData = change.doc.data() as IceCandidatePayload;
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidateData));
          } catch {}
        }
      });
    });

    // Store unsubs for cleanup if needed
    const prevPcClose = pc.close.bind(pc);
    pc.close = () => {
      unsubCall();
      unsubCandidates();
      prevPcClose();
    };
  };

  // ACCEPT CALL (Callee)
  const acceptCall = async () => {
    if (!incomingCall || !user) return;
    soundManager.stopRingtone();
    setError(null);

    const callId = incomingCall.id;
    activeCallDocRef.current = callId;
    setActiveCall(incomingCall);
    setIncomingCall(null);
    setCallStatus('connected');

    // 1. Get media stream
    const { stream, error: mediaError } = await getLocalMediaStream({
      video: true,
      audio: true,
      facingMode: isFrontCamera ? 'user' : 'environment',
    });

    if (mediaError) {
      setError(mediaError);
      if (!stream) {
        rejectCall();
        return;
      }
    }

    setLocalStream(stream);
    localStreamRef.current = stream;

    // 2. Initialize Peer Connection
    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionRef.current = pc;

    const remoteMediaStream = new MediaStream();
    setRemoteStream(remoteMediaStream);

    stream?.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        remoteMediaStream.addTrack(track);
      });
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        setError('Call connection lost.');
      }
    };

    // 3. Callee candidates collection
    const calleeCandidatesCol = collection(db, 'calls', callId, 'calleeCandidates');
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(calleeCandidatesCol, event.candidate.toJSON()).catch(() => {});
      }
    };

    // 4. Set Remote Description from Caller's Offer
    if (incomingCall.offer) {
      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
    }

    // 5. Create Answer
    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);

    const callDocRef = doc(db, 'calls', callId);
    await updateDoc(callDocRef, {
      answer: {
        type: answerDescription.type,
        sdp: answerDescription.sdp,
      },
      status: 'connected',
    });

    soundManager.playConnectedTone();

    // 6. Read existing caller candidates and listen for new ones
    const callerCandidatesCol = collection(db, 'calls', callId, 'callerCandidates');
    const existingCandidatesSnap = await getDocs(callerCandidatesCol);
    existingCandidatesSnap.forEach(async (d) => {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(d.data() as IceCandidatePayload));
      } catch {}
    });

    const unsubCallerCandidates = onSnapshot(callerCandidatesCol, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(change.doc.data() as IceCandidatePayload));
          } catch {}
        }
      });
    });

    // 7. Listen for Call Status (ended by caller)
    const unsubCallDoc = onSnapshot(callDocRef, (snapshot) => {
      const data = snapshot.data() as CallSession | undefined;
      if (data && (data.status === 'ended' || data.status === 'rejected')) {
        cleanupCall(true);
        unsubCallDoc();
      }
    });

    const prevPcClose = pc.close.bind(pc);
    pc.close = () => {
      unsubCallerCandidates();
      unsubCallDoc();
      prevPcClose();
    };
  };

  // REJECT CALL (Callee)
  const rejectCall = async () => {
    soundManager.stopRingtone();
    if (!incomingCall) return;

    const callDocRef = doc(db, 'calls', incomingCall.id);
    await updateDoc(callDocRef, {
      status: 'rejected',
      endedAt: Date.now(),
    }).catch(() => {});

    setIncomingCall(null);
  };

  // END CALL (Either)
  const endCall = async () => {
    const callId = activeCallDocRef.current;
    if (callId) {
      const callDocRef = doc(db, 'calls', callId);
      await updateDoc(callDocRef, {
        status: 'ended',
        endedAt: Date.now(),
      }).catch(() => {});
    }
    cleanupCall(true);
  };

  // Audio mute toggle
  const toggleMicrophone = () => {
    if (!localStream) return;
    const audioTracks = localStream.getAudioTracks();
    if (audioTracks.length > 0) {
      const willBeMuted = !isMicMuted;
      audioTracks.forEach((track) => {
        track.enabled = !willBeMuted;
      });
      setIsMicMuted(willBeMuted);
    }
  };

  // Video camera toggle
  const toggleCamera = () => {
    if (!localStream) return;
    const videoTracks = localStream.getVideoTracks();
    if (videoTracks.length > 0) {
      const willBeMuted = !isVideoMuted;
      videoTracks.forEach((track) => {
        track.enabled = !willBeMuted;
      });
      setIsVideoMuted(willBeMuted);
    }
  };

  // Switch camera front/back
  const switchCamera = async () => {
    if (!localStream || !peerConnectionRef.current) return;
    const nextMode = isFrontCamera ? 'environment' : 'user';

    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: nextMode } },
      });

      const nextVideoTrack = nextStream.getVideoTracks()[0];
      const senders = peerConnectionRef.current.getSenders();
      const videoSender = senders.find((s) => s.track?.kind === 'video');

      if (videoSender && nextVideoTrack) {
        await videoSender.replaceTrack(nextVideoTrack);

        // Stop previous video track
        localStream.getVideoTracks().forEach((t) => t.stop());
        localStream.removeTrack(localStream.getVideoTracks()[0]);
        localStream.addTrack(nextVideoTrack);

        setIsFrontCamera(!isFrontCamera);
      }
    } catch {
      // Camera switch may not be supported on desktop / single camera
      setError('Camera switch not supported on this device.');
    }
  };

  const clearError = () => setError(null);

  return (
    <CallContext.Provider
      value={{
        activeCall,
        incomingCall,
        callStatus,
        localStream,
        remoteStream,
        isMicMuted,
        isVideoMuted,
        isFrontCamera,
        callDuration,
        error,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMicrophone,
        toggleCamera,
        switchCamera,
        clearError,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used within a CallProvider');
  return context;
};

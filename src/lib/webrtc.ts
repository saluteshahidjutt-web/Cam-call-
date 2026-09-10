export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: 'all',
};

export interface MediaPermissions {
  video: boolean;
  audio: boolean;
  error?: string;
}

export async function getLocalMediaStream(options: {
  video?: boolean;
  audio?: boolean;
  facingMode?: 'user' | 'environment';
} = {}): Promise<{ stream: MediaStream | null; error?: string }> {
  const { video = true, audio = true, facingMode = 'user' } = options;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: video ? { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } } : false,
      audio: audio ? { echoCancellation: true, noiseSuppression: true } : false,
    });
    return { stream };
  } catch (err: unknown) {
    const error = err as Error;
    let message = 'Could not access camera or microphone.';
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      message = 'Camera or microphone permission was denied. Please allow camera and microphone permissions in your browser settings.';
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      message = 'No camera or microphone found on this device.';
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      message = 'Your camera or microphone is already in use by another application.';
    }

    // Attempt audio-only fallback if video failed
    if (video && audio) {
      try {
        const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        return { stream: audioOnlyStream, error: `${message} (Fell back to audio-only)` };
      } catch {
        // Both failed
      }
    }

    return { stream: null, error: message };
  }
}

export function stopMediaStream(stream: MediaStream | null) {
  if (!stream) return;
  stream.getTracks().forEach((track) => {
    track.stop();
  });
}

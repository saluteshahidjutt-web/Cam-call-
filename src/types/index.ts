export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  username: string;
  usernameLower: string;
  photoURL?: string;
  bio?: string;
  isOnline: boolean;
  lastSeen: number;
  createdAt: number;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantData?: {
    [uid: string]: {
      displayName: string;
      username: string;
      photoURL?: string;
      email?: string;
    };
  };
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: number;
    seen: boolean;
  };
  updatedAt: number;
  unreadCount?: {
    [uid: string]: number;
  };
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: number;
  seen: boolean;
  seenAt?: number;
}

export type CallStatus = 'ringing' | 'connected' | 'rejected' | 'ended' | 'missed';

export interface CallSession {
  id: string;
  callerId: string;
  callerName: string;
  callerPhoto?: string;
  calleeId: string;
  calleeName: string;
  calleePhoto?: string;
  type: 'video';
  status: CallStatus;
  offer?: {
    type: RTCSdpType;
    sdp: string;
  };
  answer?: {
    type: RTCSdpType;
    sdp: string;
  };
  createdAt: number;
  endedAt?: number;
}

export interface IceCandidatePayload {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
}

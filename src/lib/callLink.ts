// Helper utilities for generating public, shareable Call CAM links
export const PUBLIC_APP_ORIGIN =
  'https://ais-pre-mbgspic7h6o6pjqx5hklrq-604133282907.asia-southeast1.run.app';

/**
 * Returns the public-facing base URL of the web application.
 * Replaces any developer container domain ('ais-dev-') with the public shared domain ('ais-pre-')
 * to ensure that guest users and other mobile devices do not encounter 403 Forbidden errors.
 */
export const getPublicAppBaseUrl = (): string => {
  if (typeof window === 'undefined') {
    return PUBLIC_APP_ORIGIN;
  }

  let origin = window.location.origin || '';

  // 1. If currently on developer container host, switch to public preview host
  if (origin.includes('ais-dev-')) {
    return origin.replace(/ais-dev-/g, 'ais-pre-');
  }

  // 2. If running inside Google AI Studio parent frame or localhost
  if (
    origin.includes('aistudio.google.com') ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1')
  ) {
    return PUBLIC_APP_ORIGIN;
  }

  // 3. If running on Netlify, Vercel, or custom production domain
  if (origin && !origin.includes('ais-dev-')) {
    return origin;
  }

  // Fallback to the known public domain
  return PUBLIC_APP_ORIGIN;
};

/**
 * Formats a clean public call link that works directly on any mobile or desktop browser
 */
export const getPublicCallLink = (callId: string): string => {
  const base = getPublicAppBaseUrl().replace(/\/+$/, '');
  return `${base}/#call=${encodeURIComponent(callId)}`;
};

/**
 * Formats a WhatsApp / messaging share link with direct call link and optional room code
 */
export const getWhatsAppShareUrl = (callId: string, roomCode?: string): string => {
  const link = getPublicCallLink(callId);
  const text = roomCode
    ? `📞 Join my Call CAM Video Call!\n\nDirect Link: ${link}\nRoom Code: ${roomCode}\n\n(Tap the link to join instantly on your phone or laptop!)`
    : `📞 Join my Call CAM Video Call!\n\nDirect Link: ${link}\n\n(Tap the link to join instantly on your phone or laptop!)`;

  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
};

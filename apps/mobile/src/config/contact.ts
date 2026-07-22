/**
 * Business contact configuration — single source of truth for every
 * call/text/email action in the app.
 *
 * scheduleUrl: set EXPO_PUBLIC_SCHEDULE_URL to a Calendly (or similar)
 * booking link to make "Schedule an appointment" open it directly; until
 * then the action falls back to a pre-filled email.
 */
export const CONTACT = {
  name: 'Mara',
  company: 'Certified Home Loans',
  phoneE164: '+19546125535',
  phoneDisplay: '(954) 612-5535',
  email: 'missa@certifiedhomeloans.com',
  scheduleUrl: process.env.EXPO_PUBLIC_SCHEDULE_URL ?? null,
} as const;

export function callUrl(): string {
  return `tel:${CONTACT.phoneE164}`;
}

export function smsUrl(): string {
  return `sms:${CONTACT.phoneE164}`;
}

export function emailUrl(subject?: string, body?: string): string {
  const params = new URLSearchParams();
  if (subject !== undefined) params.set('subject', subject);
  if (body !== undefined) params.set('body', body);
  const query = params.toString();
  return `mailto:${CONTACT.email}${query === '' ? '' : `?${query}`}`;
}

export function preApprovalEmailUrl(userName?: string): string {
  const greeting = userName === undefined ? 'Hi Mara,' : `Hi Mara, this is ${userName}.`;
  return emailUrl(
    'Pre-approval request',
    `${greeting}\n\nI'd like to get pre-approved. Here are my basics:\n\n` +
      `- Buying in (city/state):\n- Target price range:\n- Down payment saved:\n- Best time to reach me:\n\nThanks!`,
  );
}

export function scheduleUrl(userName?: string): string {
  return CONTACT.scheduleUrl ?? emailUrl(
    'Schedule an appointment',
    `Hi Mara,${userName === undefined ? '' : ` this is ${userName}.`} I'd like to set up a time to talk. Here are a few windows that work for me:\n\n- \n- \n\nThanks!`,
  );
}

// contactsImport — parser Waalaxy CSV → Contact + helpers de conversion prospect.

import type { Contact, WaalaxyState } from '../types/prospect';

const VALID_STATES: WaalaxyState[] = [
  'interested',
  'replied',
  'later_interested',
  'not_interested',
  'connected',
];

function yesNoToBool(v: string | undefined): boolean {
  return (v ?? '').trim().toLowerCase() === 'yes';
}

function parseDate(v: string | undefined): string | null {
  if (!v || v.trim() === '') return null;
  const d = new Date(v.trim());
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function nullIfEmpty(v: string | undefined | null): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t === '' ? null : t;
}

export type WaalaxyParsed = Omit<
  Contact,
  | 'id'
  | 'full_name'
  | 'created_at'
  | 'updated_at'
  | 'archived'
  | 'converted_to_prospect_id'
  | 'converted_at'
  | 'first_imported_at'
  | 'last_imported_at'
>;

export function parseWaalaxyRow(row: Record<string, string>): WaalaxyParsed | null {
  const firstName = nullIfEmpty(row['firstName']);
  const lastName = nullIfEmpty(row['lastName']);
  if (!firstName || !lastName) return null;

  const rawState = nullIfEmpty(row['state']);
  const waalaxyState =
    rawState && VALID_STATES.includes(rawState as WaalaxyState)
      ? (rawState as WaalaxyState)
      : null;

  const genderRaw = nullIfEmpty(row['gender']);
  const gender =
    genderRaw === 'male' || genderRaw === 'female'
      ? genderRaw
      : genderRaw
        ? 'other'
        : null;

  return {
    first_name: firstName,
    last_name: lastName,
    gender,
    job_title: nullIfEmpty(row['job_title']),
    occupation: nullIfEmpty(row['occupation']),
    company_name: nullIfEmpty(row['company_name']),
    company_website: nullIfEmpty(row['company_website']),
    company_linkedin_url: nullIfEmpty(row['company_linkedinUrl']),
    location: nullIfEmpty(row['location']),
    country: nullIfEmpty(row['country']),
    linkedin_url: nullIfEmpty(row['linkedinUrl']),
    linkedin_email: nullIfEmpty(row['linkedinEmail']),
    pro_email: nullIfEmpty(row['proEmail']),
    phone_numbers: nullIfEmpty(row['phoneNumbers']),
    profile_picture_url: nullIfEmpty(row['profilePictureUrl']),
    waalaxy_state: waalaxyState,
    waalaxy_prospect_list: nullIfEmpty(row['prospectList']),
    waalaxy_message_sent: yesNoToBool(row['messageSent']),
    waalaxy_message_replied: yesNoToBool(row['messageReplied']),
    waalaxy_last_reply_content: nullIfEmpty(row['lastReplyDetected']),
    waalaxy_last_reply_date: parseDate(row['lastReplyDetectedDate']),
    waalaxy_connected_at: parseDate(row['connectedAt']),
    source_import: 'waalaxy',
  };
}

/** Seuls 'interested' et 'replied' déclenchent l'auto-conversion en prospect. */
export function shouldAutoConvertToProspect(state: WaalaxyState | null): boolean {
  return state === 'interested' || state === 'replied';
}

/** Normalisation côté JS pour le matching. Aligné avec unaccent_immutable SQL. */
export function normalizeForDedup(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}

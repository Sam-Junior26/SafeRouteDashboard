import { requireSupabase } from './supabase';

export const INCIDENT_STATUSES = ['submitted', 'under_review', 'verified', 'assigned', 'in_progress', 'resolved', 'rejected'];
export const ACTIVE_INCIDENT_STATUSES = ['submitted', 'under_review', 'verified', 'assigned', 'in_progress'];

export function friendly(value = '') {
  return String(value).replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
}
export function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Johannesburg' }).format(new Date(value));
}
export function shortDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-ZA', { month: 'short', day: 'numeric', timeZone: 'Africa/Johannesburg' }).format(new Date(value));
}
export async function fetchIncidents({ limit, status, category, search, from, to } = {}) {
  const db = requireSupabase();
  let q = db.from('incidents').select('*').order('reported_at', { ascending: false });
  if (limit) q = q.limit(limit);
  if (status && status !== 'all') q = q.eq('status', status);
  if (category && category !== 'all') q = q.eq('category', category);
  if (from) q = q.gte('reported_at', from);
  if (to) q = q.lte('reported_at', `${to}T23:59:59`);
  if (search?.trim()) {
    const s = search.trim().replace(/[(),]/g, ' ');
    q = q.or(`reference_number.ilike.%${s}%,title.ilike.%${s}%,location_name.ilike.%${s}%,description.ilike.%${s}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}
export async function fetchIncident(id) {
  const db = requireSupabase();
  const { data, error } = await db.from('incidents').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}
export async function fetchIncidentUpdates(id) {
  const { data, error } = await requireSupabase().from('incident_updates').select('*').eq('incident_id', id).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
export async function fetchEvidence(id) {
  const db = requireSupabase();
  const { data, error } = await db.from('incident_evidence').select('*').eq('incident_id', id).order('created_at', { ascending: false });
  if (error) throw error;
  return Promise.all((data || []).map(async item => {
    const { data: signed, error: signError } = await db.storage.from('incident-evidence').createSignedUrl(item.file_path, 300);
    return { ...item, signedUrl: signError ? null : signed?.signedUrl };
  }));
}
export async function changeIncidentStatus(incident, newStatus, note) {
  const db = requireSupabase();
  const { data: authData } = await db.auth.getUser();
  const user = authData?.user;
  if (!user) throw new Error('Your session has expired. Sign in again.');
  const update = { status: newStatus, updated_at: new Date().toISOString() };
  if (newStatus === 'verified') { update.verified_by = user.id; update.verified_at = new Date().toISOString(); }
  if (newStatus === 'resolved') { update.resolved_at = new Date().toISOString(); update.resolution_notes = note; }
  const { data, error } = await db.from('incidents').update(update).eq('id', incident.id).select('*').single();
  if (error) throw error;
  const { error: historyError } = await db.from('incident_updates').insert({
    incident_id: incident.id, updated_by: user.id, previous_status: incident.status,
    new_status: newStatus, note: note || null
  });
  if (historyError) throw new Error(`Status changed, but history could not be saved: ${historyError.message}`);
  return data;
}
export async function fetchCampusLocations(includeInactive = true) {
  let q = requireSupabase().from('campus_locations').select('*').order('name');
  if (!includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}
export async function fetchProfile(userId) {
  const { data, error } = await requireSupabase().from('profiles').select('id,full_name,university_email,role,account_status,avatar_url,created_at').eq('id', userId).single();
  if (error) throw error;
  return data;
}

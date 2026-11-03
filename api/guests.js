import {hasSession} from './session.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({error: 'Method not allowed.'});
  }
  if (!hasSession(req)) return res.status(401).json({error: 'Please log in.'});
  const {SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY} = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({error: 'RSVP storage is not configured yet.'});
  }
  try {
    const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rsvps?select=id,created_at,name,attendance,guests,dietary,message&order=created_at.desc`;
    const result = await fetch(url, {
      headers: {apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`},
      signal: AbortSignal.timeout(10000),
    });
    if (!result.ok) throw new Error('Storage failed');
    const replies = await result.json();
    if (!Array.isArray(replies)) throw new Error('Storage failed');
    return res.status(200).json({replies});
  } catch {
    return res.status(502).json({error: 'We couldn’t load replies. Please try again.'});
  }
}

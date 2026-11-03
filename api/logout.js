import {clearSessionCookie} from './session.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({error: 'Method not allowed.'});
  }
  res.setHeader('Set-Cookie', clearSessionCookie());
  return res.status(200).json({ok: true});
}

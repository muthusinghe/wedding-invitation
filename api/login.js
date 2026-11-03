import {createSession, credentialsMatch, sessionCookie} from './session.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({error: 'Method not allowed.'});
  }
  const body = req.body || {};
  if (!credentialsMatch(body.username, body.password)) {
    return res.status(401).json({error: 'Those details were not recognised.'});
  }
  res.setHeader('Set-Cookie', sessionCookie(createSession()));
  return res.status(200).json({ok: true});
}

import crypto from 'node:crypto';

const USERNAME = 'S&D';
const PASSWORD = 'S&D';
const SECRET = 'sasani-dinith-rsvp-dashboard';
const WEEK = 7 * 24 * 60 * 60;

function safeEqual(given, expected) {
  const left = Buffer.from(given);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function sign(data) {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function credentialsMatch(username, password) {
  return typeof username === 'string' && typeof password === 'string' && safeEqual(username, USERNAME) && safeEqual(password, PASSWORD);
}

export function createSession(exp = Date.now() + WEEK * 1000) {
  return sign({exp});
}

export function sessionValid(token) {
  if (typeof token !== 'string') return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature || token.split('.').length !== 2) return false;
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof data.exp === 'number' && data.exp > Date.now();
  } catch {
    return false;
  }
}

export function tokenFromRequest(req) {
  const header = req.headers?.cookie || '';
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === 'sd_session') return decodeURIComponent(rest.join('='));
  }
  return '';
}

export function hasSession(req) {
  return sessionValid(tokenFromRequest(req));
}

export function sessionCookie(token, maxAge = WEEK) {
  const secure = process.env.VERCEL ? '; Secure' : '';
  return `sd_session=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function clearSessionCookie() {
  return sessionCookie('', 0);
}

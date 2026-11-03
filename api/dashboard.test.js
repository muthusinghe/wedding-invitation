import {test} from 'node:test';
import assert from 'node:assert/strict';
import login from './login.js';
import logout from './logout.js';
import guests from './guests.js';
import {createSession, sessionValid} from './session.js';

function mockRes() {
  return {
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; },
  };
}

test('login accepts only the dashboard credentials', async () => {
  const rejected = mockRes();
  await login({method: 'POST', body: {username: 'S&D', password: 'wrong'}}, rejected);
  assert.equal(rejected.code, 401);
  assert.equal(rejected.headers['Set-Cookie'], undefined);

  const accepted = mockRes();
  await login({method: 'POST', body: {username: 'S&D', password: 'S&D'}}, accepted);
  assert.equal(accepted.code, 200);
  assert.match(accepted.headers['Set-Cookie'], /sd_session=/);
  assert.match(accepted.headers['Set-Cookie'], /HttpOnly/);
});

test('expired or altered sessions are rejected', () => {
  assert.equal(sessionValid(createSession(Date.now() - 1000)), false);
  const token = createSession();
  assert.equal(sessionValid(token), true);
  assert.equal(sessionValid(token.replace(/.$/, token.endsWith('a') ? 'b' : 'a')), false);
});

test('guest list stays closed until login', async () => {
  const saved = {...process.env};
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    const anonymous = mockRes();
    await guests({method: 'GET', headers: {}}, anonymous);
    assert.equal(anonymous.code, 401);

    const authed = mockRes();
    await guests({method: 'GET', headers: {cookie: `sd_session=${createSession()}`}}, authed);
    assert.equal(authed.code, 503);

    const signedOut = mockRes();
    await logout({method: 'POST'}, signedOut);
    assert.equal(signedOut.code, 200);
    assert.match(signedOut.headers['Set-Cookie'], /Max-Age=0/);
  } finally {
    Object.assign(process.env, saved);
  }
});

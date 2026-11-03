const loading = document.querySelector('#loading');
const loginPanel = document.querySelector('#login-panel');
const board = document.querySelector('#board');
const loginForm = document.querySelector('#login-form');
const loginStatus = document.querySelector('#login-status');
const boardStatus = document.querySelector('#board-status');
const rows = document.querySelector('#rows');
const when = new Intl.DateTimeFormat('en-GB', {dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Colombo'});

function show(panel) {
  loading.hidden = true;
  loginPanel.hidden = panel !== 'login';
  board.hidden = panel !== 'board';
}

function replyCard(reply) {
  const article = document.createElement('article');
  article.className = reply.attendance === 'yes' ? 'reply' : 'reply no';
  const top = document.createElement('div');
  top.className = 'reply-top';
  const name = document.createElement('h2');
  name.className = 'name';
  name.textContent = reply.name;
  const time = document.createElement('p');
  time.className = 'when';
  const created = new Date(reply.created_at);
  time.textContent = Number.isNaN(created.getTime()) ? '' : when.format(created);
  top.append(name, time);
  const attendance = document.createElement('p');
  attendance.className = 'attendance';
  attendance.textContent = reply.attendance === 'yes'
    ? `Joyfully accepts · ${reply.guests} ${reply.guests === 1 ? 'guest' : 'guests'}`
    : 'Sadly declines';
  article.append(top, attendance);
  if (reply.dietary) {
    const dietary = document.createElement('p');
    dietary.className = 'dietary';
    dietary.textContent = reply.dietary;
    article.append(dietary);
  }
  if (reply.message) {
    const note = document.createElement('p');
    note.className = 'note';
    note.textContent = reply.message;
    article.append(note);
  }
  return article;
}

function render(replies) {
  const accepts = replies.filter(reply => reply.attendance === 'yes');
  document.querySelector('#count-all').textContent = String(replies.length);
  document.querySelector('#count-yes').textContent = String(accepts.length);
  document.querySelector('#count-no').textContent = String(replies.length - accepts.length);
  document.querySelector('#count-guests').textContent = String(accepts.reduce((sum, reply) => sum + reply.guests, 0));
  rows.replaceChildren();
  if (!replies.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'No replies yet.';
    rows.append(empty);
    return;
  }
  rows.append(...replies.map(replyCard));
}

async function loadReplies() {
  boardStatus.textContent = '';
  const response = await fetch('/api/guests');
  if (response.status === 401) {
    show('login');
    return;
  }
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'We couldn’t load replies. Please try again.');
  render(result.replies || []);
  show('board');
}

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  const button = loginForm.querySelector('button');
  button.disabled = true;
  loginStatus.textContent = 'Checking…';
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({username: loginForm.username.value, password: loginForm.password.value}),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Those details were not recognised.');
    loginForm.reset();
    loginStatus.textContent = '';
    await loadReplies();
  } catch (error) {
    loginStatus.textContent = error.message;
    show('login');
  } finally {
    button.disabled = false;
  }
});

document.querySelector('#refresh').addEventListener('click', async () => {
  boardStatus.textContent = 'Refreshing…';
  try {
    await loadReplies();
  } catch (error) {
    boardStatus.textContent = error.message;
  }
});

document.querySelector('#logout').addEventListener('click', async () => {
  await fetch('/api/logout', {method: 'POST'});
  loginStatus.textContent = '';
  show('login');
  loginForm.username.focus();
});

loadReplies().catch(error => {
  loginStatus.textContent = error.message;
  show('login');
});

const menu = document.querySelector('#menu');
const menuButton = document.querySelector('.menu-button');
const header = document.querySelector('header');
const hero = document.querySelector('#now');
const sections = [...document.querySelectorAll('.page')];
const menuLinks = [...menu.querySelectorAll('a')];

function setMenu(open) {
  menu.hidden = !open;
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
}

menuButton.addEventListener('click', () => setMenu(menu.hidden));
menuLinks.forEach(link => link.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !menu.hidden) {
    setMenu(false);
    menuButton.focus();
  }
});

function syncHeroHeader() {
  const headerBottom = header.getBoundingClientRect().bottom;
  document.body.classList.toggle('is-hero', hero.getBoundingClientRect().bottom > headerBottom + 1);
}

let headerTick = false;
document.addEventListener('scroll', () => {
  if (headerTick) return;
  headerTick = true;
  requestAnimationFrame(() => {
    syncHeroHeader();
    headerTick = false;
  });
}, {passive: true});
syncHeroHeader();

const markCurrent = new IntersectionObserver(entries => {
  const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
  if (!visible) return;
  const hash = '#' + visible.target.id;
  menuLinks.forEach(link => {
    if (link.getAttribute('href') === hash) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  });
}, {rootMargin: '-20% 0px -50% 0px', threshold: [0.15, 0.4, 0.75]});
sections.forEach(section => markCurrent.observe(section));

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
document.querySelectorAll('.page:not(.hero)').forEach(section => {
  [...section.querySelectorAll('.reveal')].forEach((item, index) => {
    item.style.transitionDelay = reduceMotion ? '0ms' : `${Math.min(index, 7) * 80}ms`;
  });
});
const revealItems = document.querySelectorAll('.reveal, .botanical');
if (reduceMotion) {
  revealItems.forEach(item => item.classList.add('is-in'));
} else {
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      revealObserver.unobserve(entry.target);
    });
  }, {threshold: 0.18, rootMargin: '0px 0px -6% 0px'});
  revealItems.forEach(item => revealObserver.observe(item));
}

const form = document.querySelector('#rsvp-form');
form.addEventListener('change', () => {
  const declined = form.elements.attendance.value === 'no';
  document.querySelector('#guest-fields').hidden = declined;
  form.elements.guests.disabled = declined;
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  const status = document.querySelector('#form-status');
  const button = form.querySelector('button[type=submit]');
  button.disabled = true;
  status.textContent = 'Sending your reply…';
  try {
    const data = Object.fromEntries(new FormData(form));
    data.guests = data.attendance === 'yes' ? Number(data.guests) : 0;
    const response = await fetch('/api/rsvp', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Your reply could not be saved. Please try again or call us below.');
    status.textContent = '';
    if (!reduceMotion) {
      form.classList.add('is-leaving');
      await new Promise(resolve => {
        const done = event => {
          if (event.target !== form) return;
          form.removeEventListener('transitionend', done);
          resolve();
        };
        form.addEventListener('transitionend', done);
        setTimeout(resolve, 900);
      });
    }
    form.hidden = true;
    const thanks = document.createElement('div');
    thanks.className = 'thanks';
    thanks.setAttribute('role', 'status');
    const eyebrow = document.createElement('p');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = 'With love';
    const title = document.createElement('h2');
    title.textContent = 'Thank you';
    const message = document.createElement('p');
    message.textContent = data.attendance === 'yes'
      ? 'Your reply is with us. We can’t wait to celebrate with you.'
      : 'Your reply is with us. You’ll be in our hearts on the day.';
    thanks.append(eyebrow, title, message);
    form.after(thanks);
    return;
  } catch (error) {
    status.textContent = error.message;
  }
  button.disabled = false;
});

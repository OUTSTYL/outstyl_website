import './style.css';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ---------------- socials ---------------- */
const SOCIALS = [
  { name: 'Instagram', href: 'https://www.instagram.com/outstyl', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/></svg>' },
  { name: 'X', href: 'https://x.com/outstyyl', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.8 3h3.1l-6.8 7.8 8 10.2h-6.3l-4.9-6.4L5.3 21H2.2l7.3-8.3L1.9 3h6.4l4.4 5.9zm-1.1 16.2h1.7L7.4 4.7H5.6z"/></svg>' },
  { name: 'YouTube', href: 'https://youtube.com/@outstyl', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="4"/><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor"/></svg>' },
];
$$('[data-socials]').forEach((el) => {
  el.innerHTML = SOCIALS.map((s) => `<a class="social" href="${s.href}" target="_blank" rel="noopener" aria-label="OutStyl on ${s.name}">${s.svg}</a>`).join('');
});

/* ---------------- marquee ---------------- */
const WORDS = ['Fashion that learns you', 'Agentic style learning', '3D virtual try on', 'AI fit & size predictor', 'Swipe discovery', 'Curated daily looks', 'Never the wrong size'];
$$('[data-marquee]').forEach((el, i) => {
  const words = i % 2 ? WORDS : [...WORDS].reverse();
  const row = words.map((w) => `<span>${w}</span>`).join('');
  el.innerHTML = row + row; // twice, so the -50% loop is seamless
  el.lastElementChild && [...el.children].slice(words.length).forEach((c) => c.setAttribute('aria-hidden', 'true'));
});

$$('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));

/* ---------------- nav ---------------- */
const nav = $('#nav');
const onScrollNav = () => nav.classList.toggle('is-scrolled', scrollY > 12);
addEventListener('scroll', onScrollNav, { passive: true });
onScrollNav();

const burger = $('.nav__burger');
const menu = $('#mobile-menu');
const setMenu = (open) => {
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  menu.hidden = !open;
  document.body.style.overflow = open ? 'hidden' : '';
  nav.classList.toggle('is-scrolled', open || scrollY > 12);
};
burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
menu.addEventListener('click', (e) => e.target.closest('a') && setMenu(false));
addEventListener('keydown', (e) => e.key === 'Escape' && !menu.hidden && (setMenu(false), burger.focus()));
matchMedia('(min-width: 861px)').addEventListener('change', (e) => e.matches && setMenu(false));

/* ---------------- hero entrance ---------------- */
$$('[data-enter]').forEach((el) => el.style.setProperty('--d', el.dataset.enter));
const ready = () => document.documentElement.classList.add('is-ready');
(document.fonts?.ready ?? Promise.resolve()).then(ready);
setTimeout(ready, 700); // never wait on a slow font

/* ---------------- reveal on arrival (heads, cards, steps) ---------------- */
const revealIO = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    const el = en.target;
    const sibs = $$(':scope > [data-reveal]', el.parentElement);
    el.style.setProperty('--rd', `${Math.max(0, sibs.indexOf(el)) * 90}ms`);
    el.classList.add('is-in');
    revealIO.unobserve(el);
  });
}, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
$$('[data-reveal]').forEach((el) => (reduced ? el.classList.add('is-in') : revealIO.observe(el)));

/* ---------------- swipe deck ---------------- */
const deck = $('#deck');
const cards = $$('.card', deck);
cards.forEach((c) => {
  c.insertAdjacentHTML('beforeend', `
    <span class="card__stamp card__stamp--like">LIKE</span>
    <span class="card__stamp card__stamp--nope">NOPE</span>
    <div class="card__info">
      <span class="card__match">${c.dataset.match}% YOUR STYLE</span>
      <p class="card__name">${c.dataset.name}</p>
      <div class="card__row"><span>${c.dataset.price}</span><span class="card__size">Your size · ${c.dataset.size}</span></div>
    </div>`);
});
let order = [...cards];
const liveSize = $('[data-live-size]');
const liveConf = $('[data-live-conf]');
const liveBag = $('[data-live-bag]');
const paint = () => {
  order.forEach((c, i) => { c.dataset.pos = i; c.style.zIndex = String(10 - i); });
  const top = order[0];
  liveSize.textContent = top.dataset.size;
  liveConf.textContent = (97 + (Number(top.dataset.match) % 3) + 0.4).toFixed(1);
};
paint();
const PATTERN = ['like', 'like', 'nope', 'like'];
let step = 0;
let deckTimer;
const swipe = () => {
  const top = order[0];
  const dir = PATTERN[step++ % PATTERN.length];
  top.classList.add(`show-${dir}`);
  setTimeout(() => {
    top.classList.add(`is-${dir}`);
    if (dir === 'like') liveBag.textContent = `${top.dataset.name} · ${top.dataset.size}`;
    order = [...order.slice(1), top];
    order.forEach((c, i) => { if (c !== top) { c.dataset.pos = i; c.style.zIndex = String(10 - i); } });
    setTimeout(() => {
      top.classList.remove('is-like', 'is-nope', 'show-like', 'show-nope');
      top.style.transition = 'none';
      paint();
      top.offsetHeight; // commit the jump to the back before transitions return
      top.style.transition = '';
    }, 760);
  }, 520);
};
const startDeck = () => { if (!deckTimer && !reduced) deckTimer = setInterval(swipe, 3200); };
const stopDeck = () => { clearInterval(deckTimer); deckTimer = null; };
new IntersectionObserver(([en]) => (en.isIntersecting ? startDeck() : stopDeck())).observe(deck);
document.addEventListener('visibilitychange', () => (document.hidden ? stopDeck() : startDeck()));

/* ---------------- 3D phone follows the pointer ---------------- */
const phone = $('#phone3d');
const hero = $('#top');
if (!reduced && finePointer) {
  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    phone.style.setProperty('--ry', `${-14 + nx * 22}deg`);
    phone.style.setProperty('--rx', `${4 - ny * 14}deg`);
  });
  hero.addEventListener('pointerleave', () => {
    phone.style.setProperty('--ry', '-14deg');
    phone.style.setProperty('--rx', '4deg');
  });
}

/* ---------------- feature cards: tilt + glare ---------------- */
if (!reduced && finePointer) {
  $$('[data-tilt]').forEach((card) => {
    let raf = 0;
    card.addEventListener('pointerenter', () => card.classList.add('is-tilting'));
    card.addEventListener('pointermove', (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        card.style.setProperty('--ry', `${(x - 0.5) * 7}deg`);
        card.style.setProperty('--rx', `${(0.5 - y) * 7}deg`);
        card.style.setProperty('--mx', `${x * 100}%`);
        card.style.setProperty('--my', `${y * 100}%`);
      });
    });
    card.addEventListener('pointerleave', () => {
      card.classList.remove('is-tilting');
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });
}

/* ---------------- waitlist card leans toward the pointer ---------------- */
const formcard = $('#formcard');
if (!reduced && finePointer) {
  formcard.addEventListener('pointermove', (e) => {
    const r = formcard.getBoundingClientRect();
    formcard.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 4}deg`);
    formcard.style.setProperty('--rx', `${(0.5 - (e.clientY - r.top) / r.height) * 4}deg`);
  });
  formcard.addEventListener('pointerleave', () => { formcard.style.setProperty('--rx', '0deg'); formcard.style.setProperty('--ry', '0deg'); });
}

/* ---------------- scroll-linked depth: feature photos + films ---------------- */
const mediaImgs = $$('.fcard__media img');
const films = $('#films');
const filmEls = $$('.film', films);
let ticking = false;
const onScroll = () => {
  ticking = false;
  const vh = innerHeight;
  mediaImgs.forEach((img) => {
    const r = img.parentElement.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) return;
    const p = (r.top + r.height / 2) / (vh + r.height); // 0..1 as it passes
    img.style.setProperty('--py', `${(p - 0.5) * -14 - 6}%`);
  });
  const fr = films.getBoundingClientRect();
  if (fr.bottom > 0 && fr.top < vh) {
    // the two frames open like a book and settle flat by the time they are centred
    const p = clamp(1 - (fr.top + fr.height * 0.35) / vh, 0, 1);
    const k = 1 - p;
    filmEls.forEach((f, i) => {
      f.style.setProperty('--frx', `${k * 16}deg`);
      f.style.setProperty('--fry', `${(i ? -1 : 1) * k * 18}deg`);
      f.style.setProperty('--fz', `${k * -80}px`);
    });
  }
};
if (!reduced) {
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();
}

/* ---------------- videos play only while on screen ---------------- */
const vidIO = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    const v = en.target;
    if (en.isIntersecting) { v.preload = 'auto'; reduced ? null : v.play().catch(() => {}); }
    else v.pause();
  });
}, { threshold: 0.25 });
$$('video').forEach((v) => vidIO.observe(v));

/* ---------------- looks: turn front to back, drag to spin ---------------- */
$$('.look').forEach((look) => {
  const inner = $('.look__inner', look);
  const side = $('[data-side]', look);
  const who = side.textContent.split('·')[1].trim();
  let turn = 0;
  const setTurn = (deg, animate = true) => {
    turn = deg;
    look.classList.toggle('is-dragging', !animate);
    inner.style.setProperty('--turn', `${deg}deg`);
    const back = Math.round(((((deg % 360) + 360) % 360)) / 180) % 2 === 1;
    side.textContent = `${back ? 'Back' : 'Front'} · ${who}`;
    look.setAttribute('aria-pressed', String(back));
  };
  const snap = () => setTurn(Math.round(turn / 180) * 180);
  look.addEventListener('click', (e) => { if (look.dataset.dragged) { delete look.dataset.dragged; return; } setTurn(Math.round(turn / 180) * 180 + 180); });
  if (finePointer) {
    // hover shows the back, leaving keeps turning the same way back to the front
    look.addEventListener('pointerenter', () => !dragging && setTurn(Math.round(turn / 360) * 360 + 180));
    look.addEventListener('pointerleave', () => !dragging && setTurn(Math.ceil(turn / 360) * 360));
  }
  // drag to spin
  let startX = 0; let startTurn = 0; let dragging = false;
  look.addEventListener('pointerdown', (e) => { startX = e.clientX; startTurn = turn; dragging = true; });
  addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) < 6 && !look.classList.contains('is-dragging')) return;
    look.dataset.dragged = '1';
    setTurn(startTurn + dx * 0.9, false);
  });
  addEventListener('pointerup', () => { if (!dragging) return; dragging = false; if (look.classList.contains('is-dragging')) { look.classList.remove('is-dragging'); snap(); setTimeout(() => delete look.dataset.dragged, 50); } });
});

// one turn per look as the row arrives, so people see that they rotate
if (!reduced) {
  const looksIO = new IntersectionObserver(([en]) => {
    if (!en.isIntersecting) return;
    looksIO.disconnect();
    $$('.look').forEach((look, i) => setTimeout(() => {
      const inner = $('.look__inner', look);
      inner.style.setProperty('--turn', '180deg');
      setTimeout(() => inner.style.setProperty('--turn', '0deg'), 1300);
    }, 600 + i * 220));
  }, { threshold: 0.4 });
  looksIO.observe($('#looks'));
}

/* ---------------- waitlist form ---------------- */
const form = $('#waitlist-form');
const statusEl = $('#form-status');
const DEFAULT_NOTE = statusEl.textContent;
const fields = { name: $('#f-name'), email: $('#f-email'), gender: $('#f-gender'), age: $('#f-age') };
const setErr = (key, msg) => {
  const input = fields[key];
  const err = $(`#e-${key}`);
  err.textContent = msg || '';
  if (msg) { input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', err.id); }
  else { input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby'); }
};
const validate = (d) => {
  const e = {};
  if (d.name.trim().length < 2) e.name = 'Please enter your full name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email.trim())) e.email = 'Please enter a valid email address.';
  if (!d.gender) e.gender = 'Please choose an option.';
  const age = Number(d.age);
  if (!Number.isInteger(age) || age < 13 || age > 99) e.age = 'Age must be 13 to 99.';
  return e;
};
Object.entries(fields).forEach(([k, el]) => el.addEventListener('input', () => el.hasAttribute('aria-invalid') && setErr(k, '')));

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  data.gender = fields.gender.value;
  const errors = validate(data);
  Object.keys(fields).forEach((k) => setErr(k, errors[k]));
  const first = Object.keys(fields).find((k) => errors[k]);
  if (first) { fields[first].focus(); return; }

  form.classList.add('is-sending');
  statusEl.classList.remove('is-error');
  statusEl.textContent = 'Saving your spot…';
  try {
    const res = await fetch('/api/waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || !out.ok) {
      if (out.errors) { Object.keys(fields).forEach((k) => setErr(k, out.errors[k])); }
      throw new Error(out.error || 'Something went wrong. Please try again in a minute.');
    }
    const firstName = data.name.trim().split(/\s+/)[0];
    $('[data-done-name]').textContent = firstName ? `, ${firstName}` : '';
    form.hidden = true;
    const done = $('#form-done');
    done.hidden = false;
    done.focus();
  } catch (err) {
    statusEl.textContent = err.message;
    statusEl.classList.add('is-error');
  } finally {
    form.classList.remove('is-sending');
    if (!statusEl.classList.contains('is-error')) statusEl.textContent = DEFAULT_NOTE;
  }
});

/* ---------------- 3D hero scene (loaded after first paint) ---------------- */
const canvas = $('#hero-gl');
// stacked layouts: the 3D layer covers only the phone's area, never the copy above it
const stage = $('.hero__stage');
const placeCanvas = () => {
  if (innerWidth <= 1080) {
    const top = stage.offsetTop - 40;
    canvas.style.top = `${top}px`;
    canvas.style.height = `${hero.offsetHeight - top}px`;
  } else {
    canvas.style.top = '';
    canvas.style.height = '';
  }
};
placeCanvas();
addEventListener('resize', placeCanvas);
addEventListener('load', placeCanvas);
document.fonts?.ready.then(placeCanvas);
const loadGL = () => import('./hero3d.js').then((m) => m.mountHero(canvas, { reduced })).catch(() => {});
('requestIdleCallback' in window ? requestIdleCallback : setTimeout)(loadGL, { timeout: 1500 });

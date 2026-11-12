// POST /api/waitlist  (Vercel serverless function)
//
// Emails each waitlist sign-up to the team.
//   1. Zoho Mail SMTP  -> WAITLIST_TO           (default developer@outstyl.in)
//   2. if Zoho fails, Gmail SMTP -> WAITLIST_FALLBACK_TO  (default outstyyl@gmail.com)
//
// Set these in Vercel → Project → Settings → Environment Variables (never in code):
//   ZOHO_SMTP_USER       developer@outstyl.in
//   ZOHO_SMTP_PASS       a Zoho app-specific password
//   ZOHO_SMTP_HOST       optional, default smtp.zoho.in (use smtp.zoho.com for a .com Zoho account)
//   GMAIL_USER           outstyyl@gmail.com
//   GMAIL_APP_PASSWORD   a Google app password (needs 2-step verification on)
//   WAITLIST_TO / WAITLIST_FALLBACK_TO   optional overrides
import nodemailer from 'nodemailer';

const GENDERS = new Set(['Female', 'Male', 'Non-binary', 'Prefer not to say']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// small per-instance limiter: 5 sign-ups per IP per 10 minutes
const hits = new Map();
const limited = (ip) => {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 5;
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = (s, max) => String(s ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);

export function validate(body) {
  const data = {
    name: clean(body.name, 80),
    email: clean(body.email, 160).toLowerCase(),
    gender: clean(body.gender, 40),
    age: Number(body.age),
  };
  const errors = {};
  if (data.name.length < 2) errors.name = 'Please enter your full name.';
  if (!EMAIL_RE.test(data.email)) errors.email = 'Please enter a valid email address.';
  if (!GENDERS.has(data.gender)) errors.gender = 'Please choose an option.';
  if (!Number.isInteger(data.age) || data.age < 13 || data.age > 99) errors.age = 'Age must be 13 to 99.';
  return { data, errors };
}

function message(d, meta) {
  const rows = [['Name', d.name], ['Email', d.email], ['Gender', d.gender], ['Age', d.age], ['Signed up', meta.when], ['Page', meta.page]];
  return {
    subject: `New OutStyl waitlist sign-up: ${d.name}`,
    text: rows.map(([k, v]) => `${k}: ${v}`).join('\n'),
    html: `<div style="font-family:Arial,sans-serif;color:#121212;max-width:520px">
      <h2 style="margin:0 0 4px;color:#b5006a">New waitlist sign-up</h2>
      <p style="margin:0 0 18px;color:#5c5a58">Someone just claimed a spot on the OutStyl beta.</p>
      <table cellpadding="8" style="border-collapse:collapse;width:100%;background:#f6f4f3;border-radius:10px">
        ${rows.map(([k, v]) => `<tr><td style="font-weight:bold;width:110px">${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}
      </table></div>`,
  };
}

async function sendVia(transportOpts, from, to, mail, replyTo) {
  const t = nodemailer.createTransport({ ...transportOpts, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000 });
  await t.sendMail({ from: `"OutStyl Waitlist" <${from}>`, to, replyTo, ...mail });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  // honeypot: bots fill every field; answer as if it worked and send nothing
  if (body.company) return res.status(200).json({ ok: true });

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (limited(ip)) return res.status(429).json({ ok: false, error: 'Too many tries. Please wait a few minutes.' });

  const { data, errors } = validate(body);
  if (Object.keys(errors).length) return res.status(400).json({ ok: false, errors, error: 'Please check the highlighted fields.' });

  const env = process.env;
  const mail = message(data, { when: new Date().toISOString(), page: clean(req.headers.referer || 'outstyl.in', 200) });
  const attempts = [];

  if (env.ZOHO_SMTP_USER && env.ZOHO_SMTP_PASS) {
    attempts.push({
      name: 'zoho',
      run: () => sendVia(
        { host: env.ZOHO_SMTP_HOST || 'smtp.zoho.in', port: 465, secure: true, auth: { user: env.ZOHO_SMTP_USER, pass: env.ZOHO_SMTP_PASS } },
        env.ZOHO_SMTP_USER, env.WAITLIST_TO || 'developer@outstyl.in', mail, data.email,
      ),
    });
  }
  if (env.GMAIL_USER && env.GMAIL_APP_PASSWORD) {
    attempts.push({
      name: 'gmail',
      run: () => sendVia(
        { service: 'gmail', auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD } },
        env.GMAIL_USER, env.WAITLIST_FALLBACK_TO || 'outstyyl@gmail.com', mail, data.email,
      ),
    });
  }

  if (!attempts.length) {
    console.error('[waitlist] no mail account is configured (set ZOHO_SMTP_* or GMAIL_* env vars)');
    return res.status(500).json({ ok: false, error: 'Sign-ups are not open yet. Please try again soon.' });
  }

  for (const a of attempts) {
    try {
      await a.run();
      console.log(`[waitlist] sent via ${a.name}`);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error(`[waitlist] ${a.name} failed:`, err?.message || err);
    }
  }
  return res.status(502).json({ ok: false, error: 'We could not save your spot just now. Please try again in a minute.' });
}

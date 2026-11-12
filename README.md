# OutStyl website

The outstyl.in landing page, rebuilt with the same theme, copy and media, plus 3D layers:
a live Three.js hero (satin ribbon, brand ring, pearls), a 3D phone with a swipe deck,
tilt-and-glare feature cards, extruded step numbers, films that open like a book on scroll,
and try-on looks you can turn or drag from front to back.

**Stack:** Vite + plain JavaScript + Three.js (static site), one Vercel serverless function
for the waitlist (`api/waitlist.js`, Nodemailer).

## Run it locally

```bash
npm install
npm run dev        # http://localhost:5173 (the waitlist API works here too)
npm run build      # production build in dist/
```

## Deploy to Vercel

1. Push this folder to a GitHub repo, then on vercel.com: **Add New → Project → import the repo**.
   Vercel reads `vercel.json` (framework Vite, output `dist`). Or, from this folder: `npx vercel`.
2. In **Project → Settings → Environment Variables**, add (see `.env.example`):

   | Name | Value |
   |---|---|
   | `ZOHO_SMTP_USER` | `developer@outstyl.in` |
   | `ZOHO_SMTP_PASS` | a Zoho **app-specific password** |
   | `ZOHO_SMTP_HOST` | `smtp.zoho.in` (or `smtp.zoho.com` if the Zoho account is on the .com data centre) |
   | `GMAIL_USER` | `outstyyl@gmail.com` (fallback) |
   | `GMAIL_APP_PASSWORD` | a Google **app password** |

3. Redeploy after adding the variables, then point the `outstyl.in` domain at the project
   (**Settings → Domains**).

### Getting the mail passwords

- **Zoho:** mail.zoho.in → Settings → Security → App Passwords → generate one for "OutStyl site".
  Also check Settings → Mail Accounts → IMAP/POP/SMTP access is on.
- **Gmail:** turn on 2-Step Verification, then myaccount.google.com/apppasswords → create one.

### How sign-ups are delivered

Each sign-up is emailed through Zoho to **developer@outstyl.in**. If Zoho fails (wrong
password, outage), the same email goes through Gmail to **outstyyl@gmail.com**. The reply-to
is the person who signed up. Check Vercel → Logs for `[waitlist]` lines if mail doesn't arrive.

## Media

Originals live in `media-src/` (kept out of git). `npm run media` rebuilds the web-sized
WebP files in `public/media/`. Run it after replacing any photo or video.

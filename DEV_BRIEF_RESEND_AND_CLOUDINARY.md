# Dev Brief: Resend & Cloudinary

Quick reference for **email (Resend)** and **image uploads (Cloudinary)** — local and production setup.

---

## 1. Resend (Email)

### Production

- **What:** Resend sends transactional email (password reset OTP, donor rejection emails). Free tier: **3,000 emails/month** (100/day), no credit card required.
- **Setup:**
  1. Create account at [resend.com](https://resend.com).
  2. Add and verify a domain (or use their test domain for development): **Domains** → Add Domain → add DNS records they provide.
  3. Create API key: **API Keys** → Create. Copy the key once (starts with `re_`).
- **Env vars (production):**
  - `RESEND_API_KEY` – API key from step 3.
  - `EMAIL_FROM` – Verified sender address (e.g. `noreply@yourdomain.com` or `onboarding@resend.dev` for testing).
- **Code:** Backend uses Resend when `RESEND_API_KEY` is set (Resend API or their SMTP). From-address comes from `EMAIL_FROM`.

### Local

- **What:** Avoid sending real email from local; capture everything in a local inbox and view in the browser (Letter Opener–style).
- **Tool:** **Mailpit** (or Maildev).
- **Setup:**
  1. Install: `npm install -g mailpit` (or run via Docker).
  2. Start: `mailpit` (SMTP usually on `1025`, web UI on `8025`).
  3. Open: http://localhost:8025 — all “sent” emails appear here.
- **Env vars (local):**
  - Do **not** set `RESEND_API_KEY` (or leave it unset / use a dummy).
  - Set SMTP to Mailpit, e.g.:
    - `SMTP_HOST=localhost`
    - `SMTP_PORT=1025`
    - No auth needed for Mailpit.
- **Code:** Backend uses Nodemailer with the above SMTP config when running locally (no Resend). Same code path; only env differs.

**Summary:** Local = Mailpit (SMTP localhost:1025, view at localhost:8025). Production = Resend (API key + verified sender, set in env).

---

## 2. Cloudinary (Image uploads)

### Production

- **What:** Profile images and service banner images are uploaded to Cloudinary; app stores and uses the returned URL (no local `uploads/` in prod).
- **Setup:**
  1. Create account at [cloudinary.com](https://cloudinary.com).
  2. From Dashboard note: **Cloud name**, **API Key**, **API Secret**.
- **Env vars (production):**
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
  - Optional: `CLOUDINARY_FOLDER=prod` (or leave default).
- **Code:** Upload middleware uses Cloudinary SDK when these env vars are set: upload file → get URL → save URL in DB. No static `/uploads` serving in prod.

### Local

- **Option A (recommended):** Use Cloudinary in dev too with a folder prefix so dev and prod don’t mix.
  - Same env vars as above.
  - Set `CLOUDINARY_FOLDER=dev` (or `local`) in local `.env`.
  - All local uploads go to `dev/` (or `local/`) in the same Cloudinary account. No local disk storage; one code path everywhere.
- **Option B:** Use local disk in dev (current behavior).
  - Do **not** set Cloudinary env vars locally. Backend falls back to Multer + `uploads/` and serves `/uploads/...`. Production only uses Cloudinary when env is set.

**Summary:** Production = always Cloudinary (env set). Local = either Cloudinary with `CLOUDINARY_FOLDER=dev` (simplest code) or local disk (no Cloudinary keys needed for devs).

---

## 3. Env checklist

| Variable              | Local (Mailpit)     | Production (Resend)      |
|-----------------------|---------------------|--------------------------|
| `RESEND_API_KEY`      | unset or dummy      | your Resend API key      |
| `SMTP_HOST`           | `localhost`         | (not used)               |
| `SMTP_PORT`           | `1025`              | (not used)               |
| `EMAIL_FROM`          | any (e.g. dev@test) | verified sender address  |

| Variable                     | Local (disk)     | Local (Cloudinary) | Production        |
|-----------------------------|------------------|--------------------|-------------------|
| `CLOUDINARY_CLOUD_NAME`     | unset            | from dashboard     | from dashboard    |
| `CLOUDINARY_API_KEY`        | unset            | from dashboard     | from dashboard    |
| `CLOUDINARY_API_SECRET`     | unset            | from dashboard     | from dashboard    |
| `CLOUDINARY_FOLDER`         | —                | `dev` or `local`   | `prod` or unset   |

---

## 4. One-liner for your dev

- **Email:** Local = run Mailpit, point SMTP to localhost:1025, view mail at localhost:8025. Production = set Resend API key + verified sender in env.
- **Images:** Production = Cloudinary (env from dashboard). Local = either Cloudinary with `CLOUDINARY_FOLDER=dev` or keep current local disk upload (no Cloudinary env).

# Quick Start Guide - Resend & Cloudinary Setup

## 📋 What You Need to Do

### Step 1: Create Free Accounts

- [ ] **Resend**: Sign up at https://resend.com → Get API key
- [ ] **Cloudinary**: Sign up at https://cloudinary.com → Get credentials

### Step 2: Local Development Setup

- [ ] **Start Docker Services**
  ```powershell
  docker-compose up -d
  ```

- [ ] **Configure `.env` file:**

```env
# Required
JWT_SECRET=your-secret-key-here
ENC_KEY=0000000000000000000000000000000000000000000000000000000000000000
ENC_IV=00000000000000000000000000000000

# Email (Local - Mailpit)
# Leave RESEND_API_KEY unset
SMTP_HOST=localhost
SMTP_PORT=1025
EMAIL_FROM=dev@test.com

# Images (Optional - choose one)
# Option A: Use Cloudinary (recommended)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=dev

# Option B: Use local disk (leave Cloudinary vars unset)
```

- [ ] **Test Email**
  - Trigger any email (password reset, etc.)
  - Open http://localhost:8025
  - Verify email appears in Mailpit

- [ ] **Test Image Upload**
  - Upload an image via API
  - If using Cloudinary: Check dashboard → dev folder
  - If using local: Check `uploads/` folder

---

### Step 3: Production Setup

- [ ] **Add to Production `.env`:**

```env
# Email (Production - Resend)
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=noreply@yourdomain.com
# Don't set SMTP_HOST/SMTP_PORT

# Images (Production - Cloudinary)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=prod
```

- [ ] **Deploy Production**
  ```powershell
  docker-compose -f docker-compose.prod.yml up -d
  ```

- [ ] **Test Production**
  - Send test email → Check Resend dashboard
  - Upload test image → Check Cloudinary dashboard

---

## 📋 Environment Variables Quick Reference

| Variable | Local | Production |
|----------|-------|------------|
| `RESEND_API_KEY` | ❌ Unset | ✅ Required |
| `SMTP_HOST` | ✅ `localhost` | ❌ Not used |
| `SMTP_PORT` | ✅ `1025` | ❌ Not used |
| `EMAIL_FROM` | ✅ Any | ✅ Verified sender |
| `CLOUDINARY_CLOUD_NAME` | ⚠️ Optional | ✅ Required |
| `CLOUDINARY_API_KEY` | ⚠️ Optional | ✅ Required |
| `CLOUDINARY_API_SECRET` | ⚠️ Optional | ✅ Required |
| `CLOUDINARY_FOLDER` | `dev` | `prod` |

---

## ✅ Completion Checklist

- [ ] Resend account created and API key obtained
- [ ] Cloudinary account created and credentials obtained
- [ ] Local `.env` configured (Mailpit for email)
- [ ] Local email tested (viewed in Mailpit)
- [ ] Local image upload tested
- [ ] Production `.env` configured (Resend for email)
- [ ] Production email tested (verified in Resend dashboard)
- [ ] Production image upload tested (verified in Cloudinary dashboard)

---

## 🆘 Common Issues

**Email not sending?**
- Local: Check Mailpit is running → http://localhost:8025
- Production: Verify `RESEND_API_KEY` is set correctly

**Image upload failing?**
- Check Cloudinary credentials (if using)
- Check `uploads/` folder exists and is writable (if using local)

**Docker services not starting?**
- Check Docker Desktop is running
- Check ports 5432, 1025, 8025, 5050 are not in use

---

## 📚 More Information

- Full setup guide: `SETUP_SUMMARY.md`
- Environment variables: `ENVIRONMENT_SETUP.md`
- Dev brief: `DEV_BRIEF_RESEND_AND_CLOUDINARY.md`

# Resend & Cloudinary Setup - Tasks to Complete

This document lists what needs to be done to complete the Resend (email) and Cloudinary (image uploads) setup.

## 📋 Tasks to Complete

### 1. Create Free Accounts
- [ ] **Resend Account**
  - Sign up at https://resend.com
  - Free tier: 3,000 emails/month
  - Create API key from dashboard
  - Verify sender domain (or use test domain `onboarding@resend.dev`)

- [ ] **Cloudinary Account**
  - Sign up at https://cloudinary.com
  - Free tier available
  - Get credentials from dashboard:
    - Cloud Name
    - API Key
    - API Secret

### 2. Configure Local Environment

- [ ] **Start Docker Services**
  ```powershell
  docker-compose up -d
  ```
  This starts PostgreSQL, Mailpit, and pgAdmin

- [ ] **Configure `.env` file for Local**
  ```env
  # Email (Local - Mailpit)
  # Leave RESEND_API_KEY unset
  SMTP_HOST=localhost
  SMTP_PORT=1025
  EMAIL_FROM=dev@test.com

  # Images (Choose one option)
  # Option A: Use Cloudinary with dev folder
  CLOUDINARY_CLOUD_NAME=your_cloud_name
  CLOUDINARY_API_KEY=your_api_key
  CLOUDINARY_API_SECRET=your_api_secret
  CLOUDINARY_FOLDER=dev

  # Option B: Use local disk (leave Cloudinary vars unset)
  ```

- [ ] **Test Email (Local)**
  - Trigger an email (password reset, etc.)
  - View at http://localhost:8025
  - Verify email appears in Mailpit

- [ ] **Test Image Upload (Local)**
  - Upload an image via API
  - If using Cloudinary: Check dashboard → dev folder
  - If using local: Check `uploads/` folder

### 3. Configure Production Environment

- [ ] **Add Resend API Key to Production `.env`**
  ```env
  RESEND_API_KEY=re_your_api_key_here
  EMAIL_FROM=noreply@yourdomain.com
  # Don't set SMTP_HOST/SMTP_PORT
  ```

- [ ] **Add Cloudinary Credentials to Production `.env`**
  ```env
  CLOUDINARY_CLOUD_NAME=your_cloud_name
  CLOUDINARY_API_KEY=your_api_key
  CLOUDINARY_API_SECRET=your_api_secret
  CLOUDINARY_FOLDER=prod
  ```

- [ ] **Deploy Production**
  ```powershell
  docker-compose -f docker-compose.prod.yml up -d
  ```

- [ ] **Test Email (Production)**
  - Trigger an email
  - Check Resend dashboard for delivery status

- [ ] **Test Image Upload (Production)**
  - Upload an image via API
  - Check Cloudinary dashboard → Media Library → prod folder
  - Verify secure URL is returned

## 📋 Environment Variables

### Required for All Environments
```env
JWT_SECRET=your-secret-key
ENC_KEY=64-hex-characters
ENC_IV=32-hex-characters
```

### Local Development (Email)
```env
# Leave RESEND_API_KEY unset
SMTP_HOST=localhost
SMTP_PORT=1025
EMAIL_FROM=dev@test.com
```

### Production (Email)
```env
RESEND_API_KEY=re_your_api_key
EMAIL_FROM=noreply@yourdomain.com
# SMTP_HOST and SMTP_PORT not needed
```

### Local Development (Images)
**Option A (Recommended):**
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=dev
```

**Option B:**
```env
# Leave all Cloudinary variables unset
# Files will be stored in uploads/ folder
```

### Production (Images)
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=prod
```

## 🚀 Quick Start

### Local Development Setup

1. **Start Docker services:**
   ```powershell
   docker-compose up -d
   ```
   This starts:
   - PostgreSQL (port 5432)
   - Mailpit (SMTP: 1025, Web UI: 8025)
   - pgAdmin (port 5050)

2. **Configure environment:**
   - Copy environment variables to `.env`
   - For local: Leave `RESEND_API_KEY` unset
   - Set `SMTP_HOST=localhost` and `SMTP_PORT=1025`
   - Optionally set Cloudinary with `CLOUDINARY_FOLDER=dev`

3. **Test email:**
   - Send a test email (e.g., password reset)
   - View it at: http://localhost:8025

4. **Test image upload:**
   - Upload an image via API
   - If using Cloudinary: Check dashboard → dev folder
   - If using local: Check `uploads/` folder

### Production Setup

1. **Get Resend API key:**
   - Sign up at https://resend.com
   - Create API key
   - Verify sender domain

2. **Get Cloudinary credentials:**
   - Sign up at https://cloudinary.com
   - Get cloud name, API key, and secret from dashboard

3. **Configure environment:**
   - Set `RESEND_API_KEY`
   - Set `EMAIL_FROM` to verified sender
   - Set all Cloudinary credentials
   - Set `CLOUDINARY_FOLDER=prod`

4. **Deploy:**
   ```powershell
   docker-compose -f docker-compose.prod.yml up -d
   ```

## 🧪 Testing

### Test Email (Local)
1. Start Mailpit: `docker-compose up -d mailpit`
2. Trigger an email (e.g., password reset, donor rejection)
3. Open http://localhost:8025
4. Verify email appears in Mailpit inbox

### Test Email (Production)
1. Set `RESEND_API_KEY` in environment
2. Trigger an email
3. Check Resend dashboard for delivery status

### Test Image Upload (Local with Cloudinary)
1. Set Cloudinary credentials with `CLOUDINARY_FOLDER=dev`
2. Upload an image via API
3. Check Cloudinary dashboard → Media Library → dev folder
4. Verify URL is returned in API response

### Test Image Upload (Local with Disk)
1. Leave Cloudinary variables unset
2. Upload an image via API
3. Check `uploads/` folder in project root
4. Verify path `/uploads/filename.jpg` is returned

### Test Image Upload (Production)
1. Set Cloudinary credentials with `CLOUDINARY_FOLDER=prod`
2. Upload an image via API
3. Check Cloudinary dashboard → Media Library → prod folder
4. Verify secure URL is returned

## 📝 How It Works

### Email Flow
1. **Check for RESEND_API_KEY:**
   - If set → Use Resend API (production)
   - If not set → Use Mailpit SMTP (local)

2. **Send email:**
   - Production: Calls Resend API
   - Local: Sends via Nodemailer to Mailpit SMTP

### Image Upload Flow
1. **Check for Cloudinary credentials:**
   - If all set → Use Cloudinary (memory storage)
   - If not set → Use local disk (disk storage)

2. **Upload file:**
   - Cloudinary: Upload buffer to Cloudinary, return secure URL
   - Local: Save to disk, return relative path

3. **Store in database:**
   - Cloudinary: Full URL (e.g., `https://res.cloudinary.com/...`)
   - Local: Relative path (e.g., `/uploads/filename.jpg`)

## ⚠️ Important Notes

1. **Email:**
   - Local development requires Mailpit running
   - Production requires Resend API key
   - Never set both `RESEND_API_KEY` and SMTP settings in production

2. **Images:**
   - Cloudinary folder separation: `dev/` for local, `prod/` for production
   - Local disk option doesn't require Cloudinary credentials
   - File deletion works for both Cloudinary and local files

3. **Docker:**
   - Local: Use `docker-compose.yml` (includes Mailpit)
   - Production: Use `docker-compose.prod.yml` (no Mailpit)

## 🐛 Troubleshooting

### Email not sending (Local)
- Check Mailpit is running: `docker ps | grep mailpit`
- Verify SMTP settings: `SMTP_HOST=localhost`, `SMTP_PORT=1025`
- Check Mailpit UI: http://localhost:8025

### Email not sending (Production)
- Verify `RESEND_API_KEY` is set correctly
- Check Resend dashboard for errors
- Verify sender domain is verified

### Image upload failing (Cloudinary)
- Verify all Cloudinary credentials are set
- Check Cloudinary dashboard for API limits
- Verify folder name is correct

### Image upload failing (Local)
- Check `uploads/` folder exists and is writable
- Verify file size limits
- Check Multer configuration

## 📚 Additional Resources

- Resend Documentation: https://resend.com/docs
- Cloudinary Documentation: https://cloudinary.com/documentation
- Mailpit Documentation: https://github.com/axllent/mailpit

## ✅ Verification Checklist

After completing all tasks above, verify:

- [ ] Local emails appear in Mailpit (http://localhost:8025)
- [ ] Production emails are delivered via Resend
- [ ] Local image uploads work (Cloudinary or local disk)
- [ ] Production image uploads work (Cloudinary)
- [ ] All environment variables are set correctly
- [ ] Docker services are running properly

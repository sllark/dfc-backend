# Tasks to Complete - Resend & Cloudinary Setup

## 📋 Action Items

### 1. Create Free Accounts
- [ ] Sign up for Resend at https://resend.com
  - Get API key from dashboard
  - Free tier: 3,000 emails/month
  
- [ ] Sign up for Cloudinary at https://cloudinary.com
  - Get Cloud Name, API Key, and API Secret from dashboard
  - Free tier available

### 2. Local Development Setup

- [ ] Start Docker services:
  ```powershell
  docker-compose up -d
  ```

- [ ] Configure `.env` file for local:
  ```env
  # Email - Leave RESEND_API_KEY unset
  SMTP_HOST=localhost
  SMTP_PORT=1025
  EMAIL_FROM=dev@test.com

  # Images - Option A: Use Cloudinary
  CLOUDINARY_CLOUD_NAME=your_cloud_name
  CLOUDINARY_API_KEY=your_api_key
  CLOUDINARY_API_SECRET=your_api_secret
  CLOUDINARY_FOLDER=dev

  # Images - Option B: Leave Cloudinary vars unset (uses local disk)
  ```

- [ ] Test email locally:
  - Trigger an email (password reset, etc.)
  - View at http://localhost:8025
  - Verify email appears in Mailpit

- [ ] Test image upload locally:
  - Upload image via API
  - Verify it works (Cloudinary dashboard or `uploads/` folder)

### 3. Production Setup

- [ ] Add to production `.env`:
  ```env
  # Email
  RESEND_API_KEY=re_your_api_key_here
  EMAIL_FROM=noreply@yourdomain.com

  # Images
  CLOUDINARY_CLOUD_NAME=your_cloud_name
  CLOUDINARY_API_KEY=your_api_key
  CLOUDINARY_API_SECRET=your_api_secret
  CLOUDINARY_FOLDER=prod
  ```

- [ ] Deploy production:
  ```powershell
  docker-compose -f docker-compose.prod.yml up -d
  ```

- [ ] Test production:
  - Send test email → Check Resend dashboard
  - Upload test image → Check Cloudinary dashboard

## ✅ Done When

- [ ] Resend account created, API key obtained
- [ ] Cloudinary account created, credentials obtained
- [ ] Local environment configured and tested
- [ ] Production environment configured and tested
- [ ] All emails working (local via Mailpit, production via Resend)
- [ ] All image uploads working (local and production)

# Environment Variables Setup Guide

This document lists all environment variables required for the Drug Free Compliance API.

## Quick Setup

1. Copy the template below to create your `.env` file
2. Fill in all required values
3. See sections below for detailed setup instructions

## Environment Variables Template

```env
# ===== Server Configuration =====
NODE_ENV=development
PORT=3000
HOST=localhost

# ===== Database Configuration =====
DATABASE_URL=postgresql://postgres:3421@localhost:5432/mybizhelperapi

# ===== JWT & Encryption =====
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
ENC_KEY=0000000000000000000000000000000000000000000000000000000000000000
ENC_IV=00000000000000000000000000000000

# ===== Email Configuration =====
# Production: Use Resend API
# Local: Use Mailpit (SMTP settings below)
RESEND_API_KEY=
EMAIL_FROM=onboarding@resend.dev
SMTP_HOST=localhost
SMTP_PORT=1025

# ===== Cloudinary Configuration (Image Uploads) =====
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_FOLDER=prod

# ===== Stripe Configuration =====
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# ===== LabCorp Integration =====
LABCORP_SOAP_URL=
LABCORP_USER_ID=
LABCORP_PASSWORD=
```

## Required Variables

### Server Configuration
- `NODE_ENV`: `development` or `production`
- `PORT`: Server port (default: 3000)
- `HOST`: Server host (default: localhost)

### Database
- `DATABASE_URL`: PostgreSQL connection string

### Security
- `JWT_SECRET`: Secret key for JWT tokens (any secure string)
- `ENC_KEY`: 32 bytes (64 hex characters) - Generate with: `openssl rand -hex 32`
- `ENC_IV`: 16 bytes (32 hex characters) - Generate with: `openssl rand -hex 16`

## Email Configuration

### Local Development (Mailpit)
For local development, use Mailpit to capture emails:

1. Start Mailpit via Docker: `docker-compose up -d mailpit`
2. View emails at: http://localhost:8025
3. **Do NOT set** `RESEND_API_KEY` (leave it unset)
4. Set SMTP settings:
   ```env
   SMTP_HOST=localhost
   SMTP_PORT=1025
   EMAIL_FROM=dev@test.com
   ```

### Production (Resend)
For production, use Resend API:

1. Create account at [resend.com](https://resend.com)
2. Add and verify a domain (or use test domain)
3. Create API key from dashboard
4. Set environment variables:
   ```env
   RESEND_API_KEY=re_your_api_key_here
   EMAIL_FROM=noreply@yourdomain.com
   ```
5. **Do NOT set** `SMTP_HOST` or `SMTP_PORT` (not used in production)

## Cloudinary Configuration

### Local Development

**Option A (Recommended):** Use Cloudinary with dev folder
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=dev
```

**Option B:** Use local disk storage
- Leave all Cloudinary variables unset
- Files will be stored in `uploads/` folder

### Production
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=prod
```

Get credentials from: https://cloudinary.com/console

## Stripe Configuration

1. Get API keys from: https://dashboard.stripe.com/apikeys
2. Set environment variables:
   ```env
   STRIPE_SECRET_KEY=sk_live_your_secret_key
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   NEXT_PUBLIC_BASE_URL=https://yourdomain.com
   ```

## LabCorp Integration

Get SOAP API credentials from LabCorp:
```env
LABCORP_SOAP_URL=https://api.labcorp.com/soap
LABCORP_USER_ID=your_user_id
LABCORP_PASSWORD=your_password
```

## Environment Setup Checklist

### Local Development
- [ ] Database running (PostgreSQL via Docker)
- [ ] Mailpit running (via Docker Compose)
- [ ] JWT_SECRET, ENC_KEY, ENC_IV set
- [ ] RESEND_API_KEY **unset** (uses Mailpit)
- [ ] SMTP_HOST=localhost, SMTP_PORT=1025
- [ ] Cloudinary: Either set with `CLOUDINARY_FOLDER=dev` OR leave unset for local disk

### Production
- [ ] All required variables set
- [ ] RESEND_API_KEY set (from Resend)
- [ ] EMAIL_FROM set to verified sender
- [ ] All Cloudinary credentials set
- [ ] All Stripe credentials set (live keys)
- [ ] All LabCorp credentials set
- [ ] NODE_ENV=production

## Testing Email Setup

### Local (Mailpit)
1. Start Mailpit: `docker-compose up -d mailpit`
2. Send a test email (e.g., password reset)
3. Check Mailpit UI: http://localhost:8025

### Production (Resend)
1. Check Resend dashboard for email logs
2. Verify emails are being delivered

## Testing Image Uploads

### Local (Cloudinary with dev folder)
1. Set Cloudinary credentials with `CLOUDINARY_FOLDER=dev`
2. Upload an image
3. Check Cloudinary dashboard → Media Library → dev folder

### Local (Local disk)
1. Leave Cloudinary variables unset
2. Upload an image
3. Check `uploads/` folder in project root

### Production
1. Set Cloudinary credentials with `CLOUDINARY_FOLDER=prod`
2. Upload an image
3. Check Cloudinary dashboard → Media Library → prod folder

# Drug Free Compliance API

A Node.js/Express API for managing donor registrations, services, payments, and Labcorp integrations.

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Payment Processing**: Stripe
- **Email**: Resend (production) + SMTP/Mailpit (local dev)
- **External Integration**: Labcorp SOAP API

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

This will automatically generate the Prisma client via the `postinstall` script.

### 2. Database Setup

#### Option A: Using Existing Database
If you have an existing PostgreSQL database, update the `DATABASE_URL` in your `.env` file.

#### Option B: Create New Database
1. Create a PostgreSQL database:
```sql
CREATE DATABASE mybizhelperapi;
```

2. Run the baseline SQL script (optional, for initial schema):
```bash
psql -U postgres -d mybizhelperapi -f baseline.sql
```

3. Run Prisma migrations:
```bash
npx prisma migrate deploy
```

Or to apply all migrations:
```bash
npx prisma migrate dev
```

### 3. Environment Variables

Use a `.env` file in the root directory with the following variables (all keys/URLs are defined there):

```env
# Database Configuration
# For local development:
# DATABASE_URL="postgresql://postgres:3421@localhost:5432/mybizhelperapi?schema=public"
# For remote/production server, use the actual database host (not 127.0.0.1):
# DATABASE_URL="postgresql://username:password@database-host:5432/database_name?schema=public"
DATABASE_URL="postgresql://postgres:3421@localhost:5432/mybizhelperapi?schema=public"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Encryption Keys (AES-256)
# Generate ENC_KEY with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENC_KEY="your-64-character-hex-encryption-key-32-bytes-for-aes-256"
# Generate ENC_IV with: node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
ENC_IV="your-32-character-hex-initialization-vector"

# Email Configuration
# Production (recommended): Resend
RESEND_API_KEY="re_..."
EMAIL_FROM="no-reply@dfctest.com"
#
# Local development: SMTP (Mailpit)
SMTP_HOST="localhost"
SMTP_PORT=1025
#
# Automated reminder job (optional)
ENABLE_TEST_REMINDER_CRON=false
TEST_REMINDER_CRON_MINUTES=60
TEST_REMINDER_HOURS_AHEAD=24

# Labcorp Integration
LABCORP_USER_ID="your-labcorp-user-id"
LABCORP_PASSWORD="your-labcorp-password"
LABCORP_SOAP_URL="https://labcorp-soap-endpoint-url"

# Stripe Configuration
STRIPE_SECRET_KEY="sk_test_your-stripe-secret-key"
STRIPE_WEBHOOK_SECRET="whsec_your-webhook-secret"

# Application Configuration
# Server runs on port 3000 only
PORT=3000
# Use '0.0.0.0' to allow remote access, or 'localhost' for local-only access
HOST=0.0.0.0
# Used for links in email templates (portal links).
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

**Important Notes:**
- `ENC_KEY` must be exactly 64 hex characters (32 bytes for AES-256)
- `ENC_IV` must be exactly 32 hex characters (16 bytes)
- Generate secure keys using the Node.js commands shown above

### 4. Generate Encryption Keys

Run these commands to generate secure encryption keys:

```bash
# Generate ENC_KEY (64 hex characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate ENC_IV (32 hex characters)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### 5. Verify Database Connection

Test your database connection:

```bash
npm run db:check
```

### 6. Run the Application

#### Development Mode
```bash
npm run dev
```

#### Production Mode
```bash
npm run build
npm start
```

The server will start on `http://localhost:3000` (or the port specified in your `.env` file).

### 7. Docker (optional)

Run the API, PostgreSQL, PgAdmin, and Mailpit with Docker Compose. All keys and URLs are read from your `.env` file.

1. Ensure your `.env` in the project root has every key/URL you need (see **Environment Variables** above).

2. Build and start all services:
   ```bash
   docker compose up -d --build
   ```

3. The API runs at `http://localhost:3000`, Postgres on `5432`, PgAdmin on `http://localhost:5050`, Mailpit on `http://localhost:8025`. Migrations run automatically when the API container starts. For Docker, `DATABASE_URL` is overridden so the API connects to the `postgres` service; all other variables come from `.env`.

4. Production-style stack (uses `.env` for all config):
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

## Project Structure

```
├── src/
│   ├── controllers/     # Request handlers
│   ├── middlewares/     # Authentication, upload, etc.
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions (JWT, encryption, email, etc.)
│   ├── prisma/          # Prisma client configuration
│   └── index.ts         # Application entry point
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── migrations/      # Database migrations
├── uploads/             # File uploads directory
└── dist/                # Compiled TypeScript output
```

## API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/register` - User registration
- `POST /api/forgot-password` - Request password reset
- `POST /api/reset-password` - Reset password with OTP

### Services
- `GET /api/services` - List all services
- `POST /api/services` - Create a service (authenticated)
- `PUT /api/services/:id` - Update a service (authenticated)
- `DELETE /api/services/:id` - Delete a service (authenticated)

### Donor Registration
- `GET /api/donors` - List donor registrations (authenticated)
- `POST /api/donors` - Create donor registration (authenticated)
- `PUT /api/donors/:id` - Update donor registration (authenticated)

### Veriport Reports (authenticated)
- `GET /api/veriport/reports` - List reports visible to the logged-in user
- `GET /api/veriport/reports?donorRegistrationId=:id` - List reports linked to a specific registration (best-effort linkage by user/email)
- `GET /api/veriport/reports/:veriportReportId` - Get parsed report payload (latest or `?revision=...`)
- `GET /api/veriport/reports/:veriportReportId/pdf` - Get short-lived signed URL for official PDF (`pdfStatus` must be `UPLOADED`)
- `POST /api/veriport/reports/:veriportReportId/email-pdf` - Email stored PDF to donor/user

### Email Automation (authenticated)
- `POST /api/email/reminders/run` - Trigger reminder email job manually (ADMIN/SUPERVISOR/MODERATOR)

## Report/Test Linkage and Access Rules

- Reports are stored in `VeriportMroReport` by natural key: `veriportReportId + reportRevisionNumber`.
- Access is allowed for `ADMIN`, `SUPERVISOR`, `MODERATOR`, or matching recipient/donor linkage.
- PDF download availability depends on `pdfStatus === "UPLOADED"` and `pdfPublicId` presence.
- Official signed report handling: only store/distribute provider-origin `MroLetter` PDFs; do not generate a fake MRO letter.

### Payments
- `GET /api/payments` - List payments (authenticated)
- `POST /api/payments` - Create payment (authenticated)

### Stripe
- `POST /api/checkout` - Create Stripe checkout session
- `POST /api/stripe/webhook` - Stripe webhook handler
- `GET /api/stripe/session/:sessionId` - Get checkout session details

### Labcorp
- `POST /api/labcorp/*` - Labcorp integration endpoints

## Database Migrations

### Apply migrations
```bash
npx prisma migrate deploy
```

### Create a new migration
```bash
npx prisma migrate dev --name your_migration_name
```

### View database in Prisma Studio
```bash
npx prisma studio
```

## Scripts

- `npm run dev` - Start development server with nodemon
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server (ts-node)
- `npm run start:prod` - Run built app (node dist/index.js)
- `npm run db:check` - Verify database connection
- `npm run clean` - Remove dist directory

## Security Features

- JWT-based authentication
- Password encryption with bcrypt
- Data encryption for sensitive fields (email, phone, account numbers)
- Role-based access control (RBAC)
- Audit logging for all database operations
- CORS configuration for allowed origins

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check `DATABASE_URL` in `.env` file
- Ensure database exists and user has proper permissions

### Encryption Errors
- Ensure `ENC_KEY` is exactly 64 hex characters
- Ensure `ENC_IV` is exactly 32 hex characters
- Regenerate keys if needed using the commands in step 4

### Prisma Client Issues
- Run `npx prisma generate` to regenerate the client
- Ensure migrations are up to date: `npx prisma migrate deploy`

## License

ISC

## Author

SD Coder




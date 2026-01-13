# Frequently Bought Together - Automated Cron Job Setup

This document explains how to set up the automated cron job that runs every Friday at 10 AM to sync mappings and push frequently bought together updates.

## Overview

The cron job automatically:
1. **Syncs SKU mappings** from Urvann API
2. **Pushes frequently bought together updates** for all SKUs
3. **Sends email notification** to `harsh@urvann.com` with stats

## Setup Options

### Option 1: Vercel Cron (Recommended for Vercel deployments)

If you're deploying on Vercel, the cron job is already configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/frequently-bought-update",
      "schedule": "0 10 * * 5"
    }
  ]
}
```

**Schedule**: `0 10 * * 5` means:
- `0` - minute 0
- `10` - hour 10 (10 AM)
- `*` - any day of month
- `*` - any month
- `5` - Friday (0 = Sunday, 5 = Friday)

**Setup Steps**:
1. Deploy to Vercel
2. The cron job will be automatically configured
3. Add `CRON_SECRET` environment variable for security (optional)

### Option 2: External Cron Service

If you're not using Vercel, use an external cron service:

#### Using cron-job.org:
1. Sign up at https://cron-job.org
2. Create a new cron job
3. Set URL: `https://your-domain.com/api/cron/frequently-bought-update`
4. Set schedule: Every Friday at 10:00 AM
5. Method: GET
6. Add header: `Authorization: Bearer YOUR_CRON_SECRET` (if using CRON_SECRET)

#### Using EasyCron:
1. Sign up at https://www.easycron.com
2. Create a new cron job
3. Set URL and schedule similarly

### Option 3: Manual Trigger (Testing)

You can manually trigger the cron job for testing:

```bash
# Without authentication
curl https://your-domain.com/api/cron/frequently-bought-update?x-manual-trigger=true

# With authentication (if CRON_SECRET is set)
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
     https://your-domain.com/api/cron/frequently-bought-update?x-manual-trigger=true
```

## Environment Variables

Add these to your `.env` file:

```env
# Email Configuration
EMAIL_SERVICE=console  # Options: 'console', 'smtp'
EMAIL_FROM=noreply@urvann.com

# SMTP Configuration (if using EMAIL_SERVICE=smtp)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Cron Security (optional but recommended)
CRON_SECRET=your-secret-key-here

# Base URL (for internal API calls)
NEXTAUTH_URL=https://your-domain.com
```

## Email Setup

### Development Mode (Console)
By default, emails are logged to console. Set `EMAIL_SERVICE=console` (or leave unset).

### Production Mode (SMTP)
1. Set `EMAIL_SERVICE=smtp`
2. Configure SMTP settings in environment variables
3. For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833)

## Monitoring

The cron job logs all activities:
- Check your server logs for `[Cron]` prefixed messages
- Email notifications are sent to `harsh@urvann.com` on completion
- Failed runs will include error details in the email

## Troubleshooting

### Cron job not running:
1. Check if `vercel.json` is deployed (for Vercel)
2. Verify the schedule is correct
3. Check server logs for errors
4. Test manually using the manual trigger endpoint

### Email not sending:
1. Verify `EMAIL_SERVICE` is set correctly
2. Check SMTP credentials (if using SMTP)
3. Check server logs for email errors
4. In development, emails are logged to console

### Process failing:
1. Check MongoDB connection
2. Verify Urvann API access
3. Check rate limiting (429 errors)
4. Review logs for specific error messages

## Code Structure

The cron job uses modular services:

- **`/src/services/frequentlyBoughtSyncService.ts`** - Syncs SKU mappings
- **`/src/services/frequentlyBoughtPushService.ts`** - Pushes updates
- **`/src/services/frequentlyBoughtOrchestrator.ts`** - Orchestrates the full process
- **`/src/lib/email.ts`** - Email sending utility
- **`/src/app/api/cron/frequently-bought-update/route.ts`** - Cron API endpoint

All code is modular and can be reused in other parts of the application.

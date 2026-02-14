# Deployment Documentation

Deployment instructions and configuration for the My Record Collection application.

## Deployment Platform

This application is deployed on **Render** using Infrastructure as Code (Blueprint).

## Quick Deploy

**Deploy with one click**: [Deploy to Render](https://dashboard.render.com/blueprint/new?repo=https://github.com/lexpierce/my-record-collection)

## Prerequisites

- GitHub repository with code pushed
- Render account
- Discogs API token ([Get one here](https://www.discogs.com/settings/developers))

## Deployment Configuration

### Service Configuration
- **Type**: Web Service
- **Plan**: Starter ($7/month)
- **Runtime**: Node with Bun installed
- **Region**: Oregon
- **Auto Deploy**: Enabled on push to main

### Database Configuration
- **Type**: PostgreSQL
- **Version**: 18
- **Plan**: Basic 256MB ($7/month)
- **Disk**: 5GB
- **Region**: Oregon (same as service)

### Environment Variables

Required environment variables:
- `NODE_ENV=production`
- `DATABASE_URL` - PostgreSQL connection string (internal URL)
- `DISCOGS_TOKEN` - Your Discogs API token
- `DISCOGS_USER_AGENT` - User agent for API requests (default: MyRecordCollection/1.0)

## Deployment Steps

1. **Push code** to GitHub main branch
2. **Click deploy link** above to open Render Blueprint
3. **Configure secrets** in Render dashboard:
   - Set `DISCOGS_TOKEN`
   - Verify `DATABASE_URL` (auto-generated)
4. **Wait for deployment** (5-10 minutes)
5. **Verify deployment**:
   - Health check: `/api/am_i_evil`
   - Home page loads correctly
   - Search functionality works

## Build Process

The Render build runs these steps:
1. Install Bun runtime
2. Install dependencies: `bun install`
3. Push database schema: `bun run db:push --force`
4. Build Next.js app: `bun run build`
5. Start production server: `bun run start`

## Monitoring

- **Service Dashboard**: View logs and metrics in Render
- **Health Check**: `/api/am_i_evil` endpoint
- **Database**: Monitor via Render database dashboard

## Troubleshooting

Common deployment issues and solutions:

### Build Fails
- Verify `DATABASE_URL` is set correctly
- Check for TypeScript errors: `bun run type-check`
- Review build logs in Render dashboard

### App Won't Start
- Ensure using **Internal Database URL** (not external)
- Verify all environment variables are set
- Check service logs for runtime errors

### Database Connection Issues
- Confirm database is in "Available" status
- Verify both service and database are in same region
- Check connection string format

### Discogs API Not Working
- Verify `DISCOGS_TOKEN` is valid
- Check rate limit not exceeded
- Review application logs for API errors

## Detailed Deployment Documentation

For more detailed information, see:
- [DEPLOYMENT.md](../../DEPLOYMENT.md) in project root
- [render.yaml](../../render.yaml) Blueprint configuration

## Updates and Maintenance

- **Auto Deploy**: Pushes to main branch trigger automatic deployment
- **Manual Deploy**: Use Render dashboard "Manual Deploy" button
- **Database Migrations**: Run automatically during build with `db:push --force`
- **Environment Updates**: Change via Render dashboard, triggers redeploy

# Deployment Guide

## Current Status

✅ **GitHub Repository**: <https://github.com/lexpierce/my-record-collection>
✅ **Blueprint**: render.yaml (organized under Records project, Demo environment)
✅ **Deployment Method**: Render Blueprint (Infrastructure as Code)

## Blueprint Deployment URL

**Click here to deploy**: <https://dashboard.render.com/blueprint/new?repo=https://github.com/lexpierce/my-record-collection>

This will deploy:

- **Project**: Records
- **Environment**: Demo
- **Web Service**: my-record-collection (Bun runtime, Starter plan)
- **Database**: Postgres 18 (5GB disk, Basic 256MB plan)

## Next Steps to Complete Deployment

### 1. Wait for Database Provisioning

The PostgreSQL database is currently being created. This typically takes 2-5 minutes. You can monitor the status at:

- Database Dashboard: <https://dashboard.render.com/d/dpg-d680hssr85hc73chs2c0-a>

Once the database status changes from "Creating" to "Available", proceed to step 2.

### 2. Update Database Connection String

1. Go to the database dashboard (link above)
2. Copy the **Internal Database URL** (starts with `postgresql://`)
3. Go to the web service dashboard: <https://dashboard.render.com/web/srv-d680i40gjchc73b98590/env>
4. Find the `DATABASE_URL` environment variable
5. Replace the placeholder value with the actual Internal Database URL
6. Click "Save Changes"

### 3. Add Discogs API Token

You need a Discogs Personal Access Token to fetch record information.

1. Get your token at: <https://www.discogs.com/settings/developers>
2. Go to: <https://dashboard.render.com/web/srv-d680i40gjchc73b98590/env>
3. Find the `DISCOGS_TOKEN` environment variable
4. Replace `YOUR_DISCOGS_TOKEN_HERE` with your actual token
5. Click "Save Changes"

### 4. Configure Health Check

1. Go to: <https://dashboard.render.com/web/srv-d680i40gjchc73b98590/settings>
2. Scroll to "Health Check"
3. Set **Health Check Path** to: `/api/am_i_evil`
4. Click "Save Changes"

### 5. Trigger Redeploy

After updating the environment variables and health check:

1. Go to: <https://dashboard.render.com/web/srv-d680i40gjchc73b98590>
2. Click "Manual Deploy" → "Deploy latest commit"
3. Wait for the build to complete (5-10 minutes)

The build will:

- Install Bun runtime
- Install dependencies
- Run database migrations (`bun run db:push`)
- Build the Next.js application
- Start the production server

### 6. Verify Deployment

Once deployed, test your application:

1. **Health Check**: <https://my-record-collection.onrender.com/api/am_i_evil>
   - Should return: `{"status":"yes_i_am","message":"Application is running",...}`

2. **Home Page**: <https://my-record-collection.onrender.com>
   - Should show the record collection interface

3. **Search for a Record**: Try searching for an artist/album to verify Discogs integration

## Deployment Configuration

### Service Details

- **Name**: my-record-collection
- **Plan**: Starter ($7/month)
- **Region**: Oregon
- **Runtime**: Node (with Bun installed via build/start commands)
- **Auto Deploy**: Enabled (deploys on push to main branch)

### Database Details

- **Name**: my-record-collection-db
- **Plan**: Basic 256MB ($7/month)
- **Region**: Oregon
- **Version**: PostgreSQL 18
- **Disk Size**: 5GB

### Environment Variables

- `NODE_ENV`: production
- `DATABASE_URL`: PostgreSQL connection string (needs update)
- `DISCOGS_TOKEN`: Your Discogs API token (needs update)
- `DISCOGS_USER_AGENT`: MyRecordCollection/1.0

## Troubleshooting

### Build Fails

- Check that DATABASE_URL is correctly set
- Verify Bun installation in build logs
- Check for any syntax errors in the code

### App Won't Start

- Ensure DATABASE_URL is the **Internal Database URL** (not external)
- Verify all environment variables are set
- Check the service logs in Render dashboard

### Database Connection Issues

- Make sure you're using the Internal Database URL
- Verify the database is in "Available" status
- Check that both services are in the same region (Oregon)

### Discogs API Not Working

- Verify DISCOGS_TOKEN is valid
- Check API rate limits (60 req/min with token, 25 req/min without)
- Review application logs for Discogs errors

## Alternative: Blueprint Deployment

If you prefer to use the Blueprint file directly:

1. Go to: <https://dashboard.render.com/select-repo>
2. Select the `my-record-collection` repository
3. Render will detect the `render.yaml` blueprint
4. Follow the prompts to configure and deploy
5. Set environment variables when prompted

## Support

- Service Dashboard: <https://dashboard.render.com/web/srv-d680i40gjchc73b98590>
- View Logs: Click "Logs" tab in the dashboard
- Render Docs: <https://docs.render.com/>

## Current Repository

All code is committed and pushed to:

- GitHub: <https://github.com/lexpierce/my-record-collection>
- Branch: main
- Latest commit: Update render.yaml to use Bun runtime instead of Docker

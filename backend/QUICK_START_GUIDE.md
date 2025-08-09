# TeamHub Backend Quick Start Guide

## Database Setup Options

The backend requires a PostgreSQL database. Here are your options:

### Option 1: Local PostgreSQL (Recommended for development)

1. **Install PostgreSQL**:
   - Download from: https://www.postgresql.org/download/
   - Or use Docker: `docker run --name teamhub-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=teamhub -p 5432:5432 -d postgres`

2. **Update .env file**:
   ```bash
   DATABASE_URL="postgresql://postgres:password@localhost:5432/teamhub?sslmode=prefer"
   ```

3. **Run database migrations**:
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

### Option 2: SQLite (Quick Testing)

1. **Update Prisma schema** (`prisma/schema.prisma`):
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = env("DATABASE_URL")
   }
   ```

2. **Update .env file**:
   ```bash
   DATABASE_URL="file:./dev.db"
   ```

3. **Run migrations**:
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

### Option 3: Cloud Database (Production-ready)

Use services like:
- **Supabase** (free tier): https://supabase.com/
- **PlanetScale**: https://planetscale.com/
- **Railway**: https://railway.app/
- **Render**: https://render.com/

## Current Server Status

✅ **Frontend**: Running on http://localhost:3000
❌ **Backend**: Needs database configuration

## Quick Fix for Testing

If you want to test immediately with SQLite:

1. **Change the database provider** in `prisma/schema.prisma`:
   ```bash
   # Line 6: Change from
   provider = "postgresql"
   # To
   provider = "sqlite"
   ```

2. **Update DATABASE_URL** in `.env`:
   ```bash
   DATABASE_URL="file:./dev.db"
   ```

3. **Run migrations**:
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

4. **Start the server**:
   ```bash
   npm run dev
   ```

## OAuth Configuration (Optional)

To test OAuth features, add these to your `.env`:

```bash
# Google OAuth (get from Google Cloud Console)
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Microsoft OAuth (get from Azure Portal)
MICROSOFT_CLIENT_ID="your-microsoft-client-id"
MICROSOFT_CLIENT_SECRET="your-microsoft-client-secret"
```

## Testing the Application

Once the backend is running:

1. **Visit**: http://localhost:3000
2. **Test tenant registration**: Create a new organization
3. **Test tenant login**: Log in to your organization
4. **Test features**: Messages, file uploads, etc.

## Troubleshooting

### Database Connection Issues
- Check if PostgreSQL is running
- Verify credentials in DATABASE_URL
- Ensure database exists

### Port Conflicts
- Backend uses port 5000
- Frontend uses port 3000
- Make sure these ports are available

### CORS Issues
- Frontend URL is configured in CORS_ORIGIN
- WebSocket CORS is configured separately

## Need Help?

1. Check the console output for specific error messages
2. Verify all environment variables are set correctly
3. Ensure database is accessible and migrations are applied

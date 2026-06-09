# My Record Collection

A modern web application for browsing your vinyl record collection, powered by the Discogs API. It is **read-only** toward Discogs: it pulls your personal collection and caches it locally for speed.

## Features

- **Collection Sync**: Pull your personal Discogs collection into a fast local cache
- **Discogs Integration**: Automatically fetch detailed release information from Discogs
- **Vinyl Metadata**: Track record size (7", 10", 12"), vinyl color, and shaped/picture discs
- **Beautiful UI**: Warm-toned interface with browser sans-serif font
- **Record Shelf**: Display your collection with 1" album art thumbnails
- **Interactive Flip Cards**:
  - Click to flip and view complete record details
  - Card scales up and elevates when flipped for better visibility
  - Displays all information: year, size, color, value, label, genres, styles, UPC, Discogs ID
- **Record Management**:
  - Refresh a cached record with the latest Discogs data
  - Remove a record from the local cache with a confirmation dialog
- **Non-ASCII Support**: Preserves special characters in artist names and titles (Björk, Motörhead, etc.)

## Tech Stack

- **Framework**: Astro SSR
- **Runtime**: Bun (latest)
- **Database**: PostgreSQL 18 with Drizzle ORM
- **Styling**: Sass with custom warm color palette
- **API**: Discogs API with rate limiting
- **Deployment**: Render (Docker-based)

## Getting Started

### Prerequisites

- Bun 1.0 or later
- PostgreSQL 18
- Discogs API token (get one at <https://www.discogs.com/settings/developers>)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/lexpierce/my-record-collection.git
cd my-record-collection
```

2. Install dependencies:

```bash
bun install
```

3. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your database URL and Discogs token
```

4. Generate and run database migrations:

```bash
bun run db:generate
bun run db:push
```

5. Run the development server:

```bash
bun run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `DISCOGS_TOKEN`: Your Discogs personal access token
- `DISCOGS_USER_AGENT`: User agent for Discogs API requests
- `DISCOGS_USERNAME`: Your Discogs username (required for sync)
- `APP_AUTH_TOKEN`: Shared secret for state-changing API calls (`Authorization: Bearer <token>`). Generate with `openssl rand -hex 32`.
- `NODE_ENV`: Environment (development/production)

## Scripts

- `bun run dev`: Start Astro development server
- `bun run build`: Build Astro SSR app for production
- `bun run start`: Start production Astro server with Bun
- `bun run lint`: Run ESLint
- `bun run type-check`: Run TypeScript type checking
- `bun run test`: Run tests (Vitest)
- `bun run test:coverage`: Run tests with coverage report
- `bun run db:generate`: Generate Drizzle migrations
- `bun run db:push`: Push schema changes to database
- `bun run db:studio`: Open Drizzle Studio

## API Endpoints

### Health Check

- `GET /am_i_evil` - Health check endpoint

### Records Management

- `GET /api/records` - Fetch all records from the local cache
- `GET /api/records/[id]` - Fetch a single record by UUID
- `DELETE /api/records/[id]` - Remove a record from the local cache
- `POST /api/records/sync` - Pull your Discogs collection into the cache (SSE stream)

### Discogs Integration

- `POST /api/records/update-from-discogs` - Refresh an existing cached record with latest Discogs data

See [API Documentation](./docs/api/README.md) for detailed endpoint information.

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[API Documentation](./docs/api/README.md)** - REST API endpoints and usage
- **[Component Documentation](./docs/components/README.md)** - Astro-rendered markup plus vanilla browser script reference
- **[Feature Documentation](./docs/features/README.md)** - Application features and workflows
- **[Development Guidelines](./docs/development/README.md)** - Coding standards and patterns
- **[Deployment Guide](./docs/deployment/README.md)** - Deployment instructions

## Deployment

This application is deployed on Render using Infrastructure as Code (Blueprint) and runs the production server with Bun.

**Quick Deploy**: [Deploy to Render](https://dashboard.render.com/blueprint/new?repo=https://github.com/lexpierce/my-record-collection)

The application will be deployed with:

- **Service**: Starter plan with Bun runtime
- **Database**: PostgreSQL 18 (Basic 256MB, 5GB disk)
- **Health Check**: `/am_i_evil`
- **Auto Deploy**: Enabled on push to main branch

See [DEPLOYMENT.md](./DEPLOYMENT.md) or [Deployment Documentation](./docs/deployment/README.md) for detailed instructions.

## License

ISC

## Author

Alexander Pierce (lexpierce)

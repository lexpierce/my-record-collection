# My Record Collection

A modern web application for managing your vinyl record collection, powered by the Discogs API.

## Features

- **Search Records**: Search for vinyl records by catalog number, artist/title, or UPC code
- **Discogs Integration**: Automatically fetch detailed information from Discogs
- **Beautiful UI**: Warm-toned interface with Inter font
- **Record Shelf**: Display your collection with 1" album art thumbnails
- **Flip Cards**: Click on any record to see detailed information (year, value, label)
- **Manual Entry**: Add records manually if they can't be found on Discogs
- **Non-ASCII Support**: Preserves special characters in artist names and titles (Björk, Motörhead, etc.)

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Runtime**: Bun (latest)
- **Database**: PostgreSQL 18 with Drizzle ORM
- **Styling**: Tailwind CSS with custom warm color palette
- **API**: Discogs API with rate limiting
- **Deployment**: Render (Docker-based)

## Getting Started

### Prerequisites

- Bun 1.0 or later
- PostgreSQL 18
- Discogs API token (get one at https://www.discogs.com/settings/developers)

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
- `NODE_ENV`: Environment (development/production)

## Scripts

- `bun run dev`: Start development server with Turbopack
- `bun run build`: Build for production
- `bun run start`: Start production server
- `bun run lint`: Run ESLint
- `bun run type-check`: Run TypeScript type checking
- `bun run db:generate`: Generate Drizzle migrations
- `bun run db:push`: Push schema changes to database
- `bun run db:studio`: Open Drizzle Studio

## API Endpoints

- `GET /api/am_i_evil`: Health check endpoint
- `GET /api/records`: Fetch all records
- `POST /api/records`: Add a record manually
- `GET /api/records/[id]`: Get a specific record
- `PUT /api/records/[id]`: Update a record
- `DELETE /api/records/[id]`: Delete a record
- `GET /api/records/search`: Search Discogs
- `POST /api/records/fetch-from-discogs`: Fetch and save from Discogs

## Deployment

This application is configured for deployment on Render using Docker and Blueprints.

1. Push your code to GitHub
2. Connect your repository to Render
3. Use the included `render.yaml` blueprint
4. Set your environment variables in Render dashboard
5. Deploy!

The application will be deployed with:
- Starter service plan
- Basic 256MB PostgreSQL database
- 5GB disk space
- Health check at `/api/am_i_evil`

## License

ISC

## Author

Alexander Pierce (lexpierce)

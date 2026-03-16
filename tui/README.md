# Record Collection TUI

A terminal UI for browsing your vinyl record collection, built with
[Bubble Tea v2](https://github.com/charmbracelet/bubbletea) and
[Lip Gloss v2](https://github.com/charmbracelet/lipgloss).

Connects to the same PostgreSQL database as the web app.

## Requirements

- Go 1.26+
- PostgreSQL with the `records` table (same schema as the web app)

## Configuration

The TUI reads its database connection string from a config file or
environment variable.

### Config file

Create `~/.config/myrecords/config.toml`:

```toml
database_url = "postgresql://user:password@host:5432/my_record_collection"
discogs_username = "your_discogs_username"
discogs_token = "your_discogs_token"
```

### Environment variable override

`DATABASE_URL` takes precedence over the config file when set:

```bash
export DATABASE_URL=postgresql://user:password@host:5432/my_record_collection
export DISCOGS_USERNAME=your_discogs_username
export DISCOGS_TOKEN=your_discogs_token
```

### Lookup order

1. `DATABASE_URL` / `DISCOGS_USERNAME` / `DISCOGS_TOKEN` environment variables (if set, config file is skipped for that key)
2. `~/.config/myrecords/config.toml` — keys `database_url`, `discogs_username`, `discogs_token`

If neither is found the program exits with an error pointing to the
config file path.

## Quick Start

```bash
cd tui
go build -o records-tui .
./records-tui
```

## Features

### List View

Scrollable table of all records showing artist, album, year, label, and genres.

| Key          | Action            |
|--------------|-------------------|
| `↑` / `k`   | Move up           |
| `↓` / `j`   | Move down         |
| `g` / `Home` | Jump to top       |
| `G` / `End`  | Jump to bottom    |
| `Enter`      | Open detail view  |
| `a`          | Add via Discogs search |
| `M`          | Add manually (no Discogs) |
| `d`          | Delete selected record (press twice to confirm) |
| `/`          | Search            |
| `r`          | Reload from DB    |
| `q`          | Quit              |

### Detail View

Full record info with album art rendered inline. The help bar shows the
active image protocol (e.g. `[image: kitty]`).

| Key              | Action       |
|------------------|--------------|
| `Esc` / `q`      | Back to list |

### Search

Press `/` to start a search, type an artist or album name, then `Enter` to
filter. `Esc` cancels and restores the full list.

### Add Record

Two paths to add a record — both write to the same `records` table.

#### Discogs add (`a`)

Search Discogs and select a release. Fetches full metadata (genres, styles,
vinyl color, size, cover art, catalog number, UPC) and inserts it into the
database. If `DISCOGS_USERNAME` is set, the release is also added to your
Discogs collection and `is_synced_with_discogs` is set to `true`.

Search supports three methods: artist+album, catalog number, and UPC.

| Key | Action |
|-----|--------|
| `1` / `2` / `3` | Switch search method (Artist+Album / Catalog # / UPC) |
| `↑` / `k` | Previous field/result |
| `↓` / `j` / `Tab` | Next field/result |
| `Backspace` | Delete character |
| `Enter` | Search (in fields) or add selected result |
| `Esc` | Cancel and return to list |

#### Manual add (`M`)

Add a record without Discogs. Only artist and album are required; all other
fields are optional.

| Field      | Required | Notes |
|------------|----------|-------|
| Artist     | ✓        | |
| Album      | ✓        | |
| Year       |          | 4-digit integer |
| Label      |          | |
| Catalog #  |          | |
| Genres     |          | Comma-separated (e.g. `Rock, Jazz`) |
| Size       |          | e.g. `12"`, `7"` |
| Color      |          | e.g. `Blue Marble` |

| Key | Action |
|-----|--------|
| `↑` / `k` / `Shift+Tab` | Previous field |
| `↓` / `j` / `Tab` | Next field |
| `Backspace` | Delete character |
| `Enter` | Save record |
| `Esc` | Cancel and return to list |

## Album Art

Cover images are fetched from `cover_image_url` (or `thumbnail_url` as
fallback) and cached in memory for the session.

### Image protocol detection

At startup the TUI checks environment variables to pick the best
rendering method. The first match wins:

| Priority | Protocol | Detection |
|----------|----------|-----------|
| 1 | **Kitty graphics** | `TERM_PROGRAM=kitty` or `ghostty`, `TERM=xterm-kitty` or `xterm-ghostty`, or `KITTY_WINDOW_ID` set |
| 2 | **iTerm2 inline images** | `TERM_PROGRAM=iTerm.app` or `TERM_PROGRAM=WezTerm` |
| 3 | **Sixel** | *(not auto-detected — reserved for future probing)* |
| 4 | **Mosaic** (fallback) | Half-block Unicode characters via `charmbracelet/x/mosaic` |

- **Kitty/Ghostty** use Unicode virtual placements: image data is
  transmitted to terminal memory via `tea.Raw()`, and `U+10EEEE`
  placeholder characters in the view content tell the terminal where to
  render the image. This survives Bubble Tea's cell-buffer redraws.
- **iTerm2/WezTerm** and **Sixel** embed escape sequences directly in
  the view. The detail view renders info *above* the image because
  `lipgloss.JoinHorizontal` would mangle the escape data.
- **Mosaic** renders colored half-block characters that work in any
  terminal with true-color support. The detail view renders art and info
  side-by-side.

## Database

Reads directly from the `records` table using `jackc/pgx`. No ORM, no
migrations — the TUI writes records and deletes existing ones against the
same schema managed by the web app's Drizzle migrations.

## Project Structure

```text
tui/
├── main.go            # Entry point, config loading, DB connection
├── config/
│   └── config.go      # Config file + env var reader
├── db/
│   ├── connect.go     # pgxpool connection (accepts URL parameter)
│   └── records.go     # Record type, List/Search/Delete/Create queries
└── ui/
    ├── model.go       # Bubble Tea model (Init, Update, View)
    ├── styles.go      # Lip Gloss style definitions
    └── image.go       # Image protocol detection + multi-protocol rendering
```

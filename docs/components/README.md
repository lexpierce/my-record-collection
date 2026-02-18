# Component Documentation

React components for the My Record Collection application.

## Component Overview

### Record Display Components
- **RecordCard**: Flip card with width expansion (180px → 250px), 216px back thumbnail
- **RecordShelf**: Grid layout with sort (artist/title/year) and filters (size, shaped/picture disc)

### Search Components
- **SearchBar**: Search Discogs by artist/title, catalog #, or UPC. Accepts `onRecordAdded` callback for no-reload updates.

## Component Architecture

All components follow these patterns:
- **TypeScript**: Fully typed with interfaces for props
- **Sass CSS Modules**: Scoped styles per component (`.module.scss`)
- **Client/Server Split**: Marked with `"use client"` when interactive
- **Verbose Naming**: Descriptive names for clarity
- **Inline Documentation**: JSDoc comments for complex logic

## Styling Approach

- **Warm Color Palette**: CSS custom properties in `styles/_variables.scss`
- **Global Utilities**: Defined in `styles/globals.scss` (flip-card, album-art-size)
- **Responsive Design**: Mobile-first approach
- **Animation**: CSS 3D transforms for interactive elements

## Detailed Component Documentation

Individual component documentation will be added as separate files:

- [x] RecordCard component — see [record-card.md](./record-card.md)
- [ ] RecordShelf component
- [ ] SearchBar component

## Usage Patterns

Components are used in the main page layout (`app/page.tsx`) and follow Next.js App Router conventions.

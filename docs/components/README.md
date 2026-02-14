# Component Documentation

React components for the My Record Collection application.

## Component Overview

### Record Display Components
- **RecordCard**: Flip card displaying album art and detailed information
- **RecordShelf**: Grid layout for displaying the record collection

### Search Components
- **SearchBar**: Search interface for finding records on Discogs

## Component Architecture

All components follow these patterns:
- **TypeScript**: Fully typed with interfaces for props
- **Tailwind CSS**: Utility-first styling
- **Client/Server Split**: Marked with `"use client"` when interactive
- **Verbose Naming**: Descriptive names for clarity
- **Inline Documentation**: JSDoc comments for complex logic

## Styling Approach

- **Warm Color Palette**: Defined in `tailwind.config.ts`
- **Custom Utilities**: Defined in `app/globals.css`
- **Responsive Design**: Mobile-first approach
- **Animation**: CSS 3D transforms for interactive elements

## Detailed Component Documentation

Individual component documentation will be added as separate files:

- [ ] RecordCard component
- [ ] RecordShelf component
- [ ] SearchBar component

## Usage Patterns

Components are used in the main page layout (`app/page.tsx`) and follow Next.js App Router conventions.

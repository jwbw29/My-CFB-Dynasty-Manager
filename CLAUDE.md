# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CFB Dynasty Manager is a College Football Dynasty tracking application built with Next.js and Electron. It allows users to manage multiple dynasties, track teams, players, recruiting, stats, and more across seasons.

## Development Commands

- `npm run dev` - Start development server on port 3001
- `npm run build` - Build the Next.js application
- `npm run electron-dev` - Run in Electron development mode (starts Next.js dev server + Electron)
- `npm run build-electron` - Build for Electron distribution
- `npm run dist` - Create distributable packages for all platforms

## Architecture

### Core Data Flow
- **Dynasty Context** (`src/contexts/DynastyContext.tsx`) - Central state management for dynasty data, Top 25 rankings, and week progression
- **Storage Layer** (`src/utils/storage.ts`) - Handles data persistence with Electron API fallback to localStorage
- **Dynasty System** - Multi-dynasty support with individual save files stored as `dynasty_${id}` in localStorage/Electron store

### Key Components Structure
- **App Router** (`src/app/`) - Next.js 13+ app router structure with page components
- **Components** (`src/components/`) - Reusable React components organized by feature
- **UI Components** (`src/components/ui/`) - Shared UI components using Radix UI and custom styling
- **Hooks** (`src/hooks/`) - Custom React hooks for data management and state
- **Types** (`src/types/`) - TypeScript type definitions organized by domain
- **Utils** (`src/utils/`) - Utility functions for data processing, validation, and business logic

### Data Management
- **Player Data** - Roster management with CSV import/export, player cards, and statistics tracking
- **Recruiting** - Class tracking for recruits and transfers with year-over-year persistence  
- **Schedule/Games** - Week-by-week game tracking that drives progression through the season
- **Rankings** - Top 25 tracking with movement indicators and historical data
- **Awards/Trophies** - Achievement tracking for players and team accomplishments

### Styling & UI
- **Tailwind CSS** - Utility-first CSS framework with custom design system
- **Dark/Light Mode** - Theme switching via next-themes
- **School Colors** - Dynamic theming based on selected team colors
- **Responsive Design** - Mobile-friendly responsive layouts

### Electron Integration
- **Dual Environment** - Runs as both web app and Electron desktop app
- **Static Export** - Next.js configured for static export to work with Electron
- **File System** - OCR capabilities for roster import via image processing
- **Data Persistence** - Electron store with localStorage fallback

### Team Data
- **FBS Teams** (`src/utils/fbsTeams.ts`) - Complete list of FBS teams with logos and conference data
- **Custom Teams** - Support for custom team creation and management
- **Logo System** - Organized team logos in `public/logos/` with conference groupings

## Important Notes

- Dynasty data is auto-saved but manual save is recommended before closing
- CSV import/export functionality for roster management
- OCR support for roster data extraction from game screenshots
- Multi-year data persistence with historical tracking
- Week progression system tied to game schedule completion
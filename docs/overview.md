# Overview

## Purpose

Browser-based tool for parsing MT940 bank statement files and exporting transactions to CSV format. All processing happens client-side (no server uploads).

## Capabilities

- Parse .sta, .mt940, .mt, .txt MT940 files
- Preview parsed statements
- Merge multiple files with deduplication
- Export to CSV with Romanian column headers
- Multi-language UI (i18next)

## Entry Points

- `src/main.tsx` — React app bootstrap
- `index.html` — SPA entry

## Project Shape

Monolith SPA. Single-page React application with no backend.

## Key Directories

- `src/` — Application source
- `src/components/` — React UI components
- `src/stores/` — MobX state (FileStore)
- `src/i18n/` — Translations

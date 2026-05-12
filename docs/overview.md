# Overview

## Purpose

Browser-based tool for parsing, validating, and merging MT940 bank statement files. Supports CSV and MT940 output formats. All processing happens client-side (no server uploads).

## Capabilities

### Input Handling
- Parse .sta, .mt940, .mta, .txt MT940 files (and extensionless)
- ZIP file extraction with safety limits (100 entries, 50MB total, 5MB/file)
- Binary file detection and rejection
- Duplicate file detection via content hash

### Validation
- Structural validation (required MT940 tags with line numbers)
- Balance validation (date, currency, amount, debit/credit)
- Transaction validation (:61: and :86: tag association)
- Arithmetic validation (opening + net transactions = closing)
- Cross-statement continuity validation
- Duplicate detection (files, statements, transactions)

### Merge & Output
- **CSV Export:** Basic and Enhanced (19 columns with formula injection prevention)
- **MT940 Multi-message Merge:** Concatenate statements preserving original structure
- **MT940 Single-statement Merge:** Combine into one statement with balance recalculation
- Merge eligibility analysis with gating (disabled buttons with explanations)
- Confirmation modal for single-statement merge (higher risk operation)

### UI
- Preview parsed statements
- Validation status badges (Valid / Valid with warnings / Invalid)
- Issue list with severity filters
- Statement selection for targeted merge
- Multi-language UI (EN/RO via i18next)

## Entry Points

- `src/main.tsx` — React app bootstrap
- `index.html` — SPA entry

## Project Shape

Monolith SPA. Single-page React application with no backend.

## Key Directories

- `src/` — Application source
- `src/components/` — React UI components (MergePanel, PreviewModal, etc.)
- `src/stores/` — MobX state (FileStore)
- `src/validation/` — Validation logic (structural, arithmetic, continuity, duplicates)
- `src/merge/` — Merge logic (singleStatement, multiMessage)
- `src/utils/` — Utilities (csv, safety, hash)
- `src/i18n/` — Translations (EN/RO)

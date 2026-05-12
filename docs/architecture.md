# Architecture

## System Shape

Single-page application (SPA). No backend — all MT940 parsing happens in-browser via mt940-js.

## Main Modules

- **FileStore** (`src/stores/FileStore.ts`): MobX store managing file state, parsing, validation orchestration, CSV/MT940 conversion
- **Validation** (`src/validation/`): 
  - `index.ts` — Validation orchestration and structural checks
  - `arithmetic.ts` — Balance arithmetic validation
  - `continuity.ts` — Cross-statement continuity checks
  - `duplicates.ts` — Duplicate detection (files, statements, transactions)
  - `merge.ts` — Merge eligibility analysis (analyzeMergeEligibility)
- **Merge** (`src/merge/`):
  - `singleStatement.ts` — Single-statement merge with balance recalculation
  - `multiMessage.ts` — Multi-message concatenation
- **Components**:
  - `MergePanel.tsx` — Merge UI with eligibility gating and action buttons
  - `PreviewModal.tsx` — Statement preview
  - `ConfirmationModal.tsx` — Single-statement merge confirmation
- **Utils** (`src/utils/`):
  - `csv.ts` — CSV export (basic and enhanced with formula injection prevention)
  - `safety.ts` — ZIP safety limits, binary detection
  - `hash.ts` — Content hashing for deduplication

## Data Flow

1. User drops/selects MT940 files (or ZIP archive)
2. Safety checks: size limits, binary detection, extension filtering
3. FileStore.addFile() reads via FileReader, parses with mt940-js
4. Parsed statements stored in MobX observable array
5. Validation runs: structural, balance, arithmetic, continuity, duplicates
6. User selects statements for merge
7. Eligibility analysis determines available merge options
8. Export: CSV (basic/enhanced) or MT940 (multi-message/single-statement)
9. Single-statement merge recalculates closing balance from opening + transactions

## Cross-cutting

- **i18n**: react-i18next for UI translations
- **State**: MobX observables with runInAction for batched updates

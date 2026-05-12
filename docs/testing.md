# Testing

## Framework

Vitest with coverage thresholds configured in `vite.config.ts`.

## Running Tests

```bash
npm run test:run      # Run tests once
npm run test:coverage # Run with coverage report
```

## Coverage Requirements

Branch coverage thresholds (must pass for CI):
- `src/validation/**/*.ts` — 80% minimum
- `src/merge/**/*.ts` — 80% minimum

Current coverage: validation 80.18%, merge 89.47%

## Test Structure

- `src/stores/FileStore.test.ts` — Store functionality tests
- `src/merge/singleStatement.test.ts` — Single-statement merge, balance recalculation
- `src/validation/continuity.test.ts` — Cross-statement continuity
- `src/validation/duplicates.test.ts` — Duplicate detection
- `src/integration/flows.test.ts` — End-to-end flow tests
- `src/components/MergePanel.test.ts` — Component smoke tests

## Test Count

214 tests across validation, merge, store, and integration modules.

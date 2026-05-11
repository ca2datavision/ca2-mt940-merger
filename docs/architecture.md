# Architecture

## System Shape

Single-page application (SPA). No backend — all MT940 parsing happens in-browser via mt940-js.

## Main Modules

- **FileStore** (`src/stores/FileStore.ts`): MobX store managing file state, parsing, CSV conversion
- **App** (`src/App.tsx`): Main UI with file upload, file list, download actions
- **Components**: PreviewModal, CSVPreview, LanguageSelector, ConfirmationModal

## Data Flow

1. User drops/selects MT940 files
2. FileStore.addFile() reads via FileReader, parses with mt940-js
3. Parsed statements stored in MobX observable array
4. convertToCSV() transforms to CSV rows with deduplication
5. Download triggers blob creation and browser download

## Cross-cutting

- **i18n**: react-i18next for UI translations
- **State**: MobX observables with runInAction for batched updates

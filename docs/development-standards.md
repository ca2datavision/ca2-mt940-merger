# Development Standards

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Project Principles](#project-principles)
- [Layer Responsibilities](#layer-responsibilities)
- [Data Contracts](#data-contracts)
- [Error Handling](#error-handling)
- [Configuration Management](#configuration-management)
- [Testing Standards](#testing-standards)
- [Directory Layout](#directory-layout)
- [Design Principles](#design-principles)

---

## Architecture Overview

**Pattern:** Single-Page Application (SPA) with MobX state management

**Components:**
- React UI components (presentation)
- MobX stores (business logic + state)
- mt940-js (file parsing library)

**Technology Stack:**
- TypeScript 5.5
- React 18.3
- MobX 6.12
- Vite 5.4
- Tailwind CSS 3.4

---

## Project Principles

- **Client-side only:** No server-side processing; all data stays in browser
- **Privacy first:** No file uploads to external servers
- **Simple over clever:** Prefer readable code over abstractions
- **Single responsibility:** Each component/store handles one concern

---

## Layer Responsibilities

### Components (`src/components/`)
- UI rendering and user interaction
- Delegate business logic to stores
- Use MobX observer pattern for reactivity

### Stores (`src/stores/`)
- Application state management
- Business logic (parsing, conversion, deduplication)
- Use `runInAction` for batched state updates

### i18n (`src/i18n/`)
- Translation files and configuration
- UI text only; no business logic

---

## Data Contracts

### MT940File Interface
- `id: string` — UUID
- `name: string` — Original filename
- `parsed?: any` — Parsed mt940-js statements

### CSVRow Interface
- Romanian column names matching export format
- All fields are strings

---

## Error Handling

- Use try/catch in async operations
- Display user-friendly error via alert (current)
- Log technical errors to console
- Never expose stack traces to users

---

## Configuration Management

- No environment variables required
- Build-time config via `vite.config.ts`
- Runtime config not applicable (static SPA)

---

## Testing Standards

**Current:** No tests configured

**Target:**
- Unit tests for FileStore methods (parsing, CSV conversion)
- Use Vitest (Vite-native)
- Minimum coverage: 80% for store logic

---

## Directory Layout

```
src/
├── main.tsx          # App entry
├── App.tsx           # Main component
├── index.css         # Tailwind imports
├── components/       # React components
├── stores/           # MobX stores
└── i18n/             # Translations
```

**New features:** Add components to `src/components/`, stores to `src/stores/`

---

## Design Principles

### Naming Conventions
- **Components:** PascalCase (`PreviewModal.tsx`)
- **Stores:** PascalCase with `Store` suffix (`FileStore.ts`)
- **Functions:** camelCase
- **CSS:** Tailwind utility classes

### Code Style
- Use TypeScript strict mode
- Prefer functional components with hooks
- Use `observer` HOC for MobX reactivity
- Use `useCallback` for event handlers passed as props

### Imports
- React imports first
- Third-party imports second
- Local imports last

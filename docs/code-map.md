# Code Map

## Directory Structure

| Path | Purpose |
|------|---------|
| `src/` | Application source |
| `src/main.tsx` | React entry point |
| `src/App.tsx` | Main application component |
| `src/stores/FileStore.ts` | MobX store for file/transaction state |
| `src/components/` | UI components |
| `src/i18n/` | i18next configuration |
| `src/index.css` | Tailwind imports |

## Entry Points

- `index.html` → `src/main.tsx` → `src/App.tsx`

## Configuration Files

| File | Purpose |
|------|---------|
| `vite.config.ts` | Vite build configuration |
| `tsconfig.json` | TypeScript config |
| `tailwind.config.js` | Tailwind CSS config |
| `eslint.config.js` | Linting rules |
| `Dockerfile` | Production container |
| `nginx.conf` | Static file serving |

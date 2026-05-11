# Setup

## Prerequisites

- Node.js (LTS recommended)
- npm

## Install

```bash
npm install
```

## Run Development

```bash
npm run dev
```

## Build Production

```bash
npm run build
```

## Run Production (Docker)

```bash
docker build -t ca2-mt940-merger .
docker run -p 80:80 ca2-mt940-merger
```

## Environment Variables

None required — client-side only application.

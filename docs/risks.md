# Risks

## Known Issues

- No test coverage
- No error boundary for React errors
- Alert-based error handling (user-unfriendly)

## Security

- Client-side only — no data leaves browser
- No secrets or credentials

## Fragile Areas

- mt940-js parsing depends on file format compliance
- Transaction deduplication based on composite key may miss edge cases

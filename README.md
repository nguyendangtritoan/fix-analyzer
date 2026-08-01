# FIX Analyzer

FIX Analyzer is a privacy-first React application for inspecting individual FIX messages, comparing messages, and exploring complete FIX log lifecycles. Everything runs inside the browser tab; the application has no backend and does not transmit imported messages.

## Features

### Message Analyzer

- Parses SOH, `^A`, pipe-delimited, bracketed, columnar, and best-effort space-separated FIX text.
- Shows a dictionary-enriched, grouped view of one message.
- Compares two or more messages with aligned fields and repeating groups.
- Uses bundled FIX 4.0–4.4 QuickFIX dictionaries or a locally selected custom XML dictionary.
- Copies a message as pipe, SOH, bracketed, columnar, or JSON text.

### Visual Board

Open `#/visual-board` or use the top navigation. The board accepts pasted text and uncompressed `.log`, `.txt`, and `.fix` files up to 100 MB.

- Correlates messages into detected RFQ, order, market-data, and session lifecycles.
- Uses exact business identifiers such as `ClOrdID(11)`, `OrigClOrdID(41)`, `OrderID(37)`, `QuoteReqID(131)`, `QuoteID(117)`, and session-scoped `MDReqID(262)`.
- Shows virtualized chronological flows, direction, message type, common IDs, capture lag, and matched `D → 8` round-trip latency.
- Opens any row as a dictionary-enriched message drawer while preserving duplicate fields and the original log line.
- Projects any numeric FIX field onto the sequence board.
- Summarizes message types, directions, sessions, groups, latency, latest quote/market-data prices, orders, executions, rejects, sequence gaps, and envelope checks.
- Reports skipped input lines rather than silently treating them as FIX messages.

Compressed files, including `.bz2`, are intentionally unsupported. Decompress confidential logs with a trusted local operating-system tool, then select the resulting plain-text file. No decompression package is included.

## Privacy and local-only guarantees

Imported content exists only in the current browser tab's memory:

- Log parsing and correlation run in a Web Worker.
- The worker retains the source text for on-demand details; the main UI receives compact records and source offsets rather than every raw line.
- Clearing the board, closing/reloading the tab, or terminating the worker releases the in-memory dataset.
- The application does not use `fetch`, XHR, WebSockets, EventSource, beacons, analytics, telemetry, remote fonts, or CDN assets.
- Standard FIX XML dictionaries are embedded into the JavaScript bundle at build time, so selecting a dictionary does not cause a runtime request.
- Production builds inject a Content Security Policy with `connect-src 'none'` and no reporting endpoint.

The static application files still have to be served to the browser. After the page has loaded, the CSP prevents the application from opening network connections. Browser extensions and the hosting platform are outside the application's control.

## Development

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm test
npm run lint
npm run build
npm run verify:security
npm run preview
```

`npm test` uses Node's built-in test runner; no test framework dependency is required. `verify:security` scans application source for browser network APIs, checks runtime dependencies against the allowlist, and verifies the production CSP configuration.

## Architecture

```text
src/
├── app/                         # Hash route and shared application shell
├── context/                     # Shared FIX dictionary provider
├── pages/
│   ├── MessageAnalyzerPage.jsx  # Existing parse/diff workflow
│   └── VisualBoardPage.jsx      # Log-analysis dashboard
├── features/visualBoard/
│   ├── logAnalysis.js           # Pure parsing, grouping, latency, stats, diagnostics
│   ├── visualBoard.worker.js    # File/text ownership and on-demand detail queries
│   └── *.jsx                    # Importer, board, drawer, and analysis panels
├── components/                  # Existing message-analysis UI
├── utils/                       # FIX and QuickFIX XML parsers/formatters
└── constants/                   # Fallback FIX data and bundled dictionary metadata
```

Routing is a small native hash router, so the static GitHub Pages deployment does not require server rewrites or an additional routing package. The Vite base path remains `/fix-analyzer/`.

## Analysis semantics

- Capture lag is `log-prefix timestamp − SendingTime(52)` and is kept separate from request/response latency.
- Round-trip latency currently pairs `New Order Single (D)` with the matching `Execution Report (8)` by `ClOrdID(11)` within its session context.
- Correlation intentionally ignores broad fields such as symbol or currency to avoid combining unrelated lifecycles.
- `MDReqID(262)` is session-scoped to prevent identical request IDs on separate sessions from merging.
- FIX `BodyLength(9)` and `CheckSum(10)` are validated only when the source preserves real SOH framing; otherwise the message remains usable without a misleading failure.
- Parsing is tolerant by design. A malformed or vendor-specific line may be partially parsed or reported as skipped.

## Deployment

The existing GitHub Pages workflow builds the static application from `master`. The production bundle includes the strict local-only CSP. The embedded XML dictionaries make the main bundle larger than a typical small React application; this is an intentional tradeoff to avoid runtime dictionary requests.

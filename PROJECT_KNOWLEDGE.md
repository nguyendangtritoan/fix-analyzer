# FIX Analyzer - Project Knowledge Base

## Maintenance Contract
This file is the persistent project memory for code changes in this repository.

When any code is added, removed, or modified:
1. Update `Last Updated`.
2. Add or update relevant sections below (architecture, behavior, risks, workflows).
3. Append one entry to `Change Log` with files touched and verification performed.

Last Updated: 2026-08-01

## Project Purpose
`fix-analyzer` is a privacy-first, static React application with two browser-only workflows:
- Message Analyzer parses, enriches, and compares individual FIX messages.
- Visual Board analyzes a pasted or plain-text FIX log as correlated lifecycles, sequence flows, latency, prices, orders, and diagnostics.

No backend exists. Confidential imported content must remain in the current browser tab and must never be transmitted or persisted by application code.

## Stack and Runtime
- Frontend: React 19, Vite 7, Tailwind CSS 3, Lucide icons.
- Routing: native hash routing in `src/app/useHashRoute.js`; no router dependency.
- Worker: native ES module Web Worker for Visual Board parsing and retained source access.
- Tests: Node's built-in `node:test`; no test-framework dependency.
- Build output: static site (`dist/`) with base path `/fix-analyzer/`.
- Deployment: GitHub Pages workflow in `.github/workflows/deploy.yml`.

## Repository Map (High Signal)
- `src/App.jsx`: mounts the shared dictionary provider and app shell.
- `src/app/AppShell.jsx`: header, route navigation, local-only indicator, shared dictionary controls.
- `src/app/useHashRoute.js`: maps the root route to Message Analyzer and `#/visual-board` to Visual Board.
- `src/context/FixDictionaryProvider.jsx`: owns standard/custom dictionary state for both routes.
- `src/pages/MessageAnalyzerPage.jsx`: original multi-message parse/diff workflow.
- `src/pages/VisualBoardPage.jsx`: dashboard orchestration and result filters/tabs.
- `src/features/visualBoard/logAnalysis.js`: pure log parsing, exact-ID correlation, grouping, statistics, latency, price/order projections, and diagnostics.
- `src/features/visualBoard/visualBoard.worker.js`: owns selected file/source text and serves compact results, message details, and arbitrary-field queries.
- `src/features/visualBoard/useVisualBoardWorker.js`: worker lifecycle, cancellation, input validation, and 100 MB safety limit.
- `src/features/visualBoard/*.jsx`: importer, group explorer, virtual sequence board, message drawer, and analysis panels.
- `src/utils/parsers.js`: individual-message parsing and QuickFIX XML dictionary parsing/grouping.
- `src/components/features/SingleView.jsx`: dictionary-enriched grouped message rendering, reused by the drawer.
- `src/constants/dictionarySources.js`: metadata for FIX 4.0–4.4 bundled dictionaries.
- `vite.config.js`: embeds dictionary XML at build time and injects the production CSP.
- `scripts/verify-local-only.mjs`: checks forbidden network APIs, runtime dependencies, and CSP settings.

## Routes and Shared State
- Empty hash/root: Message Analyzer.
- `#/visual-board`: Visual Board.
- Navigation is hash based so static hosting needs no rewrite rules.
- FIX 4.0–4.4 XML is converted to a virtual JavaScript module by Vite, eliminating runtime dictionary fetches.
- Auto-detection reads `BeginString(8)` from current input/results. Manual selection and local custom XML upload remain available.
- Custom dictionaries exist only in memory and are shared between both routes for the lifetime of the tab.

## Message Analyzer Behavior
`parseFixMessage(raw)` heuristic order:
1. Bracketed format detection (`<35> MsgType = D`).
2. Columnar row detection.
3. Delimited parsing after normalizing pipe and `^A` to SOH.
4. Best-effort regex for space-separated `tag=value` tokens.

`parseQuickFixXml(xml)` merges definitions into defaults and produces tags, enums, field types, message names, and recursive repeating-group schemas. Invalid XML produces a user-facing error.

`groupify` selects a `MsgType(35)` schema, renders nested repeating groups, and retains the previous inference behavior for dictionary-missing count/member tags. `flattenForDiff` aligns grouped trees across all populated inputs. Matching tags can be highlighted with multiple colors and visual indentation can be toggled independently of grouping.

## Visual Board Data Flow
1. `ImportPanel` accepts pasted text or uncompressed `.log`, `.txt`, and `.fix` files up to 100 MB.
2. Compressed extensions (`bz2`, `gz`, `zip`, `7z`, `rar`, `xz`, `zst`) are rejected with instructions to decompress locally. No decompression dependency is included.
3. The Web Worker reads the `File`, parses log-prefix metadata and FIX pairs, and keeps one source string plus message byte/character offsets.
4. The main thread receives compact records without raw log lines.
5. Selecting a message asks the worker for the original line and duplicate-preserving pairs on demand.
6. Arbitrary-field projection asks the worker to scan the retained source for one numeric tag.
7. Clear, cancel, route teardown, reload, or tab close terminates the worker and releases its dataset.

## Visual Board Parsing and Correlation
- Prefix parsing extracts timestamp, incoming/outgoing direction, and common `sender->target:qualifier` session labels.
- SOH, `^A`, pipe, and best-effort whitespace FIX bodies are supported.
- Duplicate FIX fields are preserved in ordered detail pairs; an index also exposes convenient first values.
- Correlation uses disjoint-set graph merging with exact IDs only:
  - `ClOrdID(11)` / `OrigClOrdID(41)`
  - `OrderID(37)`
  - `QuoteReqID(131)`
  - `QuoteID(117)`
  - session-scoped `MDReqID(262)`
- Bridge messages can join RFQ → Quote → Order → Execution lifecycles across sessions.
- Broad attributes such as symbol, currency, or timestamps never merge groups.
- Detected group types are `rfq-order`, `rfq`, `order`, `market-data`, and `session`.

## Latency, Tables, and Diagnostics
- Capture lag is `log prefix timestamp - SendingTime(52)` and is not presented as request/response latency.
- Matched round-trip latency pairs `New Order Single (D)` with `Execution Report (8)` by exact `ClOrdID(11)` in session context.
- Prices table uses the latest Quote (`S`) or Market Data Snapshot (`W`) per source/symbol/request identity.
- Orders table enriches orders with matching executions, status, IDs, price/quantity, and round-trip latency.
- Diagnostics include skipped lines, sequence gaps/resets, rejects, unmatched orders, capture-lag anomalies, and FIX envelope mismatches.
- `BodyLength(9)` and `CheckSum(10)` are validated only when real SOH framing is available.
- The sequence board uses fixed-row windowing implemented in project code; no virtualization package was added.
- The detected-groups explorer renders groups in pages, defaults to 25 rows, and supports 10, 25, 50, or 100 groups per page. Search and type filters reset it to the first page.
- Flow filters include an inclusive UTC time-of-day range with second/millisecond precision, open-ended bounds, and overnight ranges when the start is later than the end.

## Local-Only Security Contract
- Application source must not call `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, or `navigator.sendBeacon`.
- No analytics, telemetry, remote fonts/assets, CDN resources, or CSP reporting endpoints.
- Production CSP includes `connect-src 'none'`, `worker-src 'self' blob:`, `object-src 'none'`, `form-action 'none'`, and `frame-src 'none'`.
- `npm run verify:security` enforces the source/API, dependency, and CSP parts of this contract.
- Imported data is not placed in URL/hash, localStorage, sessionStorage, IndexedDB, cookies, or service-worker caches.
- The static host and browser extensions are outside the app's trust boundary; README describes this limitation explicitly.

## Dev and Operations
Common commands:
- `npm install`
- `npm run dev`
- `npm test`
- `npm run lint`
- `npm run build`
- `npm run verify:security`
- `npm run preview`

The standard pre-handoff suite is `npm test`, `npm run lint`, `npm run build`, `npm run verify:security`, and `git diff --check`.

## Current Baseline (2026-08-01)
- Fourteen Visual Board parser/correlation, pagination, and time-range tests pass.
- ESLint passes.
- Production build passes and includes the strict CSP.
- Local-only security verification passes.
- Browser QA covers import example, all result tabs, the detail/raw drawer, arbitrary field projection, and clear-data behavior.
- The embedded FIX XML makes the main bundle exceed Vite's default 500 kB warning threshold; this is an intentional no-runtime-fetch tradeoff.

## Known Risks and Gotchas
- Parser behavior is intentionally tolerant; malformed or vendor-specific text can yield partial messages or skipped-line diagnostics.
- Exact-ID correlation avoids false positives but cannot infer a lifecycle when the producer omits all supported bridge identifiers.
- `MDReqID(262)` is session-scoped; incorrect/missing session prefixes reduce correlation quality.
- Round-trip matching currently covers `D → 8`, not every possible FIX request/response pair.
- A 100 MB input can still consume several times that amount in transient browser/worker memory; keep compact records free of raw lines and avoid unnecessary source copies.
- Diff alignment remains key-path based, so complex repeating-group reorder scenarios may be noisy.
- `src/App.css` is unused Vite starter CSS.

## Change Log
### 2026-08-01 - Remove Visual Board Page Header
- Files: `src/pages/VisualBoardPage.jsx`, `PROJECT_KNOWLEDGE.md`
- Summary: Removed the Visual Board page header, including its title, eyebrow, explanatory subtitle, and duplicate browser-memory badge.
- Behavior Impact: The import panel or loaded-dataset toolbar is now the first page content. The destructive Clear data action lives beside the loaded dataset's analysis tabs, visually tying it to the data it clears and eliminating empty header space.
- Verification: `npm test` passed 14 tests; `npm run lint`, `npm run build`, `npm run verify:security`, and `git diff --check` passed; the running local app accepted the update through HMR.

### 2026-08-01 - Filter Flow by UTC Time Range
- Files: `src/pages/VisualBoardPage.jsx`, `src/features/visualBoard/BoardToolbar.jsx`, `src/features/visualBoard/timeRange.js`, `src/features/visualBoard/timeRange.test.js`, `PROJECT_KNOWLEDGE.md`
- Summary: Added inclusive From/To UTC time-of-day controls to the Flow toolbar and pure range matching with seconds, optional milliseconds, open bounds, and midnight wrapping.
- Behavior Impact: Users can narrow the visible message sequence to times such as `08:09:10` through `08:09:15`; records without timestamps are excluded while a time filter is active.
- Verification: `npm test` passed 14 tests; `npm run lint`, `npm run build`, `npm run verify:security`, and `git diff --check` passed. Aggregate-only analysis of the supplied local log reduced 57,260 messages to 25 for the inclusive `08:09:10`–`08:09:15` UTC range.

### 2026-08-01 - Paginate Detected Groups
- Files: `src/features/visualBoard/GroupExplorer.jsx`, `src/features/visualBoard/pagination.js`, `src/features/visualBoard/pagination.test.js`, `PROJECT_KNOWLEDGE.md`
- Summary: Added bounded pagination to the detected-groups explorer with previous/next navigation, visible-range metadata, and selectable 10/25/50/100 page sizes.
- Behavior Impact: Large correlated logs no longer render every group card at once. Search, group-type, dataset, and page-size changes return the explorer to page one while preserving full-dataset filtering.
- Verification: `npm test` passed 10 tests; `npm run lint`, `npm run build`, `npm run verify:security`, and `git diff --check` passed. Aggregate-only analysis of the supplied local 31.7 MB log found 57,260 messages and 185 groups. Browser QA confirmed the 25-row default, next-page navigation, the 100-row option, filter reset to page one, and no console errors.

### 2026-08-01 - Add Local-Only Visual Board
- Files: `README.md`, `index.html`, `package.json`, `vite.config.js`, `scripts/verify-local-only.mjs`, `src/App.jsx`, `src/app/*`, `src/context/*`, `src/constants/dictionarySources.js`, `src/pages/*`, `src/features/visualBoard/*`, `src/utils/parsers.js`, `PROJECT_KNOWLEDGE.md`
- Summary: Added the Visual Board route, shared bundled dictionary state, worker-based log analysis, exact-ID lifecycle grouping, sequence/latency/price/order/diagnostic views, on-demand message detail, tests, and a production local-only CSP. Preserved the existing Message Analyzer as the root route.
- Behavior Impact: Users can analyze plain FIX logs entirely in the browser, inspect detected groups and pretty messages, project arbitrary tags, distinguish capture lag from matched order latency, and clear all in-memory data. Compressed inputs are explicitly rejected; no external decompression or UI package was added.
- Verification: `npm test` passed 8 tests; `npm run lint` passed; `npm run build` passed; `npm run verify:security` passed; in-app browser QA passed example import, Overview/Flow/Latency/Quotes & Prices/Orders/Diagnostics tabs, message pretty/raw drawer, `55` field projection, and data clearing; production preview/CSP and final diff checks completed before handoff.

### 2026-05-03 - Infer Undefined Repeating Groups
- Files: `PLAN.md`, `src/utils/parsers.js`, `PROJECT_KNOWLEDGE.md`
- Summary: Added dynamic group-count inference for repeated field-tag patterns when the active dictionary does not define the group count tag.
- Behavior Impact: A message can now render `78=4` as a repeating group with four `79/467/80/7152` allocation instances even when `NoAllocs<78>` is missing from the active dictionary.
- Verification: Targeted local parser harness confirmed `78` is inferred as four allocation instances with `79`, `467`, `80`, and `7152`; `npm run lint` passed; `npm run build` passed.

### 2026-05-03 - Infer Repeated Unknown Group Fields
- Files: `PLAN.md`, `src/utils/parsers.js`, `PROJECT_KNOWLEDGE.md`
- Summary: Added a per-group inference pass so repeated dictionary-missing tags can remain inside repeating-group instances.
- Behavior Impact: Custom tags such as `2893` in `NoLegs` and `7152` in `NoAllocs` are grouped when they repeat alongside the group instances, instead of breaking the group at the first unknown tag.
- Verification: Targeted local parser harness confirmed `78` instances include `7152` and all four `555` leg instances include `2893`; `npm run lint` passed; `npm run build` passed; Vite dev server was still running with HMR and `curl -I http://127.0.0.1:5173/fix-analyzer/` returned `200 OK`.

### 2026-05-02 - Conditional Message Input Grid
- Files: `src/App.jsx`, `PROJECT_KNOWLEDGE.md`
- Summary: Made the message input grid use the original two-column layout while only two message slots exist, switching to the expanded multi-column layout only after users add more slots.
- Behavior Impact: The default two-message view is full width as before; `+ Message` creates additional input space for multi-message comparison.
- Verification: `npm run lint` passed; `npm run build` passed.

### 2026-05-02 - Multi-Message Comparison
- Files: `PLAN.md`, `src/App.jsx`, `src/components/features/DiffView.jsx`, `PROJECT_KNOWLEDGE.md`
- Summary: Replaced fixed two-message input/diff state with a dynamic message list and updated `DiffView` to render one value column per populated message.
- Behavior Impact: Users can add more message inputs, compare any two or more populated messages side by side, and keep existing group indentation plus matching-tag highlight behavior in the multi-message diff.
- Verification: Static implementation review completed; `npm run lint` passed; `npm run build` passed; Vite dev server was still running with HMR and `curl -I http://127.0.0.1:5173/fix-analyzer/` returned `200 OK`.

### 2026-05-02 - Multi-Color Matching Tag Highlight
- Files: `PLAN.md`, `src/App.jsx`, `src/components/features/SingleView.jsx`, `src/components/features/DiffView.jsx`, `src/utils/highlightUtils.js`, `PROJECT_KNOWLEDGE.md`
- Summary: Changed matching-tag highlight from a single active tag to multiple active tag/color assignments.
- Behavior Impact: Clicking an unhighlighted field adds that tag to the active highlights without clearing existing highlights; clicking a highlighted tag removes only that tag. New tags get distinct colors while palette colors are available.
- Verification: Static implementation review completed; `npm run lint` passed; `npm run build` passed; Vite dev server was still running with HMR and `curl -I http://127.0.0.1:5173/fix-analyzer/` returned `200 OK`.

### 2026-05-02 - Matching Tag Highlight
- Files: `PLAN.md`, `src/App.jsx`, `src/components/features/SingleView.jsx`, `src/components/features/DiffView.jsx`, `PROJECT_KNOWLEDGE.md`
- Summary: Added shared highlighted-tag state and row click handlers so matching tags are highlighted across single and diff result views.
- Behavior Impact: Clicking a field row selects that tag and highlights matching visible fields; clicking the same highlighted tag clears the highlight. Group expansion in single view is now controlled by the chevron button so row clicks can highlight group tags.
- Verification: `npm run lint` passed; `npm run build` passed; Vite dev server was still running with HMR and `curl -I http://127.0.0.1:5173/fix-analyzer/` returned `200 OK`. Browser click automation was not run because Playwright is not installed in this project.

### 2026-05-02 - Group Indentation Toggle
- Files: `PLAN.md`, `src/App.jsx`, `src/components/features/SingleView.jsx`, `src/components/features/DiffView.jsx`, `src/utils/fixUtils.js`, `src/utils/parsers.js`, `PROJECT_KNOWLEDGE.md`
- Summary: Added a results toolbar toggle to enable or disable group indentation in single and diff views; cleaned existing lint issues needed for clean verification.
- Behavior Impact: Grouped rendering still defaults to indented; users can turn off visual indentation while keeping group parsing, expansion, instance labels, and diff alignment intact.
- Verification: `npm run lint` passed; `npm run build` passed; Vite dev server started and `curl -I http://127.0.0.1:5173/fix-analyzer/` returned `200 OK`.

### 2026-04-17 - Initial Project Knowledge Baseline
- Files: `PROJECT_KNOWLEDGE.md`
- Summary: Added persistent project knowledge, architecture/runtime notes, parser behavior, operational baseline, and maintenance protocol.
- Verification: Repository inspected; `npm run build` passed; `npm run lint` run and documented current failures.

## Change Log Entry Template
Use this format for future updates:

### YYYY-MM-DD - <Short Title>
- Files: `<file1>`, `<file2>`
- Summary: <what changed and why>
- Behavior Impact: <user-visible or internal behavior change>
- Verification: <commands run and outcomes>
- Follow-ups: <optional unresolved items>

# FIX Analyzer - Project Knowledge Base

## Maintenance Contract
This file is the persistent project memory for code changes in this repository.

When any code is added, removed, or modified:
1. Update `Last Updated`.
2. Add or update relevant sections below (architecture, behavior, risks, workflows).
3. Append one entry to `Change Log` with files touched and verification performed.

Last Updated: 2026-08-04

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
- `src/features/visualBoard/visualBoard.worker.js`: owns selected file/source text and serves compact results, message details, and multi-field projection queries.
- `src/features/visualBoard/datasetExport.js`: produces whole-paste or selected-group clipboard text in raw, normalized FIX, readable, and JSON formats while enforcing file-copy scope.
- `src/features/visualBoard/datasetImport.js`: recognizes copied pretty/bracketed and duplicate-preserving JSON text and reconstructs ordered FIX messages for pasted round trips.
- `src/features/visualBoard/fieldProjection.js`: normalizes requested projection tags and preserves every ordered occurrence of repeated tags.
- `src/features/visualBoard/useVisualBoardWorker.js`: worker lifecycle, cancellation, input validation, and 100 MB safety limit.
- `src/features/visualBoard/*.jsx`: importer, group explorer, virtual sequence board, message drawer, and analysis panels.
- `src/utils/parsers.js`: individual-message parsing and QuickFIX XML dictionary parsing/grouping.
- `src/utils/fixDelimiter.js`: shared automatic FIX field-delimiter detection and lossless tokenization for both routes.
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
3. Header-guided automatic delimiter detection, with repeated-boundary inference for headerless inputs and a best-effort whitespace fallback.

`parseQuickFixXml(xml)` merges definitions into defaults and produces tags, enums, field types, message names, and recursive repeating-group schemas. Invalid XML produces a user-facing error.

`groupify` selects a `MsgType(35)` schema, renders nested repeating groups, and retains the previous inference behavior for dictionary-missing count/member tags. `flattenForDiff` aligns grouped trees across all populated inputs. Matching tags can be highlighted with multiple colors and visual indentation can be toggled independently of grouping.

## Visual Board Data Flow
1. `ImportPanel` accepts pasted text or uncompressed `.log`, `.txt`, and `.fix` files up to 100 MB.
2. Compressed extensions (`bz2`, `gz`, `zip`, `7z`, `rar`, `xz`, `zst`) are rejected with instructions to decompress locally. No decompression dependency is included.
3. The Web Worker reads the `File` or pasted text, parses log-prefix metadata and FIX pairs, and keeps the analysis source plus message character offsets. A pasted pretty/JSON export is normalized into one FIX message per line while its exact original paste is retained for raw copy-all.
4. The main thread receives compact records without raw log lines.
5. Selecting a message asks the worker for the original line and duplicate-preserving pairs on demand.
6. Field projection asks the worker to scan the retained source once for up to six numeric tags and return every ordered occurrence of each tag.
7. Copy asks the worker to format either the complete pasted source or the selected detected group's message offsets. File sources require a selected group and cannot be copied wholesale. Every generated format can be pasted back: raw, pipe, and SOH parse directly; pretty/bracketed and JSON are reconstructed locally with field order and duplicates preserved.
8. Clear, cancel, route teardown, reload, or tab close terminates the worker and releases its dataset.

## Visual Board Parsing and Correlation
- Prefix parsing extracts timestamp, incoming/outgoing direction, and common `sender->target:qualifier` session labels.
- A consistent delimiter is inferred per FIX message from the `BeginString(8)` → `BodyLength(9)` boundary. Arbitrary single- or multi-character separators are supported, including control characters, punctuation, text/Unicode markers, and numeric markers. Headerless input uses repeated-boundary inference; whitespace-separated fields retain a best-effort fallback.
- Tokenization only treats the detected delimiter as a boundary when it is immediately followed by a numeric `tag=`, preserving spaces, equals signs, and delimiter-like punctuation inside field values.
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
- The sequence board uses fixed-row windowing implemented in project code; no virtualization package was added. Scroll events update React only when the overscanned start/end row window changes, and rows use static absolute positions instead of transformed compositor layers.
- Long message tables and the sequence board avoid hover-state repainting inside moving scroll surfaces. Their scroll regions use layout/paint containment, and message-table rows remain statically positioned so browser compositing work stays bounded.
- The sequence board can project up to six FIX tags as separate compact columns. Repeated tags from repeating groups remain in message order within their column, and the board scrolls horizontally when the selected fields exceed the viewport.
- Flow full-screen mode covers the app chrome and group explorer, keeps the active toolbar/filters and projected fields, lets the sequence board consume the remaining viewport, and preserves message-drawer behavior above the focused workspace.
- The loaded desktop dashboard uses a viewport-bounded two-column grid beneath the sticky app header. The removed source-summary card no longer consumes vertical space; group cards and active right-side analysis content scroll independently while search, pagination, tabs, Flow filters, analysis headings, and page position remain fixed. Quotes & Prices and Orders scroll inside their tables; Diagnostics keeps its summary cards and section headings visible while the detail lists scroll.
- Flow renders stable local/counterparty positions: outgoing messages point right (`local → remote`) and incoming messages point left (`local ← remote`) instead of swapping endpoints while always pointing right.
- The detected-groups explorer renders groups in pages, defaults to 25 rows, and supports 10, 25, 50, or 100 groups per page. Search and type filters reset it to the first page.
- Flow filters include an inclusive UTC time-of-day range with second/millisecond precision, open-ended bounds, and overnight ranges when the start is later than the end.
- The loaded-dataset toolbar copies an entire pasted dataset or one selected detected group as exact original text, normalized pipe or SOH FIX, readable bracketed fields, or duplicate-preserving JSON. For uploaded files, the control stays disabled until a detected group is selected and copies only that group's original source lines or parsed messages.

## Local-Only Security Contract
- Application source must not call `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, or `navigator.sendBeacon`.
- No analytics, telemetry, remote fonts/assets, CDN resources, or CSP reporting endpoints.
- Production CSP includes `connect-src 'none'`, `worker-src 'self' blob:`, `object-src 'none'`, `form-action 'none'`, and `frame-src 'none'`.
- `npm run verify:security` enforces the source/API, dependency, and CSP parts of this contract.
- Imported data is not placed in URL/hash, localStorage, sessionStorage, IndexedDB, cookies, or service-worker caches.
- Clipboard output is created only after the user explicitly chooses a format; it remains a browser-local action and is never sent by application code.
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

## Current Baseline (2026-08-04)
- Forty-nine parser/correlation, delimiter, pagination, time-range, field-projection, dataset-export, copied-format import, and message-direction tests pass.
- ESLint passes.
- Production build passes and includes the strict CSP.
- Local-only security verification passes.
- Browser QA covers import example, all result tabs, the detail/raw drawer, field projection, and clear-data behavior.
- The embedded FIX XML makes the main bundle exceed Vite's default 500 kB warning threshold; this is an intentional no-runtime-fetch tradeoff.

## Known Risks and Gotchas
- Parser behavior is intentionally tolerant; malformed or vendor-specific text can yield partial messages or skipped-line diagnostics.
- Exact-ID correlation avoids false positives but cannot infer a lifecycle when the producer omits all supported bridge identifiers.
- `MDReqID(262)` is session-scoped; incorrect/missing session prefixes reduce correlation quality.
- Round-trip matching currently covers `D → 8`, not every possible FIX request/response pair.
- A 100 MB input can still consume several times that amount in transient browser/worker memory; keep compact records free of raw lines and avoid unnecessary source copies.
- Diff alignment remains key-path based, so complex repeating-group reorder scenarios may be noisy.
- `src/App.css` is unused Vite starter CSS.
- Browser compositor flicker has no meaningful Node-only regression seam; retain the long repeating-group browser stress check when changing drawer/table/scroll CSS.

## Change Log
### 2026-08-04 - Align Analysis Scrolling and Flow Directions
- Files: `src/pages/VisualBoardPage.jsx`, `src/features/visualBoard/DataTable.jsx`, `src/features/visualBoard/PricesPanel.jsx`, `src/features/visualBoard/OrdersPanel.jsx`, `src/features/visualBoard/DiagnosticsPanel.jsx`, `src/features/visualBoard/SequenceBoard.jsx`, `src/features/visualBoard/messageDirection.js`, `src/features/visualBoard/messageDirection.test.js`, `README.md`, `PROJECT_KNOWLEDGE.md`
- Summary: Made Quotes & Prices, Orders, and Diagnostics own their bounded data scrollers like Flow, and gave incoming and outgoing message paths opposite arrow directions with stable endpoint positions.
- Behavior Impact: Table and diagnostic headings remain visible while their rows or detail lists scroll inside the viewport-fitted right frame. Flow now displays outgoing messages as `local → remote` and incoming messages as `local ← remote`; unknown directions preserve parsed order. The new scroll regions are keyboard focusable and visibly focused.
- Verification: `npm test` passed 49 tests; `npm run lint`, `npm run build`, `npm run verify:security`, and `git diff --check` passed. Local browser QA at 1280×720 confirmed 467px inner scrollers for Quotes and Orders and a 271px actionable Diagnostics scroller; moving each inner scroller left its heading and page scroll position unchanged. Flow rendered both left- and right-pointing arrows with no document scrolling.

### 2026-08-04 - Fit Loaded Visual Board to the Viewport
- Files: `src/pages/VisualBoardPage.jsx`, `src/features/visualBoard/GroupExplorer.jsx`, `src/features/visualBoard/SequenceBoard.jsx`, `README.md`, `PROJECT_KNOWLEDGE.md`, `design-qa.md`
- Summary: Removed the loaded-file summary card and converted the desktop result workspace into a viewport-height two-column layout with independently scrolling content regions.
- Behavior Impact: Users no longer scroll the whole page to reach detected groups or Flow messages. Group search/all/ungrouped controls and pagination stay fixed around a scrollable card list; the right tab bar and Flow controls stay fixed above a sequence board that fills and scrolls within the remaining height. Other analysis tabs scroll inside the right frame when needed, while smaller layouts retain normal document flow.
- Verification: `npm test` passed 46 tests; `npm run lint`, `npm run build`, `npm run verify:security`, and `git diff --check` passed. Local browser QA at a `2048 x 1117` CSS viewport with the supplied 57,260-message log measured an exact `1117px` document height, independently scrolled the group list to `700px` and Flow board to `900px` with page scroll fixed at zero, and found no console errors. `design-qa.md` records a passed visual comparison.

### 2026-08-04 - Re-import Copied Visual Board Formats
- Files: `src/features/visualBoard/datasetImport.js`, `src/features/visualBoard/datasetImport.test.js`, `src/features/visualBoard/visualBoard.worker.js`, `src/features/visualBoard/ImportPanel.jsx`, `README.md`, `PROJECT_KNOWLEDGE.md`
- Summary: Added worker-side recognition for content produced by the dataset copy menu so copied output can be pasted back into Visual Board and analyzed again.
- Behavior Impact: Raw, pipe, and SOH copies continue through the normal delimiter parser unchanged. Pretty/bracketed and duplicate-preserving JSON copies are reconstructed as ordered FIX messages, including duplicate tags. The worker retains the exact pasted source separately so `Original / raw` copy-all still returns precisely what the user pasted.
- Verification: `npm test` passed 46 tests, including pretty/JSON round trips and malformed-input fallbacks; `npm run lint`, `npm run build`, `npm run verify:security`, and `git diff --check` passed.

### 2026-08-04 - Copy Pasted Datasets and Selected File Groups
- Files: `src/pages/VisualBoardPage.jsx`, `src/features/visualBoard/DatasetCopyMenu.jsx`, `src/features/visualBoard/datasetExport.js`, `src/features/visualBoard/datasetExport.test.js`, `src/features/visualBoard/logAnalysis.js`, `src/features/visualBoard/useVisualBoardWorker.js`, `src/features/visualBoard/visualBoard.worker.js`, `src/utils/fixUtils.js`, `README.md`, `PROJECT_KNOWLEDGE.md`
- Summary: Added on-demand multi-message clipboard export to the loaded Visual Board toolbar, with separate source-kind and selected-group enforcement in the UI and worker.
- Behavior Impact: Pasted input can be copied in full or by selected detected group; uploaded files can copy only a selected detected group. Users can choose exact original/raw, normalized pipe, SOH, readable bracketed, or duplicate-preserving JSON output. Raw file-group export retains the original selected log lines, including their prefixes.
- Verification: `npm test` passed 41 tests; `npm run lint`, `npm run build`, `npm run verify:security`, and `git diff --check` passed. Local browser QA confirmed pasted input exposes enabled whole-dataset formats, file-wide copy is disabled, selecting a detected file group enables `Copy group`, and original/raw group copy reports success.

### 2026-08-04 - Auto-Detect FIX Field Delimiters
- Files: `src/utils/fixDelimiter.js`, `src/utils/fixDelimiter.test.js`, `src/utils/parsers.js`, `src/features/visualBoard/logAnalysis.js`, `src/features/visualBoard/logAnalysis.test.js`, `src/features/visualBoard/ImportPanel.jsx`, `README.md`, `PROJECT_KNOWLEDGE.md`
- Summary: Replaced route-specific fixed delimiter lists with one shared, header-guided delimiter detector and boundary-aware tokenizer implemented with standard JavaScript only.
- Behavior Impact: Message Analyzer and Visual Board now accept consistent arbitrary delimiters such as SOH, `^A`, pipe, semicolon, comma, tab, `::`, `<SOH>`, Unicode, equals, and numeric markers. Delimiter-like characters and spaces inside values are preserved unless followed by a numeric `tag=` boundary.
- Verification: Dedicated delimiter coverage exercises both application parsers across fifteen delimiter forms, value preservation, headerless inference, and a complete Visual Board log record. `npm test` passed 35 tests; `npm run lint`, `npm run build`, `npm run verify:security`, and `git diff --check` passed.

### 2026-08-02 - Eliminate Remaining Scroll Paint Flicker
- Files: `src/components/features/SingleView.jsx`, `src/features/visualBoard/MessageDrawer.jsx`, `src/features/visualBoard/SequenceBoard.jsx`, `PROJECT_KNOWLEDGE.md`
- Summary: Removed hover-driven row repainting and positioned table rows from moving message content, isolated the drawer's stacking context, and contained layout/paint work inside both primary scroll surfaces.
- Behavior Impact: Long pretty-message tables and the Flow list no longer flash row backgrounds as content moves beneath a stationary pointer. Selected/highlighted rows remain visible, and Flow rows retain keyboard focus feedback.
- Verification: A local 250-instance market-data stress message produced 1,012 pretty-table rows and 9,164 drawer descendants. Instrumentation confirmed scrolling caused zero `SingleView` rerenders, narrowing the issue to CSS painting. After the change, hover-sensitive rows fell from 761 to zero, positioned table rows fell to zero, both scroll regions reported `contain: layout paint`, and 30 rapid alternating wheel gestures kept all 1,012 rows continuously rendered without blank or flashing regions. `npm test` passed 16 tests; `npm run lint`, `npm run build`, `npm run verify:security`, browser console inspection, and `git diff --check` passed.

### 2026-08-02 - Add Full-Screen Flow Workspace
- Files: `src/pages/VisualBoardPage.jsx`, `src/features/visualBoard/SequenceBoard.jsx`, `README.md`, `PROJECT_KNOWLEDGE.md`
- Summary: Added an app-level full-screen toggle for Flow and made the sequence board fill the remaining focused-workspace height.
- Behavior Impact: Users can isolate the Flow toolbar, status, and message list from the app header, dataset tabs, and group explorer without losing active filters or projected fields. The message drawer remains above full screen; the exit button or Escape restores the previous page position.
- Verification: Browser QA confirmed the focused region covers the full 1280×720 viewport above the app header, preserves the `D` filter and `55/54/38` projections, resizes the sequence board, keeps the message drawer above it, handles layered Escape correctly, and restores the original page position/styles on exit. `npm test` passed 16 tests; `npm run lint`, `npm run build`, `npm run verify:security`, and `git diff --check` passed.

### 2026-08-02 - Stabilize Sequence Board Scrolling
- Files: `src/features/visualBoard/SequenceBoard.jsx`, `PROJECT_KNOWLEDGE.md`
- Summary: Stopped unchanged scroll events from re-rendering the virtualized message list, replaced transformed rows with static absolute positions, removed row color transitions, contained list overscroll, and avoided nested field scrollers when projected values already fit.
- Behavior Impact: The Flow message list remains visually stable while wheel/trackpad scrolling. Hover feedback and virtualization remain available; projected cells with more than four repeated values still scroll internally when required.
- Verification: Browser instrumentation on the supplied local log reduced four small scroll gestures from nine full list renders to zero when the visible row window was unchanged. The 19-message filtered case had zero transformed rows, row transitions, or unnecessary nested scrollers. A 10,400 px scroll through all 57,260 messages updated the window correctly while keeping 31 rows mounted. `npm test` passed 16 tests; `npm run lint`, `npm run build`, `npm run verify:security`, and `git diff --check` passed.

### 2026-08-02 - Stabilize Message Drawer Scrolling
- Files: `src/features/visualBoard/MessageDrawer.jsx`, `src/components/features/SingleView.jsx`, `PROJECT_KNOWLEDGE.md`
- Summary: Removed the full-screen backdrop blur and per-row color transitions from the message drawer, contained overscroll inside its pretty/raw content region, and locked background-page scrolling while the drawer is open.
- Behavior Impact: Scrolling a long single-message view no longer continuously recomposites a blurred page, restarts hover transitions as rows cross the pointer, or moves the Visual Board behind the modal at its boundaries. Tag highlighting, hover feedback, grouped rows, and drawer navigation remain available.
- Verification: Browser regression testing on a 73-row repeating-group message confirmed zero transitioning rows, no backdrop filter, contained overscroll, an invariant background viewport across both scroll boundaries, and complete style/page-position restoration on close. `npm test` passed 16 tests; `npm run lint`, `npm run build`, `npm run verify:security`, and `git diff --check` passed.

### 2026-08-02 - Project Multiple Fields and Repeated Values
- Files: `src/pages/VisualBoardPage.jsx`, `src/features/visualBoard/BoardToolbar.jsx`, `src/features/visualBoard/SequenceBoard.jsx`, `src/features/visualBoard/useVisualBoardWorker.js`, `src/features/visualBoard/visualBoard.worker.js`, `src/features/visualBoard/fieldProjection.js`, `src/features/visualBoard/fieldProjection.test.js`, `README.md`, `PROJECT_KNOWLEDGE.md`
- Summary: Replaced the single-value field query with a local multi-field projection that returns all occurrences of up to six requested numeric FIX tags.
- Behavior Impact: Users can enter comma- or space-separated tags, see each tag in a compact column headed only by its number, and inspect every repeated value (such as all `270` prices in a market-data repeating group) in original message order. Wide projections use synchronized horizontal scrolling without changing the privacy model or adding dependencies.
- Verification: `npm test` passed 16 tests; `npm run lint`, `npm run build`, `npm run verify:security`, and `git diff --check` passed.

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

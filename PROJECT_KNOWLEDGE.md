# FIX Analyzer - Project Knowledge Base

## Maintenance Contract
This file is the persistent project memory for code changes in this repository.

When any code is added, removed, or modified:
1. Update `Last Updated`.
2. Add or update relevant sections below (architecture, behavior, risks, workflows).
3. Append one entry to `Change Log` with files touched and verification performed.

Last Updated: 2026-05-03

## Project Purpose
`fix-analyzer` is a client-side React app for parsing and comparing FIX messages from inconsistent log formats.

Primary outcomes:
- Parse multiple FIX text styles into normalized tag/value pairs.
- Visualize one message (`SingleView`) with optional repeating-group hierarchy.
- Compare multiple messages (`DiffView`) with semantic alignment and diff highlighting.
- Resolve tag names and enum descriptions via built-in defaults or uploaded QuickFIX XML dictionaries.

## Stack and Runtime
- Frontend: React 19, Vite 7, Tailwind CSS 3, Lucide icons.
- Build output: static site (`dist/`).
- Deployment target: GitHub Pages, workflow in `.github/workflows/deploy.yml`.
- Vite base path is hardcoded to `/fix-analyzer/` in `vite.config.js` (important for hosting under repo subpath).
- No backend; parsing and dictionary handling are entirely browser-side.

## Repository Map (High Signal)
- `src/App.jsx`: top-level state and orchestration (inputs, mode, dictionary state, auto detection, layout).
- `src/utils/parsers.js`: core parsing engine (`parseFixMessage`, `parseQuickFixXml`, `groupify`, `flattenForDiff`).
- `src/utils/fixUtils.js`: tag lookup, enum display helper, clipboard copy, output re-serialization.
- `src/utils/highlightUtils.js`: shared matching-tag highlight palette and class lookup.
- `src/components/features/SingleView.jsx`: grouped tree rendering for one message.
- `src/components/features/DiffView.jsx`: flatten+align comparison table and row status styling.
- `src/components/features/DictionaryControls.jsx`: auto/manual/custom dictionary selector UI.
- `src/components/features/CopyDropdown.jsx`: copy/export formats (`pipe`, `soh`, `bracketed`, `columnar`, `json`).
- `src/constants/fixData.js`: fallback tag and enum dictionaries.
- `public/dictionaries/*.xml`: bundled QuickFIX dictionaries (`FIX40` to `FIX44`).

## Runtime Data Flow
1. User input enters the dynamic `messageInputs` list in `App.jsx`.
2. Each message input is parsed with `parseFixMessage` via `useMemo`.
3. Dictionary source is selected from:
- Auto-detected standard dictionary from tag `8=FIX.x.y`.
- Manual standard selection (`FIX40`-`FIX44`).
- Custom uploaded XML.
4. `SingleView` and `DiffView` consume parsed pairs plus dictionary maps (`tags`, `enums`) and group definitions (`groups`).
5. Diff mode receives only populated message slots and is enabled when at least two messages contain input.
6. Result view interaction state, including group indentation and active highlighted tag/color assignments, is owned by `App.jsx` and passed to both views.
7. Copy/export uses parsed arrays to generate alternate string formats.

## Parser and Grouping Behavior
`parseFixMessage(raw)` heuristic order:
1. Bracketed format detection (`<35> MsgType = D` style).
2. Columnar row detection (`FieldName Tag Value` style).
3. Delimited parsing after normalizing `|` and `^A` to SOH.
4. Fallback regex for space-separated `tag=value` tokens when SOH is absent.

`parseQuickFixXml(xml)` behavior:
- Merges parsed definitions into defaults instead of replacing them entirely.
- Builds `tags`, `enums`, and recursive repeating-group schemas.
- Creates both per-`MsgType` group maps and `_global` fallback group map.
- Resolves nested components/groups recursively with cycle guard.

`groupify(pairs, groupDefs)` behavior:
- Chooses schema by `MsgType` (`tag 35`) when available; falls back to `_global`.
- Converts flat pairs into tree nodes for repeating groups.
- Handles nested groups by recursively skipping and then re-processing subgroup token ranges.
- Infers dictionary-missing fields as group members when an unknown tag repeats in every observed inter-instance window for a group occurrence. This supports custom tags that are omitted from the active dictionary but repeat with the group cadence.

`flattenForDiff(nodes)` behavior:
- Flattens grouped tree to path-based keys for alignment across messages.
- Adds synthetic header rows for group count nodes.

## Diff and View Semantics
- `SingleView`: hierarchical rows with expand/collapse for group instances and optional depth guides.
- `DiffView`: multiple flattened streams are aligned through a unified key list built from every populated message.
- The app starts with two message input slots in the original two-column full-width layout. Pressing `+ Message` adds another input slot and switches the input grid to support additional columns; users can remove extra slots while at least two remain.
- The `Group indent` results toolbar toggle defaults to on; when off, it removes depth padding and single-view guide bars without changing grouping, expansion, or diff alignment.
- Clicking a field row in single or diff view highlights every visible row with the same tag. Multiple tags can be highlighted at once with distinct colors; clicking a field whose tag is already highlighted removes only that tag's highlight. Single-view group rows use the row click for tag highlight and the chevron button for expand/collapse.
- Row coloring in diff:
- Group header row: neutral section style.
- Value difference: yellow.
- Missing on either side: red with `MISSING` marker.

## Dictionary Behavior Details
- Initial dictionary load on mount: `FIX44`.
- Auto mode loads dictionary inferred from `BeginString` (`8=FIX.4.x`) if supported.
- Supported standard versions: `FIX40`, `FIX41`, `FIX42`, `FIX43`, `FIX44`.
- Uploading custom XML locks dictionary mode to manual and overrides active definitions.
- Clearing custom dictionary resets to auto mode and reloads `FIX44`.

## Dev and Operations
Common commands:
- `npm install`
- `npm run dev`
- `npm run lint`
- `npm run build`
- `npm run preview`

Deployment:
- Push to `master` triggers GitHub Pages workflow.
- Build artifact is `dist/`.

## Current Baseline (2026-05-03)
Build status:
- `npm run build` passes.

Lint status:
- `npm run lint` passes.

Testing:
- No automated unit/integration test suite is present in repository.

## Known Risks and Gotchas
- `src/App.css` appears to be Vite starter CSS and is not imported by current app entry.
- Clipboard copy uses `document.execCommand('copy')` (legacy API; works broadly but is not modern Clipboard API).
- Parser is intentionally heuristic and tolerant, so malformed inputs may still produce partial output (by design).
- Diff alignment is key-path-based; complex reorder scenarios in repeating groups may still produce noisy diffs, especially across more than two messages.

## Change Log
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

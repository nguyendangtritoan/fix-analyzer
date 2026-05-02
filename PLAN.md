# Feature Plans

## Multi-Message Comparison Plan

### Goal
Allow users to compare more than two FIX messages side by side while preserving single-message analysis, dictionary auto-detection, group indentation, and matching-tag highlights.

### Implementation Steps
- [x] Replace the fixed `input1` / `input2` state in `App.jsx` with a dynamic message input list.
- [x] Render one textarea per message with copy controls, detected tag count, add-message, and remove-message controls.
- [x] Keep at least two message input slots available, and compare only messages that contain input text.
- [x] Update dictionary auto-detection to scan all parsed messages.
- [x] Update view-mode behavior so diff mode is enabled only when at least two messages contain input.
- [x] Update `DiffView` to accept an array of parsed messages and render one value column per message.
- [x] Align diff rows across all messages with a unified key list from all flattened message streams.
- [x] Preserve group indentation and multi-color tag highlighting in the multi-message diff table.
- [x] Update `PROJECT_KNOWLEDGE.md` with the new multi-message flow.
- [x] Run lint/build verification and update this plan if implementation details change.

### Implementation Notes
- `App.jsx` now stores message inputs as a dynamic list of `{ id, value }` objects.
- The app starts with two message slots, allows adding more, and allows removing extra slots while keeping at least two slots.
- Diff mode uses only populated message slots and is disabled until at least two messages contain text.
- The example action now loads three sample messages to exercise multi-message comparison.
- `DiffView` receives a `messages` array and builds a unified key list from every flattened message stream.
- The diff table renders one value column per populated message and preserves group indentation plus matching-tag highlighting.

### Validation
- [x] Static implementation review confirms the app starts with two message input slots.
- [x] Static implementation review confirms users can add and remove extra message slots while keeping at least two slots.
- [x] Static implementation review confirms diff mode enables only after at least two messages contain input.
- [x] Static implementation review confirms the diff table shows one value column per populated message.
- [x] Static implementation review confirms missing/changed/highlighted rows still render correctly across multiple messages.
- [x] Run `npm run lint`.
- [x] Run `npm run build`.
- [x] Confirm the local dev server URL returns `200 OK`.

## Multi-Color Field Tag Highlight Adjustment Plan

### Goal
Allow multiple tags to stay highlighted at once. Clicking an unhighlighted field adds a highlight with a distinct color; clicking a field whose tag is already highlighted removes only that tag's highlight.

### Implementation Steps
- [x] Replace the single highlighted-tag state in `App.jsx` with an array of highlighted tag/color assignments.
- [x] Assign the first available highlight color when a new tag is selected, cycling only when all configured colors are already in use.
- [x] Pass the highlighted tag list into `SingleView` and `DiffView`.
- [x] Update `SingleView` so each row resolves its highlight color from the tag list.
- [x] Update `DiffView` so highlighted tags keep their assigned colors while existing diff/missing/header semantics remain available when a row is not highlighted.
- [x] Update `PROJECT_KNOWLEDGE.md` with the multi-tag interaction.
- [x] Run lint/build verification and update this plan if the implementation changes.

### Implementation Notes
- `App.jsx` now stores `highlightedTags` as `{ tag, colorIndex }` entries.
- `src/utils/highlightUtils.js` owns the shared highlight color palette and row-class lookup helper.
- Clicking an unhighlighted tag appends it to the active list without clearing other tags.
- Clicking a highlighted tag removes only that tag from the active list.
- New highlights use the first available color; colors cycle only after the configured palette is exhausted.

### Validation
- [x] Static implementation review confirms clicking an unhighlighted field adds a highlight without clearing existing highlighted tags.
- [x] Static implementation review confirms each newly highlighted tag gets a different color while colors are available.
- [x] Static implementation review confirms clicking a field with an already-highlighted tag removes only that tag.
- [x] Static implementation review confirms Clear removes all active tag highlights.
- [x] Run `npm run lint`.
- [x] Run `npm run build`.
- [x] Confirm the local dev server URL returns `200 OK`.

Adjustment note: this plan supersedes the single-active-tag behavior in the previous Field Tag Highlight Plan.

## Field Tag Highlight Plan

### Goal
Allow users to click a field row to highlight every visible field with the same FIX tag, then click any highlighted field with that tag again to clear the highlight.

### Implementation Steps
- [x] Add shared `highlightedTag` state in `App.jsx`.
- [x] Add a toggle handler that selects a clicked tag or clears it when the clicked tag is already highlighted.
- [x] Pass `highlightedTag` and the toggle handler into `SingleView` and `DiffView`.
- [x] Update `SingleView` leaf and group rows so clicking a field row toggles matching-tag highlight.
- [x] Keep group expand/collapse working by making the chevron button handle expansion independently from row highlight clicks.
- [x] Update `DiffView` rows so clicking either side of an aligned field row toggles matching-tag highlight.
- [x] Update `PROJECT_KNOWLEDGE.md` with the new interaction.
- [x] Run lint/build verification and update this plan if the implementation changes.

### Implementation Notes
- This initial single-active-tag behavior was superseded by the Multi-Color Field Tag Highlight Adjustment Plan.
- `App.jsx` originally owned the active `highlightedTag` and toggled it on repeated clicks.
- `SingleView` and `DiffView` originally received the active tag plus the toggle handler as props.
- Matching rows render a blue highlight with a left accent.
- Single-view group rows now use row clicks for tag highlight and the chevron button for expand/collapse.
- The Clear button also clears any active tag highlight.

### Validation
- [x] Static implementation review confirms clicking a field row selects the tag and applies highlight to matching visible rows.
- [x] Static implementation review confirms clicking the highlighted tag again clears matching highlights.
- [x] Static implementation review confirms selecting a different tag moves the highlight state.
- [x] Static implementation review confirms group expand/collapse remains on the chevron button with event propagation stopped.
- [x] Run `npm run lint`.
- [x] Run `npm run build`.
- [x] Confirm the local dev server URL returns `200 OK`.
- [ ] Browser click automation was not run because Playwright is not installed in this project.

## Group Indentation Toggle Plan

### Goal
Allow users to turn group indentation on or off while preserving the existing grouped parsing, expand/collapse behavior, and diff alignment.

### Implementation Steps
- [x] Add a top-level UI preference in `App.jsx` for whether grouped rows are indented.
- [x] Add a compact toggle near the result view controls so the setting is available in both single and diff views.
- [x] Pass the setting into `SingleView` and `DiffView`.
- [x] Update `SingleView` so disabling indentation removes depth padding and indentation guide bars while keeping group rows, instance labels, and expand/collapse controls.
- [x] Update `DiffView` so disabling indentation removes depth-based left padding while preserving flattened group alignment.
- [x] Update `PROJECT_KNOWLEDGE.md` with the new behavior and validation results.
- [x] Run lint/build verification and update this plan if the implementation changes.

### Implementation Notes
- Added `groupIndentEnabled` in `App.jsx`, defaulting to enabled to preserve existing behavior.
- Added a `Group indent` toggle in the analysis results toolbar.
- Passed the setting to `SingleView` and `DiffView`.
- `SingleView` hides depth guide bars and depth-based padding when indentation is off.
- `DiffView` keeps semantic grouping and diff alignment, but removes depth-based left padding when indentation is off.
- Clean verification required two small existing lint fixes: scoped the JSON case in `generateOutput` and replaced the parser's control-character regex literal with a dynamic `RegExp`.

### Validation
- [x] Confirm the default behavior still shows grouped indentation by preserving the setting default.
- [x] Confirm the toggle removes visual indentation in single view through `groupIndentEnabled`.
- [x] Confirm the toggle removes visual indentation in diff view through `groupIndentEnabled`.
- [x] Run `npm run lint`.
- [x] Run `npm run build`.
- [x] Start the Vite dev server and confirm the local app URL returns `200 OK`.

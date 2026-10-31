# Compact FIX message view — design QA

Date: 2026-10-30

## Visual evidence

- Source visual: `/var/folders/33/dljxjfl16pnc27n2_vm97x5h0000gp/T/codex-clipboard-16e57bdc-20d8-4337-a2a5-c8869f93f367.png` (958 × 981 pixels; source browser scale unknown).
- Previous application view: `/var/folders/33/dljxjfl16pnc27n2_vm97x5h0000gp/T/codex-clipboard-1430bad4-fa34-4993-8b6b-056512092593.png`.
- Implementation: `docs/screenshots/compact-fix-message.jpg` (910 × 881 pixels, the complete message panel).
- Full application context: `docs/screenshots/compact-fix-message-page.jpg`, captured at a 958 × 981 CSS-pixel viewport using a full-page screenshot.
- Shared drawer: `docs/screenshots/compact-message-drawer.jpg`, captured at 1280 × 1000 CSS pixels.
- Density normalization: browser capture is 1 image pixel per CSS pixel. Source and implementation were opened together in one comparison input at original image dimensions. The panel crop removes application chrome without rescaling; the full-page capture retains that context.
- State: expanded order message, including two party instances, a nested party sub-group, and a second allocation group. Synthetic FIX 4.4 data replaces the reference's redacted FIX 4.3 data; the comparison concerns density, hierarchy, and readability, not identical values or schemas.

## Findings and fidelity

No actionable P0/P1/P2 findings remain in the changed message presentation.

- Typography: system monospace, 13px text and 18px line height, with approximately 20px rows. Titles and column labels are cyan. Text is smaller than the reference as an intentional adaptation to the existing side-by-side panels. Labels, timestamps, and raw enum codes are legible; long values wrap completely without ellipsis.
- Layout: the tag column is 48px; field names use 256px, reduced to 200px inside narrower panels. Values consume the remaining width. The 38-field sample, including nested groups, occupies an 881px-high panel. Separate instance-header rows and tag badges have been removed. Groups retain subtle spacing, arrows, and indentation.
- Colors: navy background, cyan border/title, bright body fields, muted session metadata, amber and mint groups. Selected pale row backgrounds switch their foreground to dark text so highlighting remains legible.
- Assets: no raster assets are required for the UI. Existing Lucide disclosure and branch icons are used. The reference's copy action remains in the existing app toolbar rather than being duplicated inside every panel.
- Content: dictionary names and enum descriptions remain authoritative, with original values visible. BodyLength and CheckSum display their actual values; validation labels shown in the reference are not invented. Numeric/date formatting remains unchanged. Titles come from MsgType.

## Comparison history

1. Initial browser check found that `clamp()` on a table column was ignored, allowing the field-name column to grow to 575px at a 1280px viewport. This defeated the compact horizontal layout.
2. Replaced that rule with fixed column widths selected by a container query. Post-fix measurements were 48/256/572px at the reference viewport and 48/200/326px for each of two desktop panels. The final panel and full-page captures above show the corrected alignment.
3. Opened the final panel and supplied reference together. Checked the full panel plus the nested-group area within the same capture; a separate region crop was unnecessary because all rows and both hierarchy levels are legible.

## Interaction checks

- Pipe, literal SOH, caret-SOH example, and columnar inputs render.
- Nested and parent groups collapse/expand independently; disclosure actions do not toggle highlights.
- Matching repeated tags highlight together; Enter toggles the tag button and exposes its pressed state.
- Group indent toggles presentation without changing the fields.
- Two messages remain side by side; existing comparison still shows its raw-first values.
- At 390 × 844, long identifiers wrap within the locally scrollable table. Existing dictionary controls extend 3px beyond the page edge; no controls are hidden and this pre-existing shell detail is outside the change.
- The Visual Board Pretty drawer renders the compact component with the selected record's dictionary.
- Browser console inspection: no warnings or errors.
- Lint and production build pass; all 96 existing tests pass. The build retains its existing large-bundle advisory.

## Follow-up polish

- Optional: reduce the existing dictionary-toolbar width on very narrow screens.
- Custom XML upload was not manually repeated; dictionary loading/parsing code is unchanged.

## Implementation checklist

- [x] Compact message layout and value space.
- [x] Group hierarchy, expansion, and highlight interactions preserved.
- [x] Desktop, side-by-side, narrow-screen, and drawer checks.
- [x] Reference comparison and screenshots saved.
- [x] Project knowledge updated and existing checks passed.

## Currency accent follow-up

- Added the pink accent visible on `USD` and `USD/NOK` in the supplied reference. Compact Currency(15) values and three-letter slash-separated currency pairs in Symbol(55) use `#fb7185`; selected rows use `#9f1239` for contrast against pale highlights.
- Browser inspection confirmed both actual computed colors, and the currency-row highlight was toggled back off after verification.
- Evidence: `docs/screenshots/compact-currency-highlights.jpg` (497 × 426 pixels at the default 545px browser width). The crop includes the message title, column labels, and both currency fields. Earlier full-panel screenshots document the compact-layout pass before this accent was added.
- Lint and production build passed. No layout or parsing behavior changed.

## Value highlight follow-up — 2026-10-31

- Source: `/var/folders/33/dljxjfl16pnc27n2_vm97x5h0000gp/T/codex-clipboard-e075810a-111d-4d63-b031-aea4b8788460.png` (958 × 981 pixels).
- Implementation: `docs/screenshots/compact-value-highlights.jpg` (497 × 634 pixels, cropped at 1:1 density from the default 545px-wide browser). Both images were opened together for direct inspection of the group values. The implementation uses synthetic data with two party instances, a nested party group, and an allocation group.
- Purple value text (`#d8b4fe`) is visibly separate from the unchanged amber tag/name text (`#fcd34d`). In the light comparison view or selected rows, purple changes to `#7e22ce` for contrast. Typography, compact spacing, existing icons, enum descriptions, and raw values retain their earlier presentation. The new instructions and clear action sit outside the screenshot panel.
- Clicking one PartyID value highlights all PartyID values. Verified that tag/name clicks still select rows independently, values can be toggled with Space, nested/group-count values work, collapsed groups retain highlights, currency values restore pink, and multiple message panels share the selection. Comparison keeps missing cells intact, and its highlight state survives switching views.
- `Clear value highlights` removes only purple value marks. Main Clear resets both value and row marks. Drawer highlights survive next-message navigation and Pretty/Raw switching, and its clear action works.
- Lint, build, and all 96 existing tests passed. The browser initially held a stale page while the development server was stopped; restarting the server and reloading resolved this. Console history contains that startup WebSocket connection error, with no application errors during the subsequent interaction checks.
- No actionable P0/P1/P2 visual or interaction findings remain for this follow-up.

final result: passed

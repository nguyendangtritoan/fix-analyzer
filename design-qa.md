# Visual Board Viewport-Fit Layout QA

## Evidence

- Source visual truth: `/var/folders/33/dljxjfl16pnc27n2_vm97x5h0000gp/T/codex-clipboard-ca34f78d-fc35-43da-9894-9c6f1a68d9c8.png` and `/var/folders/33/dljxjfl16pnc27n2_vm97x5h0000gp/T/codex-clipboard-49787c75-42b7-4856-ad34-043f33489815.png`.
- Browser-rendered implementation: `/private/tmp/fix-analyzer-visual-board-viewport-fit-final.png` at `http://127.0.0.1:5174/fix-analyzer/#/visual-board`.
- Source pixels: `2048 x 1117` for the full-workspace annotation and `1124 x 1534` for the focused crossed-out summary annotation.
- Implementation pixels: `1966 x 1117`; browser CSS viewport: `2048 x 1117`; browser viewport override density was unchanged. The in-app browser capture surface is 82 pixels narrower than its CSS viewport, so comparison used the shared 1117-pixel height, app content regions, and measured DOM geometry rather than treating the capture-surface width difference as design drift.
- State: desktop Visual Board, local `fixmessage.txt` analyzed, 57,260 messages and 185 groups, Flow active, group list and sequence list independently scrolled.

## Full-View Comparison Evidence

- The crossed-out source-summary card and the text `57,260 messages · 185 groups · processed locally` are absent.
- The detected-groups panel begins directly below the application header and shares the same viewport-bounded frame as the right workspace.
- At the measured `2048 x 1117` CSS viewport, the loaded-workspace grid is `996px` tall from `y=97` through `y=1093`; the document scroll height is exactly `1117px` and page scroll remains `0`.
- The right Flow workspace occupies the same bounded grid height. Its internal sequence scroller is `761px` tall and retains the toolbar, visible-count row, and full-screen action above it.

## Focused Region Comparison Evidence

- Left panel: the search/type controls and pagination remain fixed. The group-card region has `overflow-y: auto`, `683px` client height, `2441px` scroll height, and reached `scrollTop=700` while page scroll stayed `0`.
- Right panel: the message sequence has `overflow-y: auto`, `761px` client height, and reached `scrollTop=900` while page scroll stayed `0`. The group list retained its independent `scrollTop=700`.
- Overview and other analysis tabs use the right panel's remaining height and gain their own vertical overflow only when their content exceeds it.

## Required Fidelity Surfaces

- Fonts and typography: unchanged from the established application; hierarchy, sizes, weights, truncation, and monospaced FIX values remain consistent with the source UI.
- Spacing and layout rhythm: the removed full-width summary releases the requested vertical space; both columns align at the top and bottom with 16px inter-column and toolbar gaps.
- Colors and visual tokens: existing slate, blue, emerald, violet, borders, radii, and shadows are preserved; no new visual tokens were introduced.
- Image quality and asset fidelity: no raster imagery was added or replaced. Existing Lucide interface icons remain sharp and consistent with the application.
- Copy and content: the unwanted loaded-file summary and processing line are removed; all functional labels, filters, tabs, counts, and pagination copy are retained.

## Findings

- No actionable P0, P1, or P2 visual or interaction differences remain for the annotated desktop layout.

## Comparison History

1. Initial implementation removed the summary and bounded the group panel, but measurement found 12px of document overflow (`1129px` document height in an `1117px` viewport). The panel calculation was corrected from `100dvh - 109px` to `100dvh - 121px`, producing an exact `1117px` document height.
2. The user expanded the request to the right workspace. The loaded grid became viewport-bounded, non-Flow analysis panels received internal overflow, and Flow's sequence board was made container-sized at desktop breakpoints. Post-fix measurement confirmed both internal scrollers move independently with page scroll fixed at `0`.

## Primary Interactions Tested

- Loaded the supplied local log through the file chooser.
- Switched from Overview to Flow.
- Scrolled the detected-groups list independently.
- Scrolled the 57,260-message sequence independently.
- Confirmed the document did not scroll during either interaction.
- Checked the browser console; no errors were reported.

## Implementation Checklist

- [x] Remove the loaded-dataset summary card and processing text.
- [x] Start both columns directly below the sticky app header.
- [x] Bound the desktop workspace to the remaining viewport height.
- [x] Keep group search, all/ungrouped choices, and pagination fixed.
- [x] Scroll only group cards inside the left panel.
- [x] Keep Flow controls fixed and scroll only the message board.
- [x] Give other right-side analysis panels internal overflow when needed.
- [x] Preserve the existing stacked layout below the desktop breakpoint.

## Follow-up Polish

- None required for this scoped layout change.

final result: passed

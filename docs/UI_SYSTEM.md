# UI system rules

This document keeps durable UI rules that should survive cleanup of one-off release notes.

## General direction

- The active v4 shell uses a compact SaaS-style interface with shared panels, cards, buttons, tables, inputs and modals.
- UI changes must be systemic: shared tokens, shared classes and common layout patterns first.
- Avoid one-off inline styles, local CSS hacks and new `!important` rules unless there is no safe shared alternative.
- Do not mix visual cleanup with calculation, warehouse, reservation or backend-write changes.

## Layout rules

- Keep main work areas readable on desktop and mobile.
- Wide technical tables should scroll inside their own card instead of breaking the page width.
- Long names should wrap by words, not by individual letters.
- Primary workflow actions should stay in predictable positions and should not jump between wizard steps.
- In quote constructor steps, the main action belongs near the lower navigation/action area after the user checks the scheme and summary.

## Technical canvas exceptions

Technical canvases are not ordinary UI cards or buttons. Global UI styling must not distort them.

- Stage cells preserve grid meaning and must not inherit hover scaling or generic card transforms.
- LED cabinets remain square tiles and keep their cabinet texture when filled.
- Truss block artwork must keep port/footprint alignment and must not inherit generic button/card backgrounds.
- Constructor scale/zoom controls must not change calculation coordinates.

## Mobile rules

- Use compact cards where wide tables become unreadable.
- Keep constructor controls grouped by task: parameters, drawing/building tools, zoom/fit and summary.
- Avoid desktop-only spacing assumptions on mobile.
- Touch drawing must match mouse drawing behavior where applicable.

## Theme and contrast

- Dark runtime remains the main technical interface baseline unless a task explicitly changes theme behavior.
- PDF/export content should use a readable light/high-contrast print layer when rendered through browser capture tools.
- Text in PDF cards, tables and headers must be protected from dark-theme inheritance.

## Release-note cleanup rule

Old docs that only describe a visual one-off fix can be removed after the durable rule is represented here or in another active doc.

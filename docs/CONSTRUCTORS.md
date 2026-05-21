# Constructors notes

This document keeps long-lived rules for Stage, Truss and LED constructors.

## Shared rules

- Quick constructors and quote constructors may use different catalog sources.
- Shared build logic, formulas and BOM contracts should stay common where possible.
- Quick mode uses ideal/local technical data.
- Quote mode uses the real equipment database, availability, deficits, compatible replacements and subrent planning.
- Documentation cleanup must not change formulas, BOM quantities, warehouse flows or backend sync.

## Stage

- Stage grid cells represent physical deck modules.
- Stairs are plan cells and should keep grid coordinates in previews and documents.
- Edge closure quantities are based on open perimeter logic.
- Support type may drive default height and compatible frame/crossbar selection.
- Saved quick-stage coordinates should be preserved when reopening quick modals.

## Truss

- Truss artwork must preserve port and footprint alignment.
- Straight truss lengths are separate physical parts: 0.5, 1, 1.5, 2, 2.5 and 3 m.
- Portal, frame and stool templates should rebuild from a clean field.
- Stool real dimensions are based on the top frame; legs and bases remain in kit, weight and BOM.
- Quote mode should keep compatibility metadata: family, interface, compatibility group, part key and straight length.
- Alternative length assembly belongs to quote mode when stock and compatibility rules allow it.
- Load-check logic and span metadata are protected calculation areas.

## LED

- LED freeform layout may contain multiple separate constructions.
- Each construction reports cabinets, size, pixels, aspect ratio, weight, power and rigging details independently.
- LED placement relative to stage belongs to visualizer/visualModel, not to the technical LED calculator.
- Standing and hanging modes may both be active when the user selects both.
- Hanging Bar is counted by top active cabinets per construction.
- Filled LED cabinets should keep square tile geometry and the LED cabinet texture.

## PDF/export

- Quick PDF should represent the current constructor scheme.
- PDF text should use readable print contrast when browser capture tools may inherit dark theme styles.

## Cleanup rule

Historical constructor release notes can be removed or archived only after their durable rule is represented here, in `UI_SYSTEM.md`, or in `CHANGELOG.md`.

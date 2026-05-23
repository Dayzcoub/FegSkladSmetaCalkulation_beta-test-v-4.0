# Pack.it approved assets package

Document indexes uploaded approved asset package:

```text
PACKIT_approved_assets_package.zip
```

Source SHA-256:

```text
b91d5c14be6abd0399d2af5ceeda8e7f627b23438709e2530f7aeead64c80bbb
```

The package contains 90 files and is a design/source package, not a direct runtime drop-in.

## Source package structure

```text
PACKIT_approved_assets_package/
  README.md
  manifest.json
  boards/
  docs/
  icons/
  illustrations/
  logos/
  transparent_png_assets/
```

## Important content

### Docs

```text
docs/PACK.IT_UI_Hard_Rebuild_TZ_v2_1.docx
docs/PACK.IT_UI_KIT_Implementation_Spec_v2_0.docx
```

These are earlier UI rebuild/spec docs. Use together with current repo docs, but current repo mapping documents remain the source of truth for the active build:

```text
docs/PACKIT_UI_SCHEME_SOURCE_MAP.md
docs/PACKIT_LAYOUT_PRIMITIVES_CONTRACT.md
docs/PACKIT_UI_TARGET_DIRECTION.md
```

### Boards

Boards are for visual review only:

- brand boards;
- empty-state boards;
- final asset overview boards;
- interface illustration boards;
- splash board.

Do not use boards as runtime UI assets.

### Source renders

Source render folders include larger logo/icon/illustration masters.

Use them for review or later export work, not direct app UI integration unless explicitly prepared.

### Transparent PNG assets

This is the useful runtime-oriented subset:

```text
transparent_png_assets/brand/light
transparent_png_assets/brand/dark
transparent_png_assets/empty_states/light
transparent_png_assets/empty_states/dark
transparent_png_assets/support_illustrations/light
transparent_png_assets/support_illustrations/dark
```

These files are suitable for UI integration after being copied into the app asset structure.

## Normalized runtime asset package

A cleaned runtime-ready package was prepared from `transparent_png_assets`:

```text
PACKIT_runtime_assets_ready_v1.zip
```

Runtime package SHA-256:

```text
c2563eb75a68eb71bd9bc7a3fce7c4deb3e0a44924f51659e25a084dcb9af5fc
```

It normalizes paths to:

```text
public/assets/packit/brand
public/assets/packit/empty-states
public/assets/packit/support
public/assets/packit/boards
docs/packit-runtime-assets-manifest.json
```

The runtime package has 59 files.

## Brand assets available

From transparent PNG manifest:

```text
packit_logo_horizontal
packit_symbol
packit_app_icon_light
packit_splash_dark
```

Light/dark variants are available where applicable.

## Empty states available

```text
empty_no_projects_open_flight_case
empty_warehouse_empty_shelf
empty_no_documents_tech_folder
empty_no_notifications_bell
empty_search_not_found_magnifier
empty_no_reports_report_sheet
```

Each has light and dark versions.

## Support illustrations available

```text
support_equipment_case
support_checklist_complete
support_delivery_truck
support_document_file
support_pie_chart
support_security_shield
support_module_cubes
support_cloud_upload
support_route_map
support_file_upload_dropzone
support_filter
support_server_stack
support_user_add
support_calendar
support_folder
support_settings_gears
```

Each has light and dark versions.

## Recommended app integration order

### Phase 1 — add files only

Copy normalized runtime files into the repo under:

```text
public/assets/packit/...
```

Do not change UI behavior in the same commit.

### Phase 2 — add asset manifest module

Add a small JS/CSS-safe asset resolver, for example:

```text
src/modules/PackitAssetManifest.js
```

It should map semantic IDs to paths:

```text
brand.logo.horizontal
brand.symbol
empty.noProjects
support.deliveryTruck
support.documentFile
```

### Phase 3 — shell branding

Replace shell placeholder logo with:

```text
public/assets/packit/brand/dark/packit_logo_horizontal.png
public/assets/packit/brand/dark/packit_symbol.png
```

Only after files are present.

### Phase 4 — empty states

Update empty/loading screens for:

- projects;
- warehouse;
- documents;
- reports;
- search;
- notifications.

### Phase 5 — PWA icons

Do not change `manifest.json` until proper 180/192/512/favicons are generated or selected from the source package.

Keep current root icons as compatibility until migration is explicit.

## Rules

- Do not use giant boards as runtime UI assets.
- Use transparent PNGs for UI illustrations.
- Keep light and dark assets separate.
- Do not recreate wordmark with CSS text.
- Do not recolor assets randomly.
- Do not mix old FEG branding into new Pack.it screens.
- Do not change calculations, BOM, warehouse logic, PDF export, backend writes or business logic while adding assets.

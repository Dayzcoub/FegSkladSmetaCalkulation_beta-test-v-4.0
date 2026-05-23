# Pack.it UI reference schemes archive

This document indexes the extracted visual reference archive produced from:

```text
PACKIT_Build_To_Target_UI_Reconstruction_MasterSpec_v1_2_1_corrected_schemes.docx
```

Archive name:

```text
PACKIT_UI_Reference_Schemes_v1_2_1_extracted.zip
```

SHA-256:

```text
025785ddd2940de54e40fd49472478d4619f4f3720a7079e61e4b3ef9b4a8dd7
```

## Contents

The archive contains 56 files:

- 24 original extracted PNG schemes in MasterSpec order;
- corrected current-build quote flow copies;
- quick calculator scheme copies;
- service section scheme copies;
- CSV/JSON manifests;
- contact sheets for fast visual review;
- README.

## Folder structure

```text
PACKIT_UI_Reference_Schemes_v1_2_1_extracted/
  00_master_spec_source_order/
  01_current_build_quote_flow/
  02_quick_calculators/
  03_service_sections/
  contact_sheets/
  docs/
  README.md
```

## Important usage rule

These PNG files are reference images only.

Do not use them directly as runtime UI assets.

Runtime assets must be prepared separately under the Pack.it asset system, for example:

```text
public/assets/brand
public/assets/home
public/assets/constructors
public/assets/empty
```

## Current build mapping

Use `01_current_build_quote_flow/` for the current `QuoteWizard.js` flow.

The current functional order remains:

```text
1. client
2. venue
3. scope
4. stage
5. truss
6. led
7. equipment
8. transport
9. crew
10. summary
```

Do not blindly implement the MasterSpec quote step order without the corrected mapping in:

```text
docs/PACKIT_UI_SCHEME_SOURCE_MAP.md
```

## QA

The archive was validated with `unzip -t` successfully.

Contact sheets:

```text
contact_sheets/contact_sheet_master_order.jpg
contact_sheets/contact_sheet_current_quote_flow.jpg
```

Use them only for quick visual navigation. Implementation comparison should use the original PNGs from the relevant folder.

# Pack.it asset system contract

Этот документ фиксирует правила ассетов Pack.it: иллюстраций, иконок, логотипов, hero graphics, empty states, constructor graphics and UI imagery.

## Главный принцип

Ассеты Pack.it должны быть подготовлены как нормальная дизайн-система, а не как случайные картинки, вставленные в интерфейс.

Каждый ассет должен иметь:

- назначение;
- формат;
- размер;
- имя;
- место хранения;
- dark/light compatibility;
- прозрачный фон, если это UI-иллюстрация/иконка;
- safe zone;
- fallback;
- правила обновления.

## Типы ассетов

### Product branding

- Pack.it logo;
- Pack.it wordmark;
- app icons;
- favicon;
- PWA icons;
- splash/launch images later.

### Home / launcher assets

- hero banner;
- big card icons;
- Stage icon;
- Truss icon;
- LED icon;
- Quote/Project icon;
- Warehouse icon;
- Documents icon;
- Admin icon;
- Field Kit icon later.

### Constructor assets

- stage deck texture;
- LED cabinet texture;
- truss SVG/PNG assets;
- corner/node graphics;
- 3D model previews later;
- placeholder graphics;
- grid/canvas helpers.

### Document assets

- company logo placeholders;
- document header/footer graphics;
- watermark/attribution;
- signature/stamp placeholders later.

### Empty states

- no projects;
- no tasks;
- no warehouse deficit;
- no documents;
- no clients;
- no internet/offline;
- field mode inactive;
- no diagnostics available.

### Field Kit assets later

- field server icon;
- router icon;
- voice room icon;
- push-to-talk icon;
- broadcast/emergency icon;
- local LAN/offline sync illustrations.

## Required formats

### UI icons

Preferred:

```text
SVG for simple vector icons
PNG/WebP with alpha for rendered 3D/polished icons
```

Rules:

- transparent background;
- no baked card background unless specifically required;
- safe padding around object;
- clear silhouette;
- readable at small sizes;
- dark/light compatibility checked.

### Hero/banner images

Preferred source size:

```text
1760 × 480 px
or
1920 × 520 px
```

Approximate ratio:

```text
3.6:1
```

Rules:

- important content inside central 85–90% width;
- important content inside 80% height;
- no important object on extreme edges;
- should work with cropping on responsive screens;
- provide WebP/PNG export.

### App/PWA icons

Required sizes:

```text
180 × 180
192 × 192
512 × 512
favicon
```

Rules:

- must be readable on dark and light backgrounds;
- no tiny text;
- high contrast silhouette;
- consistent Pack.it branding.

### Constructor technical graphics

Rules:

- dimensions and visual scale must be controlled;
- no random background rectangles;
- truss tubes must look round when required by asset type;
- technical texture must not make numbers unreadable;
- colors must follow theme tokens when possible.

## Naming convention

Use predictable names.

Examples:

```text
assets/brand/packit-logo.svg
assets/brand/packit-wordmark.svg
assets/brand/icon-192.png
assets/home/hero-stage-led-portal-wide.webp
assets/home/icon-stage-polished.png
assets/home/icon-truss-round-tubes.png
assets/home/icon-led-screen.png
assets/constructors/stage/stage-deck-texture.png
assets/constructors/led/led-cabinet-texture.png
assets/constructors/truss/t29q-straight-3m.svg
assets/empty/no-projects.svg
assets/field/field-kit-router-mini-pc.webp
```

Avoid names like:

```text
image1.png
new-final-final.png
screenshot-copy.png
variant-2-real-final.png
```

## Storage structure

Future preferred structure:

```text
/public/assets
    /brand
    /home
    /constructors
        /stage
        /truss
        /led
        /3d
    /documents
    /empty
    /field
    /icons
    /legacy
```

Current legacy root assets can remain for compatibility, but new assets should move toward structured folders.

## Alpha/transparent background rule

For UI inserts, icons and illustrations:

```text
transparent background is required
```

Exceptions:

- full hero/banner image;
- document background;
- intentional card artwork;
- photos/screenshots.

Rendered product-style icons should usually be object-only with alpha, so UI cards can control their own background.

## Dark/light compatibility

Each asset must be checked in:

- light theme;
- dark theme;
- card background;
- transparent canvas;
- mobile small size.

If one asset cannot work in both themes, provide variants:

```text
asset-name.light.png
asset-name.dark.png
```

## Asset manifest

Future asset manifest should describe:

```json
{
  "id": "home.stage.icon",
  "path": "assets/home/icon-stage-polished.png",
  "type": "png-alpha",
  "theme": "both",
  "size": [512, 512],
  "usage": ["home.launch.card.stage"],
  "safeZone": "12%",
  "status": "approved"
}
```

Statuses:

- draft;
- candidate;
- approved;
- deprecated;
- legacy.

## Approved known direction

### Home hero

Approved direction:

- wide technical/product banner;
- stage with LED screen hanging on portal;
- event production mood;
- clean SaaS/product look;
- suitable for light theme;
- content centered and not cut by wide crop.

### Stage big icon

Approved direction:

- polished dark rounded-square/product icon style;
- isometric raised stage platform;
- visible legs/braces;
- small stairs on the left;
- metallic/silver linework;
- warm gold highlights.

### Truss big icon

Approved direction:

- straight aluminum event truss segment;
- perspective view;
- round cylindrical tubes, not square;
- triangular bracing;
- metallic silver/chrome look;
- warm gold highlights.

### LED big icon

Current LED icon was accepted earlier and should not be changed unless explicitly requested.

## Asset QA checklist

Before integrating an asset:

- correct file name;
- correct folder;
- alpha channel if required;
- optimized file size;
- no accidental background;
- safe zone checked;
- theme checked;
- mobile checked;
- no unreadable small text;
- no legal/trademark issue known;
- no mixed visual style with surrounding UI;
- entry added to manifest later.

## Do not do

Do not:

- paste giant preview boards as interface assets;
- use screenshots as final UI icons;
- bake random backgrounds into transparent icon slots;
- mix dark and light UI asset styles accidentally;
- use inconsistent icon camera angles;
- keep assets only in chat without committing or packaging;
- use names that cannot be understood later;
- add unoptimized huge images to production without reason.

## Asset backlog

Minimum required asset pack for UI rebuild:

- Pack.it logo;
- Pack.it wordmark;
- favicon;
- icon 180/192/512;
- home hero banner;
- stage launch icon;
- truss launch icon;
- LED launch icon;
- quote/project icon;
- warehouse icon;
- documents icon;
- tasks icon;
- admin/settings icon;
- field kit icon later;
- no-projects empty state;
- no-tasks empty state;
- no-documents empty state;
- no-warehouse-deficit empty state;
- offline/sync empty state;
- field mode inactive empty state later.

## Integration rule

Assets should be integrated through shared asset registry/config where possible, not scattered as hardcoded paths across components.

When replacing an approved asset:

1. add new file;
2. update asset registry/manifest;
3. keep old file if needed for rollback;
4. update docs if the approved direction changes;
5. verify dark/light/mobile.

## Итоговый закон

Pack.it assets must be treated as part of the product system. UI icons, hero graphics, constructor textures, document imagery and empty states must be named, sized, stored and approved consistently. Interface assets should usually have transparent backgrounds and alpha channels. New development should not rely on large preview boards or random generated images; it should use prepared individual assets with clear usage rules.

# Pack.it / ПАК.ИТ brand identity board

Документ фиксирует бренд-ориентир Pack.it / ПАК.ИТ по утверждённому brand board.

Это целевое направление для логотипа, иконок, палитры, навигации, PWA/app icons, dark mode preview и дальнейшего UI rebuild.

## 1. Brand name

Основное написание:

```text
PACK.IT
```

Русская версия / подпись:

```text
ПАК.ИТ
```

Рабочая смысловая основа:

```text
пакет / project package / управление всем проектом в одном пакете
```

Pack.it должен восприниматься как система, которая собирает в один управляемый пакет:

- склад;
- сметы;
- проекты;
- команду;
- транспорт;
- документы;
- завершённые события;
- future field kit / communications.

## 2. Main logo

Основной логотип состоит из:

- symbol mark слева;
- wordmark `PACK.IT` справа;
- подпись `ПАК.ИТ` под wordmark.

Symbol mark:

- модульная сетка из квадратных блоков;
- визуальная метафора: package / modules / structure / assembled system;
- один верхний правый блок имеет характерную форму с вырезом / скруглением, создающую узнаваемость;
- знак должен работать отдельно как app icon.

Wordmark:

- uppercase;
- строгий технологичный кастомный стиль;
- широкие формы;
- хорошая читаемость на малом размере;
- без декоративного шума.

## 3. Logo variants

Нужны версии:

### Horizontal

```text
symbol + PACK.IT + ПАК.ИТ
```

Использование:

- topbar;
- login screen;
- documents header;
- marketing / intro screens.

### Vertical

```text
symbol
PACK.IT
ПАК.ИТ
```

Использование:

- splash;
- auth screen;
- empty states;
- centered cards.

### Symbol only

```text
symbol mark only
```

Использование:

- app icon;
- collapsed navigation;
- favicon;
- PWA icon;
- small UI mark.

## 4. Monochrome versions

Required variants:

- black / dark single-color;
- blue single-color;
- white-on-dark.

Rules:

- monochrome versions must preserve block geometry;
- do not add extra effects;
- do not use gradients for functional UI assets;
- white-on-dark version is required for dark navigation and app launch contexts.

## 5. App icon usage

App icon should use the symbol mark.

Required contexts:

- light background;
- blue background;
- dark background;
- in-app card/icon container.

Rules:

- symbol must stay readable at small size;
- no tiny text inside app icon;
- keep strong contrast;
- icon container radius should match Pack.it UI radii;
- final app icons must be exported as separate files, not cropped from a large preview board.

Required exports:

```text
180 × 180
192 × 192
512 × 512
favicon
```

## 6. Clear space

Clear space is based on one block unit from the symbol mark.

Rules:

- no text, borders, graphics or card edges should enter the clear space;
- clear space applies to horizontal, vertical and symbol-only versions;
- clear space must be preserved in document headers and app splash screens.

## 7. Minimum size

Minimum digital width:

```text
32 px
```

Minimum print width:

```text
10 mm
```

At smaller sizes:

- use symbol only;
- do not use full wordmark if readability is lost;
- do not use the Russian subtitle when it becomes unreadable.

## 8. Color palette

Approved palette from brand board:

```text
#0F1B2E  deep navy / primary dark
#2D3A4D  navy panel
#485C70  blue gray
#6A7C93  muted steel blue
#8FA0B2  soft steel
#E3E7EC  light surface
#FFFFFF  white
```

### Suggested token mapping

```text
--packit-brand-navy:        #0F1B2E;
--packit-brand-panel:       #2D3A4D;
--packit-brand-bluegray:    #485C70;
--packit-brand-steel:       #6A7C93;
--packit-brand-soft-steel:  #8FA0B2;
--packit-brand-light:       #E3E7EC;
--packit-brand-white:       #FFFFFF;
```

### UI usage

Deep navy:

- app shell;
- dark nav;
- dark header;
- app icon background;
- document dark footer/header.

Blue gray / steel colors:

- secondary panels;
- inactive icons;
- borders;
- muted UI imagery;
- technical illustrations.

Light surface / white:

- light theme backgrounds;
- cards;
- document surfaces.

Accent colors from UI system may still exist for workflow states:

- orange/accent for primary action;
- green for success/ready/money totals;
- red for delete/danger;
- yellow for warnings;
- blue for info/active states.

But branding itself should stay in the navy/steel/white family.

## 9. Typography

### Main custom wordmark

The `PACK.IT` wordmark is custom and should not be recreated using a normal font in UI.

Use exported SVG/PNG assets for the logo.

### Supporting UI font

Supporting font:

```text
Inter
```

Weights:

```text
Light / Regular / Medium / SemiBold / Bold
```

Rules:

- Inter remains the main application UI font;
- wordmark remains asset-based;
- do not stretch or fake the wordmark with CSS text;
- document templates may use Inter for all body/content text.

## 10. Brand essence

Pack.it means:

- panel of company control;
- structured system;
- under control;
- operational;
- reliable;
- from warehouse to completed projects.

UI language should support this:

- clear hierarchy;
- controlled layouts;
- predictable actions;
- visible statuses;
- calm professional density;
- no chaotic visual noise.

## 11. Usage rules

Allowed:

- use approved logo versions;
- use clear space;
- use approved palette;
- use symbol as app icon;
- use white version on dark background;
- use temporary navy/steel UI placeholders until final assets exist.

Not allowed:

- distort the logo;
- recolor the logo outside approved palette;
- place logo without clear space;
- add effects or outlines;
- use low contrast versions;
- use emoji as replacement for brand icons;
- crop logo from screenshots/boards;
- use giant preview boards as UI assets.

## 12. Dark mode preview direction

The dark mode preview from the board is approved as a strong navigation/footer direction.

Key elements:

- dark navy background;
- white symbol + wordmark;
- module icons divided by subtle vertical separators;
- labels with title + short description;
- clean technical SaaS style;
- no heavy gradients or decorative noise.

Example module labels from preview:

- Склад — Запасы и учёт;
- Сметы — Расчёты и сметы;
- Проекты — Планирование;
- Команда — Ресурсы и роли;
- Транспорт — Логистика;
- Документы — Файлы и договоры;
- События — Реализованные проекты.

This direction should influence:

- app topbar;
- nav rail icons;
- home launcher cards;
- document footer/header;
- app splash/launch screen.

## 13. Required asset files

Target files:

```text
public/assets/brand/packit-logo-horizontal.svg
public/assets/brand/packit-logo-horizontal-dark.svg
public/assets/brand/packit-logo-vertical.svg
public/assets/brand/packit-symbol.svg
public/assets/brand/packit-symbol-white.svg
public/assets/brand/packit-wordmark.svg
public/assets/brand/icon-180.png
public/assets/brand/icon-192.png
public/assets/brand/icon-512.png
public/assets/brand/favicon.ico
```

Optional exports:

```text
public/assets/brand/packit-logo-horizontal.png
public/assets/brand/packit-logo-horizontal.webp
public/assets/brand/packit-symbol-app-bg-navy.png
public/assets/brand/packit-symbol-app-bg-bluegray.png
```

## 14. Implementation notes

During migration:

- keep current root `icon-180.png`, `icon-192.png`, `icon-512.png` until references are safely migrated;
- add new assets under `public/assets/brand`;
- update `manifest.json` only after the new icon files exist;
- update app shell logo only after SVG assets are available;
- do not redraw logo in CSS;
- use assets as files.

## 15. Acceptance checklist

Brand implementation is accepted only when:

- logo files are separate assets;
- app icons are separate files;
- clear space is preserved;
- palette tokens are added;
- light/dark usage is tested;
- PWA icons are updated safely;
- old root icons are either migrated or kept as compatibility copies;
- no screenshot/brand board image is used directly as UI asset;
- shell/topbar/home use the approved Pack.it visual direction.

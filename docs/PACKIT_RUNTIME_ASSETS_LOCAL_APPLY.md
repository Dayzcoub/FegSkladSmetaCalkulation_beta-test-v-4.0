# Pack.it runtime assets local apply

The runtime asset package is:

```text
PACKIT_runtime_assets_ready_v1.zip
```

It contains binary PNG assets. These files should be added locally as a files-only commit, without UI logic changes.

## Why local apply

The package contains around 20 MB of PNG files. Uploading them one-by-one through the chat/GitHub API is too fragile and can corrupt or truncate binary content.

Use the local helper scripts instead.

## Windows PowerShell

Put the archive into the repository root:

```text
FegSkladSmetaCalkulation_beta-test-v-4.0/PACKIT_runtime_assets_ready_v1.zip
```

Run:

```powershell
cd FegSkladSmetaCalkulation_beta-test-v-4.0
powershell -ExecutionPolicy Bypass -File scripts/apply-packit-runtime-assets.ps1 -Force
```

Then check:

```powershell
git status
git add public/assets/packit docs/packit-runtime-assets-manifest.json docs/transparent_manifest.json
git commit -m "assets: add Pack.it runtime asset package"
git push
```

## macOS / Linux

Put the archive into the repository root:

```text
FegSkladSmetaCalkulation_beta-test-v-4.0/PACKIT_runtime_assets_ready_v1.zip
```

Run:

```bash
cd FegSkladSmetaCalkulation_beta-test-v-4.0
bash scripts/apply-packit-runtime-assets.sh
```

Then check:

```bash
git status
git add public/assets/packit docs/packit-runtime-assets-manifest.json docs/transparent_manifest.json
git commit -m "assets: add Pack.it runtime asset package"
git push
```

## Expected result

The repo should get:

```text
public/assets/packit/brand/...
public/assets/packit/empty-states/...
public/assets/packit/support/...
public/assets/packit/boards/...
docs/packit-runtime-assets-manifest.json
docs/transparent_manifest.json
```

Expected runtime asset file count under:

```text
public/assets/packit
```

is approximately:

```text
56 files
```

The whole archive contains 59 files including README/docs files.

## Do not change yet

Do not update in the same commit:

- `manifest.json`;
- `index.html`;
- app shell logo;
- PWA icons;
- UI logic;
- calculations;
- BOM;
- warehouse;
- PDF;
- backend writes.

This step is files-only.

## Next step after commit

After assets are in the repo, add a semantic asset resolver module:

```text
src/modules/PackitAssetManifest.js
```

Then update shell branding in a separate commit.

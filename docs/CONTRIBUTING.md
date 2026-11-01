# Contributing

See [SDK support](SDK_SUPPORT.md) for current toolchains and verified builds,
and [Decisions](DECISIONS.md) for the reasons behind the design.

## Repository structure

- `.github/workflows/build-expo-go.yml`: the single workflow.
- `scripts/`: release watch, APK verification, notes and catalog publishing.
- `releases/`: one note per SDK, with upstream announcement links.
- `web/`: the responsive download website.
- `apps.json` and `android.json`: published download catalogs.
- `tests/`: workflow, provenance, catalog and input validation.

## Build contract

Keep manual inputs to SDK choice and the optional release checkbox. Supported
SDKs are 52–58; default is 57. Settings resolve automatically in one case
statement. Check each branch's source and runner inventory before changing pins.

Compile the physical-device IPA on macOS, without Apple credentials or signing.
Preserve architecture, plist, bundle identity, SDK and ZIP verification. Older
SDK 52/53 use legacy app versions 2.32.x/2.33.x, which differ from the SDK number.
Keep the conditional SDK 56 SceneGeometry patch scoped to that SDK.

For Android, preserve Expo's original signed APK byte-for-byte. Verify its
official source, asset hash, size, signature, package, actual version and minimum
Android API. Record any known upstream version-label mismatch precisely.

Release publication waits for both platform jobs. Record actual Expo and builder
commits in notes even though the release tag references current main. This avoids
GitHub's workflow-scope restriction when the build commit is no longer branch HEAD.
Preserve existing release assets, download URLs and provenance.

The same workflow checks stable official versions every six hours. Do not guess
toolchains for future SDKs. Update the supported configurations and notes first.

## Website and catalogs

The website enables only verified published downloads. Keep one LiveContainer
source with a separate entry per SDK, preserving the actual bundle identifier.
Catalog writes use fresh metadata and compare-and-swap conflict retries.
Physical device installation is separate from build and browser evidence.

Use the installed UI primitives and the selected silver/glass artwork. Light and
dark themes share geometry. Keep keyboard navigation, reduced motion, self-hosted
fonts, source copying and useful static HTML. Keep local assistant instructions,
browser logs, caches, credentials and generated build output out of Git.

## Validation

Run `python -m unittest discover -s tests -v` and actionlint on the workflow.
In `web/`, run `npm test`, `npm run check` and `npm run build`.
Review actual browser renders on desktop, tablet and phone in both themes.
A passing source check cannot prove native compilation or device installation.


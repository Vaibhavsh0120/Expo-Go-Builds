# Build an IPA with GitHub Actions

## Start a build

1. Open this repository's **Actions** tab. Enable Actions if GitHub asks.
2. Select **Build Expo Go (unsigned IPA for Sideloadly)**. This is the only
   workflow; the previous SDK-57-only workflow was removed.
3. Click **Run workflow** and keep GitHub's **Use workflow from** set to `main`.
4. Select SDK **54, 55, 56, 57, or 58**. The default is **57**.
5. Optionally tick **Also publish this build as a GitHub Release (in
   addition to the always-uploaded Actions artifact)**.
6. Click **Run workflow**. You can close the page while the build runs.
7. After a successful run, open its summary and download the IPA artifact.

These are the only two build inputs. There is no source-ref or Xcode field.
The selected SDK determines its source branch, runner, Xcode, Node,
package manager, Ruby, plist generation, and minimum iOS automatically.
See [SDK_SUPPORT.md](SDK_SUPPORT.md) for the exact settings and build status.
Pushing a commit does not start a build; the workflow is manual only.

## The two inputs

| Input | Meaning | Default |
|---|---|---|
| `expo_sdk` | Match your project's SDK: 54, 55, 56, 57, or 58 | `57` |
| `create_release` | Attach this run's IPA to a new GitHub Release as well as its Actions artifact | `false` |

GitHub's standard branch selector is part of GitHub's interface, rather
than a custom build input. Use `main` to run the current workflow.

## Output and releases

For SDK `N`, the artifact is **`ExpoGo-SDKN-iOS`**, containing
**`ExpoGo-SDKN-unsigned.ipa`**. For example, SDK 54 produces
`ExpoGo-SDK54-iOS` / `ExpoGo-SDK54-unsigned.ipa`, and SDK 58 produces
`ExpoGo-SDK58-iOS` / `ExpoGo-SDK58-unsigned.ipa`.

Artifacts download inside GitHub's `.zip` wrapper. Unzip that wrapper once;
leave the resulting `.ipa` intact for Sideloadly. Artifacts are retained
for 30 days. A successful build uploads an artifact whether or not you
tick the release checkbox.

When publishing is selected, the same IPA is attached to a new release
tagged `expo-go-sdkN-<timestamp>`. Existing releases are preserved. The tag
targets the builder commit that ran; release notes also identify the
exact upstream Expo commit. An existing tag causes publishing to fail
instead of being overwritten.

Each release uses its [SDK-specific notes](../releases/README.md), with
Expo's original SDK release date and compatibility information. The
workflow appends the exact source and builder commits, Actions run,
actual Xcode, IPA size, and SHA-256. It compares published SDK tags before
setting Latest, so an older SDK build does not automatically take that
badge from a newer SDK.

All output is **unsigned** and must be signed locally before installation.
See [IPA_SIGNING.md](IPA_SIGNING.md).

Successful release publishing also refreshes the permanent
[LiveContainer source](https://raw.githubusercontent.com/Vaibhavsh0120/Expo-Go-IOS-IPA-Builder/main/apps.json).
Each published SDK is a separate install choice, sorted by SDK number.
The generator verifies the released IPAs and commits the catalog on
`main`; there is no additional workflow. Artifact-only builds do not
modify the catalog. See [LIVECONTAINER.md](LIVECONTAINER.md).

## Read the logs

The **Select SDK source and toolchain** job prints the resolved build
settings, then the macOS build job starts on its selected runner. The
**Record source commit and verify embedded SDK** step prints the upstream
SHA and rejects a checkout whose SDK metadata does not match the selection.

The **Select Xcode** step prints installed Xcodes and the selected version.
If GitHub removed the preferred app, the workflow warns and uses the
image's default. The final summary reports the actual selected version.
Future Xcode compatibility still requires a successful native build.

The validation and packaging steps print the binary architecture, Mach-O
metadata, bundle ID, app and SDK versions, minimum iOS, signing state,
ZIP checks, and IPA size. Inspect these when diagnosing an unexpected
artifact. Local configuration tests cannot replace an actual native build.

## Rerun or diagnose a failure

- For a transient failure, open the run and select **Re-run jobs** →
  **Re-run failed jobs**. This reuses that run's commit and inputs. To use
  an updated workflow, start a new run from `main` instead.
- To change the SDK or release checkbox, use **Run workflow** again.
- If CocoaPods or Xcode fails, download `failure-logs-sdkN` for the full
  `pod-install.log` / `xcodebuild.log`, when those steps produced logs.
  Failure logs are retained for seven days.
- Source/toolchain changes require a maintainer update to the single
  configuration case, rather than extra user inputs. Compare the live
  upstream branch with [SDK_SUPPORT.md](SDK_SUPPORT.md) first.

## Caches and build duration

The dependency cache uses the package manager's actual store path and is
keyed by OS, architecture, SDK, package-manager version, and lockfile hash.
CocoaPods caches are scoped by SDK, ref, and Podfile lockfile. Dependency
installation and `pod install` still run after cache restoration.

Earlier builds took roughly 60–150 minutes; new SDKs and cold caches can
take a different amount of time. Each native job has a 180-minute limit.
Rerunning the same SDK cancels an in-progress run for that SDK; different
SDKs can run independently.

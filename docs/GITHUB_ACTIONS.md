# Build and publish with GitHub Actions

Use [GitHub Releases](https://github.com/Vaibhavsh0120/Expo-Go-Builds/releases) for ready downloads.
There is one workflow: **Build Expo Go (iOS IPA + Android APK)**.

## Start a run

1. Open Actions → Build Expo Go → Run workflow on `main`.
2. Choose SDK **52–58** (default **57**).
3. Optionally tick **Also publish this build as a GitHub Release**.
4. Run it and wait for the platform jobs to finish.

These are the only two inputs. Source, runner, Xcode, Node, dependencies and
plist generation are automatic. [Settings and evidence](SDK_SUPPORT.md).

## Outputs

| Artifact | Contents |
|---|---|
| `ExpoGo-SDKN-iOS` | Unsigned IPA compiled from the recorded Expo commit |
| `ExpoGo-SDKN-Android` | Original Expo-signed APK and verification JSON |
| `ExpoGo-SDKN-upstream` | Fixed official versions and source metadata |

Successful platform jobs upload artifacts for 30 days, including when publishing
is off. Unzip GitHub's artifact wrapper once to get its files.

The Android job compares the official asset size and SHA-256, then verifies its
signature, package, app version and minimum Android API with Android SDK tools.
It preserves the APK unchanged. Platform app versions can differ within one SDK.

Publishing waits for **both** platform jobs. It attaches the IPA, APK and receipt,
with SDK notes, actual source and builder commits, Xcode, sizes and checksums.
Latest stays on the highest published SDK. Tags reference current `main`; notes
preserve the actual build commits. This avoids GitHub's workflow-permission
restriction on stale workflow commits. Existing release assets are preserved.

Publishing refreshes `apps.json` for LiveContainer and `android.json` for Android
downloads on `main`, with conflict retries. The website reads those catalogs.
IPAs need signing or configured LiveContainer import. APKs install directly on
compatible Android devices. Device launch testing is separate from file checks.

## Automatic release watch

The same workflow runs at **00:17, 06:17, 12:17 and 18:17 UTC**, subject to GitHub's
schedule delays. It checks stable official client versions and dispatches missing
or changed supported SDK pairs. Unchanged pairs and active builds are skipped.
Pushing alone does not start a native build.

An independent scheduled job also reconciles both catalogs from verified published
releases. It repairs feed updates after a transient publishing failure without
rebuilding native apps. Unchanged catalogs create no commit. Catalog reconciliation
and SDK publishers share a serialized queue that retains all pending jobs (up to
GitHub's queue limit), so a burst of completed SDK builds cannot replace a waiting
publisher.

Future SDKs need reviewed source/toolchain settings. Development or beta metadata
does not count as a stable release. A new stable SDK outside the supported range
is reported as needing configuration.

## Failures and reruns

- Start a new run on `main` to use updated workflow code. Re-running failed jobs uses the original commit and inputs.
- Failed iOS builds upload available pod-install and xcodebuild logs for seven days.
- Inspect configuration, source commit, selected Xcode, binary architecture, plist checks and the Android receipt.
- Same-SDK runs queue. Different SDKs run in parallel. Publication is serialized.
- Native jobs have a 180-minute limit; APK verification has a 30-minute limit.

See [Troubleshooting](TROUBLESHOOTING.md) and [SDK support](SDK_SUPPORT.md).

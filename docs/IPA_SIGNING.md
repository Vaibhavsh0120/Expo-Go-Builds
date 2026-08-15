# IPA_SIGNING.md

## What an unsigned IPA is

An `.ipa` is just a renamed `.zip` containing a `Payload/` folder with the
compiled `.app` bundle inside. iOS refuses to run *any* app binary unless
it's cryptographically signed by a certificate iOS trusts — normally one
issued by Apple to a registered developer.

This workflow builds the `.app` with `CODE_SIGNING_ALLOWED=NO` and related
flags, meaning `xcodebuild` compiles and links the binary but never signs
it. The resulting `.ipa` is real, structurally valid, and fully compiled
— but not signed, so it cannot be installed on a device as-is. The
workflow's build summary and validation output both label it explicitly:
**"Unsigned physical-device IPA — requires signing before installation."**

## Why GitHub Actions doesn't sign it

Signing requires an Apple ID and, typically, an Apple Developer Program
membership (or at minimum a free/personal Apple ID used through a signing
tool). Doing this inside CI would mean putting your Apple credentials — or
a certificate/private key derived from them — into a GitHub Secret, where
an automated system holds and uses them unattended.

**This repository will never ask for that.** No step in this pipeline
requests or stores an Apple ID password, a 2FA/verification code, a `.p12`
certificate, a private key, or a provisioning profile. Compilation
(needs macOS, doesn't need your Apple identity) and signing (needs your
Apple identity, doesn't need macOS) are deliberately kept as separate
stages, run on separate machines, by design — not as a limitation to work
around.

## How Sideloadly can be used afterward

[Sideloadly](https://sideloadly.io/) is a free, third-party Windows/macOS
tool that signs an `.ipa` using your Apple ID and installs it to a
connected iPhone/iPad over USB. It is **not an official Apple product** —
it reimplements Apple's developer-signing protocol using your Apple ID
credentials, entered locally into the Sideloadly app on your own machine,
never sent to or stored by this repository or GitHub Actions.

Basic flow:

1. Download the `.ipa` from this workflow's Actions artifact (or the
   existing "SDK 57 for iOS" Release).
2. Open Sideloadly, connect your iPhone/iPad via USB.
3. Drag the `.ipa` into Sideloadly, enter your Apple ID when prompted.
4. Click Start. Sideloadly signs the IPA locally and installs it via USB.

## Why Apple ID signing is handled locally

Because Sideloadly runs on your own Windows machine, your Apple ID
credentials never leave your computer or touch this repository, GitHub's
servers, or the GitHub Actions runner. The only thing that crosses that
boundary is the already-compiled, unsigned `.ipa` file — which contains no
credentials of any kind.

## Free Apple ID signing limitations

These are Apple-imposed restrictions on *any* app signed with a
free/personal-team Apple ID (not something Sideloadly or this repo could
remove even if they wanted to):

- **7-day expiration.** Apps signed this way stop launching after 7 days.
  To refresh: reopen Sideloadly, re-drag the same `.ipa`, click Start again
  — no need to re-run the GitHub Actions build unless you specifically want
  a newer source commit.
- **3 actively-signed apps at a time**, per free Apple ID.
- **10 App ID registrations per rolling 7-day window**, per free Apple ID.
  If Sideloadly errors about a maximum number of apps or App IDs, this is
  the cause — free up a slot at
  [appleid.apple.com](https://appleid.apple.com) → Sign-In and Security, or
  wait out the window.
- **No entitlements a paid Developer Program membership would unlock** —
  see the next section.

None of this is specific to SDK 56 vs. SDK 57 — it applies identically to
both, and to Expo Go builds from any source, sideloaded this way.

## What's unavailable after a free-Apple-ID resign

Expo Go's real entitlements file (`Exponent.entitlements`) requests Push
Notifications, Sign In with Apple, Associated Domains (universal links to
`expo.dev`/`exp.host`), and iCloud — none of which a free Apple ID can be
granted (an Apple Developer Program restriction, not a bug in this
pipeline). This workflow builds with `CODE_SIGN_ENTITLEMENTS=""`
specifically so nothing tries to bake those requests into the unsigned
binary; Sideloadly then signs with whatever minimal entitlement set its
own free provisioning profile supports.

**What breaks:**
- Push notifications (needs `aps-environment`, paid-team only).
- Sign In with Apple, inside Expo Go's own account screen.
- Universal links (`https://expo.dev/...` opening directly in-app — needs
  Associated Domains, paid-team only). The `exp://` custom URL scheme —
  what QR-code scanning and "Open in Expo Go" links actually use
  day-to-day — is **not affected**, since it's a plain custom scheme, not
  an entitlement.
- Any iCloud-backed features used internally by the client.

**What works:** scanning a QR code or typing an `exp://` dev-server URL,
loading and running your JS bundle via Metro, the in-app dev menu, fast
refresh, and standard Expo SDK module functionality inside a running
project — i.e., the actual point of Expo Go for day-to-day development.

## How to trust the developer profile on iOS

After Sideloadly installs the app, iOS will refuse to launch it until you
explicitly trust the signing identity:

**Settings → General → VPN & Device Management** (labeled "Profiles &
Device Management" on some iOS versions) **→** tap your Apple ID under
**Developer App** **→ Trust "\<your Apple ID\>"** **→** confirm.

Then launch Expo Go from the Home Screen as normal.

## How to reinstall/refresh the app when necessary

- **After the 7-day expiration**: reopen Sideloadly, re-drag the same
  `.ipa` file you already have, click Start. No rebuild needed.
- **To get a newer SDK patch/commit**: re-run the GitHub Actions workflow
  (same `expo_sdk` input), download the new artifact, then sideload that
  one instead.
- **If the app won't launch after a resign**: re-check the trust step
  above first — a stale/untrusted profile is the most common cause, not a
  build problem.

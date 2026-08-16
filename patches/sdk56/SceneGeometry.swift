// ─────────────────────────────────────────────────────────────────────────
// PATCH PROVENANCE — read this before touching this file.
//
// This is a verbatim copy of packages/expo-modules-core/ios/Utilities/
// SceneGeometry.swift as it exists on expo/expo's `main` branch (commit
// 1c4406337abe95be4c154fb1a112d0ee597d199f, 2026-08-16).
//
// WHY THIS FILE EXISTS IN THIS REPO:
// expo/expo's `sdk-56` release branch backported commit 735ce71
// ("[ios][screen-capture] Resolve the key window from the foregrounded
// scene (#48372)", 2026-08-13) into packages/expo-screen-capture, which
// changed ScreenCaptureModule.swift to call `SceneGeometry.keyWindow()`.
// That backport touched ONLY expo-screen-capture -- it did NOT also bring
// over this SceneGeometry.swift utility file from expo-modules-core, which
// SceneGeometry is defined in on `main` but does not exist anywhere on
// `sdk-56` (verified: `git ls-tree -r sdk-56` has zero files matching
// "SceneGeometry" as of sdk-56 commit 21be29ff, 2026-08-14). The result is
// a genuine compile failure on an unmodified `sdk-56` checkout:
//   "cannot find 'SceneGeometry' in scope"
//   at packages/expo-screen-capture/ios/ScreenCaptureModule.swift:14
//
// This is an upstream inconsistency in Expo's own release branch, not
// something introduced by this repository's build process or config.
// See docs/SDK_56.md and docs/TROUBLESHOOTING.md for the full writeup,
// and consider filing this upstream at github.com/expo/expo/issues if it's
// still unfixed by the time you read this.
//
// HOW THIS FILE IS USED:
// The "Apply known SDK 56 source patches" step in
// .github/workflows/build-expo-go.yml copies this file to
// expo-src/packages/expo-modules-core/ios/Utilities/SceneGeometry.swift
// -- but ONLY if that path doesn't already exist in the checked-out
// expo-src tree. If Expo fixes the incomplete backport upstream (i.e.
// adds this file to sdk-56 themselves), that check will see the file
// already exists and skip this patch entirely -- so this patch is
// self-deprecating and won't conflict with, duplicate, or shadow an
// upstream fix once one lands. You should still periodically check
// whether the upstream fix has landed and remove this patch file +
// its workflow step once it has, to stop tracking a stale copy.
//
// This file was NOT verified by an actual Xcode compile in this
// environment (no macOS/Xcode available here) -- it was verified by
// direct source comparison only: it's self-contained (imports only
// UIKit, references no other main-only-added symbols), and it's the
// exact same content actively compiling as part of expo/expo's own
// `main` branch. If it still fails to build for some other reason
// (e.g. a Swift/SDK version difference between `main` and `sdk-56`'s
// toolchain), see docs/TROUBLESHOOTING.md for the pinned-commit
// fallback (build expo_ref: c87637c7ae07b8e38786015c481250aa5f03da4b,
// the last sdk-56 commit before the broken backport landed).
// ─────────────────────────────────────────────────────────────────────────

// Copyright 2026-present 650 Industries. All rights reserved.

#if os(iOS) || os(tvOS)

import UIKit

/**
 Geometry lookups that start from the view asking the question, because iOS 27 makes iPhone apps
 freely resizable. Neither `UIScreen.main` nor the first key window in any connected scene describes
 the space a given view has, since either can belong to a differently sized scene.
 */
public enum SceneGeometry {
  public static func windowScene(for view: UIView? = nil) -> UIWindowScene? {
    if let scene = view?.window?.windowScene {
      return scene
    }
    return foregroundScene() ?? windowScenes().first
  }

  /// Deliberately strict, for callers deciding whether to attach a window to a scene at all.
  public static func foregroundActiveScene() -> UIWindowScene? {
    return windowScenes().first { $0.activationState == .foregroundActive }
  }

  /// Nil when no scene is on screen, so callers don't present UI into a background scene.
  public static func foregroundScene() -> UIWindowScene? {
    let scenes = windowScenes()
    return scenes.first { $0.activationState == .foregroundActive }
      ?? scenes.first { $0.activationState == .foregroundInactive }
  }

  private static func windowScenes() -> [UIWindowScene] {
    return UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
  }

  public static func keyWindow(for view: UIView? = nil) -> UIWindow? {
    guard let scene = windowScene(for: view) else {
      return nil
    }
    return scene.windows.first { $0.isKeyWindow } ?? scene.windows.first
  }

  public static func bounds(for view: UIView? = nil) -> CGRect {
    return (view?.window ?? keyWindow(for: view))?.bounds ?? .zero
  }

  public static func safeAreaSize(for view: UIView? = nil) -> CGSize {
    guard let window = view?.window ?? keyWindow(for: view) else {
      return .zero
    }
    let safeArea = window.safeAreaLayoutGuide.layoutFrame.size
    if safeArea.width > 0 && safeArea.height > 0 {
      return safeArea
    }
    return window.bounds.size
  }

  /// Never cache the result. Scale can differ per scene.
  public static func displayScale(for view: UIView? = nil) -> CGFloat {
    return resolveDisplayScale(candidates: [
      view?.traitCollection.displayScale,
      windowScene(for: view)?.traitCollection.displayScale,
      UITraitCollection.current.displayScale
    ])
  }

  /// Returns the first positive candidate. `UITraitCollection` reports an unspecified scale as 0.
  internal static func resolveDisplayScale(candidates: [CGFloat?]) -> CGFloat {
    for case let candidate? in candidates where candidate > 0 {
      return candidate
    }
    return 1
  }
}

#if os(iOS)
public extension SceneGeometry {
  /// Reads `effectiveGeometry` because `UIWindowScene.interfaceOrientation` is deprecated as of iOS 26.
  static func interfaceOrientation(for view: UIView? = nil) -> UIInterfaceOrientation {
    return windowScene(for: view)?.effectiveGeometry.interfaceOrientation ?? .unknown
  }
}
#endif

#endif

"""Resolve released SDK metadata or dispatch missing SDK pairs from one workflow."""

import argparse
import json
import os
from pathlib import Path
import re

from android_release import SUPPORTED_SDKS, VERSIONS_URL, marker, official_metadata, request_json


def release_has_pair(release, sdk, metadata):
    if release.get("draft") or release.get("prerelease"):
        return False
    if not re.fullmatch(rf"expo-go-sdk{sdk}-.+", release.get("tag_name", "")):
        return False
    names = {asset["name"] for asset in release.get("assets", []) if asset.get("state") == "uploaded"}
    return {f"ExpoGo-SDK{sdk}-unsigned.ipa", f"ExpoGo-SDK{sdk}.apk", f"ExpoGo-SDK{sdk}-android.json"}.issubset(names) and marker(metadata) in (release.get("body") or "")


def pending_sdks(versions, releases, active=()):
    pending = []
    for sdk in sorted(SUPPORTED_SDKS, reverse=True):
        if f"{sdk}.0.0" not in versions.get("sdkVersions", {}):
            continue
        metadata = official_metadata(sdk, versions)
        if sdk not in active and not any(release_has_pair(r, sdk, metadata) for r in releases):
            pending.append(sdk)
    return pending


def unreviewed_releases(versions):
    unknown = []
    for key, entry in versions.get("sdkVersions", {}).items():
        if not re.fullmatch(r"\d+\.0\.0", key):
            continue
        sdk = int(key.split(".")[0])
        if sdk <= max(SUPPORTED_SDKS):
            continue
        # The API can contain SDK development entries before a stable client
        # exists. Those are not release events and must not trigger builds.
        if all(re.fullmatch(rf"{sdk}\.\d+\.\d+", entry.get(field, ""))
               for field in ("iosClientVersion", "androidClientVersion")):
            unknown.append(sdk)
    return sorted(unknown)


def all_releases(repo):
    result = []
    for page in range(1, 100):
        batch = request_json(f"https://api.github.com/repos/{repo}/releases?per_page=100&page={page}", authenticated=True)
        result.extend(batch)
        if len(batch) < 100:
            return result
    raise ValueError("Unexpected release pagination limit")


def resolve(sdk, output):
    metadata = official_metadata(sdk, request_json(VERSIONS_URL))
    ref = request_json(f"https://api.github.com/repos/expo/expo/git/ref/heads/sdk-{sdk}", authenticated=True)
    sha = ref["object"]["sha"]
    if not re.fullmatch(r"[a-f0-9]{40}", sha):
        raise ValueError("Expected a full upstream source commit")
    metadata["sourceSHA"] = sha
    output.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as stream:
            stream.write(f"source_sha={sha}\n")
    print(f"SDK {sdk}: pinned expo/expo@{sha}; official Android {metadata['androidClientVersion']}")


def watch(repo):
    if not re.fullmatch(r"[\w.-]+/[\w.-]+", repo):
        raise ValueError("Expected owner/repository")
    versions = request_json(VERSIONS_URL)
    base = f"https://api.github.com/repos/{repo}"
    active = set()
    for status in ("in_progress", "queued", "waiting", "requested", "pending"):
        runs = request_json(f"{base}/actions/workflows/build-expo-go.yml/runs?status={status}&per_page=100", authenticated=True)
        for run in runs.get("workflow_runs", []):
            match = re.match(r"SDK (\d+) ", run.get("display_title", ""))
            if match:
                active.add(int(match[1]))
    pending = pending_sdks(versions, all_releases(repo), active)
    for sdk in pending:
        request_json(f"{base}/actions/workflows/build-expo-go.yml/dispatches",
                     {"ref": "main", "inputs": {"expo_sdk": str(sdk), "create_release": "true"}}, "POST", authenticated=True)
        print(f"Dispatched SDK {sdk}: iOS IPA + verified official signed APK")
    unknown = unreviewed_releases(versions)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as stream:
            stream.write("## Upstream SDK release watch\n\n")
            stream.write(f"Dispatched SDKs: {', '.join(map(str, pending)) or 'none (published pairs are current or builds are active)'}.\n")
            if unknown:
                stream.write(f"SDKs {unknown} need a reviewed native toolchain configuration before automation can build them.\n")
    if unknown:
        raise ValueError(f"New SDKs {unknown} need reviewed native toolchain settings; refusing to guess Xcode compatibility")
    print("Release watch complete; unchanged SDKs do not start native builds")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sdk", type=int)
    parser.add_argument("--output", type=Path, default=Path("upstream.json"))
    parser.add_argument("--watch", action="store_true")
    parser.add_argument("--repo", default=os.environ.get("GITHUB_REPOSITORY", "Vaibhavsh0120/Expo-Go-IOS-IPA-Builder"))
    args = parser.parse_args()
    if args.watch:
        watch(args.repo)
    elif args.sdk is not None:
        resolve(args.sdk, args.output)
    else:
        parser.error("Choose --sdk or --watch")


if __name__ == "__main__":
    main()

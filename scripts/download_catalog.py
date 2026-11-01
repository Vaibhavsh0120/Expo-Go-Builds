"""Publish Android download metadata only after verified release assets exist."""

import argparse
import base64
import json
from pathlib import Path
import re
import time
import urllib.error
import urllib.request

from livecontainer_source import GitHub, DEFAULT_REPO, SUPPORTED_SDKS


def read_receipt(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Expo-Go-Downloads"}), timeout=90) as response:
        return json.load(response)


def build_catalog(releases, repo, fetch=read_receipt):
    selected = {}
    for release in releases:
        match = re.fullmatch(r"expo-go-sdk(\d+)-.+", release.get("tag_name", ""))
        if release.get("draft") or release.get("prerelease") or not match:
            continue
        sdk = int(match[1])
        if sdk not in SUPPORTED_SDKS:
            continue
        assets = {a["name"]: a for a in release.get("assets", []) if a.get("state") == "uploaded"}
        apk = assets.get(f"ExpoGo-SDK{sdk}.apk")
        receipt_asset = assets.get(f"ExpoGo-SDK{sdk}-android.json")
        if not apk or not receipt_asset:
            continue
        prefix = f"https://github.com/{repo}/releases/download/{release['tag_name']}/"
        if any(not a["browser_download_url"].startswith(prefix) for a in (apk, receipt_asset)):
            raise ValueError("Unexpected Android release asset URL")
        receipt = fetch(receipt_asset["browser_download_url"])
        if (receipt.get("sdk") != sdk or receipt.get("signatureVerified") is not True
                or receipt.get("packageName") != "host.exp.exponent"
                or receipt.get("size") != apk["size"]
                or apk.get("digest") != "sha256:" + receipt.get("sha256", "")
                or not re.fullmatch(r"[a-f0-9]{64}", receipt.get("sha256", ""))
                or not receipt.get("certificateSHA256")):
            raise ValueError(f"SDK {sdk} APK and verification receipt differ")
        if sdk in selected and release["published_at"] <= selected[sdk]["date"]:
            continue
        selected[sdk] = {key: receipt[key] for key in (
            "sdk", "version", "minSdkVersion", "packageName", "size", "sha256",
            "certificateSHA256", "androidClientUrl", "origin")}
        selected[sdk].update(downloadURL=apk["browser_download_url"],
                             releaseURL=release["html_url"], date=release["published_at"],
                             signatureVerified=True)
    return {"name": "Expo Go Android downloads", "builds": [selected[sdk] for sdk in sorted(selected, reverse=True)]}


def publish(github):
    if not github.token:
        raise ValueError("GH_TOKEN with contents:write is required")
    for attempt in range(4):
        try:
            current = github.request("contents/android.json?ref=main")
        except urllib.error.HTTPError as error:
            if error.code != 404:
                raise
            current = None
        catalog = build_catalog(github.releases(), github.repo)
        if not catalog["builds"]:
            raise ValueError("No verified published APKs; refusing to empty the catalog")
        content = (json.dumps(catalog, indent=2) + "\n").encode()
        if current and base64.b64decode(current["content"]) == content:
            return catalog
        body = {"branch": "main", "message": "chore: refresh verified Android downloads",
                "content": base64.b64encode(content).decode()}
        if current:
            body["sha"] = current["sha"]
        try:
            github.request("contents/android.json", body)
            return catalog
        except urllib.error.HTTPError as error:
            if error.code not in {409, 422} or attempt == 3:
                raise
            time.sleep(1)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", default=DEFAULT_REPO)
    parser.add_argument("--output", type=Path, default=Path("android.json"))
    parser.add_argument("--publish", action="store_true")
    args = parser.parse_args()
    github = GitHub(args.repo)
    catalog = publish(github) if args.publish else build_catalog(github.releases(), github.repo)
    args.output.write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")
    print("Verified Android SDKs: " + ", ".join(str(b["sdk"]) for b in catalog["builds"]))


if __name__ == "__main__":
    main()

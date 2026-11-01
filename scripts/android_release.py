"""Verify and mirror Expo's original signed Android APK; never re-sign it."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import urllib.parse
import urllib.request
import zipfile

VERSIONS_URL = "https://exp.host/--/api/v2/versions"
OFFICIAL_REPO = "expo/expo-go-releases"
SUPPORTED_SDKS = {52, 53, 54, 55, 56, 57, 58}
USER_AGENT = "Expo-Go-Downloads"
# Expo labels this historical download 2.32.20 while its signed manifest says
# 2.32.19. Permit only these exact official bytes, not arbitrary mismatches.
KNOWN_INTERNAL_VERSIONS = {
    (52, "2.32.20", "217621eb008e22146470336761f9fe5f69e20c608f4595b088be6bc7bfe775f9"): "2.32.19",
}


def request_json(url, body=None, method=None, authenticated=False):
    headers = {"User-Agent": USER_AGENT, "Accept": "application/vnd.github+json"}
    token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    if authenticated and token:
        headers["Authorization"] = "Bearer " + token
    data = None if body is None else json.dumps(body).encode()
    if data is not None:
        headers["Content-Type"] = "application/json"
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers, data=data, method=method), timeout=90) as response:
        return None if response.status == 204 else json.load(response)


def official_metadata(sdk, versions):
    if sdk not in SUPPORTED_SDKS:
        raise ValueError(f"SDK {sdk} needs a reviewed builder configuration")
    entry = versions.get("sdkVersions", {}).get(f"{sdk}.0.0", {})
    android = entry.get("androidClientVersion", "")
    ios = entry.get("iosClientVersion", "")
    expected_prefix = "2.32." if sdk == 52 else "2.33." if sdk == 53 else f"{sdk}."
    for version in (android, ios):
        if not re.fullmatch(r"\d+\.\d+\.\d+", version) or not version.startswith(expected_prefix):
            raise ValueError(f"SDK {sdk} is missing stable official client versions")
    expected_url = f"https://github.com/{OFFICIAL_REPO}/releases/download/Expo-Go-{android}/Expo-Go-{android}.apk"
    if entry.get("androidClientUrl") != expected_url:
        raise ValueError("Unexpected Android asset origin or SDK version in Expo metadata")
    return {"sdk": sdk, "iosClientVersion": ios, "androidClientVersion": android,
            "androidClientUrl": expected_url, "versionsURL": VERSIONS_URL}


def marker(metadata):
    identity = {key: metadata[key] for key in ("sdk", "iosClientVersion", "androidClientVersion")}
    return "<!-- expo-go-upstream: " + json.dumps(identity, sort_keys=True, separators=(",", ":")) + " -->"


def official_asset(metadata):
    version = metadata["androidClientVersion"]
    release = request_json(f"https://api.github.com/repos/{OFFICIAL_REPO}/releases/tags/Expo-Go-{version}", authenticated=True)
    if release.get("draft") or release.get("prerelease"):
        raise ValueError("Refusing an unpublished or prerelease APK")
    asset = next((a for a in release["assets"] if a["name"] == f"Expo-Go-{version}.apk" and a.get("state") == "uploaded"), None)
    if not asset or asset["browser_download_url"] != metadata["androidClientUrl"]:
        raise ValueError("Official release does not contain the expected APK")
    if not re.fullmatch(r"sha256:[a-f0-9]{64}", asset.get("digest") or ""):
        raise ValueError("Official APK has no trustworthy SHA-256 asset digest")
    return asset


def digest_file(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def android_tool(name):
    direct = shutil.which(name)
    if direct:
        return direct
    suffix = ".bat" if os.name == "nt" and name == "apksigner" else ".exe" if os.name == "nt" else ""
    for env in ("ANDROID_HOME", "ANDROID_SDK_ROOT"):
        root = os.environ.get(env)
        if not root:
            continue
        candidates = list((Path(root) / "build-tools").glob("*/" + name + suffix))
        if candidates:
            return str(sorted(candidates, key=lambda p: tuple(int(x) if x.isdigit() else 0 for x in re.split(r"[.-]", p.parent.name)))[-1])
    raise ValueError(f"Android SDK build-tools required: {name} missing (set ANDROID_HOME)")


def verify_apk(path, sdk):
    # apksigner verifies the APK's actual signed bytes, including v2/v3 when present.
    signature = subprocess.run([android_tool("apksigner"), "verify", "--verbose", "--print-certs", str(path)], check=True, capture_output=True, text=True).stdout
    certificates = re.findall(r"(?:Signer #\d+|V\d(?:\.\d+)? Signer):? certificate SHA-256 digest: ([a-fA-F0-9]+)", signature)
    if not certificates or not any(line.endswith("true") for line in signature.splitlines() if "Verified using v" in line):
        raise ValueError("APK has no verified signer certificate")
    badging = subprocess.run([android_tool("aapt"), "dump", "badging", str(path)], check=True, capture_output=True, text=True).stdout
    package = re.search(r"^package: name='([^']+)'.*versionCode='([^']+)'.*versionName='([^']+)'", badging, re.MULTILINE)
    minimum = re.search(r"^sdkVersion:'(\d+)'", badging, re.MULTILINE)
    if not package or package[1] != "host.exp.exponent" or (sdk >= 54 and package[3].split(".")[0] != str(sdk)) or not minimum:
        raise ValueError("Actual APK package, SDK version, or Android requirement does not match")
    with zipfile.ZipFile(path) as archive:
        if "AndroidManifest.xml" not in archive.namelist() or "classes.dex" not in archive.namelist():
            raise ValueError("APK is not an installable Android application")
    return {"packageName": package[1], "versionCode": package[2], "version": package[3],
            "minSdkVersion": int(minimum[1]), "certificateSHA256": sorted(set(c.lower().zfill(64) for c in certificates)),
            "signatureVerified": True}


def prepare(metadata, output):
    asset = official_asset(metadata)
    output.mkdir(parents=True, exist_ok=True)
    path = output / f"ExpoGo-SDK{metadata['sdk']}.apk"
    expected = asset["digest"].split(":", 1)[1]
    if not path.exists() or path.stat().st_size != asset["size"] or digest_file(path) != expected:
        partial = path.with_suffix(".part")
        # Download publicly: never forward an API credential to a redirect host.
        with urllib.request.urlopen(urllib.request.Request(asset["browser_download_url"], headers={"User-Agent": USER_AGENT}), timeout=180) as response, partial.open("wb") as stream:
            shutil.copyfileobj(response, stream)
        if partial.stat().st_size != asset["size"] or digest_file(partial) != expected:
            raise ValueError("Downloaded APK differs from the official GitHub asset digest/size")
        partial.replace(path)
    receipt = {**metadata, **verify_apk(path, metadata["sdk"]), "filename": path.name,
               "size": path.stat().st_size, "sha256": expected, "officialAssetId": asset["id"],
               "origin": "Original Expo-signed APK, mirrored byte-for-byte; not built or re-signed by this repository."}
    if receipt["version"] != metadata["androidClientVersion"]:
        key = (metadata["sdk"], metadata["androidClientVersion"], expected)
        if KNOWN_INTERNAL_VERSIONS.get(key) != receipt["version"]:
            raise ValueError("APK version differs from official versions API")
        receipt["versionMetadataNote"] = ("Expo labels this verified historical download "
                                          f"{metadata['androidClientVersion']}; its signed APK manifest reports {receipt['version']}.")
    (output / f"ExpoGo-SDK{metadata['sdk']}-android.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    return path, receipt


def android_notes(receipt):
    return f"""### Android APK

Original **Expo-signed APK**, mirrored byte-for-byte from [Expo's official release]({receipt['androidClientUrl']}). This APK was not compiled or re-signed by this repository. The iOS IPA above is our separate community build; platform app versions can differ within the same SDK.

| Item | Value |
|---|---|
| APK | `{receipt['filename']}` |
| Android app version | `{receipt['version']}` |
| Official download label | `{receipt['androidClientVersion']}` |
| Package | `{receipt['packageName']}` |
| Minimum Android API | {receipt['minSdkVersion']} |
| Size | {receipt['size']:,} bytes |
| SHA-256 | `{receipt['sha256']}` |
| Verified signer SHA-256 | `{', '.join(receipt['certificateSHA256'])}` |

Open the APK on Android and allow installation from the browser/file manager if asked. It retains Expo's original signature. An incompatible existing app signature may require uninstalling that app first. Device launch testing is separate from file and signature verification.
""" + ("\n" + receipt["versionMetadataNote"] + "\n" if receipt.get("versionMetadataNote") else "")


def publish_existing(repo, sdk, path, receipt):
    if not re.fullmatch(r"[\w.-]+/[\w.-]+", repo):
        raise ValueError("Expected owner/repository")
    releases = request_json(f"https://api.github.com/repos/{repo}/releases?per_page=100", authenticated=True)
    matches = [r for r in releases if not r.get("draft") and not r.get("prerelease") and re.fullmatch(rf"expo-go-sdk{sdk}-.+", r["tag_name"])]
    if not matches:
        raise ValueError(f"SDK {sdk} has no published iOS release to extend")
    release = max(matches, key=lambda r: r["published_at"])
    existing = next((a for a in release["assets"] if a["name"] == path.name), None)
    if existing and existing.get("digest") != "sha256:" + receipt["sha256"]:
        raise ValueError("Existing APK differs; refusing to delete or replace a published asset")
    if not existing:
        token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
        if not token:
            raise ValueError("GH_TOKEN with contents:write is required to publish")
        url = release["upload_url"].split("{", 1)[0] + "?" + urllib.parse.urlencode({"name": path.name})
        request = urllib.request.Request(url, data=path.read_bytes(), headers={"Authorization": "Bearer " + token, "User-Agent": USER_AGENT, "Content-Type": "application/vnd.android.package-archive"}, method="POST")
        with urllib.request.urlopen(request, timeout=300) as response:
            uploaded = json.load(response)
        if uploaded.get("digest") != "sha256:" + receipt["sha256"] or uploaded["size"] != receipt["size"]:
            raise ValueError("Published APK receipt differs from verified original")
    receipt = {**receipt, "downloadURL": f"https://github.com/{repo}/releases/download/{release['tag_name']}/{path.name}"}
    receipt_path = path.with_name(f"ExpoGo-SDK{sdk}-android.json")
    receipt_path.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    receipt_asset = next((a for a in release["assets"] if a["name"] == receipt_path.name), None)
    if not receipt_asset:
        upload_url = release["upload_url"].split("{", 1)[0] + "?" + urllib.parse.urlencode({"name": receipt_path.name})
        token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
        request = urllib.request.Request(upload_url, data=receipt_path.read_bytes(), headers={"Authorization": "Bearer " + token, "User-Agent": USER_AGENT, "Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(request, timeout=90) as response:
            json.load(response)
    start, end = "<!-- android-provenance:start -->", "<!-- android-provenance:end -->"
    body = release.get("body") or ""
    block = start + "\n" + android_notes(receipt) + "\n" + marker(receipt) + "\n" + end
    body = re.sub(re.escape(start) + r".*?" + re.escape(end), lambda _: block, body, flags=re.DOTALL) if start in body else body.rstrip() + "\n\n" + block
    request_json(f"https://api.github.com/repos/{repo}/releases/{release['id']}", {"name": f"Expo Go SDK {sdk} for iOS and Android", "body": body}, "PATCH", authenticated=True)
    print(f"Verified APK published with SDK {sdk}: {release['html_url']}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sdk", type=int, required=True)
    parser.add_argument("--metadata", type=Path)
    parser.add_argument("--output-dir", type=Path, default=Path("apk-output"))
    parser.add_argument("--publish-existing", action="store_true")
    parser.add_argument("--repo", default="Vaibhavsh0120/Expo-Go-IOS-IPA-Builder")
    args = parser.parse_args()
    metadata = json.loads(args.metadata.read_text(encoding="utf-8")) if args.metadata else official_metadata(args.sdk, request_json(VERSIONS_URL))
    if metadata["sdk"] != args.sdk:
        raise ValueError("Metadata SDK mismatch")
    path, receipt = prepare(metadata, args.output_dir)
    print(json.dumps(receipt, indent=2))
    if args.publish_existing:
        publish_existing(args.repo, args.sdk, path, receipt)


if __name__ == "__main__":
    main()

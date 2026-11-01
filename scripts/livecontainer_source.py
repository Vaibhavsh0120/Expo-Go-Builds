"""Build and optionally publish a LiveContainer catalog from verified released IPAs."""

import argparse
import base64
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import os
from pathlib import Path
import plistlib
import re
import shutil
import tempfile
import time
import urllib.error
import urllib.request
import zipfile


SUPPORTED_SDKS = {52, 53, 54, 55, 56, 57, 58}
DEFAULT_REPO = "Vaibhavsh0120/Expo-Go-IOS-IPA-Builder"


def select_releases(releases: list[dict], repo: str) -> dict[int, dict]:
    selected = {}
    for release in releases:
        if release.get("draft") or release.get("prerelease"):
            continue
        match = re.fullmatch(r"expo-go-sdk(\d+)-.+", release["tag_name"])
        if not match or int(match[1]) not in SUPPORTED_SDKS:
            continue
        sdk = int(match[1])
        asset = next((asset for asset in release.get("assets", [])
                      if asset["name"] == f"ExpoGo-SDK{sdk}-unsigned.ipa"
                      and asset.get("state") == "uploaded"), None)
        if not asset:
            continue
        expected_prefix = f"https://github.com/{repo}/releases/download/{release['tag_name']}/"
        if not asset["browser_download_url"].startswith(expected_prefix):
            raise ValueError(f"Unexpected IPA host/path for SDK {sdk}")
        if sdk not in selected or release["published_at"] > selected[sdk]["published_at"]:
            selected[sdk] = {**release, "ipa_asset": asset}
    return dict(sorted(selected.items(), reverse=True))


def verify_asset(path: Path, asset: dict) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    if path.stat().st_size != asset["size"]:
        raise ValueError(f"IPA size differs from GitHub asset: {path.name}")
    expected = asset.get("digest")
    if not expected or expected != "sha256:" + digest.hexdigest():
        raise ValueError(f"IPA SHA-256 differs from GitHub asset: {path.name}")
    return digest.hexdigest()


def ipa_metadata(path: Path, sdk: int) -> dict:
    with zipfile.ZipFile(path) as archive:
        roots = [name for name in archive.namelist()
                 if re.fullmatch(r"Payload/[^/]+\.app/Info\.plist", name)]
        if len(roots) != 1:
            raise ValueError("Expected exactly one app Info.plist in the IPA")
        info = plistlib.loads(archive.read(roots[0]))
    version = str(info["CFBundleShortVersionString"])
    legacy = {52: "2.32.", 53: "2.33."}
    valid_version = version.startswith(legacy[sdk]) if sdk in legacy else version.split(".")[0] == str(sdk)
    if info["CFBundleIdentifier"] != "host.exp.Exponent" or not valid_version:
        raise ValueError(f"IPA bundle or version does not match Expo Go SDK {sdk}")
    return {
        "bundleIdentifier": info["CFBundleIdentifier"], "version": version,
        "buildVersion": str(info["CFBundleVersion"]), "minOSVersion": str(info["MinimumOSVersion"]),
    }


def build_source(releases: dict[int, dict], repo: str, read_metadata) -> dict:
    icon = f"https://raw.githubusercontent.com/{repo}/main/docs/assets/expo-go-icon.png"
    apps = []
    for sdk, release in releases.items():
        info = read_metadata(sdk, release)
        url = release["ipa_asset"]["browser_download_url"]
        description = (f"Expo Go for Expo SDK {sdk} projects. Requires iOS {info['minOSVersion']} or later. "
                       "Community-built unsigned IPA. Choose the SDK matching your project; "
                       "import and signing are handled by your LiveContainer setup. "
                       "These SDK builds share Expo Go's bundle identifier; use LiveContainer's "
                       "install/duplicate controls if keeping more than one. "
                       f"Release notes: {release['html_url']}")
        version = {key: info[key] for key in ("version", "buildVersion", "minOSVersion", "size", "sha256")}
        version.update(date=release["published_at"], downloadURL=url, localizedDescription=description)
        apps.append({
            "name": f"Expo Go SDK {sdk}", "bundleIdentifier": info["bundleIdentifier"],
            "developerName": f"Expo · community build by {repo.split('/')[0]}",
            "subtitle": f"SDK {sdk} projects · iOS {info['minOSVersion']}+",
            "localizedDescription": description, "iconURL": icon, "tintColor": "#000020",
            "version": info["version"], "versionDate": release["published_at"],
            "versionDescription": description, "downloadURL": url, "size": info["size"],
            "versions": [version],
        })
    return {
        "name": "Expo Go SDKs", "identifier": "com.vaibhavsh0120.expogo.sdks",
        "subtitle": "Choose the Expo SDK for your project",
        "description": "Community Expo Go iOS builds. Each published SDK is a separate install choice. Not affiliated with Expo or Apple.",
        "website": f"https://github.com/{repo}",
        "sourceURL": f"https://raw.githubusercontent.com/{repo}/main/apps.json",
        "iconURL": icon, "tintColor": "#000020", "apps": apps, "news": [],
    }


class GitHub:
    def __init__(self, repo: str):
        if not re.fullmatch(r"[\w.-]+/[\w.-]+", repo):
            raise ValueError("Expected a GitHub owner/repository")
        self.repo = repo
        self.token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")

    def request(self, path: str, body=None):
        headers = {"User-Agent": "Expo-Go-LiveContainer-Source", "Accept": "application/vnd.github+json"}
        if self.token:
            headers["Authorization"] = "Bearer " + self.token
        data = None if body is None else json.dumps(body).encode("utf-8")
        if data is not None:
            headers["Content-Type"] = "application/json"
        request = urllib.request.Request(f"https://api.github.com/repos/{self.repo}/{path}",
                                         headers=headers, data=data, method="GET" if body is None else "PUT")
        with urllib.request.urlopen(request, timeout=90) as response:
            return json.load(response)

    def releases(self) -> list[dict]:
        releases = []
        page = 1
        while True:
            batch = self.request(f"releases?per_page=100&page={page}")
            releases.extend(batch)
            if len(batch) < 100:
                return releases
            page += 1


def download_metadata(sdk: int, release: dict, cache: Path) -> dict:
    asset = release["ipa_asset"]
    path = cache / f"{int(asset['id'])}.ipa"
    if not path.is_file():
        partial = path.with_suffix(".part")
        # Public release download: never forward the GitHub API token to
        # the redirect host or include it in the catalog.
        request = urllib.request.Request(asset["browser_download_url"], headers={"User-Agent": "Expo-Go-LiveContainer-Source"})
        with urllib.request.urlopen(request, timeout=180) as response, partial.open("wb") as output:
            shutil.copyfileobj(response, output)
        verify_asset(partial, asset)
        partial.replace(path)
    sha256 = verify_asset(path, asset)
    return {**ipa_metadata(path, sdk), "size": path.stat().st_size, "sha256": sha256}


def generate(github: GitHub, cache: Path) -> dict:
    releases = select_releases(github.releases(), github.repo)
    if not releases:
        raise ValueError("No published Expo Go IPAs; refusing to publish an empty source")
    with ThreadPoolExecutor(max_workers=3) as pool:
        metadata = dict(pool.map(lambda item: (item[0], download_metadata(*item, cache)), releases.items()))
    return build_source(releases, github.repo, lambda sdk, release: metadata[sdk])


def encode_source(source: dict) -> bytes:
    return (json.dumps(source, indent=2, ensure_ascii=False) + "\n").encode("utf-8")


def publish(github: GitHub, cache: Path) -> dict:
    if not github.token:
        raise ValueError("GH_TOKEN with contents:write is required to refresh main/apps.json")
    for attempt in range(4):
        try:
            current = github.request("contents/apps.json?ref=main")
        except urllib.error.HTTPError as error:
            if error.code != 404:
                raise
            current = None
        # Regenerate after every conflict so concurrent SDK publications
        # cannot overwrite a catalog with an older release snapshot.
        source = generate(github, cache)
        content = encode_source(source)
        if current and base64.b64decode(current["content"]) == content:
            print("LiveContainer source already matches published IPAs")
            return source
        body = {"message": "chore: refresh LiveContainer SDK source", "branch": "main",
                "content": base64.b64encode(content).decode("ascii")}
        if current:
            body["sha"] = current["sha"]
        try:
            github.request("contents/apps.json", body)
            print(f"Refreshed main/apps.json: {len(source['apps'])} published SDKs")
            return source
        except urllib.error.HTTPError as error:
            if error.code not in {409, 422} or attempt == 3:
                raise
            time.sleep(1)
    raise RuntimeError("Could not refresh LiveContainer source")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", default=DEFAULT_REPO)
    parser.add_argument("--output", type=Path, default=Path("apps.json"))
    parser.add_argument("--cache", type=Path, default=Path(tempfile.gettempdir()) / "expo-go-source-ipas")
    parser.add_argument("--publish", action="store_true")
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    github = GitHub(args.repo)
    source = publish(github, args.cache) if args.publish else generate(github, args.cache)
    args.output.write_bytes(encode_source(source))
    print("Catalog entries: " + ", ".join(app["name"] for app in source["apps"]))


if __name__ == "__main__":
    main()

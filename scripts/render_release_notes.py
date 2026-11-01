"""Prepare per-SDK GitHub release notes and select the highest published SDK."""

import argparse
from datetime import datetime, timezone
import hashlib
from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]
SUPPORTED_SDKS = {54, 55, 56, 57, 58}


def sdk_notes(sdk: int) -> str:
    if sdk not in SUPPORTED_SDKS:
        raise ValueError(f"Unsupported SDK: {sdk}")
    return (ROOT / "releases" / f"sdk-{sdk}.md").read_text(encoding="utf-8").rstrip()


def should_mark_latest(sdk: int, tags: list[str]) -> bool:
    sdk_notes(sdk)
    versions = []
    for tag in tags:
        match = re.fullmatch(r"(?:expo-go-)?sdk(\d+)(?:-.*)?", tag.strip(), re.IGNORECASE)
        if match:
            versions.append(int(match.group(1)))
    return sdk >= max(versions, default=sdk)


def render_notes(sdk: int, ipa: Path, source_sha: str, builder_sha: str,
                 run_url: str, xcode: str) -> str:
    digest = hashlib.sha256()
    with ipa.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    built_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    return sdk_notes(sdk) + f"""

### Build details

| Item | Value |
|---|---|
| Source | [`expo/expo` — `sdk-{sdk}`](https://github.com/expo/expo/tree/{source_sha}) |
| Exact Expo commit | `{source_sha}` |
| Builder commit | `{builder_sha}` |
| Build run | [GitHub Actions]({run_url}) |
| Prepared at | {built_at} |
| Actual Xcode | `{xcode}` |
| IPA | `{ipa.name}` |
| Size | {ipa.stat().st_size:,} bytes |
| SHA-256 | `{digest.hexdigest()}` |

This is a community build, independent of Expo and Apple. The upstream
SDK release date above identifies Expo's release; this artifact's build
and publication dates are separate.
"""


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sdk", type=int, required=True)
    parser.add_argument("--ipa", type=Path, required=True)
    parser.add_argument("--source-sha", required=True)
    parser.add_argument("--builder-sha", required=True)
    parser.add_argument("--run-url", required=True)
    parser.add_argument("--xcode", required=True)
    parser.add_argument("--tags-file", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.write_text(render_notes(args.sdk, args.ipa, args.source_sha,
                                       args.builder_sha, args.run_url, args.xcode),
                           encoding="utf-8")
    latest = should_mark_latest(args.sdk, args.tags_file.read_text(encoding="utf-8").splitlines())
    print(str(latest).lower())


if __name__ == "__main__":
    main()

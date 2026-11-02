import hashlib
import base64
import importlib.util
import json
from pathlib import Path
import plistlib
import tempfile
import unittest
from unittest.mock import patch
import urllib.error
import zipfile


ROOT = Path(__file__).resolve().parents[1]
REPO = "Vaibhavsh0120/Expo-Go-Builds"


class LiveContainerSourceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        spec = importlib.util.spec_from_file_location("livecontainer_source", ROOT / "scripts/livecontainer_source.py")
        cls.module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.module)

    def release(self, sdk, release_id, date="2026-11-01T03:49:23Z", **extra):
        tag = f"expo-go-sdk{sdk}-{release_id}"
        return {"id": release_id, "tag_name": tag, "published_at": date,
                "html_url": f"https://github.com/{REPO}/releases/tag/{tag}",
                "draft": False, "prerelease": False,
                "assets": [{"id": release_id * 100, "name": f"ExpoGo-SDK{sdk}-unsigned.ipa",
                            "size": 1, "state": "uploaded", "digest": "sha256:" + "a" * 64,
                            "browser_download_url": f"https://github.com/{REPO}/releases/download/{tag}/ExpoGo-SDK{sdk}-unsigned.ipa"}],
                **extra}

    def make_ipa(self, path, version="58.0.4", sdk=58, bundle="host.exp.Exponent"):
        with zipfile.ZipFile(path, "w") as archive:
            archive.writestr("Payload/Expo Go.app/Info.plist", plistlib.dumps({
                "CFBundleIdentifier": bundle, "CFBundleShortVersionString": version,
                "CFBundleVersion": "4", "MinimumOSVersion": "16.4",
            }, fmt=plistlib.FMT_BINARY))
            archive.writestr("Payload/Expo Go.app/sdkVersions.json", f'{{"sdkVersion":"{sdk}.0.0"}}')

    def test_one_latest_published_asset_per_sdk_sorted_by_sdk(self):
        releases = [self.release(55, 2), self.release(58, 3),
                    self.release(55, 1, "2026-10-01T00:00:00Z"),
                    self.release(54, 5, draft=True), self.release(57, 6, prerelease=True)]
        selected = self.module.select_releases(releases, REPO)
        self.assertEqual(list(selected), [58, 55])
        self.assertEqual(selected[55]["id"], 2)

    def test_legacy_sdk_versions_keep_their_original_bundle_identity(self):
        for sdk, version in [(52, '2.32.18'), (53, '2.33.17')]:
            with tempfile.TemporaryDirectory() as temp:
                path = Path(temp) / 'legacy.ipa'
                self.make_ipa(path, version=version, sdk=sdk)
                self.assertEqual(self.module.ipa_metadata(path, sdk)['version'], version)
                with self.assertRaises(ValueError):
                    self.module.ipa_metadata(path, 53 if sdk == 52 else 52)

    def test_failed_missing_and_foreign_assets_are_not_listed(self):
        missing = self.release(54, 1, assets=[])
        wrong = self.release(55, 2)
        wrong["assets"][0]["browser_download_url"] = "https://example.com/untrusted.ipa"
        self.assertEqual(self.module.select_releases([missing], REPO), {})
        with self.assertRaises(ValueError):
            self.module.select_releases([wrong], REPO)

    def test_metadata_comes_from_the_ipa_and_preserves_actual_bundle_id(self):
        with tempfile.TemporaryDirectory() as temp:
            ipa = Path(temp) / "test.ipa"
            self.make_ipa(ipa)
            metadata = self.module.ipa_metadata(ipa, 58)
        self.assertEqual(metadata["version"], "58.0.4")
        self.assertEqual(metadata["buildVersion"], "4")
        self.assertEqual(metadata["bundleIdentifier"], "host.exp.Exponent")
        self.assertEqual(metadata["minOSVersion"], "16.4")

    def test_mismatched_sdk_or_bundle_id_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            ipa = Path(temp) / "test.ipa"
            self.make_ipa(ipa)
            with self.assertRaises(ValueError):
                self.module.ipa_metadata(ipa, 55)
            self.make_ipa(ipa, bundle="com.unrelated.app")
            with self.assertRaises(ValueError):
                self.module.ipa_metadata(ipa, 58)

    def test_catalog_has_a_separate_install_choice_for_each_sdk(self):
        releases = self.module.select_releases([self.release(55, 1), self.release(58, 2)], REPO)
        def metadata(sdk, release):
            return {"version": f"{sdk}.0.4", "buildVersion": "4", "bundleIdentifier": "host.exp.Exponent",
                    "minOSVersion": "16.4", "size": 12345, "sha256": "a" * 64}
        source = self.module.build_source(releases, REPO, metadata)
        self.assertEqual([app["name"] for app in source["apps"]], ["Expo Go SDK 58", "Expo Go SDK 55"])
        self.assertEqual(source["identifier"], "com.vaibhavsh0120.expogo.sdks")
        for app in source["apps"]:
            self.assertEqual(app["bundleIdentifier"], "host.exp.Exponent")
            self.assertEqual(app["downloadURL"], app["versions"][0]["downloadURL"])
            self.assertEqual(app["versions"][0]["sha256"], "a" * 64)

    def test_size_and_digest_must_match_downloaded_bytes(self):
        with tempfile.TemporaryDirectory() as temp:
            ipa = Path(temp) / "test.ipa"
            ipa.write_bytes(b"real bytes")
            asset = {"size": ipa.stat().st_size, "digest": "sha256:" + hashlib.sha256(b"real bytes").hexdigest()}
            self.module.verify_asset(ipa, asset)
            ipa.write_bytes(b"fake bytes")
            with self.assertRaises(ValueError):
                self.module.verify_asset(ipa, asset)

    def test_publish_regenerates_after_a_concurrent_source_update(self):
        for status in [409, 422]:
            with self.subTest(status=status):
                puts = []
                class Client:
                    token = "test-token"
                    repo = REPO
                    def request(self, path, body=None):
                        if body is None:
                            return {"sha": f"sha-{len(puts)}", "content": base64.b64encode(b'{}').decode()}
                        puts.append(body)
                        if len(puts) == 1:
                            raise urllib.error.HTTPError("https://api.github.com/test", status, "conflict", {}, None)
                        return {}
                before = {"apps": [{"name": "SDK 58"}]}
                after = {"apps": [{"name": "SDK 58"}, {"name": "SDK 55"}]}
                with patch.object(self.module, "generate", side_effect=[before, after]) as generate, \
                     patch.object(self.module.time, "sleep"):
                    result = self.module.publish(Client(), Path("unused-test-cache"))
                self.assertEqual(result, after)
                self.assertEqual(generate.call_count, 2)
                self.assertEqual(puts[1]["branch"], "main")
                self.assertEqual(puts[1]["sha"], "sha-1")
                self.assertEqual(json.loads(base64.b64decode(puts[1]["content"])), after)


if __name__ == "__main__":
    unittest.main()

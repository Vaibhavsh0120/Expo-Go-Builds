import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import zipfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import android_release as android
import upstream_release as upstream


def versions(sdk=58):
    return {"sdkVersions": {f"{sdk}.0.0": {"iosClientVersion": f"{sdk}.0.7", "androidClientVersion": f"{sdk}.0.5", "androidClientUrl": f"https://github.com/expo/expo-go-releases/releases/download/Expo-Go-{sdk}.0.5/Expo-Go-{sdk}.0.5.apk"}}}


class AndroidReleaseTests(unittest.TestCase):
    def test_official_metadata_rejects_foreign_origins_and_wrong_sdk(self):
        self.assertEqual(android.official_metadata(58, versions())["androidClientVersion"], "58.0.5")
        for bad in ["https://evil.example/Expo-Go-58.0.5.apk", "https://github.com/expo/expo-go-releases/releases/download/Expo-Go-57.0.5/Expo-Go-57.0.5.apk"]:
            fixture = versions()
            fixture["sdkVersions"]["58.0.0"]["androidClientUrl"] = bad
            with self.assertRaises(ValueError):
                android.official_metadata(58, fixture)
        with self.assertRaises(ValueError):
            android.official_metadata(59, versions(59))

    def test_legacy_sdk_metadata_accepts_original_app_version_scheme(self):
        for sdk, version in [(52, "2.32.20"), (53, "2.33.22")]:
            fixture = {"sdkVersions": {f"{sdk}.0.0": {"iosClientVersion": version, "androidClientVersion": version, "androidClientUrl": f"https://github.com/expo/expo-go-releases/releases/download/Expo-Go-{version}/Expo-Go-{version}.apk"}}}
            self.assertEqual(android.official_metadata(sdk, fixture)["sdk"], sdk)

    def test_schedule_dispatches_changed_pairs_only_and_skips_active_builds(self):
        metadata = android.official_metadata(58, versions())
        release = {"tag_name": "expo-go-sdk58-20261101-120000", "body": android.marker(metadata), "assets": [{"name": name, "state": "uploaded"} for name in ["ExpoGo-SDK58-unsigned.ipa", "ExpoGo-SDK58.apk", "ExpoGo-SDK58-android.json"]]}
        self.assertEqual(upstream.pending_sdks(versions(), [release]), [])
        release["assets"].pop()
        self.assertEqual(upstream.pending_sdks(versions(), [release]), [58])
        self.assertEqual(upstream.pending_sdks(versions(), [], active={58}), [])
        release["body"] = "old release without exact upstream version receipt"
        self.assertEqual(upstream.pending_sdks(versions(), [release]), [58])

    def test_future_sdk_needs_review_only_when_stable_clients_exist(self):
        future = versions(59)
        self.assertEqual(upstream.unreviewed_releases(future), [59])
        future["sdkVersions"]["59.0.0"]["androidClientVersion"] = "59.0.0-beta.1"
        self.assertEqual(upstream.unreviewed_releases(future), [])
        future["sdkVersions"]["59.0.0"].pop("androidClientVersion")
        self.assertEqual(upstream.unreviewed_releases(future), [])

    def test_actual_apk_identity_and_signature_must_verify(self):
        signature = "Verifies\nVerified using v2 scheme (APK Signature Scheme v2): true\nV2 Signer: certificate SHA-256 digest: " + "a" * 64
        badging = "package: name='host.exp.exponent' versionCode='465' versionName='58.0.5'\nsdkVersion:'24'"
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "app.apk"
            with zipfile.ZipFile(path, "w") as archive:
                archive.writestr("AndroidManifest.xml", b"manifest")
                archive.writestr("classes.dex", b"dex")
            completed = lambda text: subprocess.CompletedProcess([], 0, stdout=text, stderr="")
            with patch.object(android, "android_tool", return_value="tool"), patch.object(android.subprocess, "run", side_effect=[completed(signature), completed(badging)]):
                info = android.verify_apk(path, 58)
                self.assertTrue(info["signatureVerified"])
                self.assertEqual(info["minSdkVersion"], 24)
            with patch.object(android, "android_tool", return_value="tool"), patch.object(android.subprocess, "run", side_effect=[completed(signature), completed(badging.replace("host.exp.exponent", "attacker.package"))]):
                with self.assertRaises(ValueError):
                    android.verify_apk(path, 58)

            with patch.object(android, "android_tool", return_value="tool"), patch.object(android.subprocess, "run", return_value=completed("DOES NOT VERIFY")):
                with self.assertRaises(ValueError):
                    android.verify_apk(path, 58)

    def test_sdk52_metadata_exception_is_limited_to_verified_historical_bytes(self):
        expected = "217621eb008e22146470336761f9fe5f69e20c608f4595b088be6bc7bfe775f9"
        metadata = {"sdk": 52, "iosClientVersion": "2.32.18", "androidClientVersion": "2.32.20"}
        asset = {"id": 123, "size": 3, "digest": "sha256:" + expected}
        actual = {"version": "2.32.19", "signatureVerified": True}
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "ExpoGo-SDK52.apk"
            path.write_bytes(b"APK")
            with patch.object(android, "official_asset", return_value=asset), patch.object(android, "digest_file", return_value=expected), patch.object(android, "verify_apk", return_value=actual):
                _, receipt = android.prepare(metadata, Path(temp))
                self.assertEqual(receipt["version"], "2.32.19")
                self.assertIn("signed APK manifest", receipt["versionMetadataNote"])
            actual["version"] = "2.32.18"
            with patch.object(android, "official_asset", return_value=asset), patch.object(android, "digest_file", return_value=expected), patch.object(android, "verify_apk", return_value=actual):
                with self.assertRaises(ValueError):
                    android.prepare(metadata, Path(temp))


if __name__ == "__main__":
    unittest.main()

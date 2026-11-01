import importlib.util
from pathlib import Path
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]


class ReleaseNotesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        spec = importlib.util.spec_from_file_location("release_notes", ROOT / "scripts/render_release_notes.py")
        cls.module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.module)

    def test_all_sdks_have_distinct_notes_with_upstream_date_and_compatibility(self):
        dates = {54: "2025-09-10", 55: "2026-02-25", 56: "2026-05-21",
                 57: "2026-06-30", 58: "2026-10-15"}
        for sdk, date in dates.items():
            with self.subTest(sdk=sdk):
                note = self.module.sdk_notes(sdk)
                self.assertIn(f"Expo SDK {sdk}", note)
                self.assertIn(date, note)
                self.assertIn(f"https://expo.dev/changelog/sdk-{sdk}", note)
                self.assertIn("unsigned", note.lower())
                self.assertIn("iOS", note)

    def test_runtime_notes_record_the_actual_artifact_and_source(self):
        with tempfile.TemporaryDirectory() as temp:
            ipa = Path(temp) / "ExpoGo-SDK58-unsigned.ipa"
            ipa.write_bytes(b"test IPA bytes")
            notes = self.module.render_notes(58, ipa, "a" * 40, "b" * 40,
                                             "https://github.com/owner/repo/actions/runs/123", "26.4.1")
        self.assertIn("a" * 40, notes)
        self.assertIn("b" * 40, notes)
        self.assertIn("123", notes)
        self.assertIn("26.4.1", notes)
        self.assertIn("14 bytes", notes)
        import hashlib
        self.assertIn(hashlib.sha256(b"test IPA bytes").hexdigest(), notes)
        self.assertNotIn("installed successfully", notes)

    def test_older_sdk_build_cannot_replace_newer_sdk_as_latest(self):
        tags = ["expo-go-sdk56-20260816-090047", "expo-go-sdk57-20260816-094039", "SDK57"]
        self.assertFalse(self.module.should_mark_latest(54, tags))
        self.assertFalse(self.module.should_mark_latest(56, tags))
        self.assertTrue(self.module.should_mark_latest(57, tags))
        self.assertTrue(self.module.should_mark_latest(58, tags))
        self.assertFalse(self.module.should_mark_latest(57, tags + ["expo-go-sdk58-20261101-120000"]))
        self.assertTrue(self.module.should_mark_latest(54, []))

    def test_unsupported_sdk_is_rejected(self):
        with self.assertRaises(ValueError):
            self.module.sdk_notes(59)


if __name__ == "__main__":
    unittest.main()

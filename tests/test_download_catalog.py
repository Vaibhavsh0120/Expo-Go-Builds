import importlib.util
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
spec = importlib.util.spec_from_file_location('download_catalog', ROOT / 'scripts/download_catalog.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class DownloadCatalogTests(unittest.TestCase):
    def fixture(self):
        prefix = 'https://github.com/owner/repo/releases/download/expo-go-sdk58-test/'
        release = {'tag_name': 'expo-go-sdk58-test', 'published_at': '2026-11-01T00:00:00Z',
                   'html_url': 'https://github.com/owner/repo/releases/tag/expo-go-sdk58-test',
                   'assets': [{'name': 'ExpoGo-SDK58.apk', 'state': 'uploaded', 'size': 123,
                               'digest': 'sha256:' + 'a'*64, 'browser_download_url': prefix+'ExpoGo-SDK58.apk'},
                              {'name': 'ExpoGo-SDK58-android.json', 'state': 'uploaded', 'browser_download_url': prefix+'ExpoGo-SDK58-android.json'}]}
        receipt = {'sdk': 58, 'signatureVerified': True, 'packageName': 'host.exp.exponent',
                   'size': 123, 'sha256': 'a'*64, 'certificateSHA256': ['b'*64], 'version': '58.0.5',
                   'minSdkVersion': 24, 'androidClientUrl': 'https://github.com/expo/expo-go-releases/releases/download/test/app.apk', 'origin': 'Original Expo-signed APK'}
        return release, receipt

    def test_only_matching_verified_published_apk_is_advertised(self):
        release, receipt = self.fixture()
        catalog = module.build_catalog([release], 'owner/repo', lambda _: receipt)
        self.assertEqual(catalog['builds'][0]['version'], '58.0.5')
        self.assertTrue(catalog['builds'][0]['downloadURL'].endswith('ExpoGo-SDK58.apk'))
        release['draft'] = True
        self.assertEqual(module.build_catalog([release], 'owner/repo')['builds'], [])

    def test_mismatched_or_unsigned_receipt_cannot_publish_a_download(self):
        for field, wrong in [('signatureVerified', False), ('size', 999), ('sha256', 'c'*64), ('sdk', 57)]:
            release, receipt = self.fixture()
            receipt[field] = wrong
            with self.subTest(field=field), self.assertRaises(ValueError):
                module.build_catalog([release], 'owner/repo', lambda _: receipt)

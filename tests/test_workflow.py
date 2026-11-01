"""Local checks for SDK dispatch; requires PyYAML and Bash (Git Bash on Windows)."""

import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import unittest

import yaml


ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github/workflows/build-expo-go.yml"
BASH = (
    r"C:\Program Files\Git\bin\bash.exe"
    if os.name == "nt"
    else shutil.which("bash")
)


class SdkDispatchTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.workflow = yaml.safe_load(WORKFLOW.read_text(encoding="utf-8"))

    def resolve(self, sdk):
        job = self.workflow["jobs"]["resolve-config"]
        step = next(step for step in job["steps"] if step.get("id") == "config")
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "outputs"
            env = dict(os.environ, SDK=sdk,
                       GITHUB_OUTPUT=output.as_posix())
            result = subprocess.run([BASH, "-e", "-o", "pipefail", "-c", step["run"]],
                                    env=env, cwd=temp, capture_output=True, text=True)
            values = dict(line.split("=", 1) for line in output.read_text().splitlines()) if output.exists() else {}
        return result, values

    def test_each_sdk_selects_its_verified_toolchain(self):
        expected = {
            "52": ("macos-15", "16.4", "20.12.2", "yarn", "1.22.22", "15.1", "legacy"),
            "53": ("macos-15", "16.4", "22.14.0", "yarn", "1.22.22", "15.1", "legacy"),
            "54": ("macos-15", "26.2", "22.14.0", "yarn", "1.22.22", "15.1", "legacy"),
            "55": ("macos-15", "26.2", "22.14.0", "yarn", "1.22.22", "15.1", "shell"),
            "56": ("macos-26", "26.4.1", "22.14.0", "pnpm", "10", "16.4", "shell"),
            "57": ("macos-26", "26.4.1", "22.14.0", "pnpm", "10", "16.4", "shell"),
            "58": ("macos-26", "26.4.1", "24", "pnpm", "12.2.1", "16.4", "shell"),
        }
        for sdk, values in expected.items():
            with self.subTest(sdk=sdk):
                result, outputs = self.resolve(sdk)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(tuple(outputs[key] for key in (
                    "runner", "xcode_version", "node_version", "package_manager",
                    "package_manager_version", "min_ios", "macros_mode")), values)
                self.assertEqual(outputs["expo_ref"], "sdk-" + sdk)
                self.assertEqual(outputs["ipa_basename"], f"ExpoGo-SDK{sdk}-unsigned")
                self.assertEqual(outputs["artifact_name"], f"ExpoGo-SDK{sdk}-iOS")
                self.assertEqual(outputs["ruby_version"], "3.2.2")
        _, outputs = self.resolve("54")
        self.assertEqual(outputs["sdk_versions_path"], "apps/expo-go/ios/Exponent/Supporting/sdkVersions.json")

    def test_invalid_sdk_is_rejected_without_executing_input(self):
        for sdk in ["59", "", "58\nrunner=attacker", '58$(exit 42)`exit 43`"; exit 44; #']:
            with self.subTest(sdk=sdk):
                result, outputs = self.resolve(sdk)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(outputs, {})

    def test_workflow_routes_runner_and_build_steps_from_config(self):
        build = self.workflow["jobs"]["build-expo-go-ios"]
        self.assertEqual(build["needs"], "resolve-config")
        self.assertEqual(build["runs-on"], "${{ needs.resolve-config.outputs.runner }}")
        config_step = self.workflow["jobs"]["resolve-config"]["steps"][0]
        self.assertEqual(config_step["env"]["SDK"], "${{ inputs.expo_sdk }}")
        text = WORKFLOW.read_text(encoding="utf-8")
        self.assertNotIn("steps.config.outputs", yaml.safe_dump(build))
        self.assertIn("CODE_SIGNING_ALLOWED=NO", text)
        self.assertIn("-sdk iphoneos", text)
        self.assertIn("lipo -info", text)
        self.assertIn("unzip -t", text)

    def test_dispatch_exposes_only_sdk_and_release_checkbox(self):
        # BaseLoader preserves YAML 1.2's `on` key as a string.
        workflow = yaml.load(WORKFLOW.read_text(encoding="utf-8"), Loader=yaml.BaseLoader)
        inputs = workflow["on"]["workflow_dispatch"]["inputs"]
        self.assertEqual(set(inputs), {"expo_sdk", "create_release"})
        self.assertEqual(inputs["expo_sdk"]["options"], ["58", "57", "56", "55", "54", "53", "52"])
        self.assertEqual(inputs["expo_sdk"]["default"], "57")
        self.assertEqual(inputs["create_release"]["type"], "boolean")
        self.assertEqual(inputs["create_release"]["default"], "false")

    def test_only_one_build_workflow_is_dispatchable(self):
        workflows = sorted((ROOT / ".github/workflows").glob("*.y*ml"))
        self.assertEqual(workflows, [WORKFLOW])

    def test_platform_jobs_publish_together_with_scoped_write_permission(self):
        jobs = self.workflow["jobs"]
        self.assertEqual(jobs["build-expo-go-ios"]["permissions"]["contents"], "read")
        self.assertEqual(jobs["prepare-android"]["permissions"]["contents"], "read")
        publish = jobs["publish-release"]
        self.assertEqual(publish["permissions"]["contents"], "write")
        self.assertEqual(set(publish["needs"]), {"resolve-config", "build-expo-go-ios", "prepare-android"})
        command = next(s["run"] for s in publish["steps"] if s["name"] == "Publish verified platform pair")
        self.assertIn('--target main', command)
        self.assertNotIn('--target "$GITHUB_SHA"', command)
        self.assertIn('"$IPA_PATH" "$APK_PATH" "$RECEIPT"', command)
        self.assertIn('--builder-sha "$GITHUB_SHA"', command)
        self.assertIn('inputs.create_release', publish["if"])
        checkout = next(s for s in jobs["build-expo-go-ios"]["steps"] if s.get("with", {}).get("repository") == "expo/expo")
        self.assertEqual(checkout["with"]["ref"], "${{ needs.resolve-config.outputs.source_sha }}")

    def test_schedule_watches_upstream_without_adding_a_second_workflow(self):
        workflow = yaml.load(WORKFLOW.read_text(encoding="utf-8"), Loader=yaml.BaseLoader)
        self.assertEqual(workflow["on"]["schedule"][0]["cron"], "17 */6 * * *")
        self.assertEqual(workflow["jobs"]["watch-upstream"]["permissions"]["actions"], "write")
        self.assertEqual(workflow["jobs"]["watch-upstream"]["if"], "github.event_name == 'schedule'")
        self.assertEqual(workflow["jobs"]["resolve-config"]["if"], "github.event_name != 'schedule'")

    def test_old_hermes_uses_isolated_cmake3_before_pods_capture_tool_path(self):
        steps = self.workflow["jobs"]["build-expo-go-ios"]["steps"]
        native_index = next(i for i, step in enumerate(steps) if step["name"].startswith("Install native build tools"))
        pods_index = next(i for i, step in enumerate(steps) if step["name"].startswith("pod install"))
        self.assertLess(native_index, pods_index)
        script = steps[native_index]["run"]
        self.assertIn('if [ "$SDK" = "52" ] || [ "$SDK" = "53" ]', script)
        self.assertIn('--only-binary=:all: cmake==3.31.10', script)
        self.assertIn('cmake.CMAKE_BIN_DIR', script)
        self.assertIn('echo "$CMAKE_BIN_DIR" >> "$GITHUB_PATH"', script)
        self.assertIn('export PATH="$CMAKE_BIN_DIR:$PATH"', script)

    def test_every_shell_step_has_valid_bash_syntax(self):
        for job in self.workflow["jobs"].values():
            for step in job["steps"]:
                if "run" not in step:
                    continue
                with self.subTest(step=step["name"]):
                    script = re.sub(r"\$\{\{.*?\}\}", "resolved-value", step["run"])
                    result = subprocess.run([BASH, "-n"], input=script,
                                            capture_output=True, text=True)
                    self.assertEqual(result.returncode, 0, result.stderr)

    def test_source_sdk_check_accepts_both_schemas_and_rejects_mismatch(self):
        step = next(step for step in self.workflow["jobs"]["build-expo-go-ios"]["steps"]
                    if step.get("id") == "source")
        script = step["run"].split("node <<'NODE'\n", 1)[1].rsplit("NODE", 1)[0]
        for data, sdk, success in [('{"sdkVersions":["54.0.0"]}', "54", True),
                                   ('{"sdkVersion":"58.0.0"}', "58", True),
                                   ('{"sdkVersion":"57.0.0"}', "58", False),
                                   ('{}', "54", False)]:
            with self.subTest(sdk=sdk, data=data):
                with tempfile.TemporaryDirectory() as temp:
                    metadata = Path(temp) / "sdkVersions.json"
                    metadata.write_text(data)
                    env = dict(os.environ, EXPECTED_SDK=sdk, SDK_VERSIONS_PATH=str(metadata))
                    result = subprocess.run(["node", "-e", script], env=env,
                                            capture_output=True, text=True)
                self.assertEqual(result.returncode == 0, success, result.stderr)


if __name__ == "__main__":
    unittest.main()

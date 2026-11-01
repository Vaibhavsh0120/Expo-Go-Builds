export interface SDKBuild {
  sdk: number;
  version: string;
  minOSVersion: string;
  downloadURL: string;
  size: number;
  sha256: string;
  date: string;
}
export const SOURCE_URL: string;
export const ANDROID_URL: string;
export const REPOSITORY_URL: string;
export const SDK_CHOICES: number[];
export function readCatalog(value: unknown): SDKBuild[];
export function readAndroidCatalog(value: unknown): (SDKBuild & {releaseURL: string})[];
export function liveContainerURL(): string;
export function formatSize(bytes: number): string;

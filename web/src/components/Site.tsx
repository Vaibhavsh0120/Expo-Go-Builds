import { useEffect, useState } from 'react';
import * as Select from '@radix-ui/react-select';
import { Button } from '@/components/ui/button';
import { CopyBoldDuotoneIcon as CopyIcon, ArrowRightBoldDuotoneIcon as ArrowIcon } from '@/components/icons';
import { LayersLinearIcon as LayersIcon, BoxLinearIcon as BoxIcon, DownloadLinearIcon as DownloadIcon, SmartphoneLinearIcon as PhoneIcon, ArrowRightUpLinearIcon as ExternalIcon, AltArrowDownLinearIcon as ChevronIcon } from '@/components/icons/linear';
import SiteHeader from './SiteHeader';
import SdkLinks from './SdkLinks';
import HeroArtwork from './HeroArtwork';
import { SOURCE_URL, ANDROID_URL, REPOSITORY_URL, SDK_CHOICES, readCatalog, readAndroidCatalog, liveContainerURL, formatSize } from '@/lib/catalog.mjs';
import bundledCatalog from '@/data/catalog.json';
import bundledAndroid from '@/data/android.json';

type Build = ReturnType<typeof readCatalog>[number];
const initialBuilds = readCatalog(bundledCatalog);
export default function Site() {
  const [builds, setBuilds] = useState<Build[]>(initialBuilds);
  const [androidBuilds, setAndroidBuilds] = useState<Build[]>(readAndroidCatalog(bundledAndroid));
  const [selectedSDK, setSelectedSDK] = useState(initialBuilds[0]?.sdk ?? 58);
  const [catalogState, setCatalogState] = useState<'bundled' | 'live' | 'offline'>('bundled');
  const [copyState, setCopyState] = useState('');
  const [launchNotice, setLaunchNotice] = useState(false);
  const ios = builds.find((build) => build.sdk === selectedSDK);
  const android = androidBuilds.find((build) => build.sdk === selectedSDK);
  const newestSDK = Math.max(...builds.map(build => build.sdk), ...androidBuilds.map(build => build.sdk));

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    fetch(ANDROID_URL, { signal: controller.signal, cache: 'no-cache' })
      .then((response) => { if (!response.ok) throw new Error('Android catalog unavailable'); return response.json(); })
      .then((data) => { const next = readAndroidCatalog(data); if (next.length) setAndroidBuilds(next); })
      .catch(() => { /* Keep verified bundled downloads available. */ })
      .finally(() => clearTimeout(timeout));
    return () => {clearTimeout(timeout); controller.abort();};
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    fetch(SOURCE_URL, { signal: controller.signal, cache: 'no-cache' })
      .then((response) => { if (!response.ok) throw new Error('Catalog unavailable'); return response.json(); })
      .then((data) => {
        const next = readCatalog(data);
        if (!next.length) throw new Error('Catalog has no valid builds');
        setBuilds(next);
        setSelectedSDK((sdk) => next.some((build) => build.sdk === sdk) ? sdk : next[0].sdk);
        setCatalogState('live');
      })
      .catch(() => { if (!controller.signal.aborted || !document.hidden) setCatalogState('offline'); })
      .finally(() => clearTimeout(timeout));
    return () => { clearTimeout(timeout); controller.abort(); };
  }, []);

  async function copySource() {
    setCopyState('Copying source URL…');
    try {
      await navigator.clipboard.writeText(SOURCE_URL);
      setCopyState('Source URL copied. Paste it into LiveContainer’s Sources.');
    } catch {
      setCopyState('Copy is unavailable. Select and copy the source URL below.');
    }
  }

  return <>
    <a className="skip-link" href="#main">Skip to downloads</a>
    <div className="page-backdrop" aria-hidden="true" inert><span/></div>
    <SiteHeader onLaunch={() => setLaunchNotice(true)}/>
    <main id="main">
      <section className="hero page-width" aria-labelledby="hero-heading">
        <HeroArtwork/>
        <div className="hero-content">
          <h1 id="hero-heading">Download Expo Go</h1>
          <p className="hero-description">Get the Expo Go app for the SDK your project uses.</p>
          <div className="download-controls">
            <Select.Root value={String(selectedSDK)} onValueChange={value => setSelectedSDK(Number(value))}>
              <Select.Trigger className="sdk-select" id="sdk-version" aria-label="SDK version">
                <LayersIcon aria-hidden="true"/><span className="select-label">SDK Version</span>
                <span className="sdk-value"><Select.Value>{selectedSDK}{selectedSDK === newestSDK ? ' (Latest)' : ''}</Select.Value></span>
                <Select.Icon asChild><ChevronIcon className="select-chevron" aria-hidden="true"/></Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content className="sdk-menu" position="popper" sideOffset={8} collisionPadding={16}>
                  <Select.ScrollUpButton className="sdk-scroll sdk-scroll-up"><ChevronIcon aria-hidden="true"/></Select.ScrollUpButton>
                  <Select.Viewport className="sdk-menu-viewport">
                    {[...SDK_CHOICES].reverse().map(sdk => {
                      const available = builds.some(build => build.sdk === sdk) || androidBuilds.some(build => build.sdk === sdk);
                      return <Select.Item className="sdk-option" key={sdk} value={String(sdk)} disabled={!available} textValue={'SDK ' + sdk}>
                        <Select.ItemText>SDK {sdk}</Select.ItemText>
                        {sdk === newestSDK && <span className="sdk-badge">Latest</span>}
                        {!available && <span className="sdk-badge">Not published</span>}
                        <Select.ItemIndicator className="sdk-selected"><span/></Select.ItemIndicator>
                      </Select.Item>;
                    })}
                  </Select.Viewport>
                  <Select.ScrollDownButton className="sdk-scroll"><ChevronIcon aria-hidden="true"/></Select.ScrollDownButton>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
            <div className="download-cards">
              {ios ? <Button asChild ring={false} className="download-card ipa-card"><a href={ios.downloadURL} aria-label={'Download IPA for SDK ' + selectedSDK}><DownloadIcon aria-hidden="true"/><span><strong>Download IPA</strong><small>iOS {ios.minOSVersion}+ · SDK {selectedSDK}</small></span></a></Button> : <Button disabled ring={false} className="download-card ipa-card"><DownloadIcon aria-hidden="true"/><span><strong>Download IPA</strong><small>Not yet published</small></span></Button>}
              {android ? <Button asChild variant="outline" className="download-card apk-card"><a href={android.downloadURL} aria-label={'Download APK for SDK ' + selectedSDK}><DownloadIcon aria-hidden="true"/><span><strong>Download APK</strong><small>Android {android.minOSVersion}+ · SDK {selectedSDK}</small></span></a></Button> : <Button disabled variant="outline" className="download-card apk-card"><DownloadIcon aria-hidden="true"/><span><strong>Download APK</strong><small>Not yet published</small></span></Button>}
            </div>
            <div className="secondary-actions">
              <Button asChild variant="outline"><a href={liveContainerURL()} onClick={() => setLaunchNotice(true)}><BoxIcon aria-hidden="true"/>Add to LiveContainer</a></Button>
              <Button asChild variant="outline"><a href="#installation-options" data-install-guide=""><ExternalIcon aria-hidden="true"/>Installation Guide</a></Button>
            </div>
            {launchNotice && <p className="launch-notice" role="status">Didn’t open? <a href="#source">Copy the source URL</a> into LiveContainer.</p>}
          </div>
        </div>
      </section>
      <section className="install-overview page-width" id="install" aria-label="Installation steps">
        <ol className="install-steps">
          <li><span className="step-number" aria-hidden="true">1</span><LayersIcon aria-hidden="true"/><div><h2>Choose Version</h2><p>Select the Expo SDK version you need (including older versions).</p></div></li>
          <li><span className="step-number" aria-hidden="true">2</span><DownloadIcon aria-hidden="true"/><div><h2>Download App</h2><p>Get the IPA for iOS or APK for Android.</p></div></li>
          <li><span className="step-number" aria-hidden="true">3</span><PhoneIcon aria-hidden="true"/><div><h2>Install &amp; Run</h2><p>Open the APK on Android. Sign or import the IPA on iOS.</p></div></li>
        </ol>
      </section>

      <section className="details-section page-width" aria-labelledby="ready-heading">
        <div className="install-details">
          <h2 id="ready-heading">A source for every SDK.</h2>
          <p>Add it once. Choose a separate Expo Go entry for each published SDK in LiveContainer.</p>
          <div className="source-box" id="source">
            <div className="source-heading"><span>LiveContainer source</span><Button variant="outline" size="sm" onClick={copySource}><CopyIcon aria-hidden="true"/>{copyState.startsWith('Source URL copied') ? 'Copied' : 'Copy URL'}</Button></div>
            <a className="source-url" href={SOURCE_URL}>{SOURCE_URL}</a>
            <p className="copy-status" role="status">{copyState || 'In LiveContainer, open Sources and add this URL.'}</p>
          </div>
          <ul className="source-points">
            <li><strong>Match your project’s SDK.</strong><span>Check the <code>expo</code> dependency in <code>package.json</code> before installing.</span></li>
            <li><strong>Keep the versions you need.</strong><span>Each entry updates within its SDK; newer SDKs stay separate.</span></li>
            <li><strong>Refresh for SDK updates.</strong><span>New verified IPAs appear after their GitHub release is published.</span></li>
          </ul>
        </div>
        <div className="build-details">
          <h2>Know your download.</h2>
          <dl><div><dt>Expo SDK</dt><dd>{selectedSDK}</dd></div><div><dt>iOS app version</dt><dd>{ios?.version || 'Not published'}</dd></div><div><dt>Android app version</dt><dd>{android?.version || 'Not published'}</dd></div><div><dt>IPA size</dt><dd>{ios ? formatSize(ios.size) : 'Not published'}</dd></div><div><dt>APK size</dt><dd>{android ? formatSize(android.size) : 'Not published'}</dd></div></dl>
          {[ios, android].map((build, index) => build?.sha256 && <details className="checksum" key={index}><summary>{index === 0 ? 'IPA' : 'APK'} file checksum (SHA-256)</summary><p>Compare this checksum with your downloaded file using a checksum utility. Matching values show the file is unchanged.</p><code>{build.sha256}</code></details>)}
          <p className="catalog-state">{catalogState === 'live' ? 'Release list refreshed from GitHub.' : catalogState === 'offline' ? 'Live refresh unavailable. Showing the bundled release list.' : 'Showing the bundled release list.'}</p>
          <a className="text-link" href={`${REPOSITORY_URL}/releases`}>Browse releases on GitHub <ArrowIcon aria-hidden="true"/></a>
        </div>
      </section>

      <section className="signing-tools page-width" id="installation-options" aria-labelledby="signing-heading">
          <h2 id="signing-heading" tabIndex={-1}><span className="guide-target">Install on your device.</span></h2>
          <details className="platform-install">
            <summary><span>Android</span><small>APK</small><ChevronIcon aria-hidden="true"/></summary>
            <div className="platform-body"><p>Download the APK for your SDK, open it on Android, and allow installation from your browser or file manager if prompted.</p></div>
          </details>
          <details className="platform-install">
            <summary><span>iPhone / iPad</span><small>IPA</small><ChevronIcon aria-hidden="true"/></summary>
            <div className="platform-body">
              <p className="installation-note">iOS IPAs are unsigned community builds. Your installation tool handles signing. SDKs share Expo Go’s bundle identifier; use LiveContainer’s duplicate controls to keep more than one. <a href={REPOSITORY_URL + '/blob/main/docs/IPA_SIGNING.md'}>Read the iOS signing guide.</a></p>
              <div className="signing-links">
            <a href="https://sidestore.io/"><strong>SideStore <ExternalIcon aria-hidden="true"/></strong><span>Install and refresh IPAs on your device after setup.</span></a>
            <a href="https://altstore.io/"><strong>AltStore Classic <ExternalIcon aria-hidden="true"/></strong><span>Set up AltServer on your Mac or PC, then import the IPA.</span></a>
            <a href="https://livecontainer.github.io/docs/installation"><strong>LiveContainer <ExternalIcon aria-hidden="true"/></strong><span>Set up LiveContainer, then add our SDK source.</span></a>
            <a href="https://sideloadly.io/"><strong>Sideloadly <ExternalIcon aria-hidden="true"/></strong><span>Sign and install the Expo Go IPA from Windows or macOS.</span></a>
            <a href="https://iloader.app/"><strong>iloader <ExternalIcon aria-hidden="true"/></strong><span>Import IPAs from Windows, macOS, or Linux.</span></a>
            <a href="https://github.com/opa334/TrollStore"><strong>TrollStore <ExternalIcon aria-hidden="true"/></strong><span>Permanent installs on supported older iOS versions only.</span></a>
              </div>
              <p className="signing-requirements">Free Apple Account signing needs regular refreshing. Check each tool’s setup and iOS requirements.</p>
              <a className="text-link" href="https://github.com/LiveContainer/LiveContainer">LiveContainer setup guide <ArrowIcon aria-hidden="true"/></a>
            </div>
          </details>
      </section>

      <section className="faq page-width" aria-labelledby="faq-heading">
        <div className="faq-intro"><h2 id="faq-heading">Before you install.</h2><p>The details that matter.</p></div>
        <div className="faq-items">
          <details><summary>Which SDK should I choose?</summary><p>Check the <code>expo</code> dependency in your project’s <code>package.json</code>. If it starts with <code>~55.</code> or <code>^55.</code>, choose SDK 55. Your Expo Go build must match your project’s SDK.</p></details>
          <details><summary>How do I install on Android or iOS?</summary><p>On Android, open the APK and allow installation from your browser or file manager when asked. On iOS, the IPA needs your configured LiveContainer installation or a compatible signing tool. Check the minimum OS for your selected SDK.</p></details>
          <details><summary>Can I keep multiple SDKs installed?</summary><p>Each SDK has its own entry in the source, but all builds use Expo Go’s bundle identifier. Use LiveContainer’s install or duplicate controls if you need to keep multiple SDKs. A conventional installation may replace the existing app.</p></details>
          <details><summary>Where do these downloads come from?</summary><p>This is an independent community website. We compile unsigned iOS IPAs from <a href="https://github.com/expo/expo">Expo’s open source code</a>. Android APKs are original Expo-signed downloads, mirrored without modification after signature and checksum verification. Expo Go is developed by Expo: <a href="https://expo.dev/go">visit the official website</a>.</p></details>
          <details><summary>Does Expo Go support every native module?</summary><p>Expo Go includes a fixed set of native libraries. If your project needs custom native code that is not included, use an <a href="https://docs.expo.dev/develop/development-builds/introduction/">Expo development build</a> instead.</p></details>
        </div>
      </section>
    </main>
    <SdkLinks sdks={[...new Set([...builds, ...androidBuilds].map(build => build.sdk))].sort((a,b) => b-a)}/>
    <footer className="site-footer page-width"><p>Independent community builds. Not affiliated with Expo or Apple.</p><div><a href="https://expo.dev/go">Official Expo Go</a><a href="https://github.com/expo/expo">Expo source</a></div></footer>
  </>;
}

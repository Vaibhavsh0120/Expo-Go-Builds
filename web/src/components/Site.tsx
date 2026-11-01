import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DownloadBoldDuotoneIcon as DownloadIcon, BoxBoldDuotoneIcon as BoxIcon, SunBoldDuotoneIcon as SunIcon, MoonBoldDuotoneIcon as MoonIcon, CopyBoldDuotoneIcon as CopyIcon, ArrowRightBoldDuotoneIcon as ArrowIcon } from '@/components/icons';
import { SOURCE_URL, ANDROID_URL, REPOSITORY_URL, SDK_CHOICES, readCatalog, readAndroidCatalog, liveContainerURL, formatSize } from '@/lib/catalog.mjs';
import bundledCatalog from '@/data/catalog.json';
import bundledAndroid from '@/data/android.json';

type Theme = 'system' | 'light' | 'dark';
type Build = ReturnType<typeof readCatalog>[number];
const initialBuilds = readCatalog(bundledCatalog);

function Mark({ className = '' }: { className?: string }) {
  return <svg className={className} width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M4 26 13.2 7.5C14.4 5 17.6 5 18.8 7.5L28 26M11.5 26 14.5 19.6C15.1 18.2 16.9 18.2 17.5 19.6L20.5 26" stroke="currentColor" strokeWidth="4.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function HeroObject() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const hero = el.closest('.hero');
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = matchMedia('(pointer: fine)');
    const reset = () => { el.style.setProperty('--tilt-x', '0deg'); el.style.setProperty('--tilt-y', '0deg'); };
    const move = (event: Event) => {
      if (media.matches || !finePointer.matches) return reset();
      const pointer = event as PointerEvent;
      const bounds = hero!.getBoundingClientRect();
      el.style.setProperty('--tilt-x', `${((pointer.clientY - bounds.top) / bounds.height - .5) * -3}deg`);
      el.style.setProperty('--tilt-y', `${((pointer.clientX - bounds.left) / bounds.width - .5) * 4}deg`);
    };
    hero?.addEventListener('pointermove', move);
    hero?.addEventListener('pointerleave', reset);
    media.addEventListener('change', reset);
    return () => { hero?.removeEventListener('pointermove', move); hero?.removeEventListener('pointerleave', reset); media.removeEventListener('change', reset); };
  }, []);
  return <div className="hero-object" ref={host} aria-hidden="true" inert>
    <div className="hero-art">
      <img className="hero-render hero-render-dark" src="/images/hero-floor.webp" width="1536" height="1024" alt="" fetchPriority="high" decoding="async"/>
      <img className="hero-render hero-render-light" src="/images/hero-glass.webp" width="1050" height="1050" alt="" fetchPriority="high" decoding="async"/>
    </div>
  </div>;
}

export default function Site() {
  const [builds, setBuilds] = useState<Build[]>(initialBuilds);
  const [androidBuilds, setAndroidBuilds] = useState<Build[]>(readAndroidCatalog(bundledAndroid));
  const [platform, setPlatform] = useState<'ios' | 'android'>('ios');
  const [selectedSDK, setSelectedSDK] = useState(initialBuilds[0]?.sdk ?? 58);
  const [catalogState, setCatalogState] = useState<'bundled' | 'live' | 'offline'>('bundled');
  const [theme, setTheme] = useState<Theme>('system');
  const [copyState, setCopyState] = useState('');
  const [launchNotice, setLaunchNotice] = useState(false);
  const platformBuilds = platform === 'ios' ? builds : androidBuilds;
  const selected = platformBuilds.find((build) => build.sdk === selectedSDK);

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

  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem('expo-theme'); } catch { /* Storage may be disabled. */ }
    if (saved === 'light' || saved === 'dark' || saved === 'system') setTheme(saved);
  }, []);

  function changeTheme() {
    const next: Theme = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
    setTheme(next);
    try { localStorage.setItem('expo-theme', next); } catch { /* Keep the current session usable. */ }
    const dark = next === 'dark' || (next === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.dataset.theme = next;
    window.dispatchEvent(new Event('expo-theme-change'));
  }

  async function copySource() {
    try {
      await navigator.clipboard.writeText(SOURCE_URL);
      setCopyState('Source URL copied. Paste it into LiveContainer’s Sources.');
    } catch {
      setCopyState('Copy is unavailable. Select and copy the source URL below.');
    }
  }

  function selectWithArrow(event: React.KeyboardEvent<HTMLDivElement>) {
    const available = SDK_CHOICES.filter((sdk) => platformBuilds.some((build) => build.sdk === sdk));
    const current = available.indexOf(selectedSDK);
    let next: number | undefined;
    if (event.key === 'ArrowRight') next = available[(current + 1) % available.length];
    if (event.key === 'ArrowLeft') next = available[(current - 1 + available.length) % available.length];
    if (event.key === 'Home') next = available[0];
    if (event.key === 'End') next = available.at(-1);
    if (next) { event.preventDefault(); setSelectedSDK(next); document.getElementById(`sdk-${next}`)?.focus(); }
  }

  return <>
    <a className="skip-link" href="#main">Skip to downloads</a>
    <header className="site-header page-width">
      <a className="brand" href="/" aria-label="Expo Go Builds home"><Mark/><span>Expo Go <span className="brand-muted">Builds</span></span></a>
      <nav aria-label="Main navigation">
        <Button asChild variant="ghost" className="nav-link"><a href={REPOSITORY_URL}>GitHub <ArrowIcon aria-hidden="true"/></a></Button>
        <Button asChild variant="ghost" className="nav-link install-nav"><a href="#install">How to install</a></Button>
        <Button variant="ghost" size="icon" className="theme-toggle" onClick={changeTheme} aria-label={`Theme: ${theme}. Switch to ${theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system'} theme.`} title={`Theme: ${theme} (click to change)`}>
          {theme === 'dark' ? <MoonIcon aria-hidden="true"/> : <SunIcon aria-hidden="true"/>}
        </Button>
      </nav>
    </header>
    <main id="main">
      <section className="hero page-width" aria-labelledby="hero-heading">
        <div className="hero-content">
          <h1 id="hero-heading">Your SDK.<br/>{' '}Your phone.</h1>
          <p className="hero-description">Expo Go for iOS and Android. Choose your project’s SDK.</p>
          <div className="download-controls">
            <div className="platform-picker" role="group" aria-label="Download platform">
              <Button variant="ghost" aria-pressed={platform === 'ios'} onClick={() => setPlatform('ios')}>iOS</Button>
              <Button variant="ghost" aria-pressed={platform === 'android'} onClick={() => setPlatform('android')}>Android</Button>
            </div>
            <div className="sdk-picker" role="group" aria-label="Choose your Expo SDK" onKeyDown={selectWithArrow}>
              {SDK_CHOICES.map((sdk) => {
                const available = platformBuilds.some((build) => build.sdk === sdk);
                return <Button key={sdk} id={`sdk-${sdk}`} variant="ghost" className={`sdk-option ${selected?.sdk === sdk ? 'selected' : ''}`} disabled={!available} aria-pressed={selected?.sdk === sdk} aria-label={`SDK ${sdk}${available ? '' : ', not yet published'}`} onClick={() => setSelectedSDK(sdk)}>
                  <span>{sdk}</span>{!available && <span className="sdk-unavailable">Not yet</span>}
                </Button>;
              })}
            </div>
            <div className="hero-actions">
              {selected ? <Button asChild ring={false} className="primary-download" size="lg"><a href={selected.downloadURL}><DownloadIcon aria-hidden="true"/>Download {platform === 'ios' ? 'IPA' : 'APK'}</a></Button> : <Button disabled ring={false} className="primary-download" size="lg">SDK {selectedSDK} {platform === 'ios' ? 'IPA' : 'APK'} not published</Button>}
              {platform === 'ios' ? <Button asChild variant="outline" className="container-button" size="lg"><a href={liveContainerURL()} onClick={() => setLaunchNotice(true)}><BoxIcon aria-hidden="true"/>Add to LiveContainer</a></Button> : <Button asChild variant="outline" className="container-button" size="lg"><a href={`${REPOSITORY_URL}/releases`}><ArrowIcon aria-hidden="true"/>View releases</a></Button>}
            </div>
            <div className="build-meta" aria-live="polite" aria-atomic="true">
              {selected ? <><span>SDK {selected.sdk}</span><span>{platform === 'ios' ? 'iOS' : 'Android'} {selected.minOSVersion}+</span><span>{platform === 'ios' ? 'Unsigned IPA' : 'Expo-signed APK'}</span></> : <span>Choose an available SDK for {platform === 'ios' ? 'iOS' : 'Android'}.</span>}
            </div>
            {launchNotice && <p className="launch-notice" role="status">Didn’t open? <a href="#source">Copy the source URL</a> into LiveContainer.</p>}
          </div>
        </div>
        <HeroObject/>
      </section>

      <section className="install-overview page-width" id="install" aria-labelledby="install-heading">
        <h2 className="sr-only" id="install-heading">Install Expo Go on your phone</h2>
        <ol className="install-steps">
          <li><span className="step-number" aria-hidden="true">1</span><div><h3>Choose your SDK</h3><p>Match the Expo version in your project’s <code>package.json</code>.</p></div></li>
          <li><span className="step-number" aria-hidden="true">2</span><div><h3>Get the matching build</h3><p>Download the APK or IPA for your phone.</p></div></li>
          <li><span className="step-number" aria-hidden="true">3</span><div><h3>Install your way</h3><p>Open the APK on Android. Sign or import the IPA on iOS.</p></div></li>
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
          <p className="installation-note">These are unsigned community builds. Your installation tool handles signing. SDKs share Expo Go’s bundle identifier; use LiveContainer’s duplicate controls to keep more than one.</p>
          <a className="text-link" href="https://github.com/LiveContainer/LiveContainer">LiveContainer setup guide <ArrowIcon aria-hidden="true"/></a>
        </div>
        <div className="build-details">
          <h2>Know your download.</h2>
          {selected && <>
            <dl><div><dt>Expo SDK</dt><dd>{selected.sdk}</dd></div><div><dt>Expo Go version</dt><dd>{selected.version}</dd></div><div><dt>Minimum {platform === 'ios' ? 'iOS' : 'Android'}</dt><dd>{selected.minOSVersion}</dd></div><div><dt>Download size</dt><dd>{formatSize(selected.size) || 'See release'}</dd></div><div><dt>Signing</dt><dd>{platform === 'ios' ? 'Unsigned' : 'Original Expo signature'}</dd></div></dl>
            {selected.sha256 && <details className="checksum"><summary>File checksum (SHA-256)</summary><p>Compare this SHA-256 checksum with the downloaded IPA using a checksum utility. Matching values show the file is unchanged.</p><code>{selected.sha256}</code></details>}
          </>}
          <p className="catalog-state">{catalogState === 'live' ? 'Release list refreshed from GitHub.' : catalogState === 'offline' ? 'Live refresh unavailable. Showing the bundled release list.' : 'Showing the bundled release list.'}</p>
          <a className="text-link" href={`${REPOSITORY_URL}/releases`}>Browse releases on GitHub <ArrowIcon aria-hidden="true"/></a>
        </div>
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
    <footer className="site-footer page-width"><p>Independent community builds. Not affiliated with Expo or Apple.</p><div><a href="https://expo.dev/go">Official Expo Go</a><a href="https://github.com/expo/expo">Expo source</a><a href={REPOSITORY_URL}>Project on GitHub</a></div></footer>
  </>;
}

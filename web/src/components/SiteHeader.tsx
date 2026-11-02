import { Button } from '@/components/ui/button';
import { SunBoldDuotoneIcon as SunIcon, MoonBoldDuotoneIcon as MoonIcon } from '@/components/icons';
import { BoxLinearIcon as BoxIcon } from '@/components/icons/linear';
import { GithubIcon } from '@/components/icons/brand';
import { REPOSITORY_URL, liveContainerURL } from '@/lib/catalog.mjs';

export default function SiteHeader({ onLaunch }: { onLaunch?: () => void }) {
  return <header className="site-header page-width">
    <nav aria-label="Main navigation">
      <a className="brand" href="/" aria-label="Expo Go Builds home">Expo Go</a>
      <a className="nav-docs" href={REPOSITORY_URL + '/blob/main/docs/SDK_SUPPORT.md'}>Docs</a>
      <a className="nav-changelog" href={REPOSITORY_URL + '/releases'}>Changelog</a>
      <a className="nav-github" href={REPOSITORY_URL} aria-label="GitHub"><GithubIcon aria-hidden="true"/><span>GitHub</span></a>
      <a className="nav-container" aria-label="LiveContainer" href={liveContainerURL()} onClick={onLaunch}><BoxIcon aria-hidden="true"/><span>LiveContainer</span></a>
      <Button variant="ghost" className="theme-toggle" data-theme-toggle="" aria-label="Toggle light and dark theme" title="Toggle light and dark theme"><SunIcon className="theme-icon-light" aria-hidden="true"/><MoonIcon className="theme-icon-dark" aria-hidden="true"/></Button>
    </nav>
  </header>;
}

/** The same theme-aware Expo artwork on every download entry page. */
export default function HeroArtwork() {
  return <div className="hero-object" aria-hidden="true" inert>
    <img className="hero-render hero-render-dark" src="/images/hero-dark.webp" width="1050" height="1050" alt="" fetchPriority="high" decoding="async"/>
    <img className="hero-render hero-render-light" src="/images/hero-light.webp" width="1050" height="1050" alt="" fetchPriority="high" decoding="async"/>
  </div>;
}

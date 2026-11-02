export default function SdkLinks({ sdks, current }: { sdks: number[]; current?: number }) {
  return <nav className="sdk-links page-width" aria-label="Downloads by Expo SDK">
    <span>Download by SDK</span>
    <div>{sdks.map(sdk => <a key={sdk} href={`/sdk/${sdk}/`} aria-current={sdk === current ? 'page' : undefined}>SDK {sdk}</a>)}</div>
  </nav>;
}

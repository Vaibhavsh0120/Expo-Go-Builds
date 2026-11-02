import { REPOSITORY_URL, readCatalog, readAndroidCatalog } from './catalog.mjs';

// All landing pages and sitemap entries must correspond to validated published assets.
export function sdkPages(iosCatalog, androidCatalog) {
  const ios = readCatalog(iosCatalog);
  const android = readAndroidCatalog(androidCatalog);
  return [...new Set([...ios, ...android].map(build => build.sdk))].sort((a, b) => b - a)
    .map(sdk => ({ sdk, path: `/sdk/${sdk}/`, ios: ios.find(build => build.sdk === sdk), android: android.find(build => build.sdk === sdk) }));
}

const website = origin => ({
  '@type': 'WebSite', '@id': `${origin}#website`, url: origin,
  name: 'Expo Go Builds', alternateName: 'Expo Go Downloads', inLanguage: 'en',
  description: 'Independent community Expo Go downloads for iOS and Android, organized by Expo SDK.',
  sameAs: REPOSITORY_URL,
});

function application(build, os) {
  return {
    '@type': 'SoftwareApplication', name: `Expo Go SDK ${build.sdk} for ${os}`,
    applicationCategory: 'DeveloperApplication', softwareVersion: build.version,
    operatingSystem: `${os} ${build.minOSVersion} or later`, downloadUrl: build.downloadURL,
    isAccessibleForFree: true, author: { '@type': 'Organization', name: 'Expo', url: 'https://expo.dev/' },
  };
}

export function homeGraph(canonical, title, description, downloads) {
  const url = canonical.href;
  return { '@context': 'https://schema.org', '@graph': [website(url), {
    '@type': 'CollectionPage', '@id': `${url}#webpage`, url, name: title, description,
    isPartOf: { '@id': `${url}#website` }, inLanguage: 'en',
    mainEntity: { '@type': 'ItemList', itemListElement: downloads.map((build, i) => ({
      '@type': 'ListItem', position: i + 1, item: application(build, build.os),
    })) },
  }] };
}

export function sdkGraph(canonical, title, description, page) {
  const origin = new URL('/', canonical).href;
  return { '@context': 'https://schema.org', '@graph': [website(origin), {
    '@type': 'WebPage', '@id': `${canonical.href}#webpage`, url: canonical.href, name: title, description,
    isPartOf: { '@id': `${origin}#website` }, inLanguage: 'en',
    mainEntity: [page.ios && application(page.ios, 'iOS'), page.android && application(page.android, 'Android')].filter(Boolean),
  }, {
    '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Expo Go downloads', item: origin },
      { '@type': 'ListItem', position: 2, name: `SDK ${page.sdk}`, item: canonical.href },
    ],
  }] };
}

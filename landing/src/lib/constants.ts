// Download links for Rheo releases
// These are fallback values - link to releases page if API fails
export const LATEST_VERSION = 'v0.1.0';

export const GITHUB_REPO = 'https://github.com/MasterZ1311/Rheo';
export const GITHUB_RELEASES_PAGE = `${GITHUB_REPO}/releases`;
export const AUTHOR_GITHUB = 'https://github.com/MasterZ1311';
export const DONATE_URL = `${GITHUB_REPO}#sponsors`;
export const SPONSOR_CHECKOUT_URL = `${GITHUB_REPO}#sponsors`;
export const SPONSOR_CONTACT_EMAIL = 'contact@rheo.sh';

export const DOWNLOAD_LINKS = {
  macArm: GITHUB_RELEASES_PAGE,
  macIntel: GITHUB_RELEASES_PAGE,
  windows: GITHUB_RELEASES_PAGE,
  linux: GITHUB_RELEASES_PAGE,
} as const;

// Export function to get dynamic download links
export { getLatestRelease } from './releases';

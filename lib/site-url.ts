const productionOrigin = "https://www.cofoundee.co";
const configuredUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL || productionOrigin);

// The bare production domain redirects to www. Metadata and the sitemap
// should point straight to the site that serves the page.
export const siteOrigin =
  configuredUrl.hostname === "cofoundee.co" || configuredUrl.hostname === "www.cofoundee.co"
    ? productionOrigin
    : configuredUrl.origin;

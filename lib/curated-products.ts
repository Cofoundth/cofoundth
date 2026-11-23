import {
  MAX_PRODUCT_BLURB,
  MAX_PRODUCT_IMAGES,
  MAX_PRODUCT_NAME,
  PRODUCT_CATEGORIES,
} from "./post-types";
import { validateProductLinks } from "./product-store-links";
import { webUrl } from "./web-url";
import { MAX_LINK_LENGTH } from "./write-limits";

export const CURATED_PRODUCT_LABEL = "Cofoundของdee";
export const MAX_CURATED_PRODUCTS = 50;
export const MAX_CURATED_MAKER_NAME = 100;
export const MAX_PRODUCT_WORKBOOK_BYTES = 2 * 1024 * 1024;

export const PRODUCT_IMPORT_COLUMNS = [
  "name",
  "description",
  "category",
  "platforms",
  "link",
  "maker",
  "ios",
  "android",
  "screenshots",
] as const;

export type CuratedProductColumn = (typeof PRODUCT_IMPORT_COLUMNS)[number];
export type CuratedProductInput = Record<CuratedProductColumn, string>;

export const EMPTY_CURATED_PRODUCT: CuratedProductInput = {
  name: "", description: "", category: "", platforms: "web", link: "",
  maker: "", ios: "", android: "", screenshots: "",
};

export function validateCuratedProduct(input: CuratedProductInput) {
  const title = input.name.trim();
  const content = input.description.trim();
  const category = input.category.trim().toLowerCase();
  const platformValue = input.platforms.trim().toLowerCase().split(",").map((part) => part.trim());
  const platforms = [...new Set(platformValue)];
  const mobile = platforms.includes("mobile");
  const maker = input.maker.trim();
  const ios = input.ios.trim();
  const android = input.android.trim();
  const images = input.screenshots.split(/[|\n]/).map((url) => url.trim()).filter(Boolean);

  if (!title) return { error: "Name your product." };
  if (title.length > MAX_PRODUCT_NAME) return { error: "Keep the product name short." };
  if (!content) return { error: "Say what it is." };
  if (content.length > MAX_PRODUCT_BLURB) return { error: "Keep the description short." };
  if (!(PRODUCT_CATEGORIES as readonly string[]).includes(category)) return { error: "Pick a category." };
  if (platforms.some((platform) => platform !== "web" && platform !== "mobile"))
    return { error: "Pick where it runs." };
  if (maker.length > MAX_CURATED_MAKER_NAME) return { error: "Keep the maker name under 101 characters." };
  if ((ios || android) && !mobile) return { error: "Select Mobile to add app store links." };
  const links = validateProductLinks({
    link: input.link,
    requiresTryLink: platforms.includes("web"),
    inStores: !!(ios || android),
    ios,
    android,
  });
  if (links.error !== undefined) return { error: links.error };
  if (images.length > MAX_PRODUCT_IMAGES) return { error: "Use up to 8 screenshot links." };
  if (images.some((raw) => {
    const url = webUrl(raw);
    return !url || url.protocol !== "https:" || url.username || url.password || url.href.length > MAX_LINK_LENGTH;
  })) return { error: "Screenshot links must be valid HTTPS URLs." };

  return {
    entry: {
      title,
      content,
      category,
      platforms,
      link_url: links.linkUrl,
      ios_store_url: links.iosStoreUrl,
      android_store_url: links.androidStoreUrl,
      maker_name: maker || null,
      image_urls: [...new Set(images)],
    },
  };
}

/** First worksheet, one product per nonblank data row. Header order can vary. */
export function readCuratedProductRows(sheet: readonly (readonly unknown[])[]) {
  const cell = (value: unknown) =>
    typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
  const headers = (sheet[0] ?? []).map((value) => cell(value).toLowerCase());
  const indexes = PRODUCT_IMPORT_COLUMNS.map((column) => headers.indexOf(column));
  if (indexes.slice(0, 4).some((index) => index < 0) ||
      [headers.indexOf("link"), headers.indexOf("ios"), headers.indexOf("android")].every((index) => index < 0))
    return { error: "Use the Excel column names shown above." };
  if (PRODUCT_IMPORT_COLUMNS.some((column) => headers.indexOf(column) !== headers.lastIndexOf(column)))
    return { error: "Use each Excel column name only once." };

  const rows = sheet.slice(1).flatMap((row) => {
    const fields = indexes.map((index) => cell(row[index]));
    if (!fields.some(Boolean)) return [];
    const input = { ...EMPTY_CURATED_PRODUCT };
    PRODUCT_IMPORT_COLUMNS.forEach((column, index) => { input[column] = fields[index]; });
    input.category = input.category.toLowerCase();
    input.platforms = [...new Set(input.platforms.toLowerCase().split(",").map((part) => part.trim()))].sort().reverse().join(",");
    return [input];
  });
  if (!rows.length) return { error: "No products found in the first worksheet." };
  if (rows.length > MAX_CURATED_PRODUCTS) return { error: "Review up to 50 products at a time." };
  return { rows };
}

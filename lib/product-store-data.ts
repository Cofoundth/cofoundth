export const PRODUCT_STORE_COLUMNS = "ios_store_url, android_store_url";

/** Keep existing reads and writes available during the store-link migration. */
export async function queryWithProductStoreColumns<T>(
  query: (includeStores: boolean) => PromiseLike<{
    data: T;
    error: { code?: string; message: string } | null;
  }>,
  canUsePreviousSchema = true,
) {
  const result = await query(true);
  const error = result.error;
  if (
    canUsePreviousSchema &&
    (error?.code === "42703" || error?.code === "PGRST204") &&
    /\b(ios_store_url|android_store_url)\b/.test(error.message)
  ) {
    return query(false);
  }
  return result;
}

export function productStoreColumnsOf(row: Record<string, unknown>) {
  return {
    ios_store_url: typeof row.ios_store_url === "string" ? row.ios_store_url : null,
    android_store_url: typeof row.android_store_url === "string" ? row.android_store_url : null,
  };
}

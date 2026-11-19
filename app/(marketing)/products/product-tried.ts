// "Try it" on a product's own page (./ProductDetail.tsx, through
// ./PhoneHandoff.tsx TryItLink) says so on the window, so a try from the
// deck's product modal (./ProductModal.tsx) is asked about on the way back
// exactly as a try from the deck card is: ./DeckPrompts.tsx listens. The
// modal's page is server-rendered and knows nothing of the deck, hence an
// event rather than a callback. On /products/<id> nothing listens, and the
// event goes nowhere.

export const PRODUCT_TRIED_EVENT = "cofoundee:product-tried";

/** The product's tab has just opened. */
export function announceTried(productId: string) {
  window.dispatchEvent(
    new CustomEvent<string>(PRODUCT_TRIED_EVENT, { detail: productId }),
  );
}

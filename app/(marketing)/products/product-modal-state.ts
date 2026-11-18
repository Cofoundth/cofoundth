// Whether the product modal on screen was opened by the deck in THIS tab
// (./ProductDeck.tsx pushed `?product=<id>`), so that closing it steps back
// over that history entry instead of adding one (./ProductModal.tsx). Module
// state on purpose: a reload or a shared link starts with none, and the modal
// then closes by replacing its own address, which has nothing to step back to.
//
// Only the browser writes it; the server only ever renders the modal.

let openedFromDeck: string | null = null;

export function markOpenedFromDeck(productId: string) {
  openedFromDeck = productId;
}

/** The deck is leaving (./ProductDeck.tsx, on unmount): a modal met after
 *  that — signing in from it and coming back, Back from another page — was
 *  not opened by this push, and closing it must not step Back into wherever
 *  the reader went. */
export function clearOpenedFromDeck() {
  openedFromDeck = null;
}

/** True once, for the product the deck opened; every call clears it. */
export function takeOpenedFromDeck(productId: string): boolean {
  const opened = openedFromDeck === productId;
  openedFromDeck = null;
  return opened;
}

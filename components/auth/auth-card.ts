// The panel every auth page (sign in, sign up, forgot password) is drawn on,
// ONE string so the three cannot drift apart.
//
// A white card on the sand ground from 640px. Below that there is no card: the
// page itself turns white (app/(auth)/layout.tsx) and the form runs to the
// phone's 16px gutters — a bordered box inset inside a 390px screen spent ~60px
// of the width on frames around the fields, and the role cards and the
// password fields were squeezed into three-line strips to fit.
//
// `short:` (app/globals.css) trims the padding on screens under 720px tall, so
// the pages still fit one screen with an error message showing.
//
// `relative z-10`: the floating brand mark (app/(auth)/layout.tsx) sits in the
// top-left corner, and the wide sign-up card can reach that corner on a short
// screen 768-919px wide. If they ever meet, the card is drawn over the mark,
// not the mark over the card.
export const AUTH_CARD =
  "w-full max-w-md sm:relative sm:z-10 sm:rounded-xl sm:border sm:border-line sm:bg-white sm:p-8 sm:short:p-6";

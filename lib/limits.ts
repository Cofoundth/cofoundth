// Shared text-length caps.
//
// LONG_TEXT_MAX is a CHARACTER cap deliberately used as a "~200 words" limit.
// We can't count words by whitespace because Thai is written without spaces
// between words (the whole string would count as ~1 word), so a character cap
// is the only limit that behaves the same for Thai and English. ~1,500 chars
// is roughly 200 English words, with headroom so nobody is cut off mid-thought.
//
// Applies to every long-form bio/pitch/thesis/message field. Deal descriptions
// keep their own larger cap (DEAL_DESCRIPTION_MAX) — deals need the detail.
export const LONG_TEXT_MAX = 1500;
export const DEAL_DESCRIPTION_MAX = 5000;

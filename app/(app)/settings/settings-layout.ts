// The settings page's one section layout (the founder's call, 2026-11-18: the
// page takes the full width). A long form at 1120px in one column would
// stretch every field across it, so from `lg` each section is a ROW: its title
// in a narrow left column, its fields or rows on the right, with a hairline
// between sections where the title's own divider used to be. Below `lg` it is
// the column it always was. Shared by ./page.tsx and ./EditProfileForm.tsx so
// the two tabs and the profile form line up on the same columns.

/** On the <section>: the row. Its first child is the heading, the second the
 *  content (wrap multiple content blocks in one element). */
export const SETTINGS_SECTION =
  "lg:grid lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] lg:gap-x-12 lg:border-t lg:border-line lg:pt-6";

/** On the SectionHeading (with `divider`): its divider below `lg` only. */
export const SETTINGS_HEADING = "lg:border-b-0 lg:pb-0";

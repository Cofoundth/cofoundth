import { redirect } from "next/navigation";

// Interests + Chat were merged into one "Connections" page (/matches).
// This stub keeps old links and the express-interest redirect working.
export default function InterestsPage() {
  redirect("/matches");
}

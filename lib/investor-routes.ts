// Thin compatibility shim. lib/roles.ts is the source of truth for every role's
// route access, its home, and the write ladder — including the investor prose
// and allowlist that used to live here, carried over verbatim. Nothing is
// implemented twice.
//
// New code should import from lib/roles.ts directly and use
// parseAccountRole / roleHome / canRoleRead, which handle all three roles.
// These three names exist only so the existing proxy.ts and
// app/(app)/layout.tsx imports keep compiling while they are rewired.
import { ROLE_ACCESS } from "./roles";

export { INVESTOR_HOME, isAppShellRoute } from "./roles";

/** @deprecated Use `canRoleRead(role, pathname)` from lib/roles.ts. */
export function isInvestorReadableRoute(pathname: string): boolean {
  return ROLE_ACCESS.investor.canRead(pathname);
}

import { LOGIN_REDIRECT_QUERY, PATH_LOGIN } from "../config/paths";

export function loginPathWithRedirect(to: string): string {
  return `${PATH_LOGIN}?${LOGIN_REDIRECT_QUERY}=${encodeURIComponent(to)}`;
}

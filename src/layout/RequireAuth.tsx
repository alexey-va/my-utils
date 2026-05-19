import { Navigate, useLocation } from "react-router-dom";
import { isLoggedIn } from "../auth/session";
import { AUTH_NOTICE_KEY } from "../config/auth";
import { LOGIN_REDIRECT_QUERY, PATH_HOME, PATH_LOGIN } from "../config/paths";

type RequireAuthProps = {
  children: React.ReactNode;
};

/** Keeps restricted routes private; sends guests back to the app instead of a login wall. */
export default function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation();

  if (!isLoggedIn()) {
    sessionStorage.setItem(
      AUTH_NOTICE_KEY,
      "Sign in from the sidebar to open Admin panel.",
    );
    return <Navigate to={PATH_HOME} replace state={{ from: location.pathname }} />;
  }

  return children;
}

export function loginPathWithRedirect(to: string): string {
  return `${PATH_LOGIN}?${LOGIN_REDIRECT_QUERY}=${encodeURIComponent(to)}`;
}

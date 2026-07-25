import { Navigate, useLocation } from "react-router-dom";
import { isLoggedIn } from "../auth/session";
import { loginPathWithRedirect } from "./authNavigation";

type RequireAuthProps = {
  children: React.ReactNode;
};

/** Sends guests to sign-in while leaving the public Workout route untouched. */
export default function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation();

  if (!isLoggedIn()) {
    return (
      <Navigate
        to={loginPathWithRedirect(location.pathname)}
        replace
        state={{ authNotice: "Sign in to continue." }}
      />
    );
  }

  return children;
}

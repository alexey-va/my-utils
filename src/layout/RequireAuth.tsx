import { Navigate, useLocation } from "react-router-dom";
import { useStoredUser } from "../auth/useStoredUser";
import { loginPathWithRedirect } from "./authNavigation";

type RequireAuthProps = {
  children: React.ReactNode;
};

/** Sends guests to sign-in while leaving the public Workout route untouched. */
export default function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation();
  const user = useStoredUser();

  if (!user) {
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

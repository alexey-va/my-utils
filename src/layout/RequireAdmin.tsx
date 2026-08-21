import { Navigate, useLocation } from "react-router-dom";
import { useStoredUser } from "../auth/useStoredUser";
import { PATH_ACCOUNT, PATH_HOME } from "../config/paths";
import { loginPathWithRedirect } from "./authNavigation";

type Props = {
  children: React.ReactNode;
};

export default function RequireAdmin({ children }: Props) {
  const location = useLocation();
  const user = useStoredUser();

  if (!user) {
    return (
      <Navigate
        to={loginPathWithRedirect(location.pathname)}
        replace
        state={{ authNotice: "Sign in with an administrator account to continue." }}
      />
    );
  }
  if (user.mustChangePassword) {
    return <Navigate to={PATH_ACCOUNT} replace />;
  }
  if (user.role !== "ADMIN") {
    return (
      <Navigate
        to={PATH_HOME}
        replace
        state={{ authNotice: "This section is available to administrators only." }}
      />
    );
  }

  return children;
}

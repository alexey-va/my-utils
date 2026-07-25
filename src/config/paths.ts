import { featurePath } from "./featureCatalog";

export const PATH_HOME = featurePath("workout");
export const PATH_ADMIN = featurePath("dashboard");

/** Auth-only route — not a sidebar feature. */
export const PATH_LOGIN = "/login";
export const PATH_REGISTER = "/register";
export const PATH_ACCOUNT = "/account";

export const LOGIN_REDIRECT_QUERY = "to";

import { featurePath } from "./featureCatalog";

export const PATH_HOME = featurePath("generators");
export const PATH_JSON = featurePath("json");
export const PATH_ADMIN = featurePath("dashboard");

/** Auth-only route — not a sidebar feature. */
export const PATH_LOGIN = "/login";

export const LOGIN_REDIRECT_QUERY = "to";

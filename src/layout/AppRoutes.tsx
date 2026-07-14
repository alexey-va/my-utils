import type { ComponentType } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ErrorComponent } from "@refinedev/antd";
import { appFeatures } from "../config/features";
import { PATH_LOGIN } from "../config/paths";
import LoginPage from "../features/auth/LoginPage";
import AuthNotice from "./AuthNotice";
import RequireAuth from "./RequireAuth";
import RequireTabPassword from "./RequireTabPassword";

function featureRoutePath(path: string): string | undefined {
  if (path === "/") {
    return undefined;
  }
  return path.replace(/^\//, "");
}

function FeatureRoute({
  Page,
  requiresAuth,
  requiresTabPassword,
}: {
  Page: ComponentType;
  requiresAuth?: boolean;
  requiresTabPassword?: boolean;
}) {
  let page = <Page />;
  if (requiresTabPassword) {
    page = <RequireTabPassword>{page}</RequireTabPassword>;
  }
  if (requiresAuth) {
    page = <RequireAuth>{page}</RequireAuth>;
  }
  return page;
}

export default function AppRoutes() {
  return (
    <>
      <AuthNotice />
      <Routes>
        {appFeatures.map((feature) => {
          const { id, path, Page, requiresAuth, requiresTabPassword, index, aliases } = feature;
          const routePath = featureRoutePath(path);

          return (
            <Route key={id}>
              {index ? (
                <Route
                  index
                  element={
                    <FeatureRoute
                      Page={Page}
                      requiresAuth={requiresAuth}
                      requiresTabPassword={requiresTabPassword}
                    />
                  }
                />
              ) : null}
              {routePath ? (
                <Route
                  path={routePath}
                  element={
                    <FeatureRoute
                      Page={Page}
                      requiresAuth={requiresAuth}
                      requiresTabPassword={requiresTabPassword}
                    />
                  }
                />
              ) : null}
              {aliases?.map((alias) => (
                <Route key={`${id}-${alias}`} path={alias} element={<Navigate to={path} replace />} />
              ))}
            </Route>
          );
        })}
        <Route path={PATH_LOGIN.replace(/^\//, "")} element={<LoginPage />} />
        <Route path="*" element={<ErrorComponent />} />
      </Routes>
    </>
  );
}

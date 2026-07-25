import { lazy, Suspense, type ComponentType } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Button, Flex, Result, Spin } from "antd";
import { appFeatures } from "../config/features";
import { PATH_ACCOUNT, PATH_LOGIN, PATH_REGISTER } from "../config/paths";
import AuthNotice from "./AuthNotice";
import RequireAuth from "./RequireAuth";
import RequireAdmin from "./RequireAdmin";

const LoginPage = lazy(() => import("../features/auth/LoginPage"));
const RegisterPage = lazy(() => import("../features/auth/RegisterPage"));
const AccountPage = lazy(() => import("../features/auth/AccountPage"));

function RouteLoading() {
  return (
    <Flex align="center" justify="center" style={{ minHeight: "50vh" }}>
      <Spin size="large" />
    </Flex>
  );
}

function featureRoutePath(path: string): string | undefined {
  if (path === "/") {
    return undefined;
  }
  return path.replace(/^\//, "");
}

function FeatureRoute({
  Page,
  requiresAuth,
  requiresAdmin,
}: {
  Page: ComponentType;
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
}) {
  let page = (
    <Suspense
      fallback={<RouteLoading />}
    >
      <Page />
    </Suspense>
  );
  if (requiresAdmin) {
    page = <RequireAdmin>{page}</RequireAdmin>;
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
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          {appFeatures.map((feature) => {
          const { id, path, Page, requiresAuth, requiresAdmin, index, aliases } = feature;
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
                      requiresAdmin={requiresAdmin}
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
                      requiresAdmin={requiresAdmin}
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
          <Route path={PATH_REGISTER.replace(/^\//, "")} element={<RegisterPage />} />
          <Route
            path={PATH_ACCOUNT.replace(/^\//, "")}
            element={
              <RequireAuth>
                <AccountPage />
              </RequireAuth>
            }
          />
          <Route
            path="*"
            element={
              <Result
                status="404"
                title="Page not found"
                extra={
                  <Button type="primary" href="/">
                    Open Workout
                  </Button>
                }
              />
            }
          />
        </Routes>
      </Suspense>
    </>
  );
}

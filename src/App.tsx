import { Refine } from "@refinedev/core";
import routerProvider from "@refinedev/react-router";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ConfigProvider } from "antd";
import { ThemedLayout } from "@refinedev/antd";
import AppTitle from "./layout/AppTitle";
import AppSider from "./layout/AppSider";
import AppRoutes from "./layout/AppRoutes";
import { authProvider } from "./providers/authProvider";
import { accessControlProvider } from "./providers/accessControlProvider";
import { dataProvider } from "./providers/dataProvider";
import { appResources } from "./config/resources";
import { appTheme } from "./theme/appTheme";
import { APP_NAME } from "./config/appBranding";

export default function App() {
  return (
    <BrowserRouter>
      <ConfigProvider theme={appTheme}>
        <Refine
          routerProvider={routerProvider}
          dataProvider={dataProvider}
          authProvider={authProvider}
          accessControlProvider={accessControlProvider}
          options={{ syncWithLocation: true, title: { text: APP_NAME } }}
          resources={appResources}
        >
          <Routes>
            <Route
              path="/*"
              element={
                <ThemedLayout Header={() => null} Title={AppTitle} Sider={AppSider}>
                  <AppRoutes />
                </ThemedLayout>
              }
            />
          </Routes>
        </Refine>
      </ConfigProvider>
    </BrowserRouter>
  );
}

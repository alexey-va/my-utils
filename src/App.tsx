import { Refine } from "@refinedev/core";
import routerProvider from "@refinedev/react-router";
import { BrowserRouter } from "react-router-dom";
import { App as AntApp } from "antd";
import AppShell from "./layout/AppShell";
import AppRoutes from "./layout/AppRoutes";
import { authProvider } from "./providers/authProvider";
import { accessControlProvider } from "./providers/accessControlProvider";
import { dataProvider } from "./providers/dataProvider";
import { appResources } from "./config/resources";
import AppThemeProvider from "./theme/AppThemeProvider";
import { APP_NAME } from "./config/appBranding";

export default function App() {
  return (
    <BrowserRouter>
      <AppThemeProvider>
        <AntApp>
          <Refine
            routerProvider={routerProvider}
            dataProvider={dataProvider}
            authProvider={authProvider}
            accessControlProvider={accessControlProvider}
            options={{ syncWithLocation: true, title: { text: APP_NAME } }}
            resources={appResources}
          >
            <AppShell>
              <AppRoutes />
            </AppShell>
          </Refine>
        </AntApp>
      </AppThemeProvider>
    </BrowserRouter>
  );
}

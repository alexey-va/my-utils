import { Refine } from "@refinedev/core";
import routerProvider from "@refinedev/react-router";
import { BrowserRouter } from "react-router-dom";
import { App as AntApp, ConfigProvider, Layout } from "antd";
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
        <AntApp>
          <Refine
            routerProvider={routerProvider}
            dataProvider={dataProvider}
            authProvider={authProvider}
            accessControlProvider={accessControlProvider}
            options={{ syncWithLocation: true, title: { text: APP_NAME } }}
            resources={appResources}
          >
            <Layout hasSider>
              <AppSider />
              <Layout>
                <Layout.Content>
                  <AppRoutes />
                </Layout.Content>
              </Layout>
            </Layout>
          </Refine>
        </AntApp>
      </ConfigProvider>
    </BrowserRouter>
  );
}

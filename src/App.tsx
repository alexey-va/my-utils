/* eslint-disable @typescript-eslint/no-explicit-any */
import { Refine, Authenticated, AuthProvider } from "@refinedev/core";
import routerProvider from "@refinedev/react-router";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ConfigProvider, theme } from "antd";
import { ThemedLayout, ErrorComponent } from "@refinedev/antd";
import { ThunderboltOutlined } from "@ant-design/icons";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import Generators from "./pages/Generators";
import Json from "./tools/Json";

// minimal data provider
const dataProvider = {
  getList: async () => ({ data: [], total: 0 }),
  getOne: async () => ({ data: {} }),
  create: async () => ({ data: {} }),
  update: async () => ({ data: {} }),
  deleteOne: async () => ({ data: {} }),
} as any;

// define authProvider
const authProvider: AuthProvider = {
  login: async ({ email, password }) => {
    if (email && password) {
      localStorage.setItem("token", "ok");
      localStorage.setItem("user", JSON.stringify({ email }));
      return { success: true, redirectTo: "/" };
    }
    return { success: false, error: { name: "Login failed", message: "Invalid credentials" } };
  },
  logout: async () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return { success: true, redirectTo: "/login" };
  },
  check: async () => {
    const token = localStorage.getItem("token");
    return token
      ? { authenticated: true }
      : {
        authenticated: false,
        logout: false,
        redirectTo: "/login",
        error: { name: "Unauthenticated", message: "Please log in" },
      };
  },
  getIdentity: async () => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  },
  getPermissions: async () => null,
  onError: async (error) => ({ error }),
};

export default function App() {
  return (
    <BrowserRouter>
      <ConfigProvider
        theme={{
          algorithm: theme.darkAlgorithm,
          token: {
            // grafana-like grays
            colorBgBase: "#121621",
            colorBgLayout: "#121621",
            colorBgContainer: "#181d29",
            colorTextBase: "#d6dae1",
            colorBorder: "#2a3142",
            colorPrimary: "#9aa4b2",      // neutral accent (no blue)
            borderRadius: 8,
            controlHeight: 36,
          },
          components: {
            Layout: {
              siderBg: "#151a26",
              headerBg: "#121621",
              bodyBg: "#121621",
            },
            Menu: {
              itemBg: "transparent",
              itemColor: "#b7c0cc",
              itemHoverBg: "#1c2230",
              itemHoverColor: "#e5eaf1",
              itemSelectedBg: "#222838",
              itemSelectedColor: "#eef2f7",
              activeBarBorderWidth: 0,
            },
            Card: {
              colorBgContainer: "#181d29",
              colorBorderSecondary: "#2a3142",
              headerBg: "#181d29",
            },
            Button: {
              colorPrimary: "#394457",
              colorPrimaryHover: "#46536a",
              colorPrimaryActive: "#2e394a",
              defaultBg: "#1f2533",
              defaultBorderColor: "#2a3142",
              defaultColor: "#c7cfdb",
              borderRadius: 8,
            },
            Input: {
              colorBgContainer: "#141a26",
              colorTextPlaceholder: "#8b93a1",
              hoverBorderColor: "#394457",
              activeBorderColor: "#394457",
            },
          },
        }}
      >
        <Refine
          routerProvider={routerProvider}
          dataProvider={dataProvider}
          authProvider={authProvider}
          options={{ syncWithLocation: true }}
          resources={[
            { name: "dashboard", list: "/", meta: { label: "Dashboard" } },
            { name: "generators", list: "/generators", meta: { label: "Generators", icon: <ThunderboltOutlined /> } },
            { name: "json", list: "/json", meta: { label: "JSON Prettify" } },
          ]}
        >
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <Authenticated fallback={<Login />} key={""}>
                  <ThemedLayout>
                    <Routes>
                      <Route index element={<Admin />} />
                      <Route path="generators" element={<Generators />} />
                      <Route path="json" element={<Json />} />
                      <Route path="*" element={<ErrorComponent />} />
                    </Routes>
                  </ThemedLayout>
                </Authenticated>
              }
            />
          </Routes>
        </Refine>
      </ConfigProvider>
    </BrowserRouter>
  );
}
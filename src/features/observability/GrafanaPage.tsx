import { AppstoreOutlined } from "@ant-design/icons";
import { Button, Space, Tabs } from "antd";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { appFeatures } from "../../config/features";
import { grafanaEmbedUrl } from "../../config/grafana";
import { grafanaPanels } from "../../config/grafanaDashboards";

const navFeatures = appFeatures.filter((f) => f.id !== "observability");

export default function GrafanaPage() {
  const navigate = useNavigate();
  const panels = useMemo(() => grafanaPanels(), []);
  const [activeId, setActiveId] = useState(panels[0]?.id ?? "api-dashboard");

  const activePanel = panels.find((p) => p.id === activeId) ?? panels[0];
  const embedUrl = grafanaEmbedUrl({
    path: activePanel?.path,
    kiosk: false,
  });

  return (
    <div className="grafana-shell">
      <div className="grafana-shell__toolbar">
        <Button
          type="text"
          className="grafana-shell__home-btn"
          icon={<AppstoreOutlined />}
          onClick={() => navigate("/")}
        >
          App
        </Button>
        <Space size={4} wrap className="grafana-shell__nav">
          {navFeatures.map((feature) => (
            <Button
              key={feature.id}
              size="small"
              type="default"
              className="grafana-shell__nav-btn"
              onClick={() => navigate(feature.path)}
            >
              {feature.label}
            </Button>
          ))}
        </Space>
        {panels.length > 1 ? (
          <Tabs
            className="grafana-shell__tabs"
            activeKey={activeId}
            onChange={setActiveId}
            items={panels.map((panel) => ({
              key: panel.id,
              label: panel.title,
            }))}
          />
        ) : null}
      </div>
      <div className="grafana-shell__frame-wrap">
        <iframe
          className="grafana-shell__frame"
          src={embedUrl}
          title={activePanel?.title ?? "Grafana"}
          allow="fullscreen"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  );
}

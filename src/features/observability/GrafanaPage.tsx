import { BarChartOutlined } from "@ant-design/icons";
import { Menu } from "antd";
import { useMemo, useState } from "react";
import { grafanaEmbedUrl } from "../../config/grafana";
import { grafanaPanels } from "../../config/grafanaDashboards";

export default function GrafanaPage() {
  const panels = useMemo(() => grafanaPanels(), []);
  const [activeId, setActiveId] = useState(panels[0]?.id ?? "api-dashboard");

  const activePanel = panels.find((p) => p.id === activeId) ?? panels[0];
  const embedUrl = grafanaEmbedUrl({
    path: activePanel?.path,
    kiosk: true,
  });

  return (
    <div className="grafana-page">
      <aside className="grafana-page__sidebar">
        <div className="grafana-page__sidebar-title">Dashboards</div>
        <Menu
          className="grafana-page__menu"
          mode="inline"
          selectedKeys={activeId ? [activeId] : []}
          items={panels.map((panel) => ({
            key: panel.id,
            icon: <BarChartOutlined />,
            label: panel.title,
          }))}
          onClick={({ key }) => setActiveId(key)}
        />
      </aside>
      <iframe
        className="grafana-page__frame"
        src={embedUrl}
        title={activePanel?.title ?? "Grafana"}
        allow="fullscreen"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

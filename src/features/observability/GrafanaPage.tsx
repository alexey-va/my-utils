import { Tabs } from "antd";
import { useMemo, useState } from "react";
import { grafanaEmbedUrl } from "../../config/grafana";
import { grafanaPanels } from "../../config/grafanaDashboards";

export default function GrafanaPage() {
  const panels = useMemo(() => grafanaPanels(), []);
  const [activeId, setActiveId] = useState(panels[0]?.id ?? "api-dashboard");

  const activePanel = panels.find((p) => p.id === activeId) ?? panels[0];
  const embedUrl = grafanaEmbedUrl({
    path: activePanel?.path,
    kiosk: false,
  });

  return (
    <div className="grafana-page">
      {panels.length > 1 ? (
        <Tabs
          className="grafana-page__tabs"
          activeKey={activeId}
          onChange={setActiveId}
          items={panels.map((panel) => ({
            key: panel.id,
            label: panel.title,
          }))}
        />
      ) : null}
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

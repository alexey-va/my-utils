import { useMemo, useState } from "react";
import { Tabs, Tooltip } from "antd";
import { ExportOutlined } from "@ant-design/icons";
import { grafanaEmbedUrl } from "../../config/grafana";
import { grafanaPanels } from "../../config/grafanaDashboards";

export default function GrafanaPage() {
  const panels = useMemo(() => grafanaPanels(), []);
  const [activeId, setActiveId] = useState(panels[0]?.id ?? "explore");

  const activePanel = panels.find((p) => p.id === activeId) ?? panels[0];
  const embedUrl = activePanel
    ? grafanaEmbedUrl({ path: activePanel.path, kiosk: true })
    : grafanaEmbedUrl({ kiosk: true });
  const popoutUrl = activePanel
    ? grafanaEmbedUrl({ path: activePanel.path, kiosk: false })
    : grafanaEmbedUrl({ kiosk: false });

  return (
    <div className="grafana-page">
      <div className="grafana-page__bar">
        <Tabs
          className="grafana-page__tabs"
          size="small"
          activeKey={activeId}
          onChange={setActiveId}
          items={panels.map((p) => ({ key: p.id, label: p.title }))}
        />
        <Tooltip title="Open current view in new tab">
          <a
            className="grafana-page__popout"
            href={popoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open in new tab"
          >
            <ExportOutlined />
          </a>
        </Tooltip>
      </div>
      <iframe
        key={activeId}
        className="grafana-page__frame"
        src={embedUrl}
        title={activePanel?.title ?? "Grafana"}
        allow="fullscreen"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

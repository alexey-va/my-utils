import { Tooltip } from "antd";
import { ExportOutlined } from "@ant-design/icons";
import { grafanaEmbedUrl } from "../../config/grafana";

export default function GrafanaPage() {
  const embedUrl = grafanaEmbedUrl({ kiosk: true });
  const tabUrl = grafanaEmbedUrl({ kiosk: false });

  return (
    <div className="grafana-page">
      <iframe
        className="grafana-page__frame"
        src={embedUrl}
        title="Grafana"
        allow="fullscreen"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <Tooltip title="Open Grafana in new tab">
        <a
          className="grafana-page__popout"
          href={tabUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open Grafana in new tab"
        >
          <ExportOutlined />
        </a>
      </Tooltip>
    </div>
  );
}

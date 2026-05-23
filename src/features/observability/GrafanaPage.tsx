import { Button } from "antd";
import { ExportOutlined } from "@ant-design/icons";
import PageLayout from "../../shared/components/PageLayout";
import { grafanaEmbedUrl } from "../../config/grafana";

export default function GrafanaPage() {
  const embedUrl = grafanaEmbedUrl();

  return (
    <PageLayout
      title="Observability"
      subtitle="Logs, metrics, and dashboards (Grafana)"
      actions={
        <Button type="link" href={embedUrl} target="_blank" rel="noopener noreferrer" icon={<ExportOutlined />}>
          Open in new tab
        </Button>
      }
    >
      <div className="grafana-embed">
        <iframe
          className="grafana-embed__frame"
          src={embedUrl}
          title="Grafana"
          allow="fullscreen"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </PageLayout>
  );
}

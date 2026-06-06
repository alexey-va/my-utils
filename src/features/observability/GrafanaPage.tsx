import { grafanaEmbedUrl } from "../../config/grafana";

export default function GrafanaPage() {
  return (
    <div className="grafana-page">
      <iframe
        className="grafana-page__frame"
        src={grafanaEmbedUrl()}
        title="Grafana"
        allow="fullscreen"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

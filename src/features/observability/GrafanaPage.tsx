import { useMemo } from "react";
import { grafanaEmbedUrl } from "../../config/grafana";
import { grafanaPanels } from "../../config/grafanaDashboards";

export default function GrafanaPage() {
  const panels = useMemo(() => grafanaPanels(), []);
  const embedUrl = grafanaEmbedUrl({
    path: panels[0]?.path,
    kiosk: false,
  });

  return (
    <div className="grafana-page">
      <iframe
        className="grafana-page__frame"
        src={embedUrl}
        title="Grafana"
        allow="fullscreen"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

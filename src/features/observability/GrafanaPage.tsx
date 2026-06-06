import { useEffect, useRef, useState } from "react";
import {
  grafanaEmbedUrl,
  persistGrafanaIframePath,
  readSavedGrafanaEmbedPath,
} from "../../config/grafana";

export default function GrafanaPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [src] = useState(() =>
    grafanaEmbedUrl({ path: readSavedGrafanaEmbedPath() ?? undefined }),
  );

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) {
      return;
    }

    const persist = () => persistGrafanaIframePath(iframe);
    iframe.addEventListener("load", persist);
    const timer = window.setInterval(persist, 1000);

    return () => {
      iframe.removeEventListener("load", persist);
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="grafana-page">
      <iframe
        ref={iframeRef}
        className="grafana-page__frame"
        src={src}
        title="Grafana"
        allow="fullscreen"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

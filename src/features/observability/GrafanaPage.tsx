import { ArrowLeftOutlined } from "@ant-design/icons";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PATH_HOME } from "../../config/paths";
import {
  grafanaEmbedUrl,
  persistGrafanaIframePath,
  readSavedGrafanaEmbedPath,
} from "../../config/grafana";

export default function GrafanaPage() {
  const navigate = useNavigate();
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

  const leaveGrafana = () => {
    iframeRef.current?.blur();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    navigate(PATH_HOME);
  };

  return (
    <div className="grafana-page">
      <header className="grafana-page__chrome">
        <button type="button" className="grafana-page__exit" onClick={leaveGrafana}>
          <ArrowLeftOutlined aria-hidden />
          <span>В приложение</span>
        </button>
      </header>
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

import { AppstoreOutlined } from "@ant-design/icons";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
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
    navigate("/");
  };

  const escapeButton = (
    <button
      type="button"
      className="grafana-escape"
      aria-label="Выйти в приложение"
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={leaveGrafana}
    >
      <AppstoreOutlined className="grafana-escape__icon" />
      <span className="grafana-escape__label">App</span>
    </button>
  );

  return (
    <>
      {createPortal(escapeButton, document.body)}
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
    </>
  );
}

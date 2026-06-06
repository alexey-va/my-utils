import { AppstoreOutlined } from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import { useEffect, useRef, useState } from "react";
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

  return (
    <div className="grafana-page">
      <Tooltip title="В приложение" placement="right">
        <Button
          type="default"
          size="small"
          className="grafana-page__escape"
          icon={<AppstoreOutlined />}
          aria-label="В приложение"
          onClick={leaveGrafana}
        />
      </Tooltip>
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

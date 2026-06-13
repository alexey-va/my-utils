import { ArrowLeftOutlined } from "@ant-design/icons";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PATH_HOME } from "../../config/paths";
import {
  grafanaEmbedUrl,
  persistGrafanaIframePath,
  writeSavedGrafanaEmbedPath,
} from "../../config/grafana";

const AGENT_TRACES_DASHBOARD = "d/myutils-agent-traces";

export default function AgentTracesPage() {
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const src = grafanaEmbedUrl({ path: AGENT_TRACES_DASHBOARD, kiosk: true });

  useEffect(() => {
    writeSavedGrafanaEmbedPath(AGENT_TRACES_DASHBOARD);
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

  const leavePage = () => {
    iframeRef.current?.blur();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    navigate(PATH_HOME);
  };

  return (
    <div className="grafana-page">
      <header className="grafana-page__chrome">
        <button type="button" className="grafana-page__exit" onClick={leavePage}>
          <ArrowLeftOutlined aria-hidden />
          <span>В приложение</span>
        </button>
        <span className="agent-traces-page__hint">
          OpenTelemetry gen_ai → Tempo. Введи Telegram chatId в Conversation ID.
        </span>
      </header>
      <iframe
        ref={iframeRef}
        className="grafana-page__frame"
        src={src}
        title="Agent traces"
        allow="fullscreen"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

import { ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { PATH_HOME } from "../../config/paths";
import { grafanaEmbedUrl } from "../../config/grafana";

const AGENT_TRACES_DASHBOARD = "d/myutils-agent-traces";

export default function AgentTracesPage() {
  const navigate = useNavigate();
  const src = grafanaEmbedUrl({ path: AGENT_TRACES_DASHBOARD, kiosk: true });

  const leavePage = () => {
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
        className="grafana-page__frame"
        src={src}
        title="Agent traces"
        allow="fullscreen"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

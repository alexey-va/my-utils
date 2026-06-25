import { grafanaEmbedUrl } from "../../config/grafana";

const AGENT_TRACES_DASHBOARD = "d/myutils-agent-traces";

type AgentTracesPageProps = {
  embedded?: boolean;
};

export default function AgentTracesPage({ embedded = false }: AgentTracesPageProps) {
  const src = grafanaEmbedUrl({ path: AGENT_TRACES_DASHBOARD });

  if (embedded) {
    return (
      <div className="agent-traces-embed">
        <p className="agent-traces-page__hint">
          OpenTelemetry gen_ai → Tempo. «All agent traces» shows recent activity; filter by Telegram chatId below.
        </p>
        <iframe
          className="agent-traces-embed__frame"
          src={src}
          title="Agent traces"
          allow="fullscreen"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    );
  }

  return (
    <div className="grafana-page">
      <header className="grafana-page__chrome">
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

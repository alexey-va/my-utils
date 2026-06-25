import { ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { PATH_HOME } from "../../config/paths";
import { grafanaEmbedUrl } from "../../config/grafana";

/** Always opens the default Grafana dashboard — does not restore last iframe URL. */
export default function GrafanaPage() {
  const navigate = useNavigate();
  const src = grafanaEmbedUrl();

  const leaveGrafana = () => {
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
        className="grafana-page__frame"
        src={src}
        title="Grafana"
        allow="fullscreen"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

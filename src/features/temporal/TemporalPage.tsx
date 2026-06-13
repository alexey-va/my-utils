import { ArrowLeftOutlined } from "@ant-design/icons";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PATH_HOME } from "../../config/paths";
import {
  persistTemporalIframePath,
  readSavedTemporalEmbedPath,
  temporalEmbedUrl,
} from "../../config/temporal";

export default function TemporalPage() {
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [src] = useState(() =>
    temporalEmbedUrl({ path: readSavedTemporalEmbedPath() ?? undefined }),
  );

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) {
      return;
    }

    const persist = () => persistTemporalIframePath(iframe);
    iframe.addEventListener("load", persist);
    const timer = window.setInterval(persist, 1000);

    return () => {
      iframe.removeEventListener("load", persist);
      window.clearInterval(timer);
    };
  }, []);

  const leaveTemporal = () => {
    iframeRef.current?.blur();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    navigate(PATH_HOME);
  };

  return (
    <div className="temporal-page">
      <header className="temporal-page__chrome">
        <button type="button" className="temporal-page__exit" onClick={leaveTemporal}>
          <ArrowLeftOutlined aria-hidden />
          <span>В приложение</span>
        </button>
      </header>
      <iframe
        ref={iframeRef}
        className="temporal-page__frame"
        src={src}
        title="Temporal"
        allow="fullscreen"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

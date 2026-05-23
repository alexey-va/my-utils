import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Tabs, Tooltip } from "antd";
import { ArrowLeftOutlined, ExportOutlined, HomeOutlined } from "@ant-design/icons";
import { grafanaEmbedUrl } from "../../config/grafana";
import { grafanaPanels } from "../../config/grafanaDashboards";

export default function GrafanaPage() {
  const panels = useMemo(() => grafanaPanels(), []);
  const [activeId, setActiveId] = useState(panels[0]?.id ?? "explore");
  const [homeNonce, setHomeNonce] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastSyncedHref = useRef<string | null>(null);

  const activePanel = panels.find((p) => p.id === activeId) ?? panels[0];
  const embedUrl = activePanel
    ? grafanaEmbedUrl({ path: activePanel.path, kiosk: true })
    : grafanaEmbedUrl({ kiosk: true });
  const popoutUrl = activePanel
    ? grafanaEmbedUrl({ path: activePanel.path, kiosk: false })
    : grafanaEmbedUrl({ kiosk: false });

  const goHome = useCallback(() => {
    lastSyncedHref.current = null;
    setHomeNonce((n) => n + 1);
  }, []);

  const goBack = useCallback(() => {
    try {
      iframeRef.current?.contentWindow?.history.back();
    } catch {
      goHome();
    }
  }, [goHome]);

  useEffect(() => {
    lastSyncedHref.current = null;
    setHomeNonce(0);
  }, [activeId]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) {
      return undefined;
    }

    const syncIframeHistory = () => {
      try {
        const win = iframe.contentWindow;
        if (!win) {
          return;
        }
        const href = win.location.pathname + win.location.search + win.location.hash;
        if (!href.includes("/grafana/")) {
          return;
        }
        if (href === lastSyncedHref.current) {
          return;
        }
        lastSyncedHref.current = href;
        window.history.pushState({ grafanaHref: href }, "", window.location.href);
      } catch {
        // not same-origin — skip browser back sync
      }
    };

    iframe.addEventListener("load", syncIframeHistory);
    return () => iframe.removeEventListener("load", syncIframeHistory);
  }, [activeId, homeNonce]);

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const href = (event.state as { grafanaHref?: string } | null)?.grafanaHref;
      const win = iframeRef.current?.contentWindow;
      if (!win) {
        return;
      }
      if (href) {
        lastSyncedHref.current = href;
        win.location.replace(href);
        return;
      }
      goHome();
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [goHome]);

  return (
    <div className="grafana-page">
      <div className="grafana-page__bar">
        <div className="grafana-page__nav">
          <Tooltip title="Back (inside Grafana)">
            <Button
              type="text"
              size="small"
              className="grafana-page__icon-btn"
              icon={<ArrowLeftOutlined />}
              aria-label="Back"
              onClick={goBack}
            />
          </Tooltip>
          <Tooltip title="Back to dashboard root">
            <Button
              type="text"
              size="small"
              className="grafana-page__icon-btn"
              icon={<HomeOutlined />}
              aria-label="Home"
              onClick={goHome}
            />
          </Tooltip>
        </div>
        <Tabs
          className="grafana-page__tabs"
          size="small"
          activeKey={activeId}
          onChange={setActiveId}
          items={panels.map((p) => ({ key: p.id, label: p.title }))}
        />
        <Tooltip title="Open current view in new tab">
          <a
            className="grafana-page__icon-btn grafana-page__icon-btn--link"
            href={popoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open in new tab"
          >
            <ExportOutlined />
          </a>
        </Tooltip>
      </div>
      <iframe
        key={`${activeId}-${homeNonce}`}
        ref={iframeRef}
        className="grafana-page__frame"
        src={embedUrl}
        title={activePanel?.title ?? "Grafana"}
        allow="fullscreen"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

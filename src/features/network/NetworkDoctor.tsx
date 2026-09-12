import { Alert, Button, Empty, Spin, Tag } from "antd";
import type { NetworkBuildInfo, NetworkDoctorIssue, NetworkDoctorNode, NetworkDoctorReport } from "./types";
import CopyButton from "../../shared/components/CopyButton";

const ISSUE_LABELS: Record<string, string> = {
  gateway_build_unverified: "Сборка gateway не подтверждена опубликованной ревизией",
  disabled: "Узел отключён администратором",
  offline: "Узел офлайн: heartbeat не было более 2 минут",
  stale: "Heartbeat узла устарел: старше 45 секунд",
  protocol_mismatch: "Версия протокола узла не совпадает с gateway",
  diagnostics_unavailable: "Старый агент не передал диагностику сборки и конфигурации",
  node_build_unverified: "Сборка агента не подтверждена опубликованной ревизией",
  revision_mismatch: "Ревизия исходников узла отличается от gateway",
  fingerprint_unavailable: "Не хватает fingerprint бинарника или конфигурации",
  helpers_mismatch: "Установленные workflow helpers отличаются от набора gateway",
  helpers_unverified: "Workflow actions заявлены без fingerprint helpers",
};

function formatDate(value: string | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function displayValue(value: string | undefined, fallback = "Неизвестно"): string {
  return value?.trim() || fallback;
}

function shortFingerprint(value: string | undefined): string {
  if (!value) return "Нет данных";
  if (value.length <= 24) return value;
  return `${value.slice(0, 12)}…${value.slice(-8)}`;
}

function issueColor(severity: string): string {
  return severity.toLowerCase() === "error" ? "error" : "warning";
}

function issueLabel(issue: NetworkDoctorIssue): string {
  return ISSUE_LABELS[issue.code] ?? (issue.message?.trim() || `Неизвестная проблема (${issue.code})`);
}

function IssueList({ issues }: { issues: NetworkDoctorIssue[] }) {
  if (!issues.length) return <p className="network-doctor__ok">Явных проблем по этой части проверки не обнаружено.</p>;
  return (
    <ul className="network-doctor__issues">
      {issues.map((issue, index) => (
        <li key={`${issue.code}-${index}`}>
          <Tag color={issueColor(issue.severity)}>{issue.severity || "warning"}</Tag>
          <div>
            <strong>{issueLabel(issue)}</strong>
            <small>Код: <code>{issue.code || "unknown"}</code></small>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Fingerprint({ label, value }: { label: string; value?: string }) {
  return (
    <div className="network-doctor__fingerprint">
      <span>{label}</span>
      {value ? (
        <details>
          <summary title={value}><code>{shortFingerprint(value)}</code></summary>
          <div><code>{value}</code><CopyButton value={value} /></div>
        </details>
      ) : <code className="network-doctor__missing">Нет данных</code>}
    </div>
  );
}

function BuildCard({ title, build }: { title: string; build?: NetworkBuildInfo }) {
  return (
    <article className="network-doctor__build-card">
      <header>
        <strong>{title}</strong>
        <span>Go {displayValue(build?.go_version)}</span>
      </header>
      <div className="network-doctor__revision">
        <span>Исходная ревизия</span>
        <code title={build?.revision}>{displayValue(build?.revision, "Неизвестна")}</code>
      </div>
      <Fingerprint label="SHA бинарника" value={build?.executable_sha256} />
      <Fingerprint label="SHA workflow helpers" value={build?.workflow_sha256} />
    </article>
  );
}

function NodeCard({ item }: { item: NetworkDoctorNode }) {
  const diagnostics = item.node.diagnostics;
  const hasError = item.issues.some((issue) => issue.severity.toLowerCase() === "error");
  return (
    <article className="network-doctor__node-card">
      <header className="network-doctor__node-header">
        <div>
          <strong>{item.node.name}</strong>
          <span><code>{item.node.id}</code> · {item.node.hostname}</span>
        </div>
        <Tag color={hasError ? "error" : item.issues.length ? "warning" : "success"}>
          {hasError ? "Проблема" : item.issues.length ? "Есть замечания" : "Проверено"}
        </Tag>
      </header>
      <div className="network-doctor__node-meta">
        <span>Протокол: <code>{displayValue(item.node.version)}</code></span>
        <span>Последний heartbeat: {formatDate(item.node.last_seen ?? undefined)}</span>
      </div>
      {diagnostics ? (
        <div className="network-doctor__node-build">
          <BuildCard title="Агент" build={diagnostics.build} />
          <div className="network-doctor__fingerprints">
            <Fingerprint label="SHA конфигурации" value={diagnostics.config_sha256} />
            <Fingerprint label="SHA workflow helpers" value={diagnostics.workflow_sha256} />
          </div>
        </div>
      ) : (
        <Alert type="warning" showIcon message="Диагностика недоступна у старого агента" description="Fingerprint сборки и конфигурации отсутствуют; сравнение ревизий невозможно." />
      )}
      <IssueList issues={item.issues} />
    </article>
  );
}

export default function NetworkDoctor({
  report,
  loading,
  error,
  onRefresh,
}: {
  report: NetworkDoctorReport | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  const issueCount = (report?.issues.length ?? 0) + (report?.nodes ?? []).reduce((sum, item) => sum + item.issues.length, 0);
  const hasErrors = (report?.issues ?? []).some((issue) => issue.severity.toLowerCase() === "error")
    || (report?.nodes ?? []).some((item) => item.issues.some((issue) => issue.severity.toLowerCase() === "error"));

  return (
    <div className="network-doctor" data-testid="network-doctor">
      <div className="network-doctor__toolbar">
        <div>
          <p>Сверка gateway и доступных узлов по протоколу, исходной ревизии и fingerprint-ам. Разные SHA бинарников между архитектурами и SHA конфигураций между узлами допустимы.</p>
          {report ? <small>Проверено: {formatDate(report.checked_at)}</small> : null}
        </div>
        <Button size="small" onClick={onRefresh} loading={loading}>{loading ? "Проверяем…" : "Проверить снова"}</Button>
      </div>
      {error ? <Alert type="warning" showIcon message={error} /> : null}
      {loading && report ? <div className="network-doctor__refreshing" role="status">Обновляем диагностику…</div> : null}
      {loading && !report ? <div className="network-panel-loading"><Spin /></div> : !report ? error ? null : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Диагностика ещё не загружена" /> : (
        <>
          <div className="network-doctor__protocol">
            <span>Протокол gateway <code>{displayValue(report.protocol)}</code></span>
            <span>{issueCount ? `${issueCount} замечаний` : "Проверка без замечаний"}</span>
          </div>
          {report.issues.length ? <IssueList issues={report.issues} /> : null}
          <div className="network-doctor__builds">
            <BuildCard title="Gateway" build={report.gateway} />
            {report.client ? <BuildCard title="Клиент панели" build={report.client} /> : null}
          </div>
          <div className="network-doctor__nodes">
            <div className="network-doctor__section-heading"><h3>Узлы</h3><span>{report.nodes.length}</span></div>
            {report.nodes.length ? report.nodes.map((item) => <NodeCard key={item.node.id} item={item} />) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Доступных узлов нет" />}
          </div>
          {loading || error ? <Alert type="warning" showIcon message="Показана предыдущая проверка; данные могут устареть" /> : !issueCount ? <Alert type="success" showIcon message="Явных проблем не обнаружено" /> : hasErrors ? <Alert type="error" showIcon message="Есть проблемы, требующие внимания" /> : <Alert type="warning" showIcon message="Есть замечания по сборке или диагностике" />}
        </>
      )}
    </div>
  );
}

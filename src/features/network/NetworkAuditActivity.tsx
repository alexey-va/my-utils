import { Alert, Empty, Select, Spin, Tag } from "antd";
import type { NetworkActivity, NetworkActivityWindow, NetworkActivitySummary } from "./types";

const WINDOW_OPTIONS: Array<{ value: NetworkActivityWindow; label: string }> = [
  { value: "1h", label: "Последний час" },
  { value: "24h", label: "Последние 24 часа" },
  { value: "7d", label: "Последние 7 дней" },
];

const numberFormatter = new Intl.NumberFormat("ru-RU");

function formatNumber(value: number): string {
  return numberFormatter.format(Number.isFinite(value) ? value : 0);
}

function formatTime(value: string | undefined): string {
  if (!value) return "—";
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

function formatBucketTime(value: string, bucketSeconds: number): string {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return "—";
  const options: Intl.DateTimeFormatOptions = bucketSeconds >= 3 * 60 * 60
    ? { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }
    : { hour: "2-digit", minute: "2-digit" };
  return new Intl.DateTimeFormat("ru-RU", options).format(timestamp);
}

function formatDuration(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return "—";
  if (value < 1) return "<1 мс";
  return `${formatNumber(Math.round(value))} мс`;
}

function formatLatency(value: NetworkActivitySummary["queue_ms"]): string {
  if (value.samples <= 0) return "Нет замеров";
  return `ср. ${formatDuration(value.mean_ms)} · p95 ${formatDuration(value.p95_ms)} · n=${formatNumber(value.samples)}`;
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 Б";
  if (value < 1024) return `${formatNumber(value)} Б`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} КиБ`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} МиБ`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} ГиБ`;
}

function SummaryMetric({ label, value, detail, tone }: { label: string; value: string; detail?: string; tone?: "success" | "error" | "warning" }) {
  return (
    <div className={tone ? `network-activity-metric network-activity-metric--${tone}` : "network-activity-metric"}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

export default function NetworkAuditActivity({
  activity,
  loading,
  error,
  window,
  onWindowChange,
}: {
  activity: NetworkActivity | null;
  loading: boolean;
  error: string | null;
  window: NetworkActivityWindow;
  onWindowChange: (value: NetworkActivityWindow) => void;
}) {
  const totals = activity?.totals;
  const maxBucket = Math.max(1, ...(activity?.buckets ?? []).map((bucket) => bucket.requests));
  const maxAction = Math.max(1, ...(activity?.actions ?? []).map((action) => action.requests));

  return (
    <section className="network-audit-activity" data-testid="network-audit-activity">
      <header className="network-audit-activity__header">
        <div>
          <h3>Активность заданий</h3>
          <p>Период считается по времени создания задания; фильтр типа события журнала на метрики не влияет.</p>
        </div>
        <label className="network-audit-activity__window-select">
          <span>Период</span>
          <Select
            aria-label="Период активности"
            value={window}
            options={WINDOW_OPTIONS}
            onChange={(value: NetworkActivityWindow) => onWindowChange(value)}
          />
        </label>
      </header>
      {error ? <Alert type="warning" showIcon message={error} /> : null}
      {loading && !activity ? <div className="network-audit-activity__loading"><Spin /></div> : !activity ? error ? null : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Метрики за выбранный период ещё не загружены" />
      ) : (
        <>
          {loading ? <div className="network-audit-activity__refreshing" role="status">Обновляем метрики…</div> : null}
          <div className="network-audit-activity__window">
            {formatTime(activity.from)} — {formatTime(activity.to)} · время создания задания
          </div>
          <div className="network-activity-metrics" aria-label="Сводка активности">
            <SummaryMetric label="Запросы" value={formatNumber(totals?.requests ?? 0)} detail={`${formatNumber(totals?.pending ?? 0)} в работе`} />
            <SummaryMetric label="Успешно" value={formatNumber(totals?.succeeded ?? 0)} tone="success" />
            <SummaryMetric label="Ошибки" value={formatNumber(totals?.failed ?? 0)} tone="error" />
            <SummaryMetric label="Отменены" value={formatNumber(totals?.cancelled ?? 0)} />
            <SummaryMetric label="Неизвестно" value={formatNumber(totals?.unknown ?? 0)} tone="warning" />
            <SummaryMetric label="Передано" value={formatBytes(totals?.transfer_bytes ?? 0)} detail={`${formatNumber(totals?.transfer_samples ?? 0)} замеров · ${formatNumber(totals?.transfer_unknown ?? 0)} без данных`} />
          </div>
          <div className="network-activity-latency" aria-label="Задержки">
            <div title="От создания задания до старта агента"><span>До старта</span><strong>{formatLatency(totals?.queue_ms ?? { samples: 0 })}</strong></div>
            <div title="От старта агента до завершения задания, включая выдачу результата"><span>До завершения</span><strong>{formatLatency(totals?.execution_ms ?? { samples: 0 })}</strong></div>
          </div>
          <div className="network-audit-activity__coverage">
            Сохранено заданий: {formatNumber(activity.coverage.retained_jobs)} · в окне архивных: {formatNumber(activity.coverage.archived_in_window)}{activity.coverage.oldest_job_at ? ` · самая старая: ${formatTime(activity.coverage.oldest_job_at)}` : ""}
          </div>
          <div className="network-audit-activity__charts">
            <article>
              <h4>По времени</h4>
              <div className="network-audit-time-chart" role="img" aria-label={`Частота ${formatNumber(totals?.requests ?? 0)} запросов по времени`}>
                {activity.buckets.map((bucket) => (
                  <div className="network-audit-time-chart__bucket" key={`${bucket.start}-${bucket.end}`} title={`${formatBucketTime(bucket.start, activity.bucket_seconds)} — ${formatNumber(bucket.requests)} запросов`}>
                    <strong>{bucket.requests || ""}</strong>
                    <span><i style={{ height: `${Math.max(bucket.requests > 0 ? 5 : 0, bucket.requests / maxBucket * 100)}%` }} /></span>
                    <small>{formatBucketTime(bucket.start, activity.bucket_seconds)}</small>
                  </div>
                ))}
              </div>
            </article>
            <article>
              <h4>По действиям</h4>
              <ol className="network-audit-action-chart" aria-label="Частота запросов по действиям">
                {activity.actions.length ? activity.actions.map((action) => (
                  <li key={action.action}>
                    <div><code title={action.action}>{action.action}</code><strong>{formatNumber(action.requests)}</strong></div>
                    <span><i style={{ width: `${action.requests / maxAction * 100}%` }} /></span>
                    <small>{formatNumber(action.succeeded)} успешно · {formatNumber(action.failed)} ошибок · {formatNumber(action.pending)} в работе</small>
                  </li>
                )) : <li className="network-audit-action-chart__empty">Действий нет</li>}
              </ol>
            </article>
          </div>
          {totals && totals.transfer_unknown > 0 ? <Tag color="warning">Для {formatNumber(totals.transfer_unknown)} старых заданий размер передачи неизвестен</Tag> : null}
        </>
      )}
    </section>
  );
}

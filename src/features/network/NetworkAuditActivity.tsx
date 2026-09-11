import { Alert, Empty, Spin } from "antd";
import { useMemo } from "react";
import type { NetworkAuditEvent } from "./types";
import { buildAuditActivity } from "./auditActivity";

function formatWindowTime(timestamp: number): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

function formatBucketTime(timestamp: number, bucketMs: number): string {
  return new Intl.DateTimeFormat("ru-RU", bucketMs >= 24 * 60 * 60_000
    ? { day: "2-digit", month: "short" }
    : { hour: "2-digit", minute: "2-digit" }).format(timestamp);
}

export default function NetworkAuditActivity({
  events,
  loading,
  error,
  hasMore,
}: {
  events: NetworkAuditEvent[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
}) {
  const activity = useMemo(() => buildAuditActivity(events), [events]);
  const maxBucket = Math.max(1, ...activity.buckets.map((bucket) => bucket.count));
  const maxAction = Math.max(1, ...activity.actions.map((action) => action.count));
  const visibleActions = activity.actions.slice(0, 8);

  return (
    <section className="network-audit-activity" data-testid="network-audit-activity">
      <header className="network-audit-activity__header">
        <div>
          <h3>Частота запросов</h3>
          <p>Считаются события <code>job.queued</code>; фильтр типа события журнала на графики не влияет.</p>
        </div>
        {activity.total > 0 ? (
          <div className="network-audit-activity__totals">
            <span><strong>{activity.total}</strong> запросов{hasMore ? "+" : ""}</span>
            <span><strong>{activity.actions.length}</strong> действий</span>
          </div>
        ) : null}
      </header>
      {error ? <Alert type="warning" showIcon message={error} /> : null}
      {loading && activity.total === 0 ? <div className="network-audit-activity__loading"><Spin /></div> : activity.total === 0 ? error ? null : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Запросов в выбранном окне нет" />
      ) : (
        <>
          <div className="network-audit-activity__window">
            Последние {activity.total}{hasMore ? "+" : ""} запросов · {formatWindowTime(activity.firstTimestamp as number)} — {formatWindowTime(activity.lastTimestamp as number)}
          </div>
          <div className="network-audit-activity__charts">
            <article>
              <h4>По времени</h4>
              <div className="network-audit-time-chart" role="img" aria-label={`Частота ${activity.total} запросов по времени`}>
                {activity.buckets.map((bucket) => (
                  <div className="network-audit-time-chart__bucket" key={bucket.start} title={`${formatBucketTime(bucket.start, activity.bucketMs)} — ${bucket.count}`}>
                    <strong>{bucket.count || ""}</strong>
                    <span><i style={{ height: `${Math.max(bucket.count > 0 ? 5 : 0, bucket.count / maxBucket * 100)}%` }} /></span>
                    <small>{formatBucketTime(bucket.start, activity.bucketMs)}</small>
                  </div>
                ))}
              </div>
            </article>
            <article>
              <h4>По действиям</h4>
              <ol className="network-audit-action-chart" aria-label="Частота запросов по действиям">
                {visibleActions.map(({ action, count }) => (
                  <li key={action}>
                    <div><code title={action}>{action}</code><strong>{count}</strong></div>
                    <span><i style={{ width: `${count / maxAction * 100}%` }} /></span>
                  </li>
                ))}
              </ol>
              {activity.actions.length > visibleActions.length ? <p className="network-audit-action-chart__rest">Ещё действий: {activity.actions.length - visibleActions.length}</p> : null}
            </article>
          </div>
        </>
      )}
    </section>
  );
}

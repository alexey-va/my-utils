import type { NetworkAuditEvent } from "./types";

const REQUEST_KIND = "job.queued";
const TARGET_BUCKETS = 12;
const BUCKET_INTERVALS = [
  60_000,
  5 * 60_000,
  15 * 60_000,
  60 * 60_000,
  3 * 60 * 60_000,
  6 * 60 * 60_000,
  12 * 60 * 60_000,
  24 * 60 * 60_000,
  7 * 24 * 60 * 60_000,
];

export type AuditActivityBucket = {
  start: number;
  count: number;
};

export type AuditActionCount = {
  action: string;
  count: number;
};

export type AuditActivity = {
  total: number;
  firstTimestamp: number | null;
  lastTimestamp: number | null;
  bucketMs: number;
  buckets: AuditActivityBucket[];
  actions: AuditActionCount[];
};

export function buildAuditActivity(events: NetworkAuditEvent[]): AuditActivity {
  const requests = events
    .filter((event) => event.kind === REQUEST_KIND && Boolean(event.action))
    .map((event) => ({ event, timestamp: new Date(event.timestamp).getTime() }))
    .filter(({ timestamp }) => Number.isFinite(timestamp))
    .sort((left, right) => left.timestamp - right.timestamp);

  if (requests.length === 0) {
    return { total: 0, firstTimestamp: null, lastTimestamp: null, bucketMs: BUCKET_INTERVALS[1], buckets: [], actions: [] };
  }

  const firstTimestamp = requests[0].timestamp;
  const lastTimestamp = requests[requests.length - 1].timestamp;
  const desiredBucket = Math.max(1, (lastTimestamp - firstTimestamp) / TARGET_BUCKETS);
  const largestInterval = BUCKET_INTERVALS[BUCKET_INTERVALS.length - 1];
  const bucketMs = BUCKET_INTERVALS.find((interval) => interval >= desiredBucket)
    ?? Math.ceil(desiredBucket / largestInterval) * largestInterval;
  const firstBucket = Math.floor(firstTimestamp / bucketMs) * bucketMs;
  const lastBucket = Math.floor(lastTimestamp / bucketMs) * bucketMs;
  const buckets: AuditActivityBucket[] = [];
  for (let start = firstBucket; start <= lastBucket; start += bucketMs) {
    buckets.push({ start, count: 0 });
  }

  const actionCounts = new Map<string, number>();
  for (const { event, timestamp } of requests) {
    const bucket = Math.floor((timestamp - firstBucket) / bucketMs);
    if (buckets[bucket]) buckets[bucket].count += 1;
    const action = event.action as string;
    actionCounts.set(action, (actionCounts.get(action) ?? 0) + 1);
  }

  const actions = Array.from(actionCounts, ([action, count]) => ({ action, count }))
    .sort((left, right) => right.count - left.count || left.action.localeCompare(right.action));

  return { total: requests.length, firstTimestamp, lastTimestamp, bucketMs, buckets, actions };
}

import { Segmented } from "antd";
import type {
  WireGuardExitHealth,
  WireGuardExitId,
  WireGuardExitPreference,
  WireGuardExitProbeHealth,
} from "./types";

type Props = {
  health: WireGuardExitHealth | null;
  now: number;
  preference: WireGuardExitPreference;
  pending: boolean;
  applying: boolean;
  onPreferenceChange: (preference: WireGuardExitPreference) => void;
};

const exitNames: Record<WireGuardExitId, string> = {
  primary: "Основной exit",
  secondary: "Резервный exit",
};

const reasonNames: Record<string, string> = {
  handshake_missing: "нет handshake",
  handshake_stale: "устарел handshake",
  interface_missing: "интерфейс недоступен",
  egress_probe_failed: "проверка выхода не прошла",
  unexpected_egress: "неверный внешний IP",
};

function checkedAgo(value: string, now: number): string {
  const seconds = Math.max(0, Math.round((now - new Date(value).getTime()) / 1000));
  if (seconds < 10) return "только что";
  if (seconds < 60) return `${seconds} сек. назад`;
  return `${Math.floor(seconds / 60)} мин. назад`;
}

function handshakeLabel(exit: WireGuardExitProbeHealth): string {
  if (exit.handshakeAgeSeconds === null) return "нет handshake";
  if (exit.handshakeAgeSeconds < 60) return `${exit.handshakeAgeSeconds} сек. назад`;
  return `${Math.floor(exit.handshakeAgeSeconds / 60)} мин. назад`;
}

function probeSeries(health: WireGuardExitHealth, exitId: WireGuardExitId): string {
  const counter = health.counters[exitId];
  if (counter.failures > 0) return `${counter.failures} сбоев подряд`;
  return `${counter.successes} успешных подряд`;
}

function exitState(exit: WireGuardExitProbeHealth): string {
  if (exit.healthy) return "Доступен";
  return exit.reason ? reasonNames[exit.reason] ?? exit.reason : "Недоступен";
}

function ExitColumn({
  exitId,
  health,
}: {
  exitId: WireGuardExitId;
  health: WireGuardExitHealth;
}) {
  const exit = health.exits[exitId];
  const active = health.activeExit === exitId;
  const observedMismatch = exit.observedEgressIp !== null && exit.observedEgressIp !== exit.expectedEgressIp;
  return (
    <article className={`wireguard-exit wireguard-exit--${exit.healthy ? "healthy" : "down"}`}>
      <header className="wireguard-exit__header">
        <div>
          <h3>{exitNames[exitId]}</h3>
          <code>{exit.interface}</code>
        </div>
        <span className={active ? "wireguard-exit__role wireguard-exit__role--active" : "wireguard-exit__role"}>
          {active ? "Активен" : "Готов к переключению"}
        </span>
      </header>
      <div className="wireguard-exit__health">
        <span><i aria-hidden="true" />{exitState(exit)}</span>
        <small>{probeSeries(health, exitId)}</small>
      </div>
      <dl>
        <div>
          <dt>Публичный IP</dt>
          <dd className={observedMismatch ? "wireguard-exit__mismatch" : undefined}>
            <code>{exit.observedEgressIp ?? exit.expectedEgressIp}</code>
          </dd>
        </div>
        <div><dt>Handshake</dt><dd>{handshakeLabel(exit)}</dd></div>
        <div><dt>Задержка</dt><dd>{exit.latencyMs === null ? "—" : `${exit.latencyMs.toFixed(1)} мс`}</dd></div>
      </dl>
    </article>
  );
}

export default function WireGuardRoutingOverview({
  health,
  now,
  preference,
  pending,
  applying,
  onPreferenceChange,
}: Props) {
  const preferenceDescription = preference === "AUTO"
    ? "External-трафик автоматически уходит через исправный exit"
    : "Выбранный exit используется первым; при сбое включится исправный резерв";
  return (
    <section className="wireguard-exits" aria-label="Выходы в интернет">
      <header className="wireguard-exits__title">
        <div>
          <h2>Выходы в интернет</h2>
          <p>{preferenceDescription}</p>
        </div>
        <div className="wireguard-exits__controls">
          <Segmented<WireGuardExitPreference>
            aria-label="Главный сервер"
            value={preference}
            disabled={pending}
            onChange={onPreferenceChange}
            options={[
              { label: "Авто", value: "AUTO" },
              { label: "Основной", value: "PRIMARY", disabled: health ? !health.exits.primary.healthy : true },
              { label: "Резерв", value: "SECONDARY", disabled: health ? !health.exits.secondary.healthy : true },
            ]}
          />
          <span>{pending ? "Сохраняем…" : applying ? "Применяется…" : health ? `Проверено ${checkedAgo(health.checkedAt, now)}` : "Ожидаем данные агента"}</span>
        </div>
      </header>
      {health ? (
        <div className="wireguard-exits__grid">
          <ExitColumn exitId="primary" health={health} />
          <ExitColumn exitId="secondary" health={health} />
        </div>
      ) : (
        <p className="wireguard-exits__empty">Агент ещё не передал состояние основного и резервного exit.</p>
      )}
    </section>
  );
}

import { useState } from "react";
import { Button } from "antd";
import { setBusinessCounterpartyStatus } from "./api";
import type { BusinessCounterpartyView } from "./types";

export function CounterpartyActivity({ counterparty, refreshing, onChanged }: { counterparty: BusinessCounterpartyView; refreshing: boolean; onChanged: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const actionLabel = counterparty.inactive ? "Сделать активным" : "Отметить неактивным";

  async function changeStatus() {
    setSaving(true);
    setError(false);
    try {
      await setBusinessCounterpartyStatus(counterparty.id, !counterparty.inactive);
      onChanged();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return <div className="business-counterparty-activity">
    <div><strong>{counterparty.inactive ? "Неактивный плательщик" : "Активный плательщик"}</strong><p>{counterparty.inactive ? "Не участвует в проверке документов за прошлый месяц." : "За прошлый месяц должны быть выставлены счёт и акт."}</p>{error && <p className="business-counterparty-activity__error" role="alert">Не удалось изменить статус. Повторите попытку.</p>}</div>
    <Button size="small" aria-label={actionLabel} aria-busy={saving} loading={saving} disabled={refreshing || saving} onClick={changeStatus}>{actionLabel}</Button>
  </div>;
}

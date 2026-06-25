import type { AgentMemoryCompactionPreview } from "../../api/agentMemory";

export function compactSkipReasonMessage(
  reason: string | null | undefined,
  preview: AgentMemoryCompactionPreview | undefined,
): string {
  switch (reason) {
    case "below_threshold":
      return preview
        ? `Мало старых сообщений для авто-сжатия (нужно >${preview.threshold}, tail ${preview.tailKeep}). Используй «Сжать вручную».`
        : "Мало сообщений для авто-сжатия.";
    case "too_few_messages":
      return "Нужно минимум 2 сообщения, которые можно сжать.";
    case "unavailable":
      return "Сжатие недоступно — проверь Telegram-бот и OpenRouter.";
    default:
      return "Нечего сжимать.";
  }
}

export function compactionHint(preview: AgentMemoryCompactionPreview | undefined): string {
  if (!preview) return "";
  if (!preview.compactionAvailable) {
    return "Сжатие недоступно (Telegram-бот / OpenRouter).";
  }
  if (preview.compactableCount <= 1) {
    return "Мало сообщений — сжатие возможно при ≥2 compactable.";
  }
  const manual = preview.manualCompactCount;
  const auto = preview.autoCompactCount;
  if (manual <= 0) {
    return `Все ${preview.compactableCount} сообщений в «tail» (${preview.tailKeep}) — нечего сжимать.`;
  }
  const autoPart =
    auto > 0
      ? `Авто-сжатие сейчас: ${auto} сообщ. (при >${preview.threshold} старых).`
      : `Авто-сжатие ждёт >${preview.threshold} старых (tail ${preview.tailKeep}).`;
  return `${autoPart} Вручную можно сжать ${manual} — останутся последние min(tail, n−1) сырых.`;
}

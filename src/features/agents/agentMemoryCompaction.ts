export function compactSkipReasonMessage(reason: string | null | undefined): string {
  switch (reason) {
    case "nothing_to_compact":
      return "Нечего сжимать — все сообщения уже в summary или остаются в tail.";
    case "unavailable":
      return "Сжатие недоступно — проверь Telegram-бот и OpenRouter.";
    default:
      return "Нечего сжимать.";
  }
}

export function compactionHint(
  compactableCount: number,
  keepRecent: number,
  compactionAvailable: boolean,
): string {
  if (!compactionAvailable) {
    return "Сжатие недоступно (Telegram-бот / OpenRouter).";
  }
  if (compactableCount === 0) {
    return "Все сообщения уже сжаты или исключены из контекста.";
  }
  const toCompact = Math.max(0, compactableCount - keepRecent);
  if (toCompact === 0) {
    return `Оставить ${keepRecent} — сжимать нечего (${compactableCount} сырых).`;
  }
  if (keepRecent === 0) {
    return `Сжать все ${toCompact} сырых сообщений в summary; история очистится из контекста LLM.`;
  }
  return `Сжать ${toCompact} старых, оставить ${keepRecent} последних сырых.`;
}

export function compactableAfterKeep(compactableCount: number, keepRecent: number): number {
  return Math.max(0, compactableCount - keepRecent);
}

// Wake up at the boundary without polling the server. Long timers are capped
// below the browser's 32-bit limit; returning to a sleeping tab also rechecks.
export function scheduleRevenueRollover(
  nextMonth: string,
  refresh: () => void,
): () => void {
  const boundary = Date.parse(nextMonth);
  if (!Number.isFinite(boundary)) return () => {};

  let timer: ReturnType<typeof setTimeout>;
  let refreshed = false;
  const check = () => {
    clearTimeout(timer);
    if (refreshed) return;
    const remaining = boundary - Date.now();
    if (remaining <= 0) {
      refreshed = true;
      refresh();
      return;
    }
    timer = setTimeout(check, Math.min(remaining + 1000, 86_400_000));
  };

  check();
  document.addEventListener("visibilitychange", check);
  return () => {
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", check);
  };
}

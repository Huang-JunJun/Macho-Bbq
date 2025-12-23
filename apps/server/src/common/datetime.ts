function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function formatDateTimeCN(date: Date) {
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}年${mm}月${dd}日 ${hh}:${mi}:${ss}`;
}


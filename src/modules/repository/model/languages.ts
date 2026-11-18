export function languageDistribution(languages: Record<string, number>) {
  const entries = Object.entries(languages).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0) || 1;
  return entries.map(([name, bytes]) => {
    const percent = (bytes / total) * 100;
    return { name, percent: percent.toFixed(1), barWidth: Math.max(2, percent).toFixed(1) };
  });
}

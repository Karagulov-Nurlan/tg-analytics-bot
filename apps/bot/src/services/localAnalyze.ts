export function localAnalyze(texts: string[]) {
  const total = texts.length;
  const joined = texts.join(" ");
  const lengths = texts.map(t => t.length);
  const avgLen = total ? Math.round(lengths.reduce((a,b)=>a+b,0)/total) : 0;

  const words = joined
    .toLowerCase()
    .replace(/[^a-zа-я0-9\s]/gi, " ")
    .split(/\s+/)
    .filter(Boolean);

  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);

  const topWords = [...freq.entries()]
    .sort((a,b)=>b[1]-a[1])
    .slice(0, 10)
    .map(([w,c])=>`${w} (${c})`);

  return {
    total_messages: total,
    avg_length: avgLen,
    top_words: topWords,
  };
}

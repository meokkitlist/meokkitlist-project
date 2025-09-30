export function mapEmotion(score: number, label: string | null): string {
  if (!label) return '🤔';

  if (label === 'positive') {
    if (score > 0.8) return '😁'; // 아주 긍정
    if (score > 0.6) return '😊'; // 긍정
    return '🙂'; // 살짝 긍정
  }

  if (label === 'negative') {
    if (score > 0.8) return '😡'; // 매우 부정
    if (score > 0.6) return '☹️'; // 부정
    return '😕'; // 살짝 부정
  }

  if (label === 'neutral') {
    return '😐'; // 중립
  }

  return '🤔'; // fallback
}

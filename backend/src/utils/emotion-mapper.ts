// src/utils/emotion-mapper.ts

// 실제 DB에서 발견된 라벨들에 대한 정규화 매핑
function normalizeLabel(label: string | null): 'positive' | 'negative' | 'neutral' {
  if (!label) return 'neutral';

  const map: Record<string, 'positive' | 'negative' | 'neutral'> = {
    // ✅ Positive
    '고마운': 'positive',
    '사랑하는': 'positive',
    '설레는(기대하는)': 'positive',
    '즐거운(신나는)': 'positive',
    '기쁨(행복한)': 'positive',
    'Positive': 'positive',

    // ❌ Negative
    '짜증남': 'negative',
    '걱정스러운(불안한)': 'negative',
    '슬픔(우울한)': 'negative',

    // 😐 Neutral
    '일상적인': 'neutral',
    '생각이 많은': 'neutral',
    'Unknown': 'neutral',
    '': 'neutral',
  };

  return map[label] ?? 'neutral';
}

// 점수(score) + 정규화된 감정 라벨에 따라 이모지 매핑
export function mapEmotion(score: number, label: string | null): string {
  const normLabel = normalizeLabel(label);

  if (normLabel === 'positive') {
    if (score >= 0.7) return '😁'; // 아주 긍정
    if (score >= 0.4) return '😊'; // 긍정
    return '🙂'; // 살짝 긍정
  }

  if (normLabel === 'negative') {
    if (score >= 0.7) return '😡'; // 강한 부정
    if (score >= 0.4) return '☹️'; // 부정
    return '😕'; // 살짝 부정
  }

  if (normLabel === 'neutral') {
    return '😐';
  }

  return '🤔'; // fallback
}

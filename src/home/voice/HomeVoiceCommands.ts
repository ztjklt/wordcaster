export type HomeVoiceCommand =
  | { type: 'navigate'; entranceId: string; transcript: string }
  | { type: 'interact'; transcript: string }
  | { type: 'unknown'; transcript: string };

const destinations: ReadonlyArray<{ id: string; terms: readonly string[] }> = [
  { id: 'restaurant-door', terms: ['restaurant', 'food', 'dinner', '餐厅'] },
  { id: 'hospital-door', terms: ['hospital', 'clinic', 'doctor', '医院', '诊所'] },
  { id: 'training-door', terms: ['training', 'dojo', 'practice', '训练', '道场'] },
  { id: 'bookshelf-door', terms: ['bookshelf', 'library', 'book', '书架', '书库'] },
  { id: 'adventure-gate', terms: ['battle', 'adventure', 'fight', '远征', '战斗'] },
  { id: 'quarters-bed', terms: ['sleep', 'bed', 'rest', '睡觉', '休息'] },
  { id: 'settings-terminal', terms: ['settings', 'terminal', '设置'] },
] as const;

export function resolveHomeVoiceCommand(transcript: string): HomeVoiceCommand {
  const normalized = transcript.toLowerCase();
  if (['interact', 'enter', 'open', 'use', '进去', '交互'].some((term) => normalized.includes(term))) {
    const destination = destinations.find((entry) => entry.terms.some((term) => normalized.includes(term)));
    if (destination) return { type: 'navigate', entranceId: destination.id, transcript };
    return { type: 'interact', transcript };
  }
  const destination = destinations.find((entry) => entry.terms.some((term) => normalized.includes(term)));
  return destination
    ? { type: 'navigate', entranceId: destination.id, transcript }
    : { type: 'unknown', transcript };
}

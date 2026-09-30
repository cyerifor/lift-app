const weekdays: Record<string, number> = { SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6 };
export type SessionOccurrence = { programmeWeek: number; sessionNumber: number; sessionCode: string; trainingDay: string; scheduledAt: Date };
export function generateSessionOccurrences(input: { startDate: Date; trainingDays: string[]; sessionsPerWeek: number; weekCount: number }): SessionOccurrence[] {
  if (input.trainingDays.length < input.sessionsPerWeek) throw new Error("Not enough ordered training days for sessionsPerWeek");
  const days = input.trainingDays.slice(0, input.sessionsPerWeek).map((day) => day.toUpperCase());
  if (days.some((day) => weekdays[day] === undefined) || new Set(days).size !== days.length) throw new Error("Training days must be unique valid weekdays");
  const result: SessionOccurrence[] = [];
  let date = new Date(input.startDate); date.setUTCHours(0, 0, 0, 0);
  for (let index = 0; index < input.weekCount * input.sessionsPerWeek; index++) {
    const position = index % input.sessionsPerWeek;
    if (index > 0) { const previous = weekdays[days[(position - 1 + days.length) % days.length]]; const next = weekdays[days[position]]; let delta = (next - previous + 7) % 7; if (delta === 0) delta = 7; date = new Date(date); date.setUTCDate(date.getUTCDate() + delta); }
    result.push({ programmeWeek: Math.floor(index / input.sessionsPerWeek) + 1, sessionNumber: position + 1, sessionCode: `S${position + 1}`, trainingDay: days[position], scheduledAt: new Date(date) });
  }
  return result;
}

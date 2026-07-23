export function getClientGreeting(name: string, date: Date): string {
  const hour = date.getHours();

  if (hour >= 1 && hour < 5) return `Fighting crime? ${name}`;
  if (hour >= 5 && hour < 8) return `Up early, ${name}`;
  if (hour >= 8 && hour < 12) return `Good morning, ${name}`;
  if (hour >= 12 && hour < 17) return `Good afternoon, ${name}`;
  if (hour >= 17 && hour < 21) return `Good evening, ${name}`;
  if (hour >= 21) return `Still going, ${name}?`;
  return `Still awake, ${name}?`;
}

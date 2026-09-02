/** Short, dependency-free unique id generator — good enough for demo/mock data. */
export function makeId(prefix = ''): string {
  const rand = Math.random().toString(36).slice(2, 9)
  const time = Date.now().toString(36).slice(-4)
  return prefix ? `${prefix}_${time}${rand}` : `${time}${rand}`
}

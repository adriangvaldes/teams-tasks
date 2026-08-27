const LIKE_WILDCARDS = /[\\%_]/g

export function escapeLikePattern(term: string): string {
  return term.replace(LIKE_WILDCARDS, (char) => `\\${char}`)
}

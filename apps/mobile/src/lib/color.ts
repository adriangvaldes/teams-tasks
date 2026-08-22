const INK = '#0F172A'
const WHITE = '#FFFFFF'

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '')

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)

  const channel = (value: number): number => {
    const srgb = value / 255

    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
  }

  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function readableTextColor(backgroundHex: string): string {
  return relativeLuminance(backgroundHex) > 0.45 ? INK : WHITE
}

export function withAlpha(hex: string, alpha: number): string {
  const clamped = Math.max(0, Math.min(1, alpha))
  const channel = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase()

  return `${hex}${channel}`
}

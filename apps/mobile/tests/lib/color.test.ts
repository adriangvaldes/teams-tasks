import { readableTextColor, withAlpha } from '@/lib/color'

const INK = '#0F172A'
const WHITE = '#FFFFFF'

describe('readableTextColor', () => {
  it.each([
    ['#FFFFFF', INK],
    ['#FDE047', INK],
    ['#059669', WHITE],
    ['#2563EB', WHITE],
    ['#000000', WHITE],
  ])('sobre %s usa texto %s', (background, expected) => {
    expect(readableTextColor(background)).toBe(expected)
  })

  it('aceita hex sem o prefixo #', () => {
    expect(readableTextColor('2563EB')).toBe(WHITE)
  })
})

describe('withAlpha', () => {
  it('acrescenta o canal alfa em hexadecimal', () => {
    expect(withAlpha('#2563EB', 1)).toBe('#2563EBFF')
    expect(withAlpha('#2563EB', 0)).toBe('#2563EB00')
  })

  it('arredonda frações para o byte mais próximo', () => {
    expect(withAlpha('#2563EB', 0.5)).toBe('#2563EB80')
  })

  it('satura valores fora do intervalo em vez de gerar cor inválida', () => {
    expect(withAlpha('#2563EB', 2)).toBe('#2563EBFF')
    expect(withAlpha('#2563EB', -1)).toBe('#2563EB00')
  })
})

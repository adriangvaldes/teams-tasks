import { InvalidColorHexError } from '../errors/team-errors'

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/

/**
 * Cor do time, renderizada como chip nas tarefas. Normaliza para maiuscula para
 * que "#ff0000" e "#FF0000" sejam a mesma cor no banco e nas comparacoes.
 */
export class ColorHex {
  private constructor(private readonly _value: string) {}

  static create(value: string): ColorHex {
    const normalized = value.trim().toUpperCase()

    if (!HEX_PATTERN.test(normalized)) {
      throw new InvalidColorHexError(value)
    }

    return new ColorHex(normalized)
  }

  get value(): string {
    return this._value
  }

  equals(other: ColorHex): boolean {
    return this._value === other._value
  }

  toString(): string {
    return this._value
  }
}

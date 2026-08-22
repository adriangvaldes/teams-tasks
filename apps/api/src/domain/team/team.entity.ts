import { Entity } from '../shared/entity'
import type { UniqueEntityId } from '../shared/unique-entity-id'
import { InvalidTeamDescriptionError } from './errors/team-errors'
import { ColorHex } from './value-objects/color-hex.vo'
import { TeamName } from './value-objects/team-name.vo'

const MAX_DESCRIPTION_LENGTH = 500

export interface TeamProps {
  name: TeamName
  colorHex: ColorHex
  description: string | null
  createdAt: Date
  updatedAt: Date
}

export interface NewTeamProps {
  name: string
  colorHex: string
  description?: string | null
}

export class Team extends Entity<TeamProps> {
  static create(props: NewTeamProps, id: UniqueEntityId, now: Date): Team {
    return new Team(
      {
        name: TeamName.create(props.name),
        colorHex: ColorHex.create(props.colorHex),
        description: Team.normalizeDescription(props.description),
        createdAt: now,
        updatedAt: now,
      },
      id,
    )
  }

  static reconstitute(props: TeamProps, id: UniqueEntityId): Team {
    return new Team(props, id)
  }

  private static normalizeDescription(
    description: string | null | undefined,
  ): string | null {
    if (description === null || description === undefined) return null

    const normalized = description.trim()
    if (normalized.length === 0) return null

    if (normalized.length > MAX_DESCRIPTION_LENGTH) {
      throw new InvalidTeamDescriptionError(MAX_DESCRIPTION_LENGTH)
    }

    return normalized
  }

  get name(): TeamName {
    return this.props.name
  }

  get colorHex(): ColorHex {
    return this.props.colorHex
  }

  get description(): string | null {
    return this.props.description
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }

  rename(name: string, now: Date): void {
    this.props.name = TeamName.create(name)
    this.touch(now)
  }

  changeColor(colorHex: string, now: Date): void {
    this.props.colorHex = ColorHex.create(colorHex)
    this.touch(now)
  }

  changeDescription(description: string | null | undefined, now: Date): void {
    this.props.description = Team.normalizeDescription(description)
    this.touch(now)
  }

  private touch(now: Date): void {
    this.props.updatedAt = now
  }
}

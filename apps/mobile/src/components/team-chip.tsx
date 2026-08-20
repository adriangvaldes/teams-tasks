import type { TeamSummaryDTO } from '@teams-tasks/shared'
import { Text, View } from 'react-native'
import { readableTextColor } from '@/lib/color'

interface TeamChipProps {
  team: TeamSummaryDTO
  size?: 'sm' | 'md'
}

/**
 * Requisito do enunciado: a cor do time aparece como label/chip na tarefa.
 *
 * A cor vem do banco em runtime, então precisa ir por `style` e não por
 * className: o Tailwind gera classes em tempo de build e não conhece um
 * `#DB2777` cadastrado pelo usuário. A cor do texto é calculada para manter
 * contraste legível em qualquer tom escolhido.
 */
export function TeamChip({ team, size = 'md' }: TeamChipProps) {
  const textColor = readableTextColor(team.colorHex)

  return (
    <View
      style={{ backgroundColor: team.colorHex }}
      accessibilityLabel={`Time ${team.name}`}
      className={[
        'self-start rounded-full',
        size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1',
      ].join(' ')}
    >
      <Text
        style={{ color: textColor }}
        numberOfLines={1}
        className={
          size === 'sm' ? 'text-xs font-medium' : 'text-sm font-medium'
        }
      >
        {team.name}
      </Text>
    </View>
  )
}

/**
 * Lista de chips com limite visível. Uma tarefa pode ter muitos times, e
 * deixar a linha crescer sem limite quebraria o layout do card.
 */
export function TeamChipList({
  teams,
  max = 3,
  size = 'sm',
}: {
  teams: TeamSummaryDTO[]
  max?: number
  size?: 'sm' | 'md'
}) {
  if (teams.length === 0) {
    return <Text className="text-xs text-ink-subtle">Sem time</Text>
  }

  const visible = teams.slice(0, max)
  const hidden = teams.length - visible.length

  return (
    <View className="flex-row flex-wrap items-center gap-1.5">
      {visible.map((team) => (
        <TeamChip key={team.id} team={team} size={size} />
      ))}

      {hidden > 0 ? (
        <Text className="text-xs text-ink-muted">+{hidden}</Text>
      ) : null}
    </View>
  )
}

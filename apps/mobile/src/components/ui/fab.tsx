import { Pressable, type PressableProps, Text } from 'react-native'

const SHADOW = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.2,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },
  elevation: 4,
} as const

interface FabProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string
}

export function Fab({ label, ...pressableProps }: FabProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      className="absolute bottom-6 right-5 h-14 w-14 items-center justify-center rounded-full bg-brand-600 active:bg-brand-700"
      style={SHADOW}
      {...pressableProps}
    >
      <Text className="text-3xl leading-9 text-white">+</Text>
    </Pressable>
  )
}

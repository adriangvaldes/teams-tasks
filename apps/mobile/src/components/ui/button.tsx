import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  Text,
} from 'react-native'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'md' | 'sm'

const VARIANTS: Record<ButtonVariant, { container: string; label: string }> = {
  primary: {
    container: 'bg-brand-600 active:bg-brand-700 border-brand-600',
    label: 'text-white',
  },
  secondary: {
    container: 'bg-white active:bg-canvas border-border',
    label: 'text-ink',
  },
  danger: {
    container: 'bg-white active:bg-red-50 border-red-200',
    label: 'text-red-600',
  },
  ghost: {
    container: 'bg-transparent active:bg-canvas border-transparent',
    label: 'text-brand-600',
  },
}

const SIZES: Record<ButtonSize, { container: string; label: string }> = {
  md: { container: 'h-12 px-5', label: 'text-base' },
  sm: { container: 'h-9 px-3', label: 'text-sm' },
}

interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  ...pressableProps
}: ButtonProps) {
  const isDisabled = disabled === true || loading
  const appearance = VARIANTS[variant]
  const metrics = SIZES[size]

  return (
    <Pressable
      accessibilityRole="button"
      // Leitor de tela precisa saber que o botão está ocupado, não só
      // que ficou visualmente diferente.
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={label}
      disabled={isDisabled}
      className={[
        'flex-row items-center justify-center rounded-xl border',
        appearance.container,
        metrics.container,
        fullWidth ? 'w-full' : '',
        isDisabled ? 'opacity-50' : '',
      ].join(' ')}
      {...pressableProps}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#FFFFFF' : '#2563EB'}
        />
      ) : (
        <Text
          className={`font-semibold ${appearance.label} ${metrics.label}`}
          numberOfLines={1}
        >
          {label}
        </Text>
      )}
    </Pressable>
  )
}

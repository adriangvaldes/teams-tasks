import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { Modal, Pressable, useWindowDimensions, View } from 'react-native'
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler'
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const OPEN_SPRING = { damping: 22, stiffness: 260, mass: 0.7 } as const
const CLOSE_DURATION_MS = 200

/** Fracao da altura arrastada a partir da qual soltar fecha. */
const DISMISS_RATIO = 0.3

/** Velocidade para baixo que fecha mesmo sem passar do limiar. */
const DISMISS_VELOCITY = 900

/** Resistencia ao arrastar para cima, onde nao ha para onde ir. */
const RUBBER_BAND = 0.15

interface BottomSheetProps {
  visible: boolean
  onClose: () => void
  accessibilityLabel: string
  children: ReactNode
}

export function BottomSheet({
  visible,
  onClose,
  accessibilityLabel,
  children,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets()
  const { height: windowHeight } = useWindowDimensions()

  const [isMounted, setMounted] = useState(visible)
  const [sheetHeight, setSheetHeight] = useState(windowHeight * 0.5)

  const translateY = useSharedValue(windowHeight)

  const unmount = useCallback(() => setMounted(false), [])

  useEffect(() => {
    if (visible) {
      setMounted(true)
      return
    }

    translateY.value = withTiming(
      sheetHeight,
      { duration: CLOSE_DURATION_MS },
      (finished) => {
        if (finished) runOnJS(unmount)()
      },
    )
  }, [visible, sheetHeight, translateY, unmount])

  const onSheetLayout = useCallback(
    (height: number) => {
      setSheetHeight(height)

      if (visible && translateY.value >= height) {
        translateY.value = height
        translateY.value = withSpring(0, OPEN_SPRING)
      }
    },
    [visible, translateY],
  )

  const pan = Gesture.Pan()
    .onChange((event) => {
      const next = translateY.value + event.changeY

      translateY.value = next < 0 ? next * RUBBER_BAND : next
    })
    .onEnd((event) => {
      const passedThreshold = translateY.value > sheetHeight * DISMISS_RATIO
      const flungDown = event.velocityY > DISMISS_VELOCITY

      if (passedThreshold || flungDown) {
        translateY.value = withTiming(
          sheetHeight,
          { duration: CLOSE_DURATION_MS },
          (finished) => {
            if (finished) runOnJS(onClose)()
          },
        )
        return
      }

      translateY.value = withSpring(0, {
        ...OPEN_SPRING,
        velocity: event.velocityY,
      })
    })

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [0, sheetHeight],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }))

  if (!isMounted) return null

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      {/*
        O Modal renderiza numa hierarquia nativa separada, fora do
        GestureHandlerRootView da raiz do app. Sem este aqui dentro, o gesto de
        arrastar nunca chega ao handler e o sheet so fecha pelo botao.
      */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View className="flex-1 justify-end">
          <Animated.View
            style={backdropStyle}
            className="absolute inset-0 bg-black/50"
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar filtros"
              onPress={onClose}
              className="flex-1"
            />
          </Animated.View>

          <GestureDetector gesture={pan}>
            <Animated.View
              accessibilityViewIsModal
              accessibilityLabel={accessibilityLabel}
              onLayout={(event) =>
                onSheetLayout(event.nativeEvent.layout.height)
              }
              style={[
                sheetStyle,
                {
                  paddingBottom: insets.bottom + 24,
                  shadowColor: '#0F172A',
                  shadowOpacity: 0.18,
                  shadowRadius: 24,
                  shadowOffset: { width: 0, height: -8 },
                  elevation: 24,
                },
              ]}
              className="rounded-t-3xl bg-surface pt-3"
            >
              <View className="mb-4 h-1.5 w-11 self-center rounded-full bg-border" />

              {children}
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  )
}

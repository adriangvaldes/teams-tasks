/// <reference types="expo/types" />

// O Expo gera expo-env.d.ts com esta mesma referencia, porem esse arquivo e
// ignorado pelo git (ele e recriado a cada `expo start`). Versionar a
// declaracao aqui garante que `pnpm typecheck` funcione em um clone limpo,
// antes de o app ter sido executado pela primeira vez.
//
// E o que tipa process.env.EXPO_PUBLIC_* e as globais do runtime do Expo.

/**
 * O preset jest-expo cuida do transform do React Native e dos mocks nativos
 * do Expo. Aqui so acrescentamos o que e especifico deste projeto.
 */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/tests/setup-tests.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
  // Estes pacotes sao publicados como ESM/TSX e precisam passar pelo Babel.
  // @teams-tasks/shared esta na lista porque e distribuido como fonte
  // TypeScript, sem passo de build.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind|react-native-css-interop|@teams-tasks/shared)',
  ],
}

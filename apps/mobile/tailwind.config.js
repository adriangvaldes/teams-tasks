/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],

  // Necessario mesmo sem tema escuro implementado. Sem isto, o NativeWind
  // lanca "Cannot manually set color scheme" no bundle de DESENVOLVIMENTO
  // assim que algo consulta o esquema de cores do sistema - e o app abre com
  // overlay de erro vermelho, apesar de renderizar por tras. O export de
  // producao nao reclamava, o que tornava a falha invisivel no build.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Paleta semantica. Os componentes referenciam o PAPEL da cor
        // (surface, muted, danger) e nao o tom, o que mantem a UI coerente e
        // permite ajustar o tema em um unico lugar.
        brand: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        surface: '#FFFFFF',
        canvas: '#F5F7FA',
        border: '#E2E8F0',
        ink: {
          DEFAULT: '#0F172A',
          muted: '#64748B',
          subtle: '#94A3B8',
        },
        status: {
          pending: '#F59E0B',
          progress: '#3B82F6',
          done: '#10B981',
          danger: '#EF4444',
        },
      },
    },
  },
  plugins: [],
}

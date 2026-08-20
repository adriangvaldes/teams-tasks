/**
 * jsxImportSource: 'nativewind' faz o JSX aceitar a prop `className`.
 * O preset nativewind/babel converte as classes Tailwind em estilos nativos.
 */
module.exports = (api) => {
  api.cache(true)

  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  }
}

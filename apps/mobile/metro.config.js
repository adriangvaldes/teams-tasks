const path = require('node:path')
const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '..', '..')

const config = getDefaultConfig(projectRoot)

// --- Configuracao de monorepo ---
// Sem isto, editar packages/shared nao dispara reload e o import do pacote
// compartilhado falha em tempo de bundle.

// 1. Observa a raiz do workspace, nao apenas apps/mobile.
config.watchFolders = [workspaceRoot]

// 2. Resolve dependencias no app E na raiz (com node-linker=hoisted a maior
//    parte da arvore fica na raiz).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

// 3. Impede o Metro de subir a arvore de diretorios procurando modulos fora
//    dos caminhos declarados acima - a causa classica de "duas copias do React"
//    em monorepo.
config.resolver.disableHierarchicalLookup = true

module.exports = withNativeWind(config, { input: './global.css' })

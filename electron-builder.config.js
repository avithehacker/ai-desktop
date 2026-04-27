/**
 * @type {import('electron-builder').Configuration}
 */
const config = {
  appId: 'com.aidesktop.app',
  productName: 'AI Desktop',
  copyright: 'Copyright © 2024',

  mac: {
    category: 'public.app-category.productivity',
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: 'entitlements.mac.plist',
    entitlementsInherit: 'entitlements.mac.plist',
    target: [
      { target: 'dmg', arch: ['arm64', 'x64'] },
      { target: 'zip', arch: ['arm64', 'x64'] },
    ],
    icon: 'assets/icon.icns',
  },

  dmg: {
    contents: [
      { x: 410, y: 150, type: 'link', path: '/Applications' },
      { x: 130, y: 150, type: 'file' },
    ],
    window: { width: 540, height: 380 },
  },

  files: [
    'dist/**/*',
    '!dist/renderer/assets/*.map',
  ],

  directories: {
    output: 'release',
    buildResources: 'assets',
  },

  extraResources: [
    {
      from: 'resources',
      to: 'resources',
      filter: ['**/*'],
    },
  ],

  // Native modules rebuild
  npmRebuild: true,
  buildDependenciesFromSource: false,

  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
    icon: 'assets/icon.ico',
  },

  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
  },

  // Asar packaging (bundles app code)
  asar: true,
  asarUnpack: [
    'node_modules/better-sqlite3/**',
    'node_modules/keytar/**',
  ],
}

module.exports = config

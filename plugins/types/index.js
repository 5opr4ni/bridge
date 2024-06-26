// SPDX-FileCopyrightText: 2024 Sveriges Television AB
//
// SPDX-License-Identifier: MIT

/**
 * @type { import('../../api').Api }
 */
const bridge = require('bridge')

const assets = require('../../assets.json')
const manifest = require('./package.json')

const types = require('./lib/types')
const utils = require('./lib/utils')

const GROUP_PLAY_MODES = {
  all: 0,
  first: 1
}

const PLAY_HANDLERS = {
  /*
  Trigger group children based
  on the group's play mode
  */
  'bridge.types.group': item => {
    switch (parseInt(item?.data?.playMode)) {
      case GROUP_PLAY_MODES.first:
        if (item?.children?.[0]) {
          bridge.items.playItem(item?.children?.[0])
        }
        break
      case GROUP_PLAY_MODES.all:
      default:
        for (const child of (item?.children || [])) {
          bridge.items.playItem(child)
        }
    }
  },

  /*
  Trigger a reference
  item's target
  */
  'bridge.types.reference': item => {
    if (!item?.data?.targetId) {
      return
    }

    switch (parseInt(item?.data?.playAction)) {
      case types.REFERENCE_ACTION.none:
        break
      case types.REFERENCE_ACTION.stop:
        bridge.items.stopItem(item?.data?.targetId)
        break
      case types.REFERENCE_ACTION.play:
      default:
        bridge.items.playItem(item?.data?.targetId)
        break
    }
  }
}

const STOP_HANDLERS = {
  /*
  Trigger group children based
  on the group's play mode
  */
  'bridge.types.group': item => {
    for (const child of (item?.children || [])) {
      bridge.items.stopItem(child)
    }
  },

  /*
  Trigger a reference
  item's target
  */
  'bridge.types.reference': item => {
    if (!item?.data?.targetId) {
      return
    }

    switch (parseInt(item?.data?.stopAction)) {
      case types.REFERENCE_ACTION.none:
        break
      case types.REFERENCE_ACTION.play:
        bridge.items.playItem(item?.data?.targetId)
        break
      case types.REFERENCE_ACTION.stop:
      default:
        bridge.items.stopItem(item?.data?.targetId)
        break
    }
  }
}

const ITEM_CHANGE_HANDLERS = {
  /*
  Warn the user if a reference is
  targeting one of its own ancestors
  */
  'bridge.types.reference': async item => {
    const isAncestor = await utils.isAncestor(item?.data?.targetId, item?.id)

    if (!isAncestor) {
      bridge.items.removeIssue(item?.id, 'types.rta')
      return
    }

    bridge.items.applyIssue(item?.id, 'types.rta', {
      description: 'Reference is targeting an ancestor, loops may occur'
    })
  }
}

async function initWidget () {
  const cssPath = `${assets.hash}.${manifest.name}.bundle.css`
  const jsPath = `${assets.hash}.${manifest.name}.bundle.js`

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Types</title>
        <base href="/" />
        <link rel="stylesheet" href="${bridge.server.uris.STYLE_RESET}" />
        <link rel="stylesheet" href="${cssPath}" />
        <script src="${jsPath}" defer></script>
        <script>
          window.PLUGIN = ${JSON.stringify(
            {
              name: manifest.name
            }
          )}
        </script>
      </head>
      <body>
        <div id="root"></div>
      </body>
    </html>
  `
  return await bridge.server.serveString(html)
}

exports.activate = async () => {
  const htmlPath = await initWidget()

  types.init(htmlPath)

  bridge.events.on('item.play', item => {
    PLAY_HANDLERS[item.type]?.(item)
  })

  bridge.events.on('item.stop', item => {
    STOP_HANDLERS[item.type]?.(item)
  })

  bridge.events.on('item.change', item => {
    ITEM_CHANGE_HANDLERS[item?.type]?.(item)
  })
}

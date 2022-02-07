/**
 * @copyright Copyright © 2022 SVT Design
 * @author Axel Boberg <axel.boberg@svt.se>
 *
 * @typedef { (...any[]) -> Void } EventHandler
 */

const uuid = require('uuid')

const Logger = require('../Logger')
const logger = new Logger({ name: 'Events api' })

function factory (api) {
  /**
   * @type { Map.<String, Map.<String, EventHandler> }
   */
  const events = new Map()

  /**
   * Emit an event
   * @param { String } event The name of the
   *                         event to emit
   * @param  { ...any[] } args Any arguments
   * @returns
   */
  function emit (event, ...args) {
    logger.debug('Emitting event', event)

    const handlers = events.get(event)
    if (!handlers) return

    handlers.forEach(handler => handler(...args))
  }

  /**
   * Add a new handler
   * for an event
   * @param { String } event An event to listen to
   * @param { EventHandler } handler A handler to call
   * @returns { String } An id for the handler
   */
  function on (event, handler) {
    logger.debug('Adding handler for event', event)

    const id = uuid.v4()
    if (!events.has(event)) {
      events.set(event, new Map())
    }
    events.get(event).set(id, handler)

    return id
  }

  /**
   * Remove a handler for an
   * event by its identifier
   * @param { String } event An event name
   * @param { String } id A handler id to remove
   */
  function off (event, id) {
    logger.debug('Removing handler for event', event)

    const handlers = events.get(event)
    if (!handlers) return

    if (handlers.size === 1) {
      events.delete(event)
    } else {
      handlers.delete(id)
    }
  }

  /**
   * Trigger a command when
   * an event is fired
   *
   * This is useful for plugins
   * wanting to listen for events
   * @param { String } event An event to listen for
   * @param { String } command A command to trigger
   * @returns { String } An identifier for the created listener
   */
  function triggerCommand (event, command) {
    return on(event, (...args) => {
      api.executeCommand(command, ...args)
    })
  }

  api.registerCommand('events.off', off)
  api.registerCommand('events.emit', emit)
  api.registerAsyncCommand('events.on', on)
  api.registerAsyncCommand('events.triggerCommand', triggerCommand)

  api.events = { on, off }
}
exports.factory = factory

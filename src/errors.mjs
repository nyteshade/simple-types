const { Type } = await import('./type.mjs')

export class ErrorEvents {
  constructor() {

  }

  // Static properties and methods

  static ErrorSubscriberType = new Type('ErrorSubscriber', {
    message: String,
    error: Error
  })

  /** Singleton instance for logging errors */
  static #instance = null 

  /** Array containing the subscribers */
  #subscribers = []

  static get shared() {
    if (!ErrorEvents.#instance) {
      ErrorEvents.#instance = new ErrorEvents()
    }

    return ErrorEvents.#instance  
  }
}
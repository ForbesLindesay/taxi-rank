const enum WebdriverTimeoutType {
  /**
   * Synchronous script execution timeout
   */
  SCRIPT = 'script',
  /**
   * Asynchronous script execution timeout
   */
  ASYNC_SCRIPT = 'async',
  /**
   * Page load timeout
   */
  PAGE_LOAD = 'page load',
  /**
   * Implicit wait timeout.
   * Implicit waits are applied for all requests.
   */
  IMPLICIT = 'implicit',
}
export default WebdriverTimeoutType;

export default interface WebdriverCookie {
  /*
   * The name/key of the cookie.
   */
  name: string,
  /*
   * The cookie's value.
   */
  value: string,
  /*
   * The cookie path.  If you provide this, it scopes the cookie to the given path.  By default, this is set to "/"
   */
  path: string,
  /*
   * The domain the cookie is visible to. If you don't provide this, it defaults to the domain that is currently loaded
   * in the active window.
   */
  domain: string,
  /*
   * Whether the cookie is an httpOnly cookie.  If this is set to `true`, the cookie is not visible to JavaScript.
   */
  httpOnly?: boolean,
  /*
   * Whether the cookie is a secure cookie.  If this is set to `true`, the cookie is only available over https
   * connections
   */
  secure?: boolean,
  /*
   * When the cookie expires, specified in seconds since midnight, January 1, 1970 UTC.  If this is not provided, the
   * cookie never expires.
   */
  expiry?: number,
}
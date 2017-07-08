const enum WebdriverSelectorType {
  /**
   * Class-name selector type
   */
  CLASS = 'class name',
  /**
   * Css selector type, using the native css selector support
   */
  CSS = 'css selector',
  /**
   * Id selector type
   */
  ID = 'id',
  /**
   * Name selector type
   */
  NAME = 'name',
  /**
   * Link text selector type, finding a link that fits the selector.
   * The full link-text needs to match.
   */
  LINK_TEXT = 'link text',
  /**
   * Partial-link text selector type, finding a link that partially fits the selector.
   * Only a part of the link-text needs to match.
   */
  PARTIAL_LINK_TEXT = 'partial link text',
  /**
   * Tag-name selector type
   */
  TAG = 'tag name',
  /**
   * XPath selector type
   */
  XPATH = 'xpath',
}
export default WebdriverSelectorType;
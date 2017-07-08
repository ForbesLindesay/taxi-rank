export const SuccessStatus: 0 = 0;
const enum WebdriverStatus {
  NoSuchSession = 6,
  NoSuchElement = 7,
  UnknownCommand = 9,
  StaleElementReferene = 10,
  ElementNotVisible = 11,
  InvalidElementState = 12,
  UnknownError = 13,
  ElementIsNotSelectable = 15,
  JavaScriptError = 17,
  XPathLookupError = 19,
  Timeout = 21,
  NoSuchWindow = 23,
  InvalidSelector = 32,
  SessionNotCreatedException = 33,
}
export default WebdriverStatus;
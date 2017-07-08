import Webdriver from './Webdriver';
export const enum HttpMethod {
  get = 'get',
  post = 'post',
  delete = 'delete',
}
const methods: Array<{method: HttpMethod, path: string, fn: keyof Webdriver}> = [];
function register(method: HttpMethod, path: string, fn: keyof Webdriver) {
  methods.push({method, path, fn});
}
register(HttpMethod.post, '/session', 'createSession');
register(HttpMethod.delete, '/session/:sessionId', 'deleteSession');
register(HttpMethod.delete, '/session/:sessionId/cookie', 'deleteAllCookies');
register(HttpMethod.delete, '/session/:sessionId/cookie/:key', 'deleteCookie');
register(HttpMethod.get, '/session/:sessionId/element/:elementA/equals/:elementB', 'compareElements');
register(HttpMethod.get, '/session/:sessionId/window_handle', 'getActiveWindowHandle');
register(HttpMethod.post, '/session/:sessionId/timeouts', 'setTimeouts');
register(HttpMethod.post, '/session/:sessionId/timeouts/async_script', 'setAsyncScriptTimeOut');
register(HttpMethod.post, '/session/:sessionId/url', 'setUrl');
register(HttpMethod.get, '/session/:sessionId/url', 'getUrl');
register(HttpMethod.post, '/session/:sessionId/element', 'getElement');
register(HttpMethod.post, '/session/:sessionId/element/active', 'getActiveElement');
register(HttpMethod.post, '/session/:sessionId/elements', 'getElements');
register(HttpMethod.get, '/session/:sessionId/element/:elementId/name', 'getTagName');
register(HttpMethod.get, '/session/:sessionId/element/:elementId/attribute/:attributeName', 'getAttribute');
register(HttpMethod.get, '/session/:sessionId/element/:elementId/css/:propertyName', 'getCssProperty');
register(HttpMethod.get, '/session/:sessionId/element/:elementId/enabled', 'getEnabled');
register(HttpMethod.get, '/session/:sessionId/element/:elementId/selected', 'getSelected');
register(HttpMethod.get, '/session/:sessionId/element/:elementId/text', 'getText');
register(HttpMethod.post, '/session/:sessionId/element/:elementId/click', 'click');
register(HttpMethod.post, '/session/:sessionId/element/:elementId/submit', 'submit');
register(HttpMethod.post, '/session/:sessionId/element/:elementId/clear', 'clear');
register(HttpMethod.post, '/session/:sessionId/element/:elementId/value', 'appendValue');
register(HttpMethod.get, '/session/:sessionId/element/:elementId/displayed', 'getDisplayed');
register(HttpMethod.post, '/session/:sessionId/moveto', 'moveTo');
register(HttpMethod.post, '/session/:sessionId/click', 'globalClick');
register(HttpMethod.post, '/session/:sessionId/element/:elementId/element', 'getChildElement');
register(HttpMethod.post, '/session/:sessionId/element/:elementId/elements', 'getChildElements');
register(HttpMethod.get, '/session/:sessionId/title', 'getTitle');
register(HttpMethod.get, '/session/:sessionId/source', 'getSource');
register(HttpMethod.post, '/session/:sessionId/keys', 'sendKeys');
register(HttpMethod.post, '/session/:sessionId/back', 'goBack');
register(HttpMethod.post, '/session/:sessionId/forward', 'goForward');
register(HttpMethod.post, '/session/:sessionId/refresh', 'refresh');
register(HttpMethod.post, '/session/:sessionId/execute', 'execute');
register(HttpMethod.post, '/session/:sessionId/execute_async', 'executeAsync');
register(HttpMethod.post, '/session/:sessionId/cookie', 'setCookie');
register(HttpMethod.get, '/session/:sessionId/cookie', 'getCookies');
register(HttpMethod.post, '/session/:sessionId/:storageLevel', 'setStorageItem');
register(HttpMethod.get, '/session/:sessionId/:storageLevel', 'getStorageKeys');
register(HttpMethod.get, '/session/:sessionId/:storageLevel/key/:key', 'getStorageItem');
register(HttpMethod.get, '/session/:sessionId/:storageLevel/size', 'getStorageSize');
register(HttpMethod.delete, '/session/:sessionId/:storageLevel', 'clearStorage');
register(HttpMethod.delete, '/session/:sessionId/:storageLevel/key/:key', 'removeStorageItem');
register(HttpMethod.delete, '/session/:sessionId/window', 'closeActiveWindow');

export default methods;
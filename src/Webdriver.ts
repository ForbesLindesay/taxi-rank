import uuid = require('uuid/v1');
import {JSDOM, DOMWindow} from '@forbeslindesay/jsdom';
import Browser from './Browser';
import Tab from './Tab';
import WebdriverCookie from './WebdriverCookie';
import WebdriverElementReference from './WebdriverElementReference';
import WebdriverSelectorType from './WebdriverSelectorType';
import WebdriverStatus, {SuccessStatus} from './WebdriverStatus';
import WebdriverTimeoutType from './WebdriverTimeoutType';
import {Cookie, Store} from 'tough-cookie';
import MouseButton from './MouseButton';
import StorageLevel from './StorageLevel';

interface ElementList {
  readonly length: number;
  readonly [index: number]: Element;
}

type WebdriverSuccessResponse<T> = {
  status: 0,
  sessionId: string,
  value: T,
}
type WebdriverErrorResponse = {status: WebdriverStatus, value: {message: string}};
type WebdriverResponse<T> = WebdriverSuccessResponse<T> | WebdriverErrorResponse;

const XPathSelectorError = {
  status: WebdriverStatus.InvalidSelector,
  value: {message: 'Taxi Rank does not support XPath selectors.'},
};

function createResponse<T = void>(request: {params: {sessionId: string}}, value: T): WebdriverResponse<T> {
  return {status: SuccessStatus, sessionId: request.params.sessionId, value};
}

function isWebdriverResponse<T>(value: T | WebdriverResponse<T>): value is WebdriverResponse<T> {
  return value && typeof value === 'object' && typeof (value as any).status === 'number';
}

function withCallback<T>(fn: (cb: (err: any, res: T) => any) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    fn((err, res) => {
      if (err) return reject(err);
      else resolve((res as any));
    })
  });
}
class ElementStore {
  private readonly elements: Map<string, Element> = new Map();
  private readonly elementIDs: Map<Element, string> = new Map();
  private _nextIndex = 0;
  storeElement(tab: Tab, element: Element): WebdriverElementReference {
    const oldID = this.elementIDs.get(element);
    if (oldID) {
      return {ELEMENT: oldID};
    }
    const id = '' + (this._nextIndex++);
    this.elements.set(id, element);
    this.elementIDs.set(element, id);
    return {ELEMENT: id};
  }
  getElement(reference: WebdriverElementReference | string): Element | null {
    return this.elements.get(typeof reference === 'string' ? reference : reference.ELEMENT) || null;
  }
}
class WebdriverSession {
  public readonly browser: Browser;
  public readonly elements = new ElementStore();
  public timeouts: Map<WebdriverTimeoutType, number> = new Map([
    [WebdriverTimeoutType.ASYNC_SCRIPT, 5000],
    [WebdriverTimeoutType.IMPLICIT, 5000],
    [WebdriverTimeoutType.PAGE_LOAD, 5000],
    [WebdriverTimeoutType.SCRIPT, 5000],
  ]);
  public mouseLocation: null | {elementID: string, xoffset: number, yoffset: number};
  constructor(browser: Browser) {
    this.browser = browser;
  }
}
class Webdriver {
  private readonly _activeSessions: Map<string, WebdriverSession> = new Map();

  async createSession(
    request: {
      body: {
        desiredCapabilities: {[key: string]: string | number | void | null},
        requiredCapabilities: {[key: string]: string | number | void | null},
      },
    },
  ): Promise<WebdriverResponse<Object>> {
    const runScripts = request.body.desiredCapabilities.runScripts || request.body.desiredCapabilities.runScripts || 'dangerously';
    if (runScripts !== 'dangerously' && runScripts !== 'outside-only') {
      return {
        status: WebdriverStatus.SessionNotCreatedException,
        value: {message: 'The only valid values for the runScripts capability are "dangerously" and "outside-only"'},
      };
    }
    const capabilities = {runScripts: (runScripts as 'dangerously' | 'outside-only')};
    const sessionId = uuid();
    const currentSession = new WebdriverSession(new Browser({runScripts: capabilities.runScripts}));
    this._activeSessions.set(sessionId, currentSession);
    // TODO: initialise lots of things from capabilities here
    return {status: SuccessStatus, sessionId, value: capabilities};
  }
  async deleteSession(request: {params: {sessionId: string}}): Promise<WebdriverResponse<void>> {
    const session = this._activeSessions.get(request.params.sessionId);
    if (session) {
      session.browser.dispose();
      this._activeSessions.delete(request.params.sessionId);
    }
    return createResponse(request, undefined);
  }

  private async _withSession<T>(request: {params: {sessionId: string}}, fn: (session: WebdriverSession) => Promise<T | WebdriverResponse<T>>): Promise<WebdriverResponse<T>> {
    const session = this._activeSessions.get(request.params.sessionId);
    if (!session) {
      return {status: WebdriverStatus.NoSuchSession, value: {message: `No session with id, ${request.params.sessionId} was found.`}};
    }
    const result = await fn(session);
    if (isWebdriverResponse(result)) {
      return result;
    } else {
      return createResponse<T>(request, result);
    }
  }

  setTimeouts(request: {body: {type: WebdriverTimeoutType, ms: number}, params: {sessionId: string}}): Promise<WebdriverResponse<void>> {
    return this._withSession<void>(request, async (session) => {
      session.timeouts.set(request.body.type, request.body.ms);
    });
  }
  setAsyncScriptTimeOut(request: {body: {ms: number}, params: {sessionId: string}}): Promise<WebdriverResponse<void>> {
    return this._withSession<void>(request, async (session) => {
      session.timeouts.set(WebdriverTimeoutType.ASYNC_SCRIPT, request.body.ms);
    });
  }

  getActiveWindowHandle(request: {params: {sessionId: string}}): Promise<WebdriverResponse<string>>  {
    return this._withSession<string>(request, async (session) => {
      const tab = session.browser.currentTab;
      if (!tab) {
        return {status: WebdriverStatus.UnknownError, value: {message: 'No tab currently open'}};
      }
      return tab.id;
    });
  }
  setUrl(request: {body: {url: string}, params: {sessionId: string}}): Promise<WebdriverResponse<void>> {
    return this._withSession<void>(request, async (session) => {
      const tab = session.browser.currentTab;
      if (!tab) {
        return {status: WebdriverStatus.UnknownError, value: {message: 'No tab currently open'}};
      }
      const dom = await tab.whenReady();
      dom.window.location.href = request.body.url;
      await tab.whenReady();
    });
  }
  goBack(request: {body: {url: string}, params: {sessionId: string}}): Promise<WebdriverResponse<void>> {
    return this._withSession<void>(request, async (session) => {
      const tab = session.browser.currentTab;
      if (!tab) {
        return {status: WebdriverStatus.UnknownError, value: {message: 'No tab currently open'}};
      }
      const dom = await tab.whenReady();
      dom.window.history.back();
      await tab.whenReady();
    });
  }
  goForward(request: {body: {url: string}, params: {sessionId: string}}): Promise<WebdriverResponse<void>> {
    return this._withSession<void>(request, async (session) => {
      const tab = session.browser.currentTab;
      if (!tab) {
        return {status: WebdriverStatus.UnknownError, value: {message: 'No tab currently open'}};
      }
      const dom = await tab.whenReady();
      dom.window.history.forward();
      await tab.whenReady();
    });
  }
  refresh(request: {body: {url: string}, params: {sessionId: string}}): Promise<WebdriverResponse<void>> {
    return this._withSession<void>(request, async (session) => {
      const tab = session.browser.currentTab;
      if (!tab) {
        return {status: WebdriverStatus.UnknownError, value: {message: 'No tab currently open'}};
      }
      const dom = await tab.whenReady();
      dom.window.location.reload();
      await tab.whenReady();
    });
  }
  getElementFromResponse(request: {body: {using: WebdriverSelectorType, value: string}, params: {sessionId: string}}, elementsResponse: WebdriverResponse<Array<WebdriverElementReference>>): WebdriverResponse<WebdriverElementReference> {
    if (elementsResponse.status !== SuccessStatus) {
      return <WebdriverErrorResponse>elementsResponse;
    }
    const elements = (<WebdriverSuccessResponse<Array<WebdriverElementReference>>>elementsResponse).value;
    if (elements.length) {
      return createResponse(request, elements[0]);
    }
    return {status: WebdriverStatus.NoSuchElement, value: {message: `There do not seem to be any elements with the selector "${request.body.value}"`}};
  } 
  async getElement(request: {body: {using: WebdriverSelectorType, value: string}, params: {sessionId: string}}): Promise<WebdriverResponse<WebdriverElementReference>> {
    return this.getElementFromResponse(request, await this.getElements(request));
  }
  private _htmlCollectionToArray(session: WebdriverSession, tab: Tab, elements: HTMLCollectionOf<Element>): Array<WebdriverElementReference> {
    const result = [];
    for (let i = 0; i < elements.length; i++) {
      result.push(session.elements.storeElement(tab, elements[i]));
    }
    return result;
  }
  private _getElementsInContext(
    ctx: {
      using: WebdriverSelectorType,
      value: string,
      parent: Document | Element,
      session: WebdriverSession,
    },
  ): Array<Element> {
    function htmlCollectionToArray(elements: ElementList): Array<Element> {
      const result = [];
      for (let i = 0; i < elements.length; i++) {
        result.push(elements[i]);
      }
      return result;
    }
    switch (ctx.using) {
      case WebdriverSelectorType.CLASS:
        return htmlCollectionToArray(ctx.parent.getElementsByClassName(ctx.value));
      case WebdriverSelectorType.CSS:
        return htmlCollectionToArray(ctx.parent.querySelectorAll(ctx.value));
      case WebdriverSelectorType.ID:
        return htmlCollectionToArray(
          ctx.parent.querySelectorAll('#' + ctx.value)
        ).filter(element => element.id === ctx.value);
      case WebdriverSelectorType.NAME:
        return htmlCollectionToArray(
          ctx.parent.querySelectorAll(`[name="${ctx.value}"]`)
        ).filter(element => element.getAttribute('name') === ctx.value);
      case WebdriverSelectorType.LINK_TEXT:
        return htmlCollectionToArray(
          ctx.parent.getElementsByTagName('a')
        ).filter(element => element.textContent === ctx.value);
      case WebdriverSelectorType.PARTIAL_LINK_TEXT:
        return htmlCollectionToArray(
          ctx.parent.getElementsByTagName('a')
        ).filter(element => (element.textContent || '').indexOf(ctx.value) !== -1);
      case WebdriverSelectorType.TAG:
        return htmlCollectionToArray(
          ctx.parent.getElementsByTagName(ctx.value)
        );
      case WebdriverSelectorType.XPATH:
        throw new Error('XPath Selectors are not implemented');
    }
  }
  getElements(request: {body: {using: WebdriverSelectorType, value: string}, params: {sessionId: string}}): Promise<WebdriverResponse<Array<WebdriverElementReference>>> {
    return this._withSession<Array<WebdriverElementReference>>(request, async (session) => {
      const tab = session.browser.currentTab;
      if (!tab) {
        return [];
      }
      const dom = await tab.whenReady();
      if (request.body.using === WebdriverSelectorType.ID) {
        const element = dom.window.document.getElementById(request.body.value);
        return element ? [session.elements.storeElement(tab, element)] : [];
      }
      if (request.body.using === WebdriverSelectorType.XPATH) {
        return XPathSelectorError;
      }
      return this._getElementsInContext({
        using: request.body.using,
        value: request.body.value,
        parent: dom.window.document,
        session,
      }).map(element => session.elements.storeElement(tab, element));
    });
  }
  async getChildElement(request: {body: {using: WebdriverSelectorType, value: string}, params: {sessionId: string, elementId: string}}): Promise<WebdriverResponse<WebdriverElementReference>> {
    return this.getElementFromResponse(request, await this.getChildElements(request));
  }
  getChildElements(request: {body: {using: WebdriverSelectorType, value: string}, params: {sessionId: string, elementId: string}}): Promise<WebdriverResponse<Array<WebdriverElementReference>>> {
    return this._withElement<Array<WebdriverElementReference>>(request, async (session, element) => {
      const tab = session.browser.currentTab;
      if (!tab) {
        return [];
      }
      const dom = await tab.whenReady();
      if (request.body.using === WebdriverSelectorType.ID) {
        return {status: WebdriverStatus.UnknownError, value: {message: 'Cannot use an element ID selector on another element, only on body'}};
      }
      if (request.body.using === WebdriverSelectorType.XPATH) {
        return XPathSelectorError;
      }
      return this._getElementsInContext({
        using: request.body.using,
        value: request.body.value,
        parent: element,
        session,
      }).map(element => session.elements.storeElement(tab, element));
    });
  }
  compareElements(request: {params: {elementA: string, elementB: string, sessionId: string}}): Promise<WebdriverResponse<boolean>> {
    return this._withSession<boolean>(request, async (session) => {
      return request.params.elementA === request.params.elementB;
    });
  }
  getActiveElement(request: {params: {sessionId: string}}): Promise<WebdriverResponse<WebdriverElementReference>> {
    return this._withSession<WebdriverElementReference>(request, async (session) => {
      const tab = session.browser.currentTab;
      if (!tab) {
        return {status: WebdriverStatus.UnknownError, value: {message: 'No tab currently open'}};
      }
      const dom = await tab.whenReady();
      return session.elements.storeElement(tab, dom.window.document.activeElement);
    });
  }
  getSource(request: {params: {sessionId: string}}): Promise<WebdriverResponse<string>> {
    return this._withSession<string>(request, async (session) => {
      const tab = session.browser.currentTab;
      if (!tab) {
        return {status: WebdriverStatus.UnknownError, value: {message: 'No tab currently open'}};
      }
      const dom = await tab.whenReady();
      return dom.serialize();
    });
  }
  getTitle(request: {params: {sessionId: string}}): Promise<WebdriverResponse<string>> {
    return this._withSession<string>(request, async (session) => {
      const tab = session.browser.currentTab;
      if (!tab) {
        return {status: WebdriverStatus.UnknownError, value: {message: 'No tab currently open'}};
      }
      const dom = await tab.whenReady();
      return dom.window.document.title;
    });
  }
  getUrl(request: {params: {sessionId: string}}): Promise<WebdriverResponse<string>> {
    return this._withSession<string>(request, async (session) => {
      const tab = session.browser.currentTab;
      if (!tab) {
        return {status: WebdriverStatus.UnknownError, value: {message: 'No tab currently open'}};
      }
      const dom = await tab.whenReady();
      return dom.window.location.href;
    });
  }

  deleteAllCookies(request: {params: {sessionId: string}}): Promise<WebdriverResponse<void>> {
    return this._withSession(request, async (session) => {
      const store: Store = (session.browser.cookies as any).store;
      const cookies = await withCallback<Array<Cookie>>(cb => store.getAllCookies(cb));
      for (const cookie of cookies) {
        await withCallback<void>(cb => store.removeCookie(cookie.domain, cookie.path, cookie.key, err => cb(err, undefined)));
      }
    });
  }
  deleteCookie(request: {params: {sessionId: string, key: string}}): Promise<WebdriverResponse<void>> {
    return this._withSession(request, async (session) => {

      const store: Store = (session.browser.cookies as any).store;
      const cookies = await withCallback<Array<Cookie>>(cb => store.getAllCookies(cb));
      for (const cookie of cookies) {
        if (cookie.key === request.params.key) {
          await withCallback<void>(cb => store.removeCookie(cookie.domain, cookie.path, cookie.key, err => cb(err, undefined)));
        }
      }
    });
  }

  setCookie(request: {params: {sessionId: string}, body: {cookie: WebdriverCookie}}): Promise<WebdriverResponse<void>> {
    return this._withSession<void>(request, async (session) => {
      const tab = session.browser.currentTab;
      if (!tab) {
        return {status: WebdriverStatus.UnknownError, value: {message: 'No tab currently open'}};
      }
      const dom = await tab.whenReady();
      await new Promise((resolve, reject) => {
        const c = request.body.cookie;
        session.browser.cookies.setCookie(new Cookie({
          key: c.name,
          value: c.value,
          // expires: undefined,
          maxAge: c.expiry || 'Infinity',
          domain: c.domain,
          path: c.path,
          secure: c.secure || false,
          httpOnly: c.httpOnly || false,
          // extensions: [],
          creation: new Date(),
          // creationIndex: Date.now(),
          // hostOnly: false,
          // pathIsDefault: false,
          lastAccessed: new Date(),
        }), dom.window.location.href, (err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }
  getCookies(request: {params: {sessionId: string}}): Promise<WebdriverResponse<Array<WebdriverCookie>>> {
    return this._withSession<Array<WebdriverCookie>>(request, async (session) => {
      const tab = session.browser.currentTab;
      if (!tab) {
        return {status: WebdriverStatus.UnknownError, value: {message: 'No tab currently open'}};
      }
      const dom = await tab.whenReady();
      const cookies = await new Promise<Cookie[]>((resolve, reject) => {
        session.browser.cookies.getCookies(dom.window.location.href, (err, cookies) => {
          if (err) reject(err);
          else resolve(cookies);
        });
      });
      return cookies.map((c): WebdriverCookie => ({
        name: c.key,
        value: c.value,
        path: c.path,
        domain: c.domain,
        httpOnly: c.httpOnly,
        secure: c.secure,
        expiry: typeof c.maxAge === 'number' ? c.maxAge : undefined,
      }));
    });
  }

  private async _withElement<T>(request: {params: {sessionId: string, elementId: string}}, fn: (session: WebdriverSession, element: Element) => Promise<T | WebdriverResponse<T>>): Promise<WebdriverResponse<T>> {
    const session = this._activeSessions.get(request.params.sessionId);
    if (!session) {
      return {status: WebdriverStatus.NoSuchSession, value: {message: `No session with id, ${request.params.sessionId} was found.`}};
    }
    const element = session.elements.getElement(request.params.elementId);
    if (!element) {
      return {status: WebdriverStatus.NoSuchElement, value: {message: `No element with id, ${request.params.elementId} was found.`}};
    }
    const result = await fn(session, element);
    if (isWebdriverResponse(result)) {
      return result;
    } else {
      return createResponse<T>(request, result);
    }
  }

  getTagName(request: {params: {sessionId: string, elementId: string}}): Promise<WebdriverResponse<string>> {
    return this._withElement(request, async (session, element) => {
      return element.tagName.toLowerCase();
    });
  }
  getAttribute(request: {params: {sessionId: string, elementId: string, attributeName: string}}): Promise<WebdriverResponse<string | null>> {
    return this._withElement<string | null>(request, async (session, element) => {
      if (request.params.attributeName === 'value' && isInputlike(element)) {
        return element.value;
      }
      if (request.params.attributeName === 'checked' && isInput(element)) {
        // TODO: I'm not sure this is quite right
        return element.checked ? 'checked' : null;
      }
      return element.getAttribute(request.params.attributeName);
    });
  }
  getCssProperty(request: {params: {sessionId: string, elementId: string, propertyName: string}}): Promise<WebdriverResponse<string | null>> {
    return this._withElement<string | null>(request, async (session, element) => {
      const tab = session.browser.currentTab;
      if (!tab) {
        return {status: WebdriverStatus.UnknownError, value: {message: 'No tab currently open'}};
      }
      const dom = await tab.whenReady();
      return dom.window.getComputedStyle(element)[(request.params.propertyName as any)] || null;
    });
  }
  getEnabled(request: {params: {sessionId: string, elementId: string, attributeName: string}}): Promise<WebdriverResponse<boolean>> {
    return this._withElement<boolean>(request, async (session, element) => {
      return !(element as any).disabled;
    });
  }
  getSelected(request: {params: {sessionId: string, elementId: string, attributeName: string}}): Promise<WebdriverResponse<boolean>> {
    return this._withElement<boolean>(request, async (session, element) => {
      return !!(element as any).checked;
    });
  }
  getText(request: {params: {sessionId: string, elementId: string}}): Promise<WebdriverResponse<string>> {
    return this._withElement<string>(request, async (session, element) => {
      return element.textContent || '';
    });
  }
  click(request: {params: {sessionId: string, elementId: string}}): Promise<WebdriverResponse<void>> {
    return this._withElement<void>(request, async (session, element) => {
      const tab = session.browser.currentTab;
      if (!tab) {
        return {status: WebdriverStatus.UnknownError, value: {message: 'No tab currently open'}};
      }
      const dom = await tab.whenReady();

      // element.click does not fire mousedown and mouseup so we manually create all three events

      const style = dom.window.getComputedStyle(element);
      const top = style.top ? parseInt(style.top, 10) : 0;
      const left = style.left ? parseInt(style.left, 10) : 0;
      const x = style.width ? parseInt(style.width, 10) / 2 : 0;
      const y = style.height ? parseInt(style.height, 10) / 2 : 0;
      ['mousedown', 'click', 'mouseup'].forEach(name => {
        const e = dom.window.document.createEvent('MouseEvent');
        e.initMouseEvent(name, true, true, dom.window, 0, left + x, top + y, left + x, top + y, false, false, false, false, MouseButton.LEFT, null);
        element.dispatchEvent(e);
      });
    });
  }
  moveTo(request: {params: {sessionId: string}, body: {element?: string, xoffset?: number, yoffset?: number}}): Promise<WebdriverResponse<void>> {
    return this._withSession<void>(request, async (session) => {
      if (!request.body.element) {
        return {
          status: WebdriverStatus.UnknownError,
          value: {message: 'Taxi Rank does not support moving the mouse to arbitrary locations, you must specify an element.'},
        };
      }
      session.mouseLocation = {
        elementID: request.body.element,
        xoffset: request.body.xoffset || 0,
        yoffset: request.body.yoffset || 0,
      };
    });
  }
  globalClick(request: {params: {sessionId: string}, body: {button: MouseButton}}): Promise<WebdriverResponse<void>> {
    return this._withSession<void>(request, async (session) => {
      if (!session.mouseLocation) {
        return {
          status: WebdriverStatus.UnknownError,
          value: {message: 'Taxi Rank requires you to move the mouse before you can click it.'},
        };
      }
      const element = session.elements.getElement(session.mouseLocation.elementID);
      if (!element) {
        return {
          status: WebdriverStatus.UnknownError,
          value: {message: 'Could not find an element with ID ' + session.mouseLocation.elementID + '.'},
        };
      }
      const tab = session.browser.currentTab;
      if (!tab) {
        return {status: WebdriverStatus.UnknownError, value: {message: 'No tab currently open'}};
      }
      const dom = await tab.whenReady();

      // element.click does not fire mousedown and mouseup so we manually create all three events

      const style = dom.window.getComputedStyle(element);
      const top = style.top ? parseInt(style.top, 10) : 0;
      const left = style.left ? parseInt(style.left, 10) : 0;
      const x = session.mouseLocation.xoffset;
      const y = session.mouseLocation.yoffset;
      ['mousedown', 'click', 'mouseup'].forEach(name => {
        const e = dom.window.document.createEvent('MouseEvent');
        e.initMouseEvent(name, true, true, dom.window, 0, left + x, top + y, left + x, top + y, false, false, false, false, request.body.button, null);
        element.dispatchEvent(e);
      });
    });
  }
  submit(request: {params: {sessionId: string, elementId: string}}): Promise<WebdriverResponse<void>> {
    return this._withElement<void>(request, async (session, element) => {
      const tab = session.browser.currentTab;
      if (!tab) {
        return {status: WebdriverStatus.UnknownError, value: {message: 'No tab currently open'}};
      }
      const dom = await tab.whenReady();

      if (!isForm(element)) {
        return {status: WebdriverStatus.UnknownError, value: {message: 'This element is not a form, it cannot be submitted.'}};
      }
      const form: HTMLFormElement = element;
      const submit = dom.window.document.createEvent('HTMLEvents');
      submit.initEvent('submit', true, true);
      if (form.dispatchEvent(submit)) {
        form.submit();
      }
      await tab.whenReady();
    });
  }
  sendKeys(request: {params: {sessionId: string}, body: {value: string}}): Promise<WebdriverResponse<void>> {
    return this._withSession<void>(request, async (session) => {
      const tab = session.browser.currentTab;
      if (!tab) {
        return {status: WebdriverStatus.UnknownError, value: {message: 'No tab currently open'}};
      }
      const dom = await tab.whenReady();
      for (const key of request.body.value) {
        // key is a single character
        const options = {
          key: key.toLowerCase(),
          char: key,
          charCode: key.charCodeAt(0),
          shiftKey: key !== key.toLowerCase(),
          keyCode: key.toUpperCase().charCodeAt(0),
        };
        const KeyboardEvent = (dom.window as any).KeyboardEvent;
        dom.window.document.activeElement.dispatchEvent(new KeyboardEvent('keydown', options));
        dom.window.document.activeElement.dispatchEvent(new KeyboardEvent('keypress', options));
        dom.window.document.activeElement.dispatchEvent(new KeyboardEvent('keyup', options));
      }
    });
  }
  execute(request: {params: {sessionId: string}, body: {script: string, args: Array<string>}}): Promise<WebdriverResponse<any>> {
    return this._withSession(request, async (session) => {
      const tab = session.browser.currentTab;
      if (!tab) {
        return {status: WebdriverStatus.UnknownError, value: {message: 'No tab currently open'}};
      }
      const dom = await tab.whenReady();
      return (dom.window as any).Function('', request.body.script)(...request.body.args);
    });
  }
  executeAsync(request: {params: {sessionId: string}, body: {script: string, args: Array<string>}}): Promise<WebdriverResponse<any>> {
    return this.execute(request);
  }

  _getStorage(window: DOMWindow, level: StorageLevel): Storage {
    switch (level) {
      case StorageLevel.Local:
        return window.localStorage;
      case StorageLevel.Session:
        return window.sessionStorage;
    }
  }
  setStorageItem(request: {params: {sessionId: string, storageLevel: StorageLevel}, body: {key: string, value: string}}): Promise<WebdriverResponse<void>> {
    return this._withSession<void>(request, async (session) => {
      const tab = session.browser.currentTab;
      if (!tab) {
        return {status: WebdriverStatus.UnknownError, value: {message: 'No tab currently open'}};
      }
      const dom = await tab.whenReady();
      this._getStorage(dom.window, request.params.storageLevel).setItem(request.body.key, request.body.value);
    });
  }
  getStorageItem(request: {params: {sessionId: string, storageLevel: StorageLevel, key: string}}): Promise<WebdriverResponse<string | null>> {
    return this._withSession<string | null>(request, async (session) => {
      const tab = session.browser.currentTab;
      if (!tab) {
        return {status: WebdriverStatus.UnknownError, value: {message: 'No tab currently open'}};
      }
      const dom = await tab.whenReady();
      return this._getStorage(dom.window, request.params.storageLevel).getItem(request.params.key);
    });
  }
  getStorageKeys(request: {params: {sessionId: string, storageLevel: StorageLevel}}): Promise<WebdriverResponse<Array<string>>> {
    return this._withSession<Array<string>>(request, async (session) => {
      const tab = session.browser.currentTab;
      if (!tab) {
        return {status: WebdriverStatus.UnknownError, value: {message: 'No tab currently open'}};
      }
      const dom = await tab.whenReady();
      const storage = this._getStorage(dom.window, request.params.storageLevel);
      const keys = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (typeof key === 'string') {
          keys.push(key);
        }
      }
      return keys;
    });
  }
  getStorageSize(request: {params: {sessionId: string, storageLevel: StorageLevel}}): Promise<WebdriverResponse<number>> {
    return this._withSession<number>(request, async (session) => {
      const tab = session.browser.currentTab;
      if (!tab) {
        return {status: WebdriverStatus.UnknownError, value: {message: 'No tab currently open'}};
      }
      const dom = await tab.whenReady();
      return this._getStorage(dom.window, request.params.storageLevel).length;
    });
  }
  clearStorage(request: {params: {sessionId: string, storageLevel: StorageLevel}}): Promise<WebdriverResponse<void>> {
    return this._withSession<void>(request, async (session) => {
      const tab = session.browser.currentTab;
      if (!tab) {
        return {status: WebdriverStatus.UnknownError, value: {message: 'No tab currently open'}};
      }
      const dom = await tab.whenReady();
      this._getStorage(dom.window, request.params.storageLevel).clear();
    });
  }
  removeStorageItem(request: {params: {sessionId: string, storageLevel: StorageLevel, key: string}}): Promise<WebdriverResponse<void>> {
    return this._withSession<void>(request, async (session) => {
      const tab = session.browser.currentTab;
      if (!tab) {
        return {status: WebdriverStatus.UnknownError, value: {message: 'No tab currently open'}};
      }
      const dom = await tab.whenReady();
      this._getStorage(dom.window, request.params.storageLevel).removeItem(request.params.key);
    });
  }

  _setValue(window: DOMWindow, element: Element, value: string): null | WebdriverErrorResponse {
    if (!isInputlike(element)) {
      return {status: WebdriverStatus.InvalidElementState, value: {message: 'You cannot set a value for an element with the tag name ' + element.tagName}};
    }
    if (element.disabled || element.readOnly) {
      return {status: WebdriverStatus.InvalidElementState, value: {message: 'You cannot set a value for an element that is disabled or read only'}};
    }

    // Switch focus to field, change value and emit the input event (HTML5)
    element.focus();

    // `field.value = value` does not work if there is a custom property descriptor, e.g. in React
    // TODO: check what the actual spec compliant way of doing this is
    const descriptor = Object.getOwnPropertyDescriptor(element.constructor.prototype, 'value');
    if (!descriptor.set) {
      throw new Error('Corrupted element prototype');
    }
    descriptor.set.call(element, value);

    const e = window.document.createEvent('HTMLEvents');
    e.initEvent('input', true, true);
    element.dispatchEvent(e);

    // Switch focus out of field, if value changed, this will emit change event
    element.blur();
    return null;
  }

  clear(request: {params: {sessionId: string, elementId: string}}): Promise<WebdriverResponse<void>> {
    return this._withElement<void>(request, async (session, element) => {
      const tab = session.browser.currentTab;
      if (!tab) {
        return {status: WebdriverStatus.UnknownError, value: {message: 'No tab currently open'}};
      }
      const dom = await tab.whenReady();
      this._setValue(dom.window, element, '');
    });
  }
  appendValue(request: {params: {sessionId: string, elementId: string}, body: {value: Array<string>}}): Promise<WebdriverResponse<void>> {
    return this._withElement<void>(request, async (session, element) => {
      const tab = session.browser.currentTab;
      if (!tab) {
        return {status: WebdriverStatus.UnknownError, value: {message: 'No tab currently open'}};
      }
      const dom = await tab.whenReady();
      if (!isInputlike(element)) {
        return {status: WebdriverStatus.InvalidElementState, value: {message: 'You cannot set a value for an element with the tag name ' + element.tagName}};
      }
      this._setValue(dom.window, element, element.value + request.body.value.join(''));
    });
  }
  getDisplayed(request: {params: {sessionId: string, elementId: string}}): Promise<WebdriverResponse<boolean>> {
    return this._withElement<boolean>(request, async (session, element) => {
      const tab = session.browser.currentTab;
      if (!tab) {
        return {status: WebdriverStatus.UnknownError, value: {message: 'No tab currently open'}};
      }
      const dom = await tab.whenReady();
      const display = dom.window.getComputedStyle(element).display;
      return display !== 'none';
    });
  }
  closeActiveWindow(request: {params: {sessionId: string}}): Promise<WebdriverResponse<void>> {
    return this._withSession<void>(request, async (session) => {
      const tab = session.browser.currentTab;
      if (tab) {
        tab.close();
      }
    });
  }
}

function isInput(element: Element): element is HTMLInputElement {
  return element.tagName === 'INPUT';
}
function isInputlike(element: Element): element is HTMLTextAreaElement | HTMLInputElement {
  return element.tagName === 'TEXTAREA' || element.tagName === 'INPUT';
}
function isForm(element: Element): element is HTMLFormElement {
  return element.tagName === 'FORM';
}

export default Webdriver;

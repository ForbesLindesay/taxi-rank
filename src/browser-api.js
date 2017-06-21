import Browser from '@forbeslindesay/zombie';
import uuid from 'uuid';
import throat from 'throat';

module.exports = function () {
  const browser = new Browser();
  browser.visit('about:blank');

  function throwError(status, message) {
    const err = new Error(message);
    err.webdriverError = {status, value: {message}};
    throw err;
  }

  const timeouts = {
    implicit: 5000,
  };

  const elements = new Map();

  function getElementById(id) {
    return elements.get(id);
  }
  function storeElement(element) {
    if (!element) {
      throwError(7, 'No element found');
    }
    const elementID = uuid();
    elements.set(elementID, element);
    return {ELEMENT: elementID};
  }
  const driver = {
    getActiveWindowHandle() {
      return '' + browser.tabs.index;
    },
    setTimeouts({body: {type, ms}}) {
      timeouts[type] = ms;
    },
    setAsyncScriptTimeOut({body: {ms}}) {
      timeouts.async = ms;
    },
    async setUrl({body: {url}}) {
      await browser.visit(url);
      // TODO: verify that window handles are kept consistent
    },
    getUrl() {
      return browser.url;
    },

    async getElement({body: {using, value}}) {
      const timeout = Date.now() + timeouts.implicit;
      let element = this.getElements({body: {using, value}})[0];
      while (!element && Date.now() < timeout) {
        await new Promise(resolve => setTimeout(resolve, 100));
        element = this.getElements({body: {using, value}})[0];
      }
      if (!element) {
        throwError(7, 'No element found');
      }
      return element;
    },

    getElements({body: {using, value}}) {
      const document = browser.document;
      switch (using) {
        case 'class name':
          return Array.from(document.getElementsByClassName(value)).map(storeElement);
        case 'css selector':
          return Array.from(document.querySelectorAll(value)).map(storeElement);
        case 'id':
          return [storeElement(document.getElementById(value))];
        case 'link text':
          return (
            Array.from(document.getElementsByTagName('a')).filter(link => link.textContent === value).map(storeElement)
          );
        case 'partial link text':
          return (
            Array.from(
              document.getElementsByTagName('a')
            ).filter(link => link.textContent.includes(value)).map(storeElement)
          );
        case 'name':
          return Array.from(document.querySelectorAll('[name="' + value + '"]')).map(storeElement);
        case 'tag':
          return Array.from(document.getElementsByTagName(value)).map(storeElement);
        default:
          throw new Error('Invalid using: ' + using);
      }
    },

    compareElements({params: {elementA, elementB}}) {
      return getElementById(elementA) === getElementById(elementB);
    },

    getActiveElement() {
      return storeElement(browser.activeElement);
    },

    getSource() {
      // TODO: use proper serialize method
      return '<!DOCTYPE html>\n' + browser.document.documentElement.outerHTML;
    },

    getTitle() {
      return browser.document.title;
    },

    async sendKeys({body: {value}}) {
      for (const key of value) {
        // key is a single character
        const options = {
          key: key.toLowerCase(),
          char: key,
          charCode: key.charCodeAt(0),
          shiftKey: key !== key.toLowerCase(),
          keyCode: key.toUpperCase().charCodeAt(0),
        };
        const KeyboardEvent = browser.window.KeyboardEvent;
        browser.activeElement.dispatchEvent(new KeyboardEvent('keydown', options));
        browser.activeElement.dispatchEvent(new KeyboardEvent('keypress', options));
        browser.activeElement.dispatchEvent(new KeyboardEvent('keyup', options));
        await browser.wait();
      }
    },

    async goBack() {
      await browser.back();
    },

    async goForward() {
      await browser.history.forward();
    },

    async refresh() {
      await browser.reload();
    },

    execute({body: {script, args}}) {
      return browser.window.Function('', script)(...args);
    },

    setCookie({body: {cookie}}) {
      browser.cookies.set(cookie);
    },
    getCookies() {
      return browser.cookies.map(cookie => {
        const result = {};
        for (const key of Object.keys(cookie)) {
          if (key === 'key') {
            result.name = cookie.key;
          } else {
            result[key] = cookie[key];
          }
        }
        return result;
      });
    },
    deleteCookie({params: {key}}) {
      const cookie = browser.cookies.find(cookie => cookie.key === key);
      if (cookie) {
        browser.cookies.delete(cookie);
      }
    },
    deleteAllCookies() {
      browser.cookies.deleteAll();
    },

    closeActiveWindow() {
      browser.tabs.close(browser.tabs.index);
    },
  };

  const elementMethods = {
    async click(element) {
      // workaround for https://github.com/assaf/zombie/issues/1124
      if (
        element.tagName.toLowerCase() === 'input' &&
        element.getAttribute('type').toLowerCase() === 'checkbox'
      ) {
        if (element.checked) {
          await browser.uncheck(element);
        } else {
          await browser.check(element);
        }
      } else {
        await browser.click(element);
      }
    },
    getAttribute(element, {params: {attributeName}}) {
      if (attributeName === 'value') {
        return element.value;
      }
      return element.getAttribute(attributeName);
    },
    getCssProperty(element, {params: {propertyName}}) {
      // TODO: convert css property name into JavaScript property name
      return browser.window.getComputedStyle(element)[propertyName];
    },
    getEnabled(element) {
      return !element.disabled;
    },
    getSelected(element) {
      return element.checked;
    },
    getTagName(element) {
      return element.tagName.toLowerCase();
    },
    getText(element) {
      return element.textContent;
    },
    async submit(element) {
      await browser.fire(element, 'submit');
    },

    async getElement(parentElement, {body: {using, value}}) {
      const timeout = Date.now() + timeouts.implicit;
      let element = this.getElements(parentElement, {body: {using, value}})[0];
      while (!element && Date.now() < timeout) {
        await new Promise(resolve => setTimeout(resolve, 100));
        element = this.getElements(parentElement, {body: {using, value}})[0];
      }
      if (!element) {
        throwError(7, 'No element found');
      }
      return element;
    },

    getElements(element, {body: {using, value}}) {
      switch (using) {
        case 'class name':
          return Array.from(element.getElementsByClassName(value)).map(storeElement);
        case 'css selector':
          return Array.from(element.querySelectorAll(value)).map(storeElement);
        case 'id':
          return [storeElement(element.getElementById(value))];
        case 'link text':
          return (
            Array.from(element.getElementsByTagName('a')).filter(link => link.textContent === value).map(storeElement)
          );
        case 'partial link text':
          return (
            Array.from(
              element.getElementsByTagName('a')
            ).filter(link => link.textContent.includes(value)).map(storeElement)
          );
        case 'name':
          return Array.from(element.querySelectorAll('[name="' + value + '"]')).map(storeElement);
        case 'tag':
          return Array.from(element.getElementsByTagName(value)).map(storeElement);
        default:
          throw new Error('Invalid using: ' + using);
      }
    },

    async clear(element) {
      browser.fill(element, '');
    },
    appendValue(element, {body: {value}}) {
      browser.fill(element, element.value + value.join(''));
    },

    getDisplayed(element) {
      return browser.window.getComputedStyle(element).display !== 'none';
    },
  };

  const storage = {
    setItem(id, {body: {key, value}}) {
      browser.window[id].setItem(key, value);
    },
    getItem(id, {params: {key}}) {
      return browser.window[id].getItem(key);
    },
    getKeys(id) {
      const keys = [];
      for (let i = 0; i < browser.window[id].length; i++) {
        keys.push(browser.window[id].key(i));
      }
      return keys;
    },
    getSize(id) {
      return browser.window[id].length;
    },
    removeItem(id, {params: {key}}) {
      browser.window[id].removeItem(key);
    },
    clear(id) {
      browser.window[id].clear();
    },
  };

  function handleMessage({level, method, params, body}) {
    switch (level) {
      case 'driver':
        if (typeof driver[method] !== 'function') {
          throwError(9, `Unknown command driver.${method}`);
        }
        return driver[method]({params, body});
      case 'element':
        if (typeof elementMethods[method] !== 'function') {
          throwError(9, `Unknown command element.${method}`);
        }
        return elementMethods[method](getElementById(params.elementId), {params, body});
      case 'storage':
        if (typeof storage[method] !== 'function') {
          throwError(9, `Unknown command storage.${method}`);
        }
        return storage[method](
          (
            params.level === 'local_storage'
            ? 'localStorage'
            : params.level === 'session_storage'
            ? 'sessionStorage'
            : (() => { throw new Error(`Unknown storage level ${params.level}`); })()
          ),
          {params, body},
        );
      case 'session_storage':
        if (typeof storage[method] !== 'function') {
          throwError(9, `Unknown command storage.${method}`);
        }
        return elementMethods[method]('sessionStorage', {params, body});
      default:
        throwError(9, `Unknown command ${level}.${method}`);

    }
  }

  return {
    handle: throat(1, message => {
      return Promise.resolve(null).then(() => handleMessage(message)).then(result => {
        return {status: 0, value: result};
      }, err => {
        if (err.webdriverError) {
          return err.webdriverError;
        } else {
          return {status: 13, value: {message: err.stack}};
        }
      });
    }),
    dispose() {
      browser.destroy();
    },
  };
};

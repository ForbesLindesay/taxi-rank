import {JSDOM, DOMWindow} from '@forbeslindesay/jsdom';
import {parseURL, serializeURL, URLData} from 'whatwg-url';
import Browser from './Browser';
import TabOptions from './TabOptions';
import StorageShim = require('node-storage-shim');

class Tab {
  private readonly _browser: Browser;
  private _url: URLData;
  private _dom: Promise<JSDOM>;
  public readonly id: string;
  public readonly name: string | void;
  private readonly _sessionStorage: Map<string, StorageShim> = new Map();
  private readonly _localStorage: Map<string, StorageShim>;
  private readonly _onClose: (tab: Tab) => void;
  constructor(browser: Browser, options: TabOptions, id: string, localStorage: Map<string, StorageShim>, onClose: (tab: Tab) => void) {
    this._browser = browser;
    this.id = id;
    this.name = options.name;
    this._localStorage = localStorage;
    this._onClose = onClose;
    this.setLocation(options);
  }
  private _beforeParse = (window: DOMWindow) => {
    // polyfill local storage
    const host = window.location.host;
    const sessionStorage = this._sessionStorage.get(host) || new StorageShim();
    const localStorage = this._localStorage.get(host) || new StorageShim();
    this._sessionStorage.set(host, sessionStorage);
    this._localStorage.set(host, localStorage);
    (window as any).sessionStorage = sessionStorage;
    (window as any).localStorage = localStorage;
    
    // polyfill console.dir
    window.console.dir = window.console.log;

    // polyfill requestAnimationFrame and cancelAnimationFrame
    let lastTime = 0;
    if (!window.requestAnimationFrame)
      (window as any).requestAnimationFrame = function(callback: (delay: number) => void, element: any) {
        var currTime = new Date().getTime();
        var timeToCall = Math.max(0, 16 - (currTime - lastTime));
        var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
          timeToCall);
        lastTime = currTime + timeToCall;
        return id;
      };
 
    if (!window.cancelAnimationFrame)
      window.cancelAnimationFrame = function(id) {
          clearTimeout(id);
      };

    this._browser.onBeforeParse.emit(window);
  };
  setLocation(options: TabOptions): void {
    const url = parseURL(options.url);
    if (url === 'failure') {
      throw new Error('Invalid url ' + options.url);
    }
    this._url = url;
    if (url.scheme === 'about') {
      this._dom = Promise.resolve(new JSDOM('', {
        cookieJar: this._browser.cookies,
        url: options.url,
        referrer: options.referrer,
        resources: 'usable',
        runScripts: this._browser.runScripts,
        beforeParse: this._beforeParse,
      }));
    } else {
      this._dom = JSDOM.fromURL(options.url, {
        cookieJar: this._browser.cookies,
        referrer: options.referrer,
        resources: 'usable',
        runScripts: this._browser.runScripts,
        beforeParse: this._beforeParse,
      });
    }
  }
  get dom() {
    return this._dom;
  }
  whenReady(): Promise<JSDOM> {
    return this._dom.then((dom): JSDOM | Promise<JSDOM> => {
      const state = dom.window.document.readyState
      if (state === 'complete' || state === 'interactive') {
        return dom;
      }
      return new Promise((resolve, reject) => {
        dom.window.document.addEventListener('DOMContentLoaded', () => resolve(dom));
      });
    });
  }
  async close() {
    const dom = await this.dom;
    dom.window.close();
    this._onClose(this);
  }
}
export default Tab;
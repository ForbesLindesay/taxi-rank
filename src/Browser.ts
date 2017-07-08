import {CookieJar, DOMWindow} from '@forbeslindesay/jsdom';
import BrowserOptions from './BrowserOptions';
import eventChannel from './eventChannel';
import Tab from './Tab';
import TabOptions from './TabOptions';
import StorageShim = require('node-storage-shim');

class Browser {
  private _currentTab: Tab | null = null;
  private _nextTabID: number = 0;
  private readonly _tabsByID: Map<string, Tab> = new Map();
  private readonly _tabsByName: Map<string, Tab> = new Map();
  private readonly _localStorage: Map<string, StorageShim> = new Map();

  public readonly runScripts: 'dangerously' | 'outside-only';
  public readonly cookies = new CookieJar();

  public readonly onInactive = eventChannel<Tab>();
  public readonly onActive = eventChannel<Tab>();
  public readonly onBeforeParse = eventChannel<DOMWindow>();
  constructor(options: BrowserOptions) {
    this.runScripts = options.runScripts;
    this.open({
      url: 'about:blank',
    });
  }

  findTab(nameOrID: string): Tab | null {
    const tabByName = this._tabsByName.get(nameOrID);
    if (tabByName) {
      return tabByName;
    }
    const tabByID = this._tabsByID.get(nameOrID);
    if (tabByID) {
      return tabByID;
    }
    return null;
  }

  /**
   * Opens and returns a tab.  If an open window by the same name already exists,
   * opens this window in the same tab.  Omit name or use '_blank' to always open
   * a new tab.
   */
  open(options: TabOptions): Tab {
    const named = options.name && this.findTab(options.name);
    if (named) {
      if (this._currentTab) {
        this.onInactive.emit(this._currentTab);
      }
      named.setLocation(options);
      this._currentTab = named;
      this.onActive.emit(named);
      return named;
    }
    const id = '' + (this._nextTabID++);
    const tab = new Tab(this, options, id, this._localStorage, this._onTabClose);
    this._tabsByID.set(id, tab);
    if (options.name) {
      this._tabsByName.set(options.name, tab);
    }
    if (this._currentTab) {
      this.onInactive.emit(this._currentTab);
    }
    this._currentTab = tab;
    this.onActive.emit(tab);
    return tab;
  }

  get currentTab(): Tab | null {
    return this._currentTab;
  }
  private _onTabClose = (tab: Tab) => {
    this._tabsByID.delete(tab.id);
    if (tab.name) {
      this._tabsByName.delete(tab.name);
    }
    if (this._currentTab === tab) {
      this.open({
        url: 'about:blank',
      });
    }
  };

  dispose() {
    
  }
}
export default Browser;
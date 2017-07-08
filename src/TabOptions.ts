import {DOMWindow} from '@forbeslindesay/jsdom';

interface TabOptions {
  /**
   * Window name (optional)
   */
  name?: string;
  /**
   * Opening window (window.open call)
   */
  opener?: DOMWindow;
  referrer?: string;
  url: string;
  html?: string;
}
export default TabOptions;
declare module 'whatwg-url' {
  export class URL {
    constructor(url: string, base?: string)

    readonly origin: string;
    protocol: string;
    username: string;
    password: string;
    host: string | null;
    hostname: string;
    port: string | null;
    pathname: string;
    search: string;
    hash: string;
    cannotBeABaseURL: boolean;

    toJSON(): string;
    toString(): string;
  }
  export interface URLData {
    /**
     * The protocol without a trailing `:` e.g. "http", "javascript"
     */
    scheme: string;
    username: string;
    password: string;
    /**
     * The hostname without port information e.g. "example.com"
     */
    host: null | string;
    /**
     * The port number, or null to represent the default port e.g. 1337
     */
    port: null | number;
    /**
     * The path, split by "/", e.g. ["foo", "bar"]
     * It will include the empty string if there is no path e.g. [""]
     */
    path: Array<string>;
    /**
     * The query portion of the url, without the leading `?` e.g. "foo=bar"
     */
    query: null | string;
    /**
     * The fragment portion of the url, without the leading `#` e.g. "foo"
     */
    fragment: null | string;
    cannotBeABaseURL: boolean;
  }
  export type StateOverride = (
    | "scheme start"
    | "scheme"
    | "no scheme"
    | "special relative or authority"
    | "path or authority"
    | "relative"
    | "relative slash"
    | "special authority slashes"
    | "special authority ignore slashes"
    | "authority"
    | "host"
    | "hostname"
    | "port"
    | "file"
    | "file slash"
    | "file host"
    | "path start"
    | "path"
    | "cannot-be-a-base-URL path"
    | "query"
    | "fragment"
  );
  export function serializeURL(url: URLData, excludeFragment?: boolean): string;
  export function serializeURLOrigin(url: URLData): string;
  export function basicURLParse(
    input: string,
    options?: {
      readonly baseURL?: URLData,
      readonly encodingOverride?: string,
      readonly url?: URLData,
      readonly stateOverride?: StateOverride,
    },
  ): URLData | 'failure';
  export function setTheUsername(url: URLData, username: string): void;
  export function setThePassword(url: URLData, password: string): void;
  export function serializeHost(host: number | Array<number> | string): string;
  export function serializeInteger(value: number): string;
  export function parseURL(
    url: string,
    options?: {readonly baseURL?: URLData, readonly encodingOverride?: string},
  ): URLData | 'failure';
}
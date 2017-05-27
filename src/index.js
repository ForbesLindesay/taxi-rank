import {fork} from 'child_process';
import express from 'express';
import uuid from 'uuid/v1';
import {json} from 'body-parser';
import throat from 'throat';

class Session {
  constructor() {
    this._process = fork(__dirname + '/browser-process.js');
    this.handle = throat(1, message => new Promise((resolve) => {
      this._process.once('message', resolve);
      this._process.send(message);
    }));
  }
  dispose() {
    this._process.kill();
  }
}

module.exports = function (options = {}) {
  const app = express();
  const activeSessions = new Map();

  app.use(json());

  app.post('/session', (req, res, next) => {
    const sessionId = options.uuid ? options.uuid() : uuid();
    const currentSession = new Session(options);
    activeSessions.set(sessionId, currentSession);
    // TODO: initialise lots of things from capabilities here
    const capabilities = {};
    res.json({status: 0, sessionId, value: capabilities});
  });

  app.delete('/session/:sessionId', (req, res, next) => {
    const session = activeSessions.get(req.params.sessionId);
    session.dispose();
    activeSessions.delete(req.params.sessionId);
    res.json({status: 0, sessionId: req.param.sessionId});
  });

  function withSession(level, method) {
    return (req, res, next) => {
      // console.dir({method: `${level}.${method}`, params: req.params, body: req.body}, {colors: true});
      const sessionId = req.params.sessionId;
      const session = activeSessions.get(sessionId);
      Promise.resolve(null).then(
        () => session.handle({level, method, params: req.params, body: req.body}),
      ).then(result => {
        // console.dir(result, {colors: true});
        res.json(result);
      }, next);
    };
  }
  function sessionMethod(method) {
    return withSession('driver', method);
  }
  function elementMethod(method) {
    return withSession('element', method);
  }
  function storageMethod(method) {
    const fn = withSession('storage', method);
    return (req, res, next) => {
      if (req.params.level !== 'session_storage' && req.params.level !== 'local_storage') {
        return next();
      }
      return fn(req, res, next);
    };
  }

  app.delete('/session/:sessionId/cookie', sessionMethod('deleteAllCookies'));
  app.delete('/session/:sessionId/cookie/:key', sessionMethod('deleteCookie'));
  app.delete('/session/:sessionId/window', sessionMethod('closeActiveWindow'));
  app.delete('/session/:sessionId/:level', storageMethod('clear'));
  app.delete('/session/:sessionId/:level/key/:key', storageMethod('removeItem'));
  app.get('/session/:sessionId/cookie', sessionMethod('getCookies'));
  app.get('/session/:sessionId/element/:elementA/equals/:elementB', sessionMethod('compareElements'));
  app.get('/session/:sessionId/:level', storageMethod('getKeys'));
  app.get('/session/:sessionId/:level/key/:key', storageMethod('getItem'));
  app.get('/session/:sessionId/:level/size', storageMethod('getSize'));
  app.get('/session/:sessionId/source', sessionMethod('getSource'));
  app.get('/session/:sessionId/title', sessionMethod('getTitle'));
  app.get('/session/:sessionId/url', sessionMethod('getUrl'));
  app.get('/session/:sessionId/window_handle', sessionMethod('getActiveWindowHandle'));
  app.post('/session/:sessionId/back', sessionMethod('goBack'));
  app.post('/session/:sessionId/cookie', sessionMethod('setCookie'));
  app.post('/session/:sessionId/element', sessionMethod('getElement'));
  app.post('/session/:sessionId/element/active', sessionMethod('getActiveElement'));
  app.post('/session/:sessionId/elements', sessionMethod('getElements'));
  app.post('/session/:sessionId/execute', sessionMethod('execute'));
  app.post('/session/:sessionId/execute_async', sessionMethod('execute'));
  app.post('/session/:sessionId/forward', sessionMethod('goForward'));
  app.post('/session/:sessionId/keys', sessionMethod('sendKeys'));
  app.post('/session/:sessionId/:level', storageMethod('setItem'));
  app.post('/session/:sessionId/refresh', sessionMethod('refresh'));
  app.post('/session/:sessionId/timeouts', sessionMethod('setTimeouts'));
  app.post('/session/:sessionId/timeouts/async_script', sessionMethod('setAsyncScriptTimeOut'));
  app.post('/session/:sessionId/url', sessionMethod('setUrl'));

  app.get('/session/:sessionId/element/:elementId/attribute/:attributeName', elementMethod('getAttribute'));
  app.get('/session/:sessionId/element/:elementId/css/:propertyName', elementMethod('getCssProperty'));
  app.get('/session/:sessionId/element/:elementId/displayed', elementMethod('getDisplayed'));
  app.get('/session/:sessionId/element/:elementId/enabled', elementMethod('getEnabled'));
  app.get('/session/:sessionId/element/:elementId/name', elementMethod('getTagName'));
  app.get('/session/:sessionId/element/:elementId/selected', elementMethod('getSelected'));
  app.get('/session/:sessionId/element/:elementId/text', elementMethod('getText'));
  app.post('/session/:sessionId/element/:elementId/clear', elementMethod('clear'));
  app.post('/session/:sessionId/element/:elementId/click', elementMethod('click'));
  app.post('/session/:sessionId/element/:elementId/element', elementMethod('getElement'));
  app.post('/session/:sessionId/element/:elementId/elements', elementMethod('getElements'));
  app.post('/session/:sessionId/element/:elementId/submit', elementMethod('submit'));
  app.post('/session/:sessionId/element/:elementId/value', elementMethod('appendValue'));

  app.use((req, res, next) => {
    res.json({status, value: {message: `Unkown method: ${req.method} ${req.path}`}});
  });

  return app.listen(options.port || 9516, options.onStart);
};

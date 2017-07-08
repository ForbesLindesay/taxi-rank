import express = require('express');
import uuid = require('uuid/v1');
import {json} from 'body-parser';
import Webdriver from './Webdriver';
import WebdriverOptions from './WebdriverOptions';
import urlMap from './WebdriverUrlMap';
import WebdriverStatus from './WebdriverStatus';
import StorageLevel from './StorageLevel';

function startServer(options: WebdriverOptions = {}) {
  const app = express();

  app.use(json());
  
  app.get('/version', (req, res, next) => {
    res.json(require('../package.json').version);
  });

  function isStorageLevel(str: string): str is StorageLevel {
    return str === StorageLevel.Local || str === StorageLevel.Session;
  }

  const driver = new Webdriver();
  urlMap.forEach(pattern => {
    (app as any)[pattern.method](pattern.path, (req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (req.params.storageLevel && !isStorageLevel(req.params.storageLevel)) {
        return next();
      }
      (driver as any)[pattern.fn](req).then(
        (result: any) => res.json(result),
        (err: any) => res.json({status: WebdriverStatus.UnknownError, value: {message: err.stack}}),
      ).catch(next);
    });
  });

  app.use((req, res, next) => {
    res.json({status: WebdriverStatus.UnknownCommand, value: {message: `Unknown method: "${req.method}" "${req.path}"`}});
  });

  return app.listen(options.port || 9516, options.onStart);
};
export = startServer;
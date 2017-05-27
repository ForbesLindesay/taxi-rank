// @flow

import {fork} from 'child_process';
import cabbie from 'cabbie-sync';
import runTest from './run-test';
import location from './upload-test-case';

let p = null;
p = fork(require.resolve('./start-server')).on('message', m => {
  if (m !== 'started') {
    return;
  }
  let driver;
  try {
    driver = cabbie('http://localhost:9516');

    runTest(driver, location);
  } finally {
    if (driver) {
      driver.dispose();
    }
    if (p) {
      p.kill();
    }
  }
});

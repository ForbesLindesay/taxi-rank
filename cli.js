#!/usr/bin/env node

const startServer = require('./lib');

const argv = require('minimist')(process.argv.slice(2));
const port = argv.p || argv.port || 9516;

if (argv.help || argv.h) {
  console.log('Usage:');
  console.log('');
  console.log('  taxi-rank --port <port>');
  console.log('');
  process.exit(0);
}

startServer({
  onStart() {
    console.log('listening on http://localhost:' + port);
  },
  port,
});

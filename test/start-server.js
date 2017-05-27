import startServer from '../src';

startServer({
  onStart() {
    process.send('started');
  },
});

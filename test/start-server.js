import startServer from '../lib';

startServer({
  onStart() {
    process.send('started');
  },
});

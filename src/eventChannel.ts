type Subscribe<T> = (handler: (value: T) => void) => (() => void);
interface Emitter<T> {
  emit(value: T): void;
}
function eventChannel<T>(): Subscribe<T> & Emitter<T> {
  const handlers: Set<(value: T) => void> = new Set();
  function on(handler: (value: T) => void) {
    handlers.add(handler);
    return () => {
      handlers.delete(handler);
    };
  }
  (on as any).emit = (value: T) => {
    handlers.forEach(fn => fn(value));
  };
  return (on as any);
}

export default eventChannel;
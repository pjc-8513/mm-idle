// Simple pub/sub event system
const subscribers = {};

export function on(event, callback) {
  if (!subscribers[event]) subscribers[event] = [];
  subscribers[event].push(callback);
}

export function emit(event, data) {
  if (subscribers[event]) {
    subscribers[event].forEach(cb => cb(data));
  }
}

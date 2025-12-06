import "@testing-library/jest-dom/vitest";

const createStorage = () => {
  let store: Record<string, string> = {};

  return {
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key: string, value: string) {
      store[key] = String(value);
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      store = {};
    },
  } satisfies Storage;
};

const memoryStorage = createStorage();

Object.defineProperty(globalThis, "localStorage", {
  value: memoryStorage,
  writable: true,
});

beforeEach(() => {
  memoryStorage.clear();
});

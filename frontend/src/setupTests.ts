import "@testing-library/jest-dom/vitest";

const createStorage = () => {
  let store: Record<string, string> = {};
  const getKeys = () => Object.keys(store);

  return {
    get length() {
      return getKeys().length;
    },
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key: string, value: string) {
      store[key] = String(value);
    },
    removeItem(key: string) {
      delete store[key];
    },
    key(index: number) {
      const keys = getKeys();
      return keys[index] ?? null;
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

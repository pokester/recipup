declare function describe(name: string, fn: () => void): void;
declare function it(name: string, fn: () => void | Promise<void>): void;
declare function expect(received: unknown): {
  toBe(expected: unknown): void;
  toBeDefined(): void;
};

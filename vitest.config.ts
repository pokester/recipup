// Vitest infrastructure is intended for this project, but registry access was
// unavailable during release prep. This placeholder keeps the conventional
// config path available until Vitest dependencies can be installed.
const vitestConfig = {
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
};

export default vitestConfig;

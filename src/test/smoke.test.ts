describe("smoke test", () => {
  it("runs", () => {
    expect(true).toBe(true);
  });

  it("environment is set correctly", () => {
    expect(process.env.NODE_ENV).toBeDefined();
  });
});

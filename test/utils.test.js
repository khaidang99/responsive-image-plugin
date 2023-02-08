import { getOutputAndPublicPath } from "../lib/utils";

describe("Utils package", () => {
  it("should create both paths respecting absolutes", () => {
    const { outputPath, publicPath } = getOutputAndPublicPath("file.png", {
      outputPath: "/dist/img/",
      publicPath: "/public",
    });
    expect(outputPath).toBe("/dist/img/file.png");
    expect(publicPath).toBe('"/public/file.png"');
  });

  it("should create both paths ", () => {
    const { outputPath, publicPath } = getOutputAndPublicPath("file.png", {
      outputPath: "dist/img/",
      publicPath: "public/",
    });
    expect(outputPath).toBe("dist/img/file.png");
    expect(publicPath).toBe('"public/file.png"');
  });

  it("https:// slashes are kept on public path", () => {
    const { outputPath, publicPath } = getOutputAndPublicPath("file.png", {
      outputPath: "dist/img/",
      publicPath: "https://example.com/public/",
    });
    expect(publicPath).toBe('"https://example.com/public/file.png"');
  });
});

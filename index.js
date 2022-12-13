const { resolve } = require("path");
const fs = require("fs");

function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

module.exports = class BundlesizeWebpackPlugin {
  constructor(options) {
    this.options = options || {
      sizeLimit: 3,
    };
  }
  apply(compiler) {
    compiler.hooks.done.tap("BundleSizePlugin", (stats) => {
      const { path, filename } = stats.compilation.options.output;
      const bundlePath = resolve(path, filename);
      const { size } = fs.statSync(bundlePath);
      const bundleSize = formatBytes(size);
      console.log(bundleSize);
      const { sizeLimit } = this.options;
      if (bundleSize < sizeLimit) {
        console.log("Safe:Bundle-Size", "\n SIZE LIMIT:", sizeLimit);
      } else {
        if (bundleSize === sizeLimit) {
          console.warn("Warn:Bundle-Size", "\n SIZE LIMIT:", sizeLimit);
        } else {
          console.error("Unsafe:Bundle-Size", "\n SIZE LIMIT:", sizeLimit);
        }
      }
    });
  }
};

const path = require("path");

const OptimizeImagePlugin = require("../index.js");

module.exports = {
  mode: "development",
  entry: path.resolve(__dirname, "index"),
  output: {
    path: path.resolve(__dirname, "build"),
    publicPath: "foobar/",
    filename: "test.js",
  },
  plugins: [
    new OptimizeImagePlugin({
      test: /\.(png|gif|ico|jpg|jpeg)$/,
      options: {
        sourcePath: path.resolve(__dirname, "public"),
        outputPath: "public/assets/optimize-images",
        sizes: [375, 768, 1280],
        quality: 80,
        overrideExtension: true,
      },
    }),
  ],
  target: "node",
};

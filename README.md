# responsive-image-plugin

A webpack plugin for responsive images.

## Installation

```bash
npm install responsive-image-plugin sharp --save-dev
```

## Usage

```js
var OptimizeImagePlugin = require("responsive-image-plugin");

module.exports = {
  // ...
  plugins: [
    new OptimizeImagePlugin({
      test: /\.(png|gif|ico|jpg|jpeg)$/,
      options: {
        sourcePath: "public",
        outputPath: "public/assets/optimize-images",
        sizes: [375, 768, 1280],
        quality: 80,
        overrideExtension: true,
      },
    }),
  ],
};
```

## License

[MIT](https://choosealicense.com/licenses/mit/)

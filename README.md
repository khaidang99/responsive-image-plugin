# responsive-image-plugin

A webpack plugin for responsive images.

## Installation

```bash
npm install responsive-image-plugin --save-dev
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
        sourcePath: path.resolve(__dirname, "public"),
        outputPath: path.resolve(__dirname, "optimize-images"),
        sizes: [375, 768, 1280],
        quality: 80,
        overrideExtension: true,
      },
    }),
  ],
};
```

## Options

| Option       | Type      | Default            | Description                                         |
| ------------ | --------- | ------------------ | --------------------------------------------------- |
| `sourcePath` | `string`  | `undefined`        | The directory containing the images to be generated |
| `outputPath` | `string`  | `undefined`        | The directory containing the images to be exported  |
| `sizes`      | `array`   | `[375, 768, 1280]` | The image sizes you want to generate                |
| `quality`    | `integer` | `80`               | The quality of the image                            |

## Examples

#### Before running webpack

     Project
      |_ src
      |_ public
      |   |_ image1.jpg
      |   |_ image2.jpg

#### After running webpack

     Project
      |_ src
      |_ public
      |   |_ image1.jpg
      |   |_ image2.jpg
      |_ optimize-images
      |   |_ image1-375x476.webp
      |   |_ image1-768x976.webp
      |   |_ image1-1220x1626.webp
      |   |_ image2-375x476.webp
      |   |_ image2-768x976.webp
      |   |_ image2-1220x1626.webp

## License

[MIT](https://choosealicense.com/licenses/mit/)

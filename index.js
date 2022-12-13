const path = require("path");
const sharp = require("sharp");

const CYAN = "\x1b[36m%s\x1b[0m";
const GREEN = "\x1b[32m%s\x1b[0m";
const RED = "\x1b[31m%s\x1b[0m";

class OptimizeImagePlugin {
  static defaultOptions = {
    sourcePath: "public/assets/images",
    outputPath: "public/assets/optimize-images-generated",
    sizes: [375, 768, 1280],
    quality: 90,
    overrideExtension: true,
  };

  // Any options should be passed in the constructor of your plugin,
  // (this is a public API of your plugin).
  constructor({ test = /\.(png|gif|ico|jpg|jpeg)$/, options = {} }) {
    // Applying user-specified options over the default options
    // and making merged options further available to the plugin methods.
    // You should probably validate all the options here as well.
    this.test = test;
    this.options = { ...OptimizeImagePlugin.defaultOptions, ...options };
  }

  apply(compiler) {
    const pluginName = OptimizeImagePlugin.name;

    // webpack module instance can be accessed from the compiler object,
    // this ensures that correct version of the module is used
    // (do not require/import the webpack or any symbols from it directly).
    const { webpack, intermediateFileSystem } = compiler;

    // Compilation object gives us reference to some useful constants.
    const { Compilation } = webpack;

    // RawSource is one of the "sources" classes that should be used
    // to represent asset sources in compilation.
    // const { RawSource } = webpack.sources;

    const context = (
      base = ".",
      scanSubDirectories = false,
      regularExpression = /\.js$/
    ) => {
      const files = {};

      function readDirectory(directory) {
        intermediateFileSystem.readdirSync(directory).forEach((file) => {
          const fullPath = path.resolve(directory, file);

          if (intermediateFileSystem.statSync(fullPath).isDirectory()) {
            if (scanSubDirectories) readDirectory(fullPath);

            return;
          }

          if (!regularExpression.test(fullPath)) return;

          files[fullPath] = {
            directory: directory,
            fileName: file,
          };
        });
      }

      readDirectory(base);
      function Module(file) {
        return files[file];
      }

      Module.keys = () => Object.keys(files);

      return Module;
    };

    function resize({ size, imagePath, options }) {
      return new Promise((resolve, reject) => {
        let image = sharp(imagePath);
        image.metadata().then((metadata) => {
          let width = Math.min(metadata.width, size);
          let height = Math.round((size / metadata.width) * metadata.height);
          let resized = image.clone().resize(width, height);
          resized = resized.webp({
            // lossless: true, // Nén hình không làm mất dữ liệu ban đầu
            quality: options.quality,
          });

          resized.toBuffer((err, data, { height }) => {
            if (err) {
              reject(err);
            } else {
              resolve({
                data,
                width,
                height,
              });
            }
          });
        });
      });
    }

    function writeFile(fs, filePath, data) {
      return new Promise((resolve, reject) => {
        fs.mkdir(path.dirname(filePath), { recursive: true }, (err) => {
          if (err) {
            reject(err);
            return;
          }

          fs.writeFile(filePath, data, (err) => {
            if (err) throw err;

            resolve(filePath);
          });
        });
      });
    }

    const onEmit = (compilation, callback) => {
      const contextImage = context(
        path.join(__dirname, this.options.sourcePath),
        true,
        this.test
      );
      const assetNames = contextImage.keys();

      console.log(CYAN, "OptimizeImagePlugin: Assets are being optimized....");

      Promise.all(
        assetNames.map((name) => {
          let inputFilePath = name;
          let outputFileName = contextImage(name).fileName;
          if (this.options.overrideExtension) {
            outputFileName = outputFileName.split(".").slice(0, -1).join(".");
          }

          const promises = [];
          const promisesOptimize = [];

          //optimize images
          this.options.sizes.forEach((size) => {
            promises.push(
              resize({
                size,
                imagePath: inputFilePath,
                options: {
                  quality: this.options.quality,
                },
              })
            );
          });

          try {
            Promise.all(promises).then((resizes) => {
              resizes.forEach((size) => {
                let fileName = path.join(
                  __dirname,
                  this.options.outputPath,
                  `${outputFileName}-${size.width}x${size.height}.webp`
                );
                promisesOptimize.push(
                  writeFile(intermediateFileSystem, fileName, size.data)
                );
              });

              Promise.all(promisesOptimize);
            });
          } catch (err) {
            console.error(
              RED,
              `OptimizeImagePlugin: Something wrong when write files image sizes! ${err}`
            );
            Promise.reject(-1);
          }

          return Promise.resolve(0);
        })
      ).then((result) => {
        console.log(
          GREEN,
          `OptimizeImagePlugin: Assets are finishing optimized!`
        );
        callback();
      });
    };

    compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
      compilation.hooks.processAssets.tapAsync(
        {
          name: pluginName,
          // Using one of the later asset processing stages to ensure
          // that all assets were already added to the compilation by other plugins.
          stage: Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE,
        },
        (assets, callback) => onEmit(compilation, callback)
      );
    });
  }
}

module.exports = OptimizeImagePlugin;

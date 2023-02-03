const path = require("path");
const sharp = require("sharp");

import { Metadata, OutputInfo } from "sharp";
import { Compiler, Compilation } from "webpack";
import { InnerCallback } from "tapable";

const CYAN = "\x1b[36m%s\x1b[0m";
const GREEN = "\x1b[32m%s\x1b[0m";
const RED = "\x1b[31m%s\x1b[0m";
type AA = Compiler["intermediateFileSystem"];

type OptionsPlugin = {
  sourcePath: string;
  outputPath: string;
  sizes: number[];
  quality: number;
  overrideExtension: boolean;
};

type ParamsResize = {
  size: number;
  imagePath: string;
  options?: OptionsPlugin;
};

class OptimizeImagePlugin {
  static defaultOptions: OptionsPlugin = {
    sourcePath: "public/assets/images",
    outputPath: "public/assets/optimize-images-generated",
    sizes: [375, 768, 1280],
    quality: 90,
    overrideExtension: true,
  };
  readonly test: RegExp;
  options: {
    sourcePath: string;
    outputPath: string;
    sizes: number[];
    quality: number;
    overrideExtension: boolean;
  };

  constructor({ test = /\.(png|gif|ico|jpg|jpeg)$/, options }) {
    this.test = test;
    this.options = { ...OptimizeImagePlugin.defaultOptions, ...options };
  }

  apply(compiler: Compiler) {
    const pluginName: string = OptimizeImagePlugin.name;

    const { webpack, intermediateFileSystem } = compiler;
    const { Compilation } = webpack;

    const context = (
      base: string = ".",
      scanSubDirectories: boolean = false,
      regularExpression: RegExp = /\.js$/
    ): {
      (file: string): any;
      keys(): string[];
    } => {
      const files = {};
      function readDirectory(directory: string) {
        const fileSystem: any = intermediateFileSystem;
        fileSystem.readdirSync(directory).forEach((file: string) => {
          const fullPath = path.resolve(directory, file);
          if (fileSystem.statSync(fullPath).isDirectory()) {
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
      function Module(file: string) {
        return files[file];
      }

      Module.keys = () => Object.keys(files);

      return Module;
    };

    async function resize({ size, imagePath, options }: ParamsResize) {
      return new Promise((resolve, reject) => {
        let image = sharp(imagePath);
        image.metadata().then((metadata: Metadata) => {
          let width = Math.min(metadata.width, size);
          let height = Math.round((size / metadata.width) * metadata.height);
          let resized = image.clone().resize(width, height);
          resized = resized.webp({
            // lossless: true, // Nén hình không làm mất dữ liệu ban đầu
            quality: options.quality,
          });

          resized.toBuffer(
            (err: Error, data: Buffer, { height }: OutputInfo) => {
              if (err) {
                reject(err);
              } else {
                resolve({
                  data,
                  width,
                  height,
                });
              }
            }
          );
        });
      });
    }

    function writeFile(fs: any, filePath: string, data: Buffer) {
      return new Promise((resolve, reject) => {
        fs.mkdir(path.dirname(filePath), { recursive: true }, (err: Error) => {
          if (err) {
            reject(err);
            return;
          }

          fs.writeFile(filePath, data, (err: Error) => {
            if (err) throw err;

            resolve(filePath);
          });
        });
      });
    }

    const onEmit = (callback: InnerCallback<Error, void>) => {
      const contextImage = context(this.options.sourcePath, true, this.test);
      const assetNames = contextImage.keys();

      console.log(CYAN, "OptimizeImagePlugin: Assets are being optimized....");

      Promise.all(
        assetNames.map((name) => {
          let inputFilePath = name;
          let outputFileName = contextImage(name).fileName;
          if (this.options.overrideExtension) {
            outputFileName = outputFileName.split(".").slice(0, -1).join(".");
          }

          const promises: any[] = [];
          const promisesOptimize = [];

          //optimize images
          this.options.sizes.forEach((size) => {
            promises.push(
              resize({
                size,
                imagePath: inputFilePath,
                options: {
                  ...this.options,
                },
              })
            );
          });

          try {
            Promise.all(promises).then((resizes) => {
              resizes.forEach((size) => {
                let fileName = path.join(
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

    compiler.hooks.thisCompilation.tap(
      pluginName,
      (compilation: Compilation) => {
        compilation.hooks.processAssets.tapAsync(
          {
            name: pluginName,
            // Using one of the later asset processing stages to ensure
            // that all assets were already added to the compilation by other plugins.
            stage: Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE,
          },
          (assets, callback) => onEmit(callback)
        );
      }
    );
  }
}

module.exports = OptimizeImagePlugin;

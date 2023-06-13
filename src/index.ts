const path = require("path");
import sharp from "sharp";
import fs from "fs";

import { Compiler, Compilation } from "webpack";
import { InnerCallback } from "tapable";

const CYAN = "\x1b[36m%s\x1b[0m";
const GREEN = "\x1b[32m%s\x1b[0m";
const RED = "\x1b[31m%s\x1b[0m";

interface ResizeResult {
  data: Buffer;
  width: number;
  height: number;
}

export type OptionsPlugin = {
  sourcePath: string;
  outputPath: string;
  sizes: number[];
  quality: number;
  overrideExtension: boolean;
};

export type ParamsResize = {
  size: number;
  imagePath: string;
  options?: OptionsPlugin;
};

export class OptimizeImagePlugin {
  static defaultOptions: OptionsPlugin = {
    sourcePath: undefined,
    outputPath: undefined,
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

    const { webpack } = compiler;
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
        fs.readdirSync(directory).forEach((file: string) => {
          const fullPath = path.resolve(directory, file);
          if (fs.statSync(fullPath).isDirectory()) {
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

    async function resize({
      size,
      imagePath,
      options,
    }: ParamsResize): Promise<ResizeResult> {
      return new Promise<ResizeResult>((resolve, reject) => {
        let image: sharp.Sharp = sharp(imagePath);
        image.metadata().then((metadata: sharp.Metadata) => {
          let width: number = Math.min(metadata.width, size);
          let height: number = Math.round(
            (size / metadata.width) * metadata.height
          );
          let resized: sharp.Sharp = image.clone().resize(width, height);
          resized = resized.webp({
            // lossless: true, // Nén hình không làm mất dữ liệu ban đầu
            quality: options.quality,
          });

          resized.toBuffer(
            (err: Error, data: Buffer, { height }: sharp.OutputInfo) => {
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

    function writeFile(filePath: string, data: Buffer): Promise<string> {
      return new Promise<string>((resolve, reject) => {
        fs.mkdir(
          path.dirname(filePath),
          { recursive: true },
          (err: Error | null) => {
            if (err) {
              reject(err);
              return;
            }

            fs.writeFile(filePath, data, (err: Error | null) => {
              if (err) throw err;

              resolve(filePath);
            });
          }
        );
      });
    }

    const onEmit = (callback: InnerCallback<Error, void>) => {
      if (!this.options.sourcePath || !this.options.outputPath) {
        console.log(CYAN, "sourcePath or outputPath undefine");
        return;
      }
      const contextImage: {
        (file: string): any;
        keys(): string[];
      } = context(this.options.sourcePath, true, this.test);

      const assetNames: string[] = contextImage.keys();

      console.log(CYAN, "OptimizeImagePlugin: Assets are being optimized....");

      assetNames.map((name: string) => {
        // thong bao thanh cong hay that bai
        let inputFilePath: string = name;
        let fileNameContext: string = contextImage(name).fileName;
        if (this.options.overrideExtension) {
          fileNameContext = fileNameContext.split(".").slice(0, -1).join("."); //image.img => image
        }

        const promises: Promise<ResizeResult>[] = [];

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
                `${fileNameContext}-${size.width}x${size.height}.webp`
              );
              writeFile(fileName, size.data);
            });
          });
        } catch (err) {
          console.error(
            RED,
            `OptimizeImagePlugin: Something wrong when write files image sizes! ${err}`
          );
          Promise.reject(-1);
        }
      });
    };

    compiler.hooks.compilation.tap(pluginName, (compilation: Compilation) => {
      compilation.hooks.processAssets.tapAsync(
        {
          name: pluginName,
          // Using one of the later asset processing stages to ensure
          // that all assets were already added to the compilation by other plugins.
          stage: Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE,
        },
        (assets, callback) => onEmit(callback)
      );
    });
  }
}

module.exports = OptimizeImagePlugin;

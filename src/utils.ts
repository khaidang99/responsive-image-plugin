import * as path from "path";

// return `"data:${mime};base64,${data.toString("base64")}"`

interface GetOutputAndPublicPath {
  (
    fileName: string,
    {
      outputPath,
      publicPath,
    }: {
      outputPath?: ((...args: Array<unknown>) => string) | string;
      publicPath?: ((...args: Array<unknown>) => string) | string;
    }
  ): {
    outputPath: string;
    publicPath: string;
  };
}
/**
 * **Responsive Loader Paths**
 *
 * Returns the output and public path
 *
 * @method getOutputAndPublicPath
 *
 * @param {string} fileName
 * @param {Config} outputPath
 * @param {Config} publicPath
 *
 * @return {Config} Paths Result
 */
const getOutputAndPublicPath: GetOutputAndPublicPath = (
  fileName: string,
  { outputPath: configOutputPath, publicPath: configPublicPath }
) => {
  let outputPath = fileName;
  if (configOutputPath) {
    if (typeof configOutputPath === "function") {
      outputPath = configOutputPath(fileName);
    } else {
      outputPath = path.posix.join(configOutputPath, fileName);
    }
  }
  let publicPath = `__webpack_public_path__ + ${JSON.stringify(outputPath)}`;

  if (configPublicPath) {
    if (typeof configPublicPath === "function") {
      publicPath = configPublicPath(fileName);
    } else {
      // publicPath can be a url or local path
      // check if it's a valid url
      if (isValidUrl(configPublicPath)) {
        const url = new URL(configPublicPath);
        url.pathname = path.posix.join(url.pathname, fileName);
        publicPath = url.toString();
      } else {
        publicPath = path.posix.join(configPublicPath, fileName);
      }
    }
    publicPath = JSON.stringify(publicPath);
  }

  return {
    outputPath,
    publicPath,
  };
};
const isValidUrl = (urlString: string) => {
  try {
    return Boolean(new URL(urlString));
  } catch (e) {
    return false;
  }
};

export { getOutputAndPublicPath };

const path = require("path");
const webpack = require("webpack");

/** @type {import('webpack').Configuration} */
module.exports = {
  entry: "./src/app.tsx",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    filename: "app.js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
  // Canva hosts a single bundle — force all code (including dynamic imports
  // from @canva/app-ui-kit) into one file.
  optimization: {
    splitChunks: false,
    runtimeChunk: false,
  },
  plugins: [
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1,
    }),
  ],
  devtool: false,
  performance: {
    hints: false,
  },
};

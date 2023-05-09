const path = require('path');

module.exports = {
  mode: 'development', // set to 'development' for a development build
  entry: './src/sdk.ts', // entry point of your TypeScript code
  output: {
    filename: 'bundle.js', // name of the output file
    path: path.resolve(__dirname, 'dist'), // path to the output directory
    libraryTarget: 'umd',
    clean: true,
    library: 'chatE2E'
  },
  module: {
    rules: [
      {
        test: /\.ts?$/, // match TypeScript files
        use: 'ts-loader', // use ts-loader to transpile TypeScript to JavaScript
        exclude: /node_modules/,
      },
      {
        test: /\.js$/,
        loader: "webpack-remove-debug", // remove "debug" package
      }
    ],
  },
  resolve: {
    extensions: ['.ts'], // allow import statements without file extensions
  },
  devtool: 'source-map', // generate source maps for better debugging experience
};

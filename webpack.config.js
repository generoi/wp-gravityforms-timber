const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: {
    'wp-gravityforms-timber': path.resolve('./js/wp-gravityforms-timber.js'),
  },
  output: {
    filename: '[name].js',
    path: path.resolve('./dist'),
  },
  devtool: '#source-map',
  externals: {
    jquery: 'jQuery',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [
          { loader: 'buble-loader', options: { objectAssign: 'Object.assign' } },
        ]
      }
    ]
  },
  plugins: [
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
      'window.jQuery': 'jquery',
    }),
    new webpack.LoaderOptionsPlugin({
      minimize: true,
      debug: process.argv.indexOf('--watch') === -1,
      stats: { colors: true },
    }),
  ]
};

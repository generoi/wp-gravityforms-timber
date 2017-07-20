const webpack = require('webpack');
const path = require('path');

module.exports = {
  entry: {
    'wp-gravityforms-timber': path.resolve('./js/main.js')
  },

  output: {
    filename: '[name].js',
    path: path.resolve('./dist')
  },

  devtool: '#cheap-source-map',

  externals: {
    jquery: 'jQuery',
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [
          { loader: 'buble-loader', options: { objectAssign: '.merge' } },
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
      debug: false,
      stats: { colors: true },
    }),
  ]
};

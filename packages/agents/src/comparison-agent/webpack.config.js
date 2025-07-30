/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */
const path = require('path');
const slsw = require('serverless-webpack');
const nodeExternals = require('webpack-node-externals');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: slsw.lib.webpack.isLocal ? 'development' : 'production',
  entry: slsw.lib.entries,
  target: 'node',
  
  // Generate sourcemaps for proper error messages
  devtool: slsw.lib.webpack.isLocal ? 'eval-source-map' : 'source-map',
  
  // Exclude node_modules except for packages that need bundling
  externals: [nodeExternals({
    allowlist: [
      // Include packages that don't work well with Lambda's Node.js runtime
      /^@codequal\/.*/,  // Include all internal packages
      'zod',             // Schema validation
    ]
  })],

  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,  // Skip type checking for faster builds
              experimentalWatchApi: true,
            }
          }
        ],
        exclude: /node_modules/,
      }
    ]
  },

  resolve: {
    extensions: ['.ts', '.js', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    }
  },

  output: {
    libraryTarget: 'commonjs2',
    path: path.join(__dirname, 'dist'),
    filename: '[name].js',
    sourceMapFilename: '[file].map'
  },

  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            dead_code: true,
            drop_console: slsw.lib.webpack.isLocal ? false : true,
            drop_debugger: true,
            keep_classnames: true,
            keep_fnames: true
          },
          mangle: {
            keep_classnames: true,
            keep_fnames: true
          },
          output: {
            comments: false
          }
        },
        extractComments: false
      })
    ]
  },

  // Performance hints
  performance: {
    hints: false  // Lambda has its own size limits
  },

  // Stats output
  stats: {
    colors: true,
    hash: false,
    version: false,
    timings: true,
    assets: true,
    chunks: false,
    modules: false,
    reasons: false,
    children: false,
    source: false,
    errors: true,
    errorDetails: true,
    warnings: true,
    publicPath: false
  }
};
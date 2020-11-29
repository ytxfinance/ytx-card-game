const path = require('path')
const nodeExternals = require('webpack-node-externals');

/*
    NOT IN USE
    can be used to transpile to TS
*/

module.exports = {
    mode: process.env.NODE_ENV,
    target: "node",
    externals: [nodeExternals()],
    devtool: process.env.NODE_ENV === 'production' ? '' : 'eval-source-map',
    entry: [
        '@babel/polyfill',
        path.join(__dirname,  'src', 'server.js')
    ],
    output: {
        path: path.join(__dirname, 'build'),
        filename: 'build.js'
    },
    resolve: {
        extensions: [
            // '.ts', 
            '.js'] // not sure why this requires .js to load node_modules
    },
    module: {
        rules: [ 
          {
            loader: 'babel-loader',
            test: /\.ts?$/,
            exclude: /node_modules/,
            query: {
                presets: [
                    // '@babel/preset-typescript', uncomment to use TS 
                    '@babel/preset-env']
            }
        }]
    }
}

const path = require('path')
const htmlPlugin = require('html-webpack-plugin')

console.log(path.resolve(__dirname, '../dist'))
module.exports = {
    mode: process.env.NODE_ENV,
    target: "web",
    devtool: process.env.NODE_ENV === 'production' ? '' : 'eval-source-map',
    entry: [
        '@babel/polyfill',
        path.join(__dirname,  'src', 'App.jsx')
    ],
    output: {
        path: path.resolve(__dirname, '../dist'),
        filename: 'build.js'
    },
    resolve: {
        extensions: ['.jsx', 'js', '.wasm', '.mjs', '.js', '.json'],
    },
    module: {
        rules: [ 
          {
            loader: 'babel-loader',
            test: /\.(js|jsx)?$/,
            exclude: /node_modules/,
            include: path.resolve(__dirname, 'src'),
            query: {
                presets: [
                    // '@babel/preset-typescript', uncomment to use TS 
                    '@babel/preset-env', '@babel/preset-react']
            }
        }, {
            test: /\.styl$/,
            exclude: /node_modules/,
            use: ['style-loader', {
                loader: 'css-loader',
                options: {
                    importLoaders: 2
                }
            }, 'stylus-loader'],
            include: /src/
        }]
    },
    plugins: [
        new htmlPlugin({
            title: "Decentralized card game",
            template: './src/index.ejs',
            hash: true
        })
    ]
}

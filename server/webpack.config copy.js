const path = require('path')
const htmlPlugin = require('html-webpack-plugin')
const nodeExternals = require('webpack-node-externals');

module.exports = {
    mode: process.env.NODE_ENV,
    target: "web",
    externals: [nodeExternals()],
    devtool: process.env.NODE_ENV === 'production' ? '' : 'eval-source-map',
    entry: [
        '@babel/polyfill',
        path.join(__dirname,  'src', 'App.tsx')
    ],
    output: {
        path: path.join(__dirname, 'dist'),
        filename: 'build.js'
    },
    resolve: {
        extensions: ['.ts', '.tsx', ".js"] // not sure why this requires .js to load node_modules
    },
    module: {
        rules: [ 
          {
            loader: 'babel-loader',
            test: /\.(ts|tsx)?$/,
            exclude: /node_modules/,
            query: {
                presets: ['@babel/preset-typescript', '@babel/preset-env', '@babel/preset-react']
            }
        }
        , 
        {
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

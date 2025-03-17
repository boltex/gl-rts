const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
    entry: './src/main.ts',
    output: {
        filename: 'bundle.[contenthash].js', // Add content hash for cache busting
        path: path.resolve(__dirname, 'docs'),
        clean: true, // Clean the dist folder before each build
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    {
                        loader: 'css-loader',
                        options: {
                            url: false, // Prevent css-loader from processing URLs
                        },
                    },
                ],
            },
            // Add loaders for images if necessary
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './public/index.html',
            // inject: 'body', // Ensure the CSS and JS are injected into the body
        }),
        new CopyWebpackPlugin({
            patterns: [
                { from: 'public/images', to: 'images' },
                { from: 'public/favicon.ico', to: '' },
            ],
        }),
        new MiniCssExtractPlugin({
            filename: 'style.[contenthash].css', // Add content hash for cache busting
        }),
    ],
    devServer: {
        static: './dist',
        watchFiles: ['public/**/*.css', 'public/**/*.html'], // Watch for changes in CSS and HTML files
        liveReload: true, // Enable live reload for full page reload on changes
    },
    mode: 'production', // or 'production' for production builds
};
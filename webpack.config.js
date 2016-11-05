var webpack = require("webpack");

module.exports = [
    {
        entry: {
            monster_importer: ["./build/monster_importer.js"],
        },
        output: {
            path: __dirname + "/lib",
            filename: "[name].js"
        },
        target: "node",
        plugins: [
            new webpack.DefinePlugin({
                global: {} //shim for lack of NodeJS global object
            })
        ]
    }
];
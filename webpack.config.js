var webpack = require("webpack");

module.exports = [
    {
        entry: {
            monster_importer: ["./build/monster_importer.js"],
            turn_timer: ["./build/turn_timer.js"],
            turn_tracker: ["./build/turn_tracker.js"],
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
import * as fs from "fs";
import { Configuration, DefinePlugin } from "webpack";

const root = "./src/";
const ignore = [
    "roll20ApiScript.js",
];
const entry: { [name: string]: string } = {};
const extensionLength = 3;
fs.readdirSync(root)
    .filter((f) => f.match(/.*\.js$/) && ignore.indexOf(f) === -1)
    .map((f) => ({
        name: f.substring(0, f.length - extensionLength),
        path: root + f,
    }))
    .reduce((obj, f) => {
        obj[f.name] = f.path;

        return obj;
    }, entry);

const config: Configuration = {
    entry,
    output: {
        filename: "[name].js",
        path: `${__dirname}/dist`,
    },
    plugins: [
        new DefinePlugin({
            global: {}, // Shim for lack of NodeJS global object
        }),
    ],
    target: "node",
};

module.exports = config;

const path = require("path");
const { DefinePlugin, EnvironmentPlugin } = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const WEB_ANALYTICS_TOKEN = process.env.CF_WEB_ANALYTICS_TOKEN ?? "";
if (WEB_ANALYTICS_TOKEN !== "" && !/^[0-9a-f]{32}$/.test(WEB_ANALYTICS_TOKEN)) {
  throw new Error("CF_WEB_ANALYTICS_TOKEN must be the 32 hex digit Web Analytics site token");
}

module.exports = {
  entry: "./src/index.ts",
  output: {
    filename: "assets/main.[contenthash].js",
    assetModuleFilename: "assets/[contenthash][ext]",
    path: path.resolve(__dirname, "dist"),
    publicPath: "",
    clean: true,
  },
  devtool: "source-map",
  performance: { hints: false },
  devServer: {
    contentBase: path.join(__dirname, "dist"),
    host: "127.0.0.1",
    port: 8002,
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    alias: {
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
    },
  },
  plugins: [
    new DefinePlugin({ "process.env.CF_WEB_ANALYTICS_TOKEN": JSON.stringify(WEB_ANALYTICS_TOKEN) }),
    new EnvironmentPlugin({ ARCHIVE_P3: "off", ARCHIVE_P2: "off", ARCHIVE_P1: "off" }),
    new HtmlWebpackPlugin({ template: "src/index.html", inject: "body", scriptLoading: "blocking" }),
    new CopyPlugin({
      patterns: [
        { from: "public/osrs-assets", to: "osrs-assets", noErrorOnMissing: true },
        { from: "public/fonts", to: "fonts" },
        { from: "_headers", to: "", context: "src/" },
        { from: "telemetry.json", to: "", context: "src/" },
        { from: "*.png", to: "", context: "node_modules/osrs-sdk/_bundles/", noErrorOnMissing: true },
        { from: "*.gif", to: "", context: "node_modules/osrs-sdk/_bundles/", noErrorOnMissing: true },
        { from: "*.ogg", to: "", context: "node_modules/osrs-sdk/_bundles/", noErrorOnMissing: true },
      ],
    }),
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: "ts-loader",
            options: { transpileOnly: true },
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|ogg|gltf|glb)$/i,
        type: "asset/resource",
      },
    ],
  },
};

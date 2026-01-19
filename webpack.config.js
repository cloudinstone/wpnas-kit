const defaultConfig = require("@wordpress/scripts/config/webpack.config");

module.exports = {
  ...defaultConfig,
  devServer: {
    ...defaultConfig.devServer,
    proxy: {
      "/": {
        target: "https://wpnas-play.local",
        secure: false, // 关键点：忽略证书验证错误
        changeOrigin: true, // 必须：修改请求头中的 Host 为目标域名
      },
    },
    // 如果浏览器依然报错，可以添加这个：
    allowedHosts: ["wpnas-play.local"],
  },
};

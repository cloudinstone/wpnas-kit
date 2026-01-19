# 解释构建产物过大的原因

## 原因分析
经过排查 `package.json`、`index.asset.php` 以及 `@wordpress/scripts` 的源码，发现构建后的 `index.js` 体积较大（约 1.8MB）的主要原因是 **`@wordpress/dataviews` 被打包进了代码中，而不是作为外部依赖（External）引用**。

具体证据如下：
1.  **构建产物分析**：在 `build/index.asset.php` 的依赖列表中，虽然有 `wp-components`, `wp-element` 等核心包，但**缺少** `wp-dataviews` 的 JS 句柄。这意味着 Webpack 没有将其排除，而是将其完整打包。
2.  **wp-scripts 默认行为**：查看 `@wordpress/dependency-extraction-webpack-plugin` 的源码，发现 `@wordpress/dataviews` 和 `@wordpress/dataviews/wp` 被明确列在 `BUNDLED_PACKAGES` 列表中。
    - 这是因为 `DataViews` 目前在 WordPress 核心中可能尚未作为稳定的全局变量（如 `wp.dataViews`）完全暴露，或者为了兼容性考虑，官方工具建议插件自带该库。
3.  **引用方式**：你在代码中使用了 `import { DataViews } from "@wordpress/dataviews/wp";`。官方文档指出，在插件中使用 `DataViews` 时必须这样引用，并且这会导致它被打包。

## 结论
这是一个**预期内的行为**。由于 `DataViews` 组件较新且包含较多依赖（如 `date-fns` 等），将其打包会导致产物体积显著增加。

## 建议
目前建议维持现状，以确保插件在不同 WordPress 环境下的兼容性和稳定性。虽然体积较大，但这是为了保证 `DataViews` 功能正常的必要代价。

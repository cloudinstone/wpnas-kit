# 使用 @wordpress/preferences 实现 Dataviews 偏好记忆

我们将通过接入 WordPress 的 `core/preferences` 系统来实现用户偏好的持久化存储。

## 1. 安装依赖
在 `package.json` 中添加并安装以下依赖：
- `@wordpress/data`
- `@wordpress/preferences`

## 2. 代码重构 (src/App.js)

### A. 引入依赖
引入 `useSelect`, `useDispatch` 以及 `store as preferencesStore`。

### B. 定义默认配置
提取当前的初始 `view` 状态为常量 `DEFAULT_VIEW_CONFIG`，以便复用。

### C. 实现偏好读取 (useSelect)
使用 `useSelect` 钩子从 `core/preferences` 获取数据：
- **Scope**: `wpnas-kit` (或者是 `wpnas-kit/dataviews`)
- **Key**: `dataview_configuration`
- **逻辑**: 如果 store 中有值，则与 `DEFAULT_VIEW_CONFIG` 合并；否则使用默认值。同时获取 `isResolving` 状态以处理加载。

### D. 实现偏好写入 (useDispatch)
在 `setView` 的逻辑中：
- 接收新的 view 状态。
- **过滤**: 排除 `page`, `search` 等临时状态。
- **保存**: 调用 `dispatch( preferencesStore ).set( 'wpnas-kit', 'dataview_configuration', persistedView )`。

### E. 初始化与渲染
- 添加一个初始化检查：如果偏好设置正在加载（Resolving），显示 `Spinner`。
- 将混合了偏好设置的 `view` 对象传递给 `DataViews`。

## 3. 验证
- 验证切换视图（Table/Grid）、修改每页数量、隐藏/显示列后，刷新页面是否能保持状态。

我将把当前的 `Notice` 组件升级为标准的 WordPress 通知系统，使用 `core/notices` 数据存储和 `SnackbarList` 组件。

### 核心变更
1.  **状态管理迁移**：从本地的 `useState` 迁移到 WordPress 原生的 `core/notices` store。这将使通知管理更加规范，支持自动消失和多条通知堆叠。
2.  **UI 组件替换**：移除 `<Notice>` 组件，并在页面底部添加 `<SnackbarList>` 组件。
3.  **交互逻辑更新**：将所有的 `setNotice` 调用替换为 `createNotice`，并指定通知类型为 `snackbar`。

### 具体步骤
1.  **修改 `src/App.js`**：
    *   导入 `SnackbarList` (from `@wordpress/components`) 和 `store as noticesStore` (from `@wordpress/notices`)。
    *   使用 `useDispatch` 获取 `createNotice` 和 `removeNotice` 方法。
    *   使用 `useSelect` 获取当前的 `notices` 列表。
    *   移除本地 `notice` 状态和相关的 `setNotice` 定义。
    *   重构所有使用 `setNotice` 的地方（如安装成功、失败等），改为调用 `createNotice`，例如：
        ```javascript
        createNotice('success', 'Plugin installed successfully!', {
            type: 'snackbar',
            explicitDismiss: true // 可选，视需求而定
        });
        ```
    *   在 JSX 渲染部分，删除旧的 `<Notice>` 代码块。
    *   在组件的最外层容器内底部添加 `<SnackbarList notices={notices} onRemove={removeNotice} />`。

### 依赖说明
*   虽然 `package.json` 中未显式列出 `@wordpress/notices`，但这是 WordPress 核心包。通过 `import` 引用后，`wp-scripts` 构建工具会自动将其添加到构建产物 (`index.asset.php`) 的依赖列表中，无需手动修改 `package.json`。

这个方案完全符合 Site Editor 和 Gutenberg 的现代实践。
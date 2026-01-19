# Fix Plugin Errors

## Analysis
1.  **CSS 404 Error**: The PHP code enqueues `build/index.css`, but the build process generated `build/style-index.css`. This is a mismatch in file naming conventions.
2.  **React Error #130**: The error `Element type is invalid... but got: undefined` suggests that `DataViews` is `undefined`. This happens because `@wordpress/scripts` treats `@wordpress/dataviews` as an **external dependency** (expecting a global `wp.dataviews` provided by WordPress Core), but the current WordPress environment does not provide it. We need to bundle this library into our plugin.

## Plan
1.  **Fix CSS Enqueue**: Update `wpnas-kit.php` to point to the correct CSS file (`build/style-index.css`).
2.  **Configure Webpack**: Create a `webpack.config.js` to override the default build configuration. We will configure it to **bundle** `@wordpress/dataviews` instead of treating it as external.
3.  **Import Styles**: Update `src/index.js` to explicitly import the CSS for `DataViews`.
4.  **Rebuild**: Install necessary build dependencies and run the build process again.

## Steps
1.  Edit `wpnas-kit.php`.
2.  Install `@wordpress/dependency-extraction-webpack-plugin`.
3.  Create `webpack.config.js`.
4.  Edit `src/index.js`.
5.  Run `npm run build`.

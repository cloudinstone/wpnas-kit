I will implement the preference persistence using `@wordpress/preferences`.

### Implementation Steps

1. **Install Dependencies**:

   * Run `npm install @wordpress/preferences @wordpress/data` to ensure types and references are available for development.

2. **Modify** **`src/App.js`**:

   * **Imports**: Import `useSelect`, `useDispatch` from `@wordpress/data` and the store from `@wordpress/preferences`.

   * **State Management**:

     * Keep the local `view` state for immediate UI responsiveness.

     * Use `useSelect` to retrieve the saved preference key (e.g., `wpnas-kit-dataview-config`).

     * Use `useEffect` to initialize the local `view` state from the saved preference when the component mounts (merging with defaults).

   * **Persistence**:

     * Update the `onChangeView` handler (or use a `useEffect` on `view` change) to dispatch the `set` action to the preferences store, saving the new configuration.

     * Ensure the persistence is debounced or efficient to avoid excessive writes if necessary (though for view changes it's usually fine).

3. **Verify**:

   * Check that changing the layout (e.g., to Grid), sorting, or changing items per page persists after a page reload.

### Technical Detail

* **Preference Key**: `wpnas-kit/dataview-configuration`

* **Scope**: We will use a scoped preference if possible, or a simple key-value pair in the generic store.

* **Fallbacks**: Ensure that if the preference is empty, the hardcoded defaults (`table` layout, 20 items/page) are used.


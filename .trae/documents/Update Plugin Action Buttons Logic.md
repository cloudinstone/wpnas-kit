I will implement the plugin action logic using the `semver` library and updated wording.

### 1. Dependencies
-   **Install `semver`**: I will run `npm install semver` to ensure the library is available for version comparison.

### 2. Logic Implementation
I will update `src/App.js` to import `semver` (specifically `lt` for "less than" checks) and implement the following logic in the "Actions" column:

1.  **Not Installed**:
    -   **Condition**: Plugin is not found locally.
    -   **Action**: **Install** button (`variant="secondary"`).
2.  **Update Available**:
    -   **Condition**: Plugin is installed AND `semver.lt(localVersion, remoteVersion)` is true.
    -   **Action**: **Update** button (`variant="primary"`).
3.  **Up to Date & Inactive**:
    -   **Condition**: Plugin is installed, version is latest, but status is `inactive`.
    -   **Action**: **Activate** button (`variant="secondary"`).
    -   **Note**: I will implement the `activatePlugin` function using the WP REST API (`POST /wp/v2/plugins/{id}`).
4.  **Up to Date & Active**:
    -   **Condition**: Plugin is installed, version is latest, and status is `active`.
    -   **Action**: **Up to Date** button (Disabled).
    -   **Reasoning**: "Up to Date" clearly communicates that the version is current, addressing your concern about "Installed" being ambiguous.

### 3. Code Changes
-   **`src/App.js`**:
    -   Import `lt` from `semver`.
    -   Update `useEffect` to capture `localVersion`.
    -   Add `activatePlugin` function.
    -   Update `actions` column render function with the new logic.

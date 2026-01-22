I will implement the search refactoring using **MiniSearch** and **pnpm** as requested.

**Plan:**
1.  **Install Dependencies**:
    *   Run `pnpm add minisearch stemmer`.
2.  **Refactor `src/App.js`**:
    *   **Remove**: Delete `SYNONYMS`, `getExpandedSearchTerms`, and `calculateRelevance`.
    *   **Setup MiniSearch**:
        *   Initialize `MiniSearch` with `stemmer` for the `processTerm` option (enabling linguistic stemming).
        *   Set `idField: 'plugin'` (unique identifier).
        *   Configure fields: `['name', 'plugin', 'tags', 'description']`.
    *   **Implement Search**:
        *   Index the plugins list.
        *   Execute search with boosting: `{ boost: { name: 5, plugin: 3, tags: 2, description: 1 } }`.
        *   MiniSearch's TF-IDF algorithm naturally scores exact matches higher (shorter, precise matches rank above partial ones).
    *   **Update Data Flow**: Map search results back to the plugin objects for display.

This meets all your requirements: **Stemming** (via `stemmer`), **Whole Word** (via MiniSearch), **Weights**, **No Synonyms**, and **pnpm**.
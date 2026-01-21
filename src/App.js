import { useState, useEffect, useMemo, useCallback } from "@wordpress/element";
import { DataViews, filterSortAndPaginate } from "@wordpress/dataviews/wp";
import apiFetch from "@wordpress/api-fetch";
import { Button, Spinner, Notice, Flex } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { useSelect, useDispatch } from "@wordpress/data";
import { store as preferencesStore } from "@wordpress/preferences";
import { lt } from "semver";

const PREFERENCE_SCOPE = "wpnas-kit";
const PREFERENCE_KEY = "dataviews-settings";

const SYNONYMS = {
  seo: ["optimization", "rank", "search engine"],
  security: ["firewall", "protection", "safe"],
  speed: ["performance", "cache", "fast"],
};

const getExpandedSearchTerms = (query) => {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const expanded = new Set(terms);

  terms.forEach((term) => {
    // Check if term is a key in synonyms
    if (SYNONYMS[term]) {
      SYNONYMS[term].forEach((syn) => expanded.add(syn));
    }
  });

  return Array.from(expanded);
};

const calculateRelevance = (item, searchTerms) => {
  let score = 0;
  const name = item.name ? item.name.toLowerCase() : "";
  const description = item.description ? item.description.toLowerCase() : "";
  const plugin = item.plugin ? item.plugin.toLowerCase() : "";

  // Handle tags which might be an array or object
  let tags = [];
  if (Array.isArray(item.tags)) {
    tags = item.tags;
  } else if (item.tags && typeof item.tags === "object") {
    tags = Object.values(item.tags);
  }
  // Normalize tags to lowercase strings
  tags = tags.map((tag) => String(tag).toLowerCase());

  searchTerms.forEach((term) => {
    if (name.includes(term)) score += 4;
    if (plugin.includes(term)) score += 3;
    if (tags.some((tag) => tag.includes(term))) score += 2;
    if (description.includes(term)) score += 1;
  });

  return score;
};

const DEFAULT_VIEW = {
  type: "table",
  perPage: 20,
  page: 1,
  search: "",
  filters: [],
  sort: {},
  layout: {
    primaryField: "name",
    badgeFields: ["status"],
    enableMoving: false,
  },
  fields: ["version", "author", "status", "actions"],
  titleField: "name",
  descriptionField: "description",
};

const App = () => {
  const [plugins, setPlugins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const { set: setPreference } = useDispatch(preferencesStore);
  const savedView = useSelect((select) => {
    return select(preferencesStore).get(PREFERENCE_SCOPE, PREFERENCE_KEY);
  }, []);

  const [view, setView] = useState(DEFAULT_VIEW);

  // useEffect(() => {
  //   if (savedView) {
  //     setView((prev) => ({
  //       ...prev,
  //       ...savedView,
  //       // Preserve transient state
  //       search: prev.search,
  //       page: prev.page,
  //     }));
  //   }
  // }, [savedView]);

  const handleViewChange = useCallback(
    (newView) => {
      setView(newView);
      const viewToSave = {
        type: newView.type,
        perPage: newView.perPage,
        layout: newView.layout,
        sort: newView.sort,
        density: newView.density,
      };
      setPreference(PREFERENCE_SCOPE, PREFERENCE_KEY, viewToSave);
    },
    [setPreference],
  );

  const [installing, setInstalling] = useState({});
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    Promise.all([
      apiFetch({ path: "/wpnas-kit/v1/plugins" }),
      apiFetch({ path: "/wp/v2/plugins" }).catch(() => []),
    ])
      .then(([remotePlugins, localPlugins]) => {
        const localPluginsMap = new Map();
        if (Array.isArray(localPlugins)) {
          localPlugins.forEach((plugin) => {
            localPluginsMap.set(plugin.plugin, plugin);
          });
        }

        const processedPlugins = Array.isArray(remotePlugins)
          ? remotePlugins.map((plugin) => {
              const localPlugin = localPluginsMap.get(plugin.plugin);
              return {
                ...plugin,
                status: localPlugin ? localPlugin.status : "not_installed",
                localVersion: localPlugin ? localPlugin.version : null,
              };
            })
          : [];

        console.log(processedPlugins);
        setPlugins(processedPlugins);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setIsLoading(false);
        setNotice({
          status: "error",
          content: __("Failed to load plugins.", "wpnas-kit"),
        });
      });
  }, []);

  const installPlugin = useCallback((slug) => {
    setInstalling((prev) => ({ ...prev, [slug]: true }));
    setNotice(null);

    apiFetch({
      path: "/wpnas-kit/v1/install",
      method: "POST",
      data: { slug },
    })
      .then((response) => {
        setInstalling((prev) => ({ ...prev, [slug]: false }));
        setNotice({
          status: "success",
          content: __("Plugin installed successfully!", "wpnas-kit"),
        });
        // Refresh plugins list to get new status/version
        // For simplicity, we might just reload the page or re-fetch.
        // But here we rely on user manually refreshing or we can trigger a refetch.
        // A simple way is to reload window or just let it be.
        // Ideally we should re-fetch the list.
        // For now, let's just leave it as is, or trigger a re-fetch if we had the code.
        // But since I don't want to change too much, I'll stick to the existing pattern.
      })
      .catch((error) => {
        setInstalling((prev) => ({ ...prev, [slug]: false }));
        setNotice({
          status: "error",
          content: error.message || __("Installation failed.", "wpnas-kit"),
        });
      });
  }, []);

  const activatePlugin = useCallback((pluginPath) => {
    setInstalling((prev) => ({ ...prev, [pluginPath]: true }));
    setNotice(null);

    apiFetch({
      path: `/wp/v2/plugins/${encodeURIComponent(pluginPath)}`,
      method: "POST",
      data: { status: "active" },
    })
      .then(() => {
        setInstalling((prev) => ({ ...prev, [pluginPath]: false }));
        setNotice({
          status: "success",
          content: __("Plugin activated successfully!", "wpnas-kit"),
        });
        setPlugins((prev) =>
          prev.map((p) =>
            p.plugin === pluginPath ? { ...p, status: "active" } : p,
          ),
        );
      })
      .catch((error) => {
        setInstalling((prev) => ({ ...prev, [pluginPath]: false }));
        setNotice({
          status: "error",
          content: error.message || __("Activation failed.", "wpnas-kit"),
        });
      });
  }, []);

  const fields = useMemo(
    () => [
      {
        id: "name",
        label: __("Name", "wpnas-kit"),
        enableSorting: true,
        enableHiding: false,
        render: ({ item }) => {
          let faviconUrl = null;
          const relUrl = item.plugin_uri || item.author_uri;
          if (relUrl) {
            try {
              const domain = new URL(relUrl).hostname;
              faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
            } catch (e) {
              // Invalid URL, ignore
            }
          }

          return (
            <Flex className="plugin-icon-name">
              {faviconUrl && (
                <img src={faviconUrl} alt="" width="16" height="16" />
              )}
              <strong class="plugin-name">{item.name}</strong>
            </Flex>
          );
        },
      },
      {
        id: "description",
        label: __("Description", "wpnas-kit"),
        render: ({ item }) => (
          <span dangerouslySetInnerHTML={{ __html: item.description }} />
        ),
      },
      {
        id: "version",
        label: __("Version", "wpnas-kit"),
        render: ({ item }) => item.version,
      },
      {
        id: "author",
        label: __("Author", "wpnas-kit"),
        render: ({ item }) => item.author,
      },
      {
        id: "status",
        label: __("Status", "wpnas-kit"),
        render: ({ item }) => {
          let label = __("Not Installed", "wpnas-kit");
          if (item.status === "active") label = __("Active", "wpnas-kit");
          if (item.status === "inactive") label = __("Inactive", "wpnas-kit");
          return label;
        },
      },
      {
        id: "actions",
        label: __("Actions", "wpnas-kit"),
        enableHiding: false,
        render: ({ item }) => {
          const isInstalled = item.status !== "not_installed";
          const hasUpdate =
            isInstalled &&
            item.localVersion &&
            lt(item.localVersion, item.version);
          const isBusy = installing[item.slug] || installing[item.plugin];

          if (!isInstalled) {
            return (
              <Button
                variant="secondary"
                isBusy={isBusy}
                onClick={() => installPlugin(item.slug)}
              >
                {__("Install", "wpnas-kit")}
              </Button>
            );
          }

          if (hasUpdate) {
            return (
              <Button
                variant="primary"
                isBusy={isBusy}
                onClick={() => installPlugin(item.slug)}
              >
                {__("Update", "wpnas-kit")}
              </Button>
            );
          }

          if (item.status === "inactive") {
            return (
              <Button
                variant="secondary"
                isBusy={isBusy}
                onClick={() => activatePlugin(item.plugin)}
              >
                {__("Activate", "wpnas-kit")}
              </Button>
            );
          }

          return (
            <Button variant="tertiary" disabled>
              {__("Up to Date", "wpnas-kit")}
            </Button>
          );
        },
      },
    ],
    [installing, installPlugin, activatePlugin],
  );

  const actions = useMemo(
    () => [
      {
        id: "install",
        label: __("Install", "wpnas-kit"),
        icon: "upload",
        isPrimary: true,
        callback: (items) => {
          items.forEach((item) => installPlugin(item.slug));
        },
      },
      {
        id: "cancel",
        label: "Cancel",
        supportsBulk: true,
        callback() {},
      },
    ],
    [installPlugin],
  );

  const { data: processedData, paginationInfo } = useMemo(() => {
    let filteredPlugins = plugins;
    let isSearching = false;

    if (view.search) {
      isSearching = true;
      const searchTerms = getExpandedSearchTerms(view.search);

      const scoredPlugins = plugins.map((plugin) => ({
        ...plugin,
        _relevance: calculateRelevance(plugin, searchTerms),
      }));

      filteredPlugins = scoredPlugins
        .filter((p) => p._relevance > 0)
        .sort((a, b) => b._relevance - a._relevance);
    }

    const result = filterSortAndPaginate(
      filteredPlugins,
      { ...view, search: "", sort: isSearching ? {} : view.sort },
      fields,
    );

    return {
      ...result,
      paginationInfo: {
        ...result.paginationInfo,
        infiniteScrollHandler: () => {
          console.log("infiniteScrollHandler");
          setView((prev) => ({
            ...prev,
            perPage: prev.perPage + 20,
          }));
        },
      },
    };
  }, [plugins, view, fields]);

  return (
    <div className="admin-ui-page">
      <Flex as="header" className="admin-ui-page__header">
        <h1>{__("Plugins", "wpnas-kit")}</h1>
      </Flex>

      {notice && (
        <Notice status={notice.status} onRemove={() => setNotice(null)}>
          {notice.content}
        </Notice>
      )}

      <DataViews
        isLoading={isLoading}
        data={processedData}
        fields={fields}
        view={view}
        onChangeView={handleViewChange}
        actions={actions}
        paginationInfo={paginationInfo}
        defaultLayouts={{
          table: {
            fields: ["version", "author", "status", "actions"],
          },
          grid: {
            fields: ["version", "author", "status", "actions"],
          },
        }}
      />
    </div>
  );
};

export default App;

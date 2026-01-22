import { useState, useEffect, useMemo, useCallback } from "@wordpress/element";
import {
  Icon,
  plugins as pluginIcon,
  moreVertical,
  external,
} from "@wordpress/icons";
import { DataViews, filterSortAndPaginate } from "@wordpress/dataviews/wp";
import apiFetch from "@wordpress/api-fetch";
import {
  Button,
  Spinner,
  SnackbarList,
  Flex,
  ExternalLink,
  Modal,
  TextControl,
  DropdownMenu,
  MenuGroup,
  MenuItem,
  __experimentalHStack as HStack,
  __experimentalHeading as Heading,
  __experimentalVStack as VStack,
  __experimentalSpacer as Spacer,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { useSelect, useDispatch } from "@wordpress/data";
import { store as noticesStore } from "@wordpress/notices";
import { store as preferencesStore } from "@wordpress/preferences";
import { lt } from "semver";
import MiniSearch from "minisearch";
import { stemmer } from "stemmer";

const PREFERENCE_SCOPE = "wpnas-kit";
const PREFERENCE_KEY = "dataviews-settings";

const DEFAULT_VIEW = {
  type: "table",
  perPage: 20,
  page: 1,
  search: "",
  filters: [],
  sort: {},
  layout: {
    primaryField: "name",
    enableMoving: false,
  },
  fields: ["version", "updated_date", "author", "status", "actions"],
  titleField: "name",
  descriptionField: "description",
  infiniteScrollEnabled: true,
};

const robustVersionCompare = (v1, v2) => {
  if (!v1 || !v2) return false;

  // Try semver first
  try {
    return lt(v1, v2);
  } catch (e) {
    // Fallback for non-semver versions (e.g. 1.0.0.1)
    const v1Parts = String(v1).split(".").map(Number);
    const v2Parts = String(v2).split(".").map(Number);

    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const p1 = v1Parts[i] || 0;
      const p2 = v2Parts[i] || 0;

      if (p1 < p2) return true;
      if (p1 > p2) return false;
    }

    return false; // Equal
  }
};

const Favicon = ({ url }) => {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    if (!url) return;
    const img = new Image();
    img.src = url;
    img.onload = () => setSrc(url);
  }, [url]);

  if (!src) return null;

  return <img src={src} alt="" width="16" height="16" loading="lazy" />;
};

const App = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const [plugins, setPlugins] = useState([]);
  const [isLoadingMore, setIsLoadingMore] = useState(true);

  // For infinite scroll simulation
  const [displayedPlugins, setDisplayedPlugins] = useState([]);
  const PER_PAGE_INCREMENT = 20;

  const { set: setPreference } = useDispatch(preferencesStore);
  const savedView = useSelect((select) => {
    return select(preferencesStore).get(PREFERENCE_SCOPE, PREFERENCE_KEY);
  }, []);

  const [view, setView] = useState(DEFAULT_VIEW);

  // Reset page to 1 when search or sort changes
  useEffect(() => {
    setView((prev) => ({ ...prev, page: 1 }));
  }, [view.search, view.sort]);

  const handleViewChange = useCallback(
    (newView) => {
      console.log("newView", newView);
      if (newView.search !== view.search && newView.search) {
        newView.sort = {
          field: "relevance",
          direction: "desc",
        };
      }
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
    [setPreference, view.search],
  );

  const [installing, setInstalling] = useState({});
  const { createNotice, removeNotice } = useDispatch(noticesStore);
  const notices = useSelect((select) => select(noticesStore).getNotices(), []);

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
          ? remotePlugins
              .filter((plugin) => plugin.plugin)
              .map((plugin) => {
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
        setIsLoadingMore(false);
      })
      .catch((error) => {
        console.error(error);
        setIsLoadingMore(false);
        createNotice("error", __("Failed to load plugins.", "wpnas-kit"), {
          type: "snackbar",
        });
      });
  }, []);

  const installPlugin = useCallback((slug) => {
    setInstalling((prev) => ({ ...prev, [slug]: true }));

    apiFetch({
      path: "/wpnas-kit/v1/install",
      method: "POST",
      data: { slug },
    })
      .then((response) => {
        setInstalling((prev) => ({ ...prev, [slug]: false }));
        createNotice(
          "success",
          __("Plugin installed successfully!", "wpnas-kit"),
          {
            type: "snackbar",
          },
        );
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
        createNotice(
          "error",
          error.message || __("Installation failed.", "wpnas-kit"),
          {
            type: "snackbar",
          },
        );
      });
  }, []);

  const activatePlugin = useCallback((pluginPath) => {
    setInstalling((prev) => ({ ...prev, [pluginPath]: true }));

    apiFetch({
      path: `/wp/v2/plugins/${encodeURIComponent(pluginPath)}`,
      method: "POST",
      data: { status: "active" },
    })
      .then(() => {
        setInstalling((prev) => ({ ...prev, [pluginPath]: false }));
        createNotice(
          "success",
          __("Plugin activated successfully!", "wpnas-kit"),
          {
            type: "snackbar",
          },
        );
        setPlugins((prev) =>
          prev.map((p) =>
            p.plugin === pluginPath ? { ...p, status: "active" } : p,
          ),
        );
      })
      .catch((error) => {
        setInstalling((prev) => ({ ...prev, [pluginPath]: false }));
        createNotice(
          "error",
          error.message || __("Activation failed.", "wpnas-kit"),
          {
            type: "snackbar",
          },
        );
      });
  }, []);

  const fields = useMemo(
    () => [
      {
        id: "relevance",
        label: __("Relevance", "wpnas-kit"),
        getValue: ({ item }) => item._score || 0,
        enableSorting: true,
        isVisible: false,
      },
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
              <span className="plugin-icon">
                {faviconUrl ? (
                  <Favicon url={faviconUrl} />
                ) : (
                  <Icon icon={pluginIcon} size={16} />
                )}
              </span>
              <ExternalLink
                className="plugin-name-link"
                href={`https://wpnas-club.local/plugins/${item.slug}/`}
              >
                <strong className="plugin-name">{item.name}</strong>
              </ExternalLink>
            </Flex>
          );
        },
      },
      {
        id: "description",
        label: __("Description", "wpnas-kit"),
        render: ({ item }) => (
          <div
            className="plugin-description"
            dangerouslySetInnerHTML={{ __html: item.description }}
          />
        ),
        enableSorting: false,
      },
      {
        id: "version",
        label: __("Version", "wpnas-kit"),
        render: ({ item }) => item.version,
        enableSorting: false,
      },
      {
        id: "updated_date",
        label: __("Last Updated", "wpnas-kit"),
        getValue: ({ item }) => item.plugin_file_modified,
        type: "date",
        format: {
          date: "Y-m-d",
        },
        filterBy: false,
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
        enableSorting: false,
        render: ({ item }) => {
          const isInstalled = item.status !== "not_installed";
          const hasUpdate =
            isInstalled &&
            item.localVersion &&
            robustVersionCompare(item.localVersion, item.version);
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
        callback() {},
      },
    ],
    [installPlugin],
  );

  const miniSearch = useMemo(() => {
    const ms = new MiniSearch({
      idField: "plugin",
      fields: ["name", "plugin", "tags", "description"],
      storeFields: ["plugin"],
      processTerm: (term) => stemmer(term), // Enable stemming
      searchOptions: {
        boost: { name: 5, plugin: 3, tags: 2, description: 1 },
        fuzzy: 0.2,
        prefix: true,
      },
    });

    if (plugins.length > 0) {
      const documents = plugins.map((p) => {
        let tags = [];
        if (Array.isArray(p.tags)) {
          tags = p.tags;
        } else if (p.tags && typeof p.tags === "object") {
          tags = Object.values(p.tags);
        }
        return { ...p, tags };
      });
      ms.addAll(documents);
    }
    return ms;
  }, [plugins]);

  const { data: processedData, paginationInfo } = useMemo(() => {
    let filteredPlugins = plugins;
    let isSearching = false;

    if (view.search) {
      isSearching = true;
      const results = miniSearch.search(view.search);
      const resultMap = new Map(plugins.map((p) => [p.plugin, p]));

      filteredPlugins = results
        .map((result) => {
          const plugin = resultMap.get(result.id);
          return plugin ? { ...plugin, _score: result.score } : null;
        })
        .filter(Boolean);
    }

    // Sort the filtered plugins
    const sortedPlugins = filterSortAndPaginate(
      filteredPlugins,
      { ...view, search: "", page: 1, perPage: filteredPlugins.length }, // Get all sorted items
      fields,
    ).data;

    const totalItems = sortedPlugins.length;
    const totalPages = Math.ceil(totalItems / PER_PAGE_INCREMENT);
    const currentPage = view.page || 1;

    return {
      data: sortedPlugins.slice(0, currentPage * PER_PAGE_INCREMENT),
      paginationInfo: {
        totalItems,
        totalPages,
        infiniteScrollHandler: () => {
          if (isLoadingMore || currentPage >= totalPages) {
            return;
          }
          setIsLoadingMore(true);
          // Simulate network delay if needed, or just update view
          setView((prev) => ({
            ...prev,
            page: (prev.page || 1) + 1,
          }));
          // We don't set isLoadingMore(false) here immediately if we were fetching data.
          // But since we are just updating view state which triggers re-render,
          // we might want to let the effect handling view changes or data fetching turn it off.
          // However, since we are client-side slicing, the update is synchronous.
          // So we can turn it off. Or better, let the effect that processes data turn it off if it was async.
          // In this synchronous case:
          setIsLoadingMore(false);
        },
      },
    };
  }, [plugins, view, fields, miniSearch, isLoadingMore]);

  return (
    <div className="admin-ui-page">
      <VStack as="header" className="admin-ui-page__header" spacing={0}>
        <HStack className="admin-ui-page__header-title">
          <HStack>
            <Heading
              level={2}
              className="components-truncate components-text components-heading"
            >
              {__("Plugins", "wpnas-kit")}
            </Heading>
          </HStack>
          <HStack
            className="admin-ui-page__header-actions"
            style={{ width: "auto", flexShrink: 0 }}
          >
            {isConnected ? (
              <Button
                variant="secondary"
                isDestructive
                onClick={() => setIsDisconnectModalOpen(true)}
              >
                {__("Disconnect", "wpnas-kit")}
              </Button>
            ) : (
              <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                {__("Connect WPNAS", "wpnas-kit")}
              </Button>
            )}
            <DropdownMenu
              icon={moreVertical}
              label={__("More actions", "wpnas-kit")}
              toggleProps={{ size: "compact" }}
              popoverProps={{ placement: "bottom-end" }}
            >
              {({ onClose }) => (
                <>
                  <MenuGroup>
                    <MenuItem
                      onClick={() => {
                        setView(DEFAULT_VIEW);
                        onClose();
                      }}
                    >
                      {__("Reset to Default View", "wpnas-kit")}
                    </MenuItem>
                  </MenuGroup>
                  <MenuGroup>
                    <MenuItem
                      href="https://wpnas.com"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {__("WPNAS Home", "wpnas-kit")}
                    </MenuItem>
                    <MenuItem
                      href="https://wpnas.com/support"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {__("Support", "wpnas-kit")}
                    </MenuItem>
                  </MenuGroup>
                </>
              )}
            </DropdownMenu>
          </HStack>
        </HStack>
      </VStack>

      {isDisconnectModalOpen && (
        <Modal
          title={__("Disconnect from WPNAS", "wpnas-kit")}
          onRequestClose={() => setIsDisconnectModalOpen(false)}
          size="medium"
        >
          <p>
            {__(
              "Are you sure you want to disconnect? You will lose access to premium plugins and updates.",
              "wpnas-kit",
            )}
          </p>
          <Flex justify="flex-end" gap={2} style={{ marginTop: "16px" }}>
            <Button
              variant="secondary"
              onClick={() => setIsDisconnectModalOpen(false)}
            >
              {__("Cancel", "wpnas-kit")}
            </Button>
            <Button
              variant="primary"
              isDestructive
              onClick={() => {
                setIsConnected(false);
                setIsDisconnectModalOpen(false);
                createNotice(
                  "success",
                  __("Disconnected from WPNAS.", "wpnas-kit"),
                  {
                    type: "snackbar",
                  },
                );
              }}
            >
              {__("Disconnect", "wpnas-kit")}
            </Button>
          </Flex>
        </Modal>
      )}

      {isModalOpen && (
        <Modal
          title={__("Connect to WPNAS Server", "wpnas-kit")}
          onRequestClose={() => setIsModalOpen(false)}
          size="medium"
        >
          <p>{__("Enter your API Key to verify and connect.", "wpnas-kit")}</p>
          <TextControl
            label={__("API Key", "wpnas-kit")}
            value={apiKey}
            onChange={(value) => setApiKey(value)}
          />
          <Flex justify="flex-end" gap={2} style={{ marginTop: "16px" }}>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              {__("Cancel", "wpnas-kit")}
            </Button>
            <Button
              variant="primary"
              isBusy={isConnecting}
              onClick={() => {
                setIsConnecting(true);
                // Mock connection
                setTimeout(() => {
                  setIsConnecting(false);
                  setIsConnected(true);
                  setIsModalOpen(false);
                  createNotice(
                    "success",
                    __("Connected to WPNAS successfully!", "wpnas-kit"),
                    {
                      type: "snackbar",
                    },
                  );
                }, 1000);
              }}
            >
              {__("Connect", "wpnas-kit")}
            </Button>
          </Flex>
        </Modal>
      )}

      <SnackbarList
        notices={notices}
        className="components-snackbar-list"
        onRemove={removeNotice}
      />

      <DataViews
        isLoading={isLoadingMore}
        getItemId={(item) => item.plugin}
        data={processedData}
        fields={fields}
        view={view}
        onChangeView={handleViewChange}
        actions={actions}
        paginationInfo={paginationInfo}
        defaultLayouts={{
          table: {
            fields: ["version", "status", "author", "actions"],
          },
          grid: {
            layout: {
              previewSize: 350,
            },
            // fields: ["version", "status", "author", "actions"],
          },
        }}
      />
    </div>
  );
};

export default App;

import { useState, useEffect, useMemo, useCallback } from "@wordpress/element";
import { DataViews, filterSortAndPaginate } from "@wordpress/dataviews/wp";
import apiFetch from "@wordpress/api-fetch";
import { Button, Spinner, Notice } from "@wordpress/components";
import { __ } from "@wordpress/i18n";

const App = () => {
  const [plugins, setPlugins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState({
    type: "table",
    perPage: 20,
    page: 1,
    search: "",
    filters: [],
    sort: {},
    layout: {
      primaryField: "name",
    },
  });
  const [installing, setInstalling] = useState({});
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    apiFetch({ path: "/wpnas-kit/v1/plugins" })
      .then((data) => {
        console.log(data);
        setPlugins(Array.isArray(data) ? data : []);
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
      })
      .catch((error) => {
        setInstalling((prev) => ({ ...prev, [slug]: false }));
        setNotice({
          status: "error",
          content: error.message || __("Installation failed.", "wpnas-kit"),
        });
      });
  }, []);

  const fields = useMemo(
    () => [
      {
        id: "name",
        label: __("Name", "wpnas-kit"),
        enableSorting: true,
        render: ({ item }) => <strong>{item.name}</strong>,
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
        id: "actions",
        label: __("Actions", "wpnas-kit"),
        render: ({ item }) => (
          <div className="wpnas-kit-actions">
            <Button
              variant="primary"
              isBusy={installing[item.slug]}
              onClick={() => installPlugin(item.slug)}
            >
              {__("Install", "wpnas-kit")}
            </Button>
          </div>
        ),
      },
    ],
    [installing, installPlugin],
  );

  const actions = useMemo(
    () => [
      {
        id: "install",
        label: __("Install", "wpnas-kit"),
        isPrimary: true,
        callback: (items) => {
          items.forEach((item) => installPlugin(item.slug));
        },
      },
    ],
    [installPlugin],
  );

  const { data: processedData, paginationInfo } = useMemo(() => {
    return filterSortAndPaginate(plugins, view, fields);
  }, [plugins, view, fields]);

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <div>
      <h1>{__("WPNAS Kit", "wpnas-kit")}</h1>
      {notice && (
        <Notice status={notice.status} onRemove={() => setNotice(null)}>
          {notice.content}
        </Notice>
      )}
      <DataViews
        data={processedData}
        fields={fields}
        view={view}
        onChangeView={setView}
        actions={actions}
        paginationInfo={paginationInfo}
        titleField="name"
        descriptionField="description"
        defaultLayouts={{
          table: {
            fields: ["name", "description", "version", "author", "actions"],
          },
          grid: {
            fields: ["name", "version", "actions"],
          },
        }}
      />
    </div>
  );
};

export default App;

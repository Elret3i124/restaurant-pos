import {Layout} from "@/screens/partials/layout.tsx";
import {useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {useSecurity} from "@/hooks/useSecurity.ts";
import {DocumentTitle} from "@/components/common/document-title.tsx";
import {
  InventoryMovementHistory,
  SimpleCurrentStock,
  StockMovementForm,
} from "@/components/inventory/simple.inventory.tsx";

/** Stable permission codes stored in user roles — not translated labels. */
const INVENTORY_TAB_MODULES: Record<string, string> = {
  stock: "inventory.current_inventory",
  in: "inventory.purchases",
  out: "inventory.issues",
  history: "inventory.current_inventory",
};

export const Inventory = () => {
  const {t: tNav} = useTranslation("navigation");
  const [selected, setSelected] = useState("stock");
  const [refreshKey, setRefreshKey] = useState(0);
  const {protectAction} = useSecurity();

  const pages = useMemo(() => ([
    {
      id: "stock",
      title: "Current Stock",
      description: "What you have now",
      component: <SimpleCurrentStock refreshKey={refreshKey}/>,
    },
    {
      id: "in",
      title: "Stock In",
      description: "Add received items",
      component: (
        <StockMovementForm
          direction="in"
          onRecorded={() => {
            setRefreshKey(current => current + 1);
            setSelected("history");
          }}
        />
      ),
    },
    {
      id: "out",
      title: "Stock Out",
      description: "Record used items",
      component: (
        <StockMovementForm
          direction="out"
          onRecorded={() => {
            setRefreshKey(current => current + 1);
            setSelected("history");
          }}
        />
      ),
    },
    {
      id: "history",
      title: "History",
      description: "Every stock movement",
      component: (
        <InventoryMovementHistory
          refreshKey={refreshKey}
          onReset={() => setRefreshKey(current => current + 1)}
        />
      ),
    },
  ]), [refreshKey]);

  const activePage = pages.find(page => page.id === selected) ?? pages[0];

  const selectPage = (key: string) => {
    protectAction(() => {
      setSelected(key);
    }, {
      module: INVENTORY_TAB_MODULES[key],
      description: `Access ${pages.find(page => page.id === key)?.title || "inventory"}`,
    });
  };

  return (
    <Layout
      containerClassName=""
    >
      <DocumentTitle parts={[activePage.title, tNav("sidebar.inventory")]} />
      <div data-testid="inventory-page">
        <nav
          className="mb-4 grid grid-cols-2 gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 shadow-sm lg:grid-cols-4"
          aria-label="Inventory"
          data-testid="inventory-tabs"
        >
          {pages.map(page => {
            const isActive = page.id === activePage.id;
            return (
              <button
                type="button"
                key={page.id}
                aria-pressed={isActive}
                data-testid={`inventory-tab-${page.id}`}
                onClick={() => selectPage(page.id)}
                className={`min-h-[78px] touch-manipulation rounded-xl border-2 px-4 py-3 text-left outline-none transition focus-visible:ring-4 focus-visible:ring-red-200 ${
                  isActive
                    ? "border-transparent bg-gradient text-white shadow-md"
                    : "border-neutral-200 bg-white text-neutral-900 hover:border-neutral-300 active:scale-[0.98]"
                }`}
            >
                <span className="block text-lg font-bold">{page.title}</span>
                <span className={`mt-1 block text-sm ${isActive ? "text-white/80" : "text-neutral-500"}`}>
                  {page.description}
                </span>
              </button>
            );
          })}
        </nav>

        <main data-testid={`inventory-panel-${activePage.id}`}>
          {activePage.component}
        </main>
      </div>
    </Layout>
  )
}

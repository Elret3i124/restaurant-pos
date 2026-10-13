import {useEffect, useMemo, useRef, useState} from "react";
import {useAtom} from "jotai";
import {toast} from "sonner";
import {useDB} from "@/api/db/db.ts";
import {Tables} from "@/api/db/tables.ts";
import {appPage} from "@/store/jotai.ts";
import {formatDateTime, toAppBusinessDate, type DateInput} from "@/lib/datetime.ts";
import {
  computeStockFromLedger,
  fetchLedgerMovements,
  fetchLedgerNetsByStore,
  writeLedgerEntries,
} from "@/lib/inventory/ledger.service.ts";
import {recordIdToString} from "@/api/reports/shared/records.ts";
import {formatNumber} from "@/lib/utils.ts";
import {useSecurity} from "@/hooks/useSecurity.ts";

type ReferenceItem = {
  id: string;
  name: string;
  code?: string;
  uom?: string;
};

type ReferenceLocation = {
  id: string;
  name: string;
};

type StockRow = {
  key: string;
  item: string;
  code?: string;
  unit?: string;
  location: string;
  quantity: number;
};

type HistoryRow = {
  id: string;
  date: DateInput;
  businessDate: string;
  item: string;
  code?: string;
  unit?: string;
  location: string;
  quantity: number;
  notes?: string;
};

type Direction = "in" | "out";

const normalizeId = (value: unknown): string => {
  const id = recordIdToString(value) || String(value ?? "");
  const parts = id.split(":");
  return parts.length > 1 ? parts[parts.length - 1] : id;
};

const addRecordAliases = <T extends {id: string}>(map: Map<string, T>, record: T) => {
  const fullId = recordIdToString(record.id) || String(record.id);
  map.set(fullId, record);
  map.set(normalizeId(fullId), record);
};

const loadReferences = async (db: ReturnType<typeof useDB>) => {
  const [itemsResult, locationsResult] = await Promise.all([
    db.query(`SELECT id, name, code, uom FROM ${Tables.inventory_items} ORDER BY name ASC`),
    db.query(`SELECT id, name FROM ${Tables.inventory_locations} WHERE is_active = true ORDER BY name ASC`),
  ]);

  return {
    items: ((itemsResult?.[0] as ReferenceItem[]) ?? []),
    locations: ((locationsResult?.[0] as ReferenceLocation[]) ?? []),
  };
};

const LoadingState = () => (
  <div className="rounded-2xl bg-white p-10 text-center text-neutral-500 shadow-sm">
    Loading inventory…
  </div>
);

const ErrorState = ({message}: {message: string}) => (
  <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
    {message}
  </div>
);

export const SimpleCurrentStock = ({refreshKey}: {refreshKey: number}) => {
  const db = useDB();
  const dbRef = useRef(db);
  dbRef.current = db;
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [{items, locations}, balances] = await Promise.all([
          loadReferences(dbRef.current),
          fetchLedgerNetsByStore(dbRef.current),
        ]);

        const itemById = new Map<string, ReferenceItem>();
        const locationById = new Map<string, ReferenceLocation>();
        items.forEach(item => addRecordAliases(itemById, item));
        locations.forEach(location => addRecordAliases(locationById, location));

        const nextRows = balances
          .map(balance => {
            const item = itemById.get(balance.itemId) ?? itemById.get(normalizeId(balance.itemId));
            const location = locationById.get(balance.locationId) ?? locationById.get(normalizeId(balance.locationId));
            return {
              key: `${balance.itemId}-${balance.locationId}`,
              item: item?.name || "Unknown item",
              code: item?.code,
              unit: item?.uom,
              location: location?.name || "Unknown location",
              quantity: balance.net,
            };
          })
          .sort((a, b) => a.item.localeCompare(b.item) || a.location.localeCompare(b.location));

        if (active) setRows(nextRows);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load current stock.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(row =>
      row.item.toLowerCase().includes(query)
      || row.code?.toLowerCase().includes(query)
      || row.location.toLowerCase().includes(query)
    );
  }, [rows, search]);

  if (loading) return <LoadingState/>;
  if (error) return <ErrorState message={error}/>;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Current Stock</h2>
          <p className="text-sm text-neutral-500">What is available at each location right now.</p>
        </div>
        <input
          type="search"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Search item or location"
          className="min-h-[52px] w-full rounded-xl border-2 border-neutral-200 px-4 text-base outline-none focus:border-red-400 sm:max-w-sm"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
          <tr>
            <th className="px-5 py-4 text-left text-sm font-bold text-neutral-700">Item</th>
            <th className="px-5 py-4 text-left text-sm font-bold text-neutral-700">Location</th>
            <th className="px-5 py-4 text-right text-sm font-bold text-neutral-700">On hand</th>
          </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
          {visibleRows.length > 0 ? visibleRows.map(row => (
            <tr key={row.key}>
              <td className="px-5 py-4">
                <div className="font-semibold text-neutral-900">{row.item}</div>
                {row.code && <div className="text-xs text-neutral-500">{row.code}</div>}
              </td>
              <td className="px-5 py-4 text-neutral-700">{row.location}</td>
              <td className={`px-5 py-4 text-right text-lg font-bold ${row.quantity <= 0 ? 'text-red-600' : 'text-neutral-900'}`}>
                {formatNumber(row.quantity)} {row.unit || ""}
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan={3} className="px-5 py-10 text-center text-neutral-500">
                No stock records found.
              </td>
            </tr>
          )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const StockMovementForm = ({
  direction,
  onRecorded,
}: {
  direction: Direction;
  onRecorded: () => void;
}) => {
  const db = useDB();
  const dbRef = useRef(db);
  dbRef.current = db;
  const {protectAction} = useSecurity();
  const [appState] = useAtom(appPage);
  const [items, setItems] = useState<ReferenceItem[]>([]);
  const [locations, setLocations] = useState<ReferenceLocation[]>([]);
  const [itemId, setItemId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isStockIn = direction === "in";

  useEffect(() => {
    let active = true;
    loadReferences(dbRef.current)
      .then(({items: nextItems, locations: nextLocations}) => {
        if (!active) return;
        setItems(nextItems);
        setLocations(nextLocations);
        setItemId(current => current || recordIdToString(nextItems[0]?.id));
        setLocationId(current => current || recordIdToString(nextLocations[0]?.id));
      })
      .catch(loadError => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load inventory options.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const saveMovement = async () => {
    if (!itemId || !locationId || !Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Choose an item and location, then enter a quantity above zero.");
      return;
    }

    protectAction(async () => {
      try {
        setSaving(true);

        if (!isStockIn) {
          const available = await computeStockFromLedger(dbRef.current, itemId, locationId);
          if (quantity > available) {
            toast.error(`Only ${formatNumber(available)} is available at this location.`);
            return;
          }
        }

        const movementId = crypto.randomUUID();
        const userId = appState?.user?.id ? recordIdToString(appState.user.id) : undefined;
        const notePrefix = isStockIn ? "Stock in" : "Stock out";

        await writeLedgerEntries(dbRef.current, [{
          created_by: userId,
          business_date: toAppBusinessDate(),
          inventory_item: itemId,
          inventory_location: locationId,
          quantity_change: isStockIn ? quantity : -quantity,
          reference_type: "adjustment",
          reference_id: movementId,
          ledger_key: `adjustment:${movementId}`,
          notes: notes.trim() ? `${notePrefix}: ${notes.trim()}` : notePrefix,
        }]);

        toast.success(isStockIn ? "Stock added." : "Stock removed.");
        setQuantity(1);
        setNotes("");
        onRecorded();
      } catch (saveError) {
        toast.error(saveError instanceof Error ? saveError.message : "Unable to record this movement.");
      } finally {
        setSaving(false);
      }
    }, {
      module: isStockIn ? "inventory.purchases.update" : "inventory.issues.update",
      description: isStockIn ? "Record stock coming in" : "Record stock going out",
    });
  };

  if (loading) return <LoadingState/>;
  if (error) return <ErrorState message={error}/>;

  return (
    <div className="mx-auto max-w-3xl rounded-2xl bg-white p-5 shadow-sm sm:p-8">
      <div className="mb-7">
        <h2 className="text-3xl font-bold text-neutral-900">{isStockIn ? "Stock In" : "Stock Out"}</h2>
        <p className="mt-1 text-neutral-500">
          {isStockIn ? "Record items received into inventory." : "Record items used, sold, damaged, or removed."}
        </p>
      </div>

      <div className="space-y-6">
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-neutral-700">Item</span>
          <select
            value={itemId}
            onChange={event => setItemId(event.target.value)}
            className="min-h-[58px] w-full rounded-xl border-2 border-neutral-200 bg-white px-4 text-lg outline-none focus:border-red-400"
          >
            {items.map(item => (
              <option key={recordIdToString(item.id)} value={recordIdToString(item.id)}>
                {item.name}{item.code ? ` (${item.code})` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-neutral-700">Location</span>
          <select
            value={locationId}
            onChange={event => setLocationId(event.target.value)}
            className="min-h-[58px] w-full rounded-xl border-2 border-neutral-200 bg-white px-4 text-lg outline-none focus:border-red-400"
          >
            {locations.map(location => (
              <option key={recordIdToString(location.id)} value={recordIdToString(location.id)}>
                {location.name}
              </option>
            ))}
          </select>
        </label>

        <div>
          <span className="mb-2 block text-sm font-bold text-neutral-700">Quantity</span>
          <div className="grid grid-cols-[64px_1fr_64px] gap-2">
            <button
              type="button"
              className="min-h-[60px] touch-manipulation rounded-xl border-2 border-neutral-200 bg-neutral-100 text-3xl font-bold active:scale-95"
              onClick={() => setQuantity(current => Math.max(1, current - 1))}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <input
              type="number"
              min="0.001"
              step="any"
              inputMode="decimal"
              value={quantity}
              onChange={event => setQuantity(Number(event.target.value))}
              className="min-h-[60px] w-full rounded-xl border-2 border-neutral-200 px-4 text-center text-2xl font-bold outline-none focus:border-red-400"
            />
            <button
              type="button"
              className="min-h-[60px] touch-manipulation rounded-xl border-2 border-neutral-200 bg-neutral-100 text-3xl font-bold active:scale-95"
              onClick={() => setQuantity(current => (Number.isFinite(current) ? current : 0) + 1)}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-neutral-700">Note (optional)</span>
          <input
            type="text"
            value={notes}
            onChange={event => setNotes(event.target.value)}
            placeholder={isStockIn ? "Delivery or supplier note" : "Used, sold, damaged…"}
            className="min-h-[58px] w-full rounded-xl border-2 border-neutral-200 px-4 text-lg outline-none focus:border-red-400"
          />
        </label>

        <button
          type="button"
          disabled={saving || items.length === 0 || locations.length === 0}
          onClick={saveMovement}
          className={`min-h-[64px] w-full touch-manipulation rounded-xl px-5 text-xl font-bold text-white shadow-md transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${
            isStockIn ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
          }`}
        >
          {saving ? "Saving…" : isStockIn ? "Add to Inventory" : "Remove from Inventory"}
        </button>
      </div>
    </div>
  );
};

export const InventoryMovementHistory = ({
  refreshKey,
  onReset,
}: {
  refreshKey: number;
  onReset: () => void;
}) => {
  const db = useDB();
  const dbRef = useRef(db);
  dbRef.current = db;
  const {protectAction} = useSecurity();
  const [appState] = useAtom(appPage);
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | Direction>("all");
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [{items, locations}, movements] = await Promise.all([
          loadReferences(dbRef.current),
          fetchLedgerMovements(dbRef.current, {excludeReversals: true}),
        ]);

        const itemById = new Map<string, ReferenceItem>();
        const locationById = new Map<string, ReferenceLocation>();
        items.forEach(item => addRecordAliases(itemById, item));
        locations.forEach(location => addRecordAliases(locationById, location));

        const nextRows = movements
          .filter(movement => movement.quantity_change !== 0)
          .map(movement => {
            const item = itemById.get(movement.inventory_item) ?? itemById.get(normalizeId(movement.inventory_item));
            const location = locationById.get(movement.inventory_location) ?? locationById.get(normalizeId(movement.inventory_location));
            return {
              id: movement.id,
              date: movement.created_at as DateInput,
              businessDate: movement.business_date,
              item: item?.name || "Unknown item",
              code: item?.code,
              unit: item?.uom,
              location: location?.name || "Unknown location",
              quantity: movement.quantity_change,
              notes: movement.notes,
            };
          })
          .reverse()
          .slice(0, 500);

        if (active) setRows(nextRows);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load inventory history.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter(row => {
      const directionMatches = filter === "all" || (filter === "in" ? row.quantity > 0 : row.quantity < 0);
      const searchMatches = !query
        || row.item.toLowerCase().includes(query)
        || row.code?.toLowerCase().includes(query)
        || row.location.toLowerCase().includes(query)
        || row.notes?.toLowerCase().includes(query);
      return directionMatches && searchMatches;
    });
  }, [filter, rows, search]);

  const resetAllStock = () => {
    protectAction(async () => {
      try {
        setResetting(true);
        const balances = await fetchLedgerNetsByStore(dbRef.current);
        const nonZeroBalances = balances.filter(balance => Math.abs(balance.net) > 0.000001);

        if (nonZeroBalances.length === 0) {
          toast.info("All stock is already zero.");
          setConfirmingReset(false);
          return;
        }

        const resetId = crypto.randomUUID();
        const userId = appState?.user?.id ? recordIdToString(appState.user.id) : undefined;

        await writeLedgerEntries(dbRef.current, nonZeroBalances.map((balance, index) => ({
          created_by: userId,
          business_date: toAppBusinessDate(),
          inventory_item: balance.itemId,
          inventory_location: balance.locationId,
          quantity_change: -balance.net,
          reference_type: "adjustment",
          reference_id: resetId,
          ledger_key: `adjustment:reset:${resetId}:${index}`,
          notes: "Reset all stock to zero",
        })));

        toast.success(`Reset ${nonZeroBalances.length} stock balance${nonZeroBalances.length === 1 ? "" : "s"} to zero.`);
        setConfirmingReset(false);
        onReset();
      } catch (resetError) {
        toast.error(resetError instanceof Error ? resetError.message : "Unable to reset stock.");
      } finally {
        setResetting(false);
      }
    }, {
      module: "inventory.adjustments.update",
      description: "Reset all inventory stock to zero",
    });
  };

  if (loading) return <LoadingState/>;
  if (error) return <ErrorState message={error}/>;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Movement History</h2>
          <p className="text-sm text-neutral-500">A simple record of everything added and removed.</p>
        </div>
        <button
          type="button"
          onClick={() => setConfirmingReset(true)}
          className="min-h-[50px] touch-manipulation rounded-xl border-2 border-red-600 bg-white px-5 font-bold text-red-700 transition hover:bg-red-50 active:scale-[0.98]"
          data-testid="inventory-reset-stock"
        >
          Reset All Stock
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid grid-cols-3 gap-2">
          {(["all", "in", "out"] as const).map(value => (
            <button
              type="button"
              key={value}
              onClick={() => setFilter(value)}
              className={`min-h-[48px] touch-manipulation rounded-xl border-2 px-5 font-semibold ${
                filter === value
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-neutral-700"
              }`}
            >
              {value === "all" ? "All" : value === "in" ? "Stock In" : "Stock Out"}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Search history"
          className="min-h-[50px] w-full rounded-xl border-2 border-neutral-200 px-4 text-base outline-none focus:border-red-400 lg:max-w-sm"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
          <tr>
            <th className="px-4 py-4 text-left text-sm font-bold text-neutral-700">Date</th>
            <th className="px-4 py-4 text-left text-sm font-bold text-neutral-700">Item</th>
            <th className="px-4 py-4 text-left text-sm font-bold text-neutral-700">Location</th>
            <th className="px-4 py-4 text-left text-sm font-bold text-neutral-700">Movement</th>
            <th className="px-4 py-4 text-right text-sm font-bold text-neutral-700">Quantity</th>
            <th className="px-4 py-4 text-left text-sm font-bold text-neutral-700">Note</th>
          </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
          {visibleRows.length > 0 ? visibleRows.map(row => {
            const isIn = row.quantity > 0;
            return (
              <tr key={row.id}>
                <td className="whitespace-nowrap px-4 py-4 text-sm text-neutral-600">
                  {formatDateTime(row.date || row.businessDate)}
                </td>
                <td className="px-4 py-4">
                  <div className="font-semibold text-neutral-900">{row.item}</div>
                  {row.code && <div className="text-xs text-neutral-500">{row.code}</div>}
                </td>
                <td className="px-4 py-4 text-neutral-700">{row.location}</td>
                <td className="px-4 py-4">
                  <span className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${
                    isIn ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                  }`}>
                    {isIn ? "IN" : "OUT"}
                  </span>
                </td>
                <td className={`whitespace-nowrap px-4 py-4 text-right text-lg font-bold ${
                  isIn ? "text-emerald-700" : "text-red-700"
                }`}>
                  {isIn ? "+" : "−"}{formatNumber(Math.abs(row.quantity))} {row.unit || ""}
                </td>
                <td className="max-w-xs px-4 py-4 text-sm text-neutral-600">{row.notes || "—"}</td>
              </tr>
            );
          }) : (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-neutral-500">
                No movements found.
              </td>
            </tr>
          )}
          </tbody>
        </table>
      </div>

      {confirmingReset && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-stock-title"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
            <h3 id="reset-stock-title" className="text-2xl font-bold text-neutral-900">
              Reset all stock to zero?
            </h3>
            <p className="mt-3 text-base leading-6 text-neutral-600">
              Every item at every location will be set to zero. Existing history will stay available, and the reset will be added to the history as a new movement.
            </p>
            <div className="mt-7 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={resetting}
                onClick={() => setConfirmingReset(false)}
                className="min-h-[58px] touch-manipulation rounded-xl border-2 border-neutral-200 bg-white px-4 text-lg font-bold text-neutral-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resetting}
                onClick={resetAllStock}
                className="min-h-[58px] touch-manipulation rounded-xl bg-red-600 px-4 text-lg font-bold text-white shadow-md hover:bg-red-700 disabled:opacity-50"
                data-testid="inventory-confirm-reset-stock"
              >
                {resetting ? "Resetting…" : "Yes, Reset Everything"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

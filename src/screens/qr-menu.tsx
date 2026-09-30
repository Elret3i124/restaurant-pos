import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { ProtectedRoute } from '@/routes/protected-route.tsx';
import { Menu } from '@/screens/menu.tsx';

type QrVariant = { id: string; name: string; price: number; available: boolean };
type QrProduct = {
  id: string;
  category: string;
  name: string;
  description: string;
  imageUrl?: string;
  available: boolean;
  variants: QrVariant[];
};
type QrCategory = { key: string; label: string; items: QrProduct[] };
type QrMenuResponse = { categories: QrCategory[]; extras: unknown[] };
type CartLine = {
  key: string;
  menuItemId: string;
  variantId: string;
  name: string;
  variantName: string;
  unitPrice: number;
  quantity: number;
  note?: string;
};

const formatDt = (amount: number) => `${Number(amount).toFixed(Number.isInteger(amount) ? 0 : 1)} DT`;

async function qrApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/pos${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || body?.message || 'La connexion au restaurant a échoué.');
  return body as T;
}

const readCart = (key: string): CartLine[] => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

export function MenuEntry() {
  const [params] = useSearchParams();
  const isQrMenu = Boolean(params.get('table') && params.get('qr'));
  if (isQrMenu) return <QrMenu />;
  return <ProtectedRoute><Menu /></ProtectedRoute>;
}

export function QrMenu() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const tableNumber = Number(params.get('table'));
  const qrSecret = params.get('qr') || '';
  const cartKey = Number.isInteger(tableNumber) ? `qr-cart-table-${tableNumber}` : 'qr-cart';
  const [menu, setMenu] = useState<QrMenuResponse | null>(null);
  const [cart, setCart] = useState<CartLine[]>(() => readCart(cartKey));
  const [selected, setSelected] = useState<{ product: QrProduct; variant: QrVariant } | null>(null);
  const [note, setNote] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      qrApi<QrMenuResponse>('/menu'),
      qrApi<{ valid: true }>(`/tables/validate?table=${encodeURIComponent(String(tableNumber))}&qr=${encodeURIComponent(qrSecret)}`),
    ]).then(([menuResponse]) => {
      if (active) setMenu(menuResponse);
    }).catch((reason) => {
      if (active) setError(reason instanceof Error ? reason.message : 'QR code invalide.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [tableNumber, qrSecret]);

  useEffect(() => {
    localStorage.setItem(cartKey, JSON.stringify(cart));
  }, [cart, cartKey]);

  const total = useMemo(
    () => cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
    [cart],
  );

  const addSelected = () => {
    if (!selected) return;
    const key = `${selected.product.id}:${selected.variant.id}:${note.trim()}`;
    setCart((current) => {
      const existing = current.find((line) => line.key === key);
      if (existing) return current.map((line) => line.key === key ? { ...line, quantity: line.quantity + 1 } : line);
      return [...current, {
        key,
        menuItemId: selected.product.id,
        variantId: selected.variant.id,
        name: selected.product.name,
        variantName: selected.variant.name,
        unitPrice: selected.variant.price,
        quantity: 1,
        note: note.trim() || undefined,
      }];
    });
    setSelected(null);
    setNote('');
  };

  const changeQuantity = (key: string, change: number) => {
    setCart((current) => current
      .map((line) => line.key === key ? { ...line, quantity: line.quantity + change } : line)
      .filter((line) => line.quantity > 0));
  };

  const submit = async () => {
    setError('');
    if (!customerName.trim()) {
      setError('Entrez votre nom pour envoyer la commande.');
      return;
    }
    setSending(true);
    const requestId = crypto.randomUUID();
    try {
      const result = await qrApi<{ publicToken: string }>('/orders', {
        method: 'POST',
        headers: { 'Idempotency-Key': requestId },
        body: JSON.stringify({
          requestId,
          customerName: customerName.trim(),
          tableNumber,
          qrSecret,
          items: cart.map((line) => ({
            menuItemId: line.menuItemId,
            variantId: line.variantId,
            quantity: line.quantity,
            note: line.note,
            extraIds: [],
          })),
        }),
      });
      localStorage.removeItem(cartKey);
      navigate(`/order/${result.publicToken}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Commande impossible.');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <main className="min-h-screen bg-neutral-950 p-8 text-center text-white">Chargement du menu…</main>;
  if (error && !menu) return <main className="min-h-screen bg-neutral-950 p-8 text-center text-danger-300"><h1 className="text-2xl font-black !text-white">QR code invalide</h1><p className="mt-3">{error}</p></main>;

  return (
    <main className="min-h-screen bg-neutral-950 pb-28 text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div><p className="text-xs font-black uppercase tracking-[0.25em] text-success-500">Pronto Pizza</p><h1 className="text-2xl font-black !text-white">Menu</h1></div>
          <div className="rounded-xl bg-white/10 px-4 py-2 font-bold">Table {tableNumber}</div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-10 px-4 py-8">
        {menu?.categories.map((category) => (
          <section key={category.key}>
            <div className="mb-4 flex items-center gap-3"><h2 className="text-2xl font-black uppercase !text-white">{category.label}</h2><div className="h-px flex-1 bg-success-600" /></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {category.items.map((product) => (
                <article key={product.id} className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 shadow-xl">
                  {product.imageUrl && <img src={product.imageUrl} alt={product.name} className="h-36 w-full object-cover" loading="lazy" />}
                  <div className="p-4">
                    <h3 className="text-xl font-black uppercase !text-white">{product.name}</h3>
                    <p className="mt-2 min-h-10 text-sm text-neutral-400">{product.description}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {product.variants.map((variant) => (
                        <button key={variant.id} disabled={!product.available || !variant.available} onClick={() => { setSelected({ product, variant }); setNote(''); }} className="min-h-11 rounded-lg bg-white px-4 py-2 text-sm font-black text-black disabled:bg-neutral-700 disabled:text-neutral-400">
                          {variant.name} - {formatDt(variant.price)}
                        </button>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <button aria-label="Ouvrir le panier" onClick={() => setCartOpen(true)} className="fixed bottom-5 right-5 z-30 flex h-16 min-w-16 items-center justify-center rounded-full bg-white px-5 font-black text-black shadow-2xl">
        Panier {cart.length > 0 && `(${cart.reduce((sum, line) => sum + line.quantity, 0)})`}
      </button>

      {selected && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/75" onClick={() => setSelected(null)}>
          <section className="w-full rounded-t-3xl bg-neutral-900 p-5" onClick={(event) => event.stopPropagation()}>
            <div className="mx-auto max-w-md">
              <h3 className="text-2xl font-black uppercase !text-white">{selected.product.name}</h3>
              <p className="font-bold text-success-400">{selected.variant.name} - {formatDt(selected.variant.price)}</p>
              {selected.product.category !== 'BOISSONS' && <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={240} placeholder="Note: sans oignons, bien cuit…" className="mt-5 min-h-24 w-full rounded-xl border border-white/10 bg-black p-4 text-white" />}
              <button onClick={addSelected} className="mt-5 h-14 w-full rounded-xl bg-white font-black text-black">Ajouter au panier</button>
            </div>
          </section>
        </div>
      )}

      {cartOpen && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/75" onClick={() => setCartOpen(false)}>
          <section className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-neutral-900 p-5" onClick={(event) => event.stopPropagation()}>
            <div className="mx-auto max-w-md">
              <div className="flex items-center justify-between"><h3 className="text-3xl font-black uppercase !text-white">Panier</h3><button onClick={() => setCartOpen(false)} className="rounded-lg bg-white/10 px-4 py-2">Fermer</button></div>
              <div className="mt-5 space-y-3">
                {cart.length === 0 && <p className="rounded-xl border border-white/10 p-5 text-center text-neutral-400">Aucun article dans le panier.</p>}
                {cart.map((line) => (
                  <div key={line.key} className="rounded-xl border border-white/10 p-4">
                    <div className="flex justify-between"><div><p className="font-bold">{line.name} {line.variantName}</p>{line.note && <p className="text-sm text-neutral-400">{line.note}</p>}</div><p className="font-bold text-success-400">{formatDt(line.unitPrice * line.quantity)}</p></div>
                    <div className="mt-3 flex items-center gap-3"><button onClick={() => changeQuantity(line.key, -1)} className="h-10 w-10 rounded-lg bg-white/10">−</button><span className="font-black">{line.quantity}</span><button onClick={() => changeQuantity(line.key, 1)} className="h-10 w-10 rounded-lg bg-white/10">+</button></div>
                  </div>
                ))}
              </div>
              {cart.length > 0 && <>
                <div className="mt-5 flex justify-between rounded-xl bg-white p-4 font-black text-black"><span>Total</span><span>{formatDt(total)}</span></div>
                <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} maxLength={80} placeholder="Votre nom" className="mt-4 h-14 w-full rounded-xl border border-white/10 bg-black px-4 text-white" />
                {error && <p className="mt-3 text-sm text-danger-300">{error}</p>}
                <button disabled={sending} onClick={submit} className="mt-4 h-14 w-full rounded-xl bg-success-600 font-black text-white disabled:opacity-50">{sending ? 'Envoi…' : 'Envoyer la commande'}</button>
              </>}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

type PublicOrder = {
  dailyNumber: number;
  tableNumber: number;
  status: 'WAITING_PAYMENT' | 'PAID' | 'CANCELLED' | string;
  total: number;
  items: Array<{ id: string; quantity: number; itemName: string; variantName: string; lineTotal: number; note?: string | null }>;
};

export function QrOrderStatus() {
  const { token = '' } = useParams();
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try { setOrder(await qrApi<PublicOrder>(`/orders/public/${encodeURIComponent(token)}`)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Commande introuvable.'); }
  };

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 2500);
    return () => window.clearInterval(timer);
  }, [token]);

  const cancel = async () => {
    setBusy(true);
    try { setOrder(await qrApi<PublicOrder>(`/orders/public/${encodeURIComponent(token)}/cancel`, { method: 'POST' })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Annulation impossible.'); }
    finally { setBusy(false); }
  };

  if (error && !order) return <main className="min-h-screen bg-neutral-950 p-8 text-center text-danger-300">{error}</main>;
  if (!order) return <main className="min-h-screen bg-neutral-950 p-8 text-center text-white">Chargement…</main>;

  const statusLabels: Record<string, string> = {
    WAITING_PAYMENT: 'En attente de paiement',
    PAID: 'Payée',
    PREPARING: 'En préparation',
    READY: 'Prête',
    SERVED: 'Servie',
    CANCELLED: 'Commande annulée',
  };
  const label = statusLabels[order.status] || order.status;
  return <main className="min-h-screen bg-neutral-950 px-4 py-8 text-white"><section className="mx-auto max-w-md">
    <p className="text-xs uppercase tracking-[0.25em] text-success-400">Commande #{String(order.dailyNumber).padStart(3, '0')}</p>
    <h1 className="mt-3 text-4xl font-black !text-white">Table {order.tableNumber}</h1>
    <div className="mt-6 rounded-3xl border border-success-400/30 bg-success-400/10 p-5"><p className="text-lg font-black">{label}</p>{order.status === 'WAITING_PAYMENT' && <p className="mt-2 text-sm text-neutral-300">Veuillez passer au comptoir pour payer et confirmer votre commande.</p>}</div>
    <div className="mt-6 space-y-3">{order.items.map((line) => <div key={line.id} className="rounded-2xl border border-white/10 bg-neutral-900 p-4"><div className="flex justify-between gap-3"><div><p className="font-bold">{line.quantity}x {line.itemName}</p><p className="text-sm text-neutral-400">{line.variantName}</p></div><p className="font-bold text-success-400">{formatDt(line.lineTotal)}</p></div>{line.note && <p className="mt-2 text-sm text-neutral-400">Note: {line.note}</p>}</div>)}</div>
    <div className="mt-6 flex justify-between rounded-2xl bg-white p-5 font-black text-black"><span>Total</span><span>{formatDt(order.total)}</span></div>
    {order.status === 'WAITING_PAYMENT' && <button disabled={busy} onClick={cancel} className="mt-4 h-14 w-full rounded-full border border-danger-300/50 text-danger-200 disabled:opacity-50">Annuler ma commande</button>}
  </section></main>;
}

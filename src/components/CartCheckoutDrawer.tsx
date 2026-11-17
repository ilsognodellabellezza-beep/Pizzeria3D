import {
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  MapPin,
  Minus,
  Plus,
  RefreshCw,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api';
import type {
  CartItem,
  DeliveryType,
  Order,
  OrderStatus,
  PaymentMethod,
  PublicUser,
  SiteConfig,
} from '../types';

interface CartCheckoutDrawerProps {
  open: boolean;
  onClose: () => void;
  siteConfig: SiteConfig;
  items: CartItem[];
  currentUser: PublicUser | null;
  onUpdateQuantity: (cartKey: string, delta: number) => void;
  onRemoveItem: (cartKey: string) => void;
  onClearCart: () => void;
  onOrderCreated: (order: Order) => void;
}

const STATUS_STEPS: { key: OrderStatus; label: string }[] = [
  { key: 'ricevuto', label: 'Ricevuto' },
  { key: 'preparazione', label: 'In preparazione' },
  { key: 'forno', label: 'In forno' },
  { key: 'consegna', label: 'In consegna' },
  { key: 'consegnato', label: 'Consegnato' },
];

const TIME_SLOTS = [
  'Subito (30–40 min)',
  '19:00',
  '19:30',
  '20:00',
  '20:30',
  '21:00',
  '21:30',
  '22:00',
  '22:30',
];

const CASH_BILLS = [
  { label: 'Importo esatto', value: 0 },
  { label: 'Resto su 20,00 €', value: 20 },
  { label: 'Resto su 50,00 €', value: 50 },
  { label: 'Resto su 100,00 €', value: 100 },
];

export function CartCheckoutDrawer({
  open,
  onClose,
  siteConfig,
  items,
  currentUser,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onOrderCreated,
}: CartCheckoutDrawerProps) {
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('domicilio');
  const [requestedTime, setRequestedTime] = useState(TIME_SLOTS[0]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [address, setAddress] = useState('');
  const [floorOrNotes, setFloorOrNotes] = useState('');
  const [kitchenNotes, setKitchenNotes] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    siteConfig.acceptCardOnline ? 'carta' : 'contanti',
  );
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cashBillAmount, setCashBillAmount] = useState<number>(0);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [refreshingStatus, setRefreshingStatus] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setCustomerName((prev) => prev || currentUser.fullName);
      setCustomerPhone((prev) => prev || currentUser.phone);
      setCustomerEmail((prev) => prev || currentUser.email);
      setAddress((prev) => prev || currentUser.address);
    }
  }, [currentUser]);

  if (!open) return null;

  const subtotal = items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
  const freeThreshold = siteConfig.freeDeliveryThreshold;
  const deliveryFee =
    deliveryType === 'asporto' || items.length === 0
      ? 0
      : subtotal >= freeThreshold
      ? 0
      : siteConfig.deliveryFee;
  const total = subtotal + deliveryFee;
  const missingForFree = Math.max(0, freeThreshold - subtotal);

  const handleFormatCardNumber = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    const groups = digits.match(/.{1,4}/g) || [];
    setCardNumber(groups.join(' '));
  };

  const handleFormatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      setCardExpiry(`${digits.slice(0, 2)}/${digits.slice(2)}`);
    } else {
      setCardExpiry(digits);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    const selectedCashObj = CASH_BILLS.find((b) => b.value === cashBillAmount);
    try {
      const { order } = await api.placeOrder({
        customerName,
        customerPhone,
        customerEmail,
        deliveryType,
        requestedTime,
        address,
        floorOrNotes,
        kitchenNotes,
        items,
        paymentMethod,
        cardNumber: paymentMethod === 'carta' ? cardNumber : undefined,
        cardExpiry: paymentMethod === 'carta' ? cardExpiry : undefined,
        cardCvc: paymentMethod === 'carta' ? cardCvc : undefined,
        cashChangeFor:
          paymentMethod === 'contanti' && selectedCashObj ? selectedCashObj.label : undefined,
        cashBillAmount: paymentMethod === 'contanti' && cashBillAmount > 0 ? cashBillAmount : undefined,
      });
      setConfirmedOrder(order);
      onClearCart();
      onOrderCreated(order);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Impossibile inviare l’ordine.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefreshOrder = async () => {
    if (!confirmedOrder) return;
    setRefreshingStatus(true);
    try {
      const { order } = await api.trackOrder(confirmedOrder.id);
      setConfirmedOrder(order);
    } catch {
      // ignore transient error
    } finally {
      setRefreshingStatus(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <div className="w-full max-w-lg bg-white h-full flex flex-col shadow-2xl border-l border-zinc-200 overflow-hidden">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#111214]" />
            <h2 className="font-display text-lg font-semibold text-[#111214]">
              {confirmedOrder ? `Ordine ${confirmedOrder.id}` : 'Il tuo Ordine'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              if (confirmedOrder) setConfirmedOrder(null);
              onClose();
            }}
            aria-label="Chiudi carrello"
            className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-[#111214] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {confirmedOrder ? (
            <div className="space-y-6">
              <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-emerald-950">
                    Ordine confermato — {confirmedOrder.id}
                  </h3>
                  <p className="text-sm text-emerald-800 mt-1">
                    {confirmedOrder.deliveryType === 'domicilio'
                      ? `Consegna prevista a ${confirmedOrder.address} (${confirmedOrder.requestedTime}).`
                      : `Ritiro in sede (${confirmedOrder.requestedTime}).`}
                  </p>
                </div>
              </div>

              {/* Live Order Tracker */}
              <div className="border border-zinc-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Stato preparazione
                  </span>
                  <button
                    type="button"
                    onClick={handleRefreshOrder}
                    disabled={refreshingStatus}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-700 hover:text-[#111214] cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshingStatus ? 'animate-spin' : ''}`} />
                    Aggiorna stato
                  </button>
                </div>

                <div className="space-y-2.5">
                  {STATUS_STEPS.map((step, idx) => {
                    const currentIdx = STATUS_STEPS.findIndex(
                      (s) => s.key === confirmedOrder.status,
                    );
                    const done = idx <= currentIdx;
                    const active = idx === currentIdx;
                    return (
                      <div key={step.key} className="flex items-center justify-between text-sm">
                        <span
                          className={
                            active
                              ? 'font-semibold text-[#111214]'
                              : done
                              ? 'text-zinc-700'
                              : 'text-zinc-400'
                          }
                        >
                          0{idx + 1}. {step.label}
                        </span>
                        <span className="text-xs font-mono-tabular">
                          {active ? 'Attuale' : done ? 'Completato' : 'In attesa'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Receipt summary */}
              <div className="border border-zinc-200 rounded-xl p-5 space-y-3 text-sm">
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Riepilogo &amp; Pagamento
                </div>
                {confirmedOrder.items.map((it) => (
                  <div key={it.cartKey} className="flex justify-between gap-4">
                    <span className="text-zinc-700">
                      {it.quantity}× {it.name}{' '}
                      {it.format !== 'standard' ? `(${it.format})` : ''}
                    </span>
                    <span className="font-mono-tabular font-medium text-[#111214]">
                      {(it.unitPrice * it.quantity).toFixed(2).replace('.', ',')} €
                    </span>
                  </div>
                ))}
                <div className="pt-3 border-t border-zinc-200 flex justify-between font-semibold text-[#111214]">
                  <span>Totale</span>
                  <span className="font-mono-tabular">
                    {confirmedOrder.total.toFixed(2).replace('.', ',')} €
                  </span>
                </div>
                <div className="text-xs text-zinc-600 pt-1">
                  Metodo:{' '}
                  {confirmedOrder.paymentMethod === 'carta'
                    ? `Pagato online con Carta (•••• ${confirmedOrder.cardLast4})`
                    : `Contanti alla consegna${
                        confirmedOrder.cashChangeFor ? ` (${confirmedOrder.cashChangeFor})` : ''
                      }`}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setConfirmedOrder(null);
                  onClose();
                }}
                className="w-full py-3 rounded-xl bg-[#111214] text-white text-sm font-semibold hover:opacity-90 cursor-pointer"
              >
                Torna al sito
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-16">
              <ShoppingBag className="w-10 h-10 text-zinc-300 mb-3" />
              <p className="font-display text-lg font-medium text-[#111214]">
                Il tuo carrello è vuoto
              </p>
              <p className="text-sm text-zinc-500 mt-1 max-w-xs">
                Sfoglia le categorie del menu e aggiungi pizze, panini o fritti al tuo ordine.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 px-5 py-2.5 rounded-lg bg-[#111214] text-white text-xs font-semibold cursor-pointer"
              >
                Vai al Menu
              </button>
            </div>
          ) : (
            <form id="checkout-form" onSubmit={handleSubmitOrder} className="space-y-6">
              {deliveryType === 'domicilio' && (
                <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-700">
                  {missingForFree > 0 ? (
                    <span>
                      Aggiungi{' '}
                      <strong className="font-mono-tabular">
                        {missingForFree.toFixed(2).replace('.', ',')} €
                      </strong>{' '}
                      per ottenere la consegna gratuita a Catania.
                    </span>
                  ) : (
                    <span className="font-medium text-emerald-700">
                      Consegna gratuita a Catania sbloccata!
                    </span>
                  )}
                </div>
              )}

              {/* Items List */}
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.cartKey}
                    className="flex items-start gap-3.5 p-3.5 rounded-xl border border-zinc-200 bg-white"
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-lg object-cover bg-zinc-100 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-[#111214] truncate">
                          {item.name}
                        </h4>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.cartKey)}
                          aria-label={`Rimuovi ${item.name}`}
                          className="text-zinc-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        {item.format !== 'standard'
                          ? `Formato ${item.format === 'maxi' ? 'Maxi (50 cm)' : 'Normale (33 cm)'}`
                          : 'Porzione standard'}
                        {item.notes ? ` · ${item.notes}` : ''}
                      </div>
                      <div className="mt-2.5 flex items-center justify-between">
                        <div className="inline-flex items-center border border-zinc-200 rounded-lg">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.cartKey, -1)}
                            className="p-1.5 text-zinc-600 hover:text-[#111214] cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2.5 text-xs font-mono-tabular font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.cartKey, 1)}
                            className="p-1.5 text-zinc-600 hover:text-[#111214] cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="text-sm font-semibold font-mono-tabular text-[#111214]">
                          {(item.unitPrice * item.quantity).toFixed(2).replace('.', ',')} €
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Delivery vs Pickup + Time Slot */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Ricezione &amp; Orario
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDeliveryType('domicilio')}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                      deliveryType === 'domicilio'
                        ? 'bg-[#111214] text-white border-[#111214]'
                        : 'bg-white text-zinc-700 border-zinc-200'
                    }`}
                  >
                    Consegna a Domicilio
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryType('asporto')}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                      deliveryType === 'asporto'
                        ? 'bg-[#111214] text-white border-[#111214]'
                        : 'bg-white text-zinc-700 border-zinc-200'
                    }`}
                  >
                    Ritiro in Sede (Gratis)
                  </button>
                </div>

                <div className="relative">
                  <Clock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                  <select
                    value={requestedTime}
                    onChange={(e) => setRequestedTime(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-none focus:border-[#111214]"
                  >
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        Orario richiesto: {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Customer & Address Fields */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Dati per la consegna
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Nome e Cognome *"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:border-[#111214]"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="Telefono *"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:border-[#111214]"
                  />
                </div>
                <input
                  type="email"
                  placeholder="Email (per ricevuta ordine)"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:border-[#111214]"
                />
                {deliveryType === 'domicilio' ? (
                  <>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        placeholder="Via, numero civico, quartiere (Catania) *"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:border-[#111214]"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Piano, scala, citofono (es. Scala B, 2° piano)"
                      value={floorOrNotes}
                      onChange={(e) => setFloorOrNotes(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:border-[#111214]"
                    />
                  </>
                ) : (
                  <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-600">
                    Ritiro presso: <strong className="text-[#111214]">{siteConfig.address}</strong>
                  </div>
                )}

                <input
                  type="text"
                  placeholder="Note per la cucina / allergie (es. ben cotta, senza origano)"
                  value={kitchenNotes}
                  onChange={(e) => setKitchenNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:border-[#111214]"
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Metodo di Pagamento
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {siteConfig.acceptCardOnline && (
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('carta')}
                      className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                        paymentMethod === 'carta'
                          ? 'bg-[#111214] text-white border-[#111214]'
                          : 'bg-white text-zinc-700 border-zinc-200'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      Carta Online
                    </button>
                  )}
                  {siteConfig.acceptCashOnDelivery && (
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('contanti')}
                      className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                        paymentMethod === 'contanti'
                          ? 'bg-[#111214] text-white border-[#111214]'
                          : 'bg-white text-zinc-700 border-zinc-200'
                      }`}
                    >
                      <Banknote className="w-4 h-4" />
                      Contanti alla consegna
                    </button>
                  )}
                </div>

                {paymentMethod === 'carta' && siteConfig.acceptCardOnline && (
                  <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-3">
                    <input
                      type="text"
                      required
                      inputMode="numeric"
                      placeholder="Numero Carta (es. 4532 8910 2231 4242)"
                      value={cardNumber}
                      onChange={(e) => handleFormatCardNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 bg-white text-sm font-mono-tabular focus:outline-none focus:border-[#111214]"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        required
                        inputMode="numeric"
                        placeholder="Scadenza MM/AA"
                        value={cardExpiry}
                        onChange={(e) => handleFormatExpiry(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 bg-white text-sm font-mono-tabular focus:outline-none focus:border-[#111214]"
                      />
                      <input
                        type="text"
                        required
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="CVC"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 bg-white text-sm font-mono-tabular focus:outline-none focus:border-[#111214]"
                      />
                    </div>
                  </div>
                )}

                {paymentMethod === 'contanti' && siteConfig.acceptCashOnDelivery && (
                  <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2">
                    <label className="block text-xs font-medium text-zinc-700">
                      Resto necessario al fattorino
                    </label>
                    <select
                      value={cashBillAmount}
                      onChange={(e) => setCashBillAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-none focus:border-[#111214]"
                    >
                      {CASH_BILLS.map((bill) => (
                        <option key={bill.value} value={bill.value}>
                          {bill.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
                  {errorMsg}
                </div>
              )}
            </form>
          )}
        </div>

        {/* Drawer Footer */}
        {!confirmedOrder && items.length > 0 && (
          <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50 space-y-3">
            <div className="space-y-1 text-xs text-zinc-600">
              <div className="flex justify-between">
                <span>Subtotale</span>
                <span className="font-mono-tabular">{subtotal.toFixed(2).replace('.', ',')} €</span>
              </div>
              <div className="flex justify-between">
                <span>Consegna</span>
                <span className="font-mono-tabular">
                  {deliveryFee === 0 ? 'Gratuita' : `${deliveryFee.toFixed(2).replace('.', ',')} €`}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#111214] pt-1">
                <span>Totale da pagare</span>
                <span className="font-mono-tabular">{total.toFixed(2).replace('.', ',')} €</span>
              </div>
            </div>

            <button
              type="submit"
              form="checkout-form"
              disabled={submitting}
              style={{ backgroundColor: siteConfig.accentColor }}
              className="w-full py-3.5 rounded-xl text-sm font-semibold text-white hover:opacity-95 transition-opacity disabled:opacity-60 cursor-pointer"
            >
              {submitting
                ? 'Invio ordine in corso...'
                : paymentMethod === 'carta'
                ? `Paga ${total.toFixed(2).replace('.', ',')} € e Ordina`
                : `Conferma Ordine (${total.toFixed(2).replace('.', ',')} € alla consegna)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

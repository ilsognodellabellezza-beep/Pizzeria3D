import { LogOut, Package, RotateCcw, Shield, User as UserIcon, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, setStoredToken } from '../api';
import type { CartItem, Order, PublicUser, SiteConfig } from '../types';

interface AccountModalProps {
  open: boolean;
  onClose: () => void;
  siteConfig: SiteConfig;
  currentUser: PublicUser | null;
  onUserChange: (user: PublicUser | null) => void;
  onOpenOwnerPanel: () => void;
  onReorderItems: (items: CartItem[]) => void;
}

const STATUS_LABELS: Record<string, string> = {
  ricevuto: 'Ricevuto',
  preparazione: 'In preparazione',
  forno: 'In forno',
  consegna: 'In consegna',
  consegnato: 'Consegnato',
  annullato: 'Annullato',
};

export function AccountModal({
  open,
  onClose,
  siteConfig,
  currentUser,
  onUserChange,
  onOpenOwnerPanel,
  onReorderItems,
}: AccountModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Profile edit state
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileAddress, setProfileAddress] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);

  // Customer order history
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    if (!open || !currentUser) return;
    setProfileName(currentUser.fullName);
    setProfilePhone(currentUser.phone);
    setProfileAddress(currentUser.address);

    if (currentUser.role === 'customer') {
      setLoadingOrders(true);
      api
        .myOrders()
        .then((res) => setOrders(res.orders))
        .catch(() => {})
        .finally(() => setLoadingOrders(false));
    }
  }, [open, currentUser]);

  if (!open) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const { token, user } = await api.login(identifier, password);
      setStoredToken(token);
      onUserChange(user);
      setIdentifier('');
      setPassword('');
      if (user.role === 'owner') {
        onClose();
        onOpenOwnerPanel();
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Accesso non riuscito.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const { token, user } = await api.register({
        email: regEmail,
        password: regPassword,
        fullName: regName,
        phone: regPhone,
        address: regAddress,
      });
      setStoredToken(token);
      onUserChange(user);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Registrazione non riuscita.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaved(false);
    try {
      const { user } = await api.updateProfile({
        fullName: profileName,
        phone: profilePhone,
        address: profileAddress,
      });
      onUserChange(user);
      setProfileSaved(true);
      window.setTimeout(() => setProfileSaved(false), 2000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Errore nel salvataggio.');
    }
  };

  const handleLogout = () => {
    setStoredToken(null);
    onUserChange(null);
    setOrders([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-xl bg-white rounded-2xl border border-zinc-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <UserIcon className="w-5 h-5 text-[#111214]" />
            <h2 className="font-display text-lg font-semibold text-[#111214]">
              {currentUser ? `Ciao, ${currentUser.fullName}` : 'Account & Accesso'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi finestra account"
            className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!currentUser ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg('');
                  }}
                  className={`py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    mode === 'login' ? 'bg-white text-[#111214] shadow-sm' : 'text-zinc-600'
                  }`}
                >
                  Accedi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMsg('');
                  }}
                  className={`py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    mode === 'register' ? 'bg-white text-[#111214] shadow-sm' : 'text-zinc-600'
                  }`}
                >
                  Crea Account Cliente
                </button>
              </div>

              {mode === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                      Email o Nome Utente (usa <span className="font-mono-tabular">owner</span> per il gestionale)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="es. cliente@catania.it oppure owner"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:border-[#111214]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:border-[#111214]"
                    />
                  </div>

                  {errorMsg && (
                    <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">
                      {errorMsg}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    style={{ backgroundColor: siteConfig.accentColor }}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white hover:opacity-95 cursor-pointer"
                  >
                    {loading ? 'Verifica in corso...' : 'Accedi'}
                  </button>

                  <div className="pt-4 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                    <span>Cliente demo: cliente@catania.it / pizza123</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIdentifier('owner');
                        setPassword('');
                      }}
                      className="inline-flex items-center gap-1 font-medium text-[#111214] hover:underline cursor-pointer"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      Accesso Proprietario
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-3.5">
                  <input
                    type="text"
                    required
                    placeholder="Nome e Cognome *"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:border-[#111214]"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="email"
                      required
                      placeholder="Email *"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:border-[#111214]"
                    />
                    <input
                      type="tel"
                      required
                      placeholder="Telefono *"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:border-[#111214]"
                    />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Indirizzo di consegna a Catania *"
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:border-[#111214]"
                  />
                  <input
                    type="password"
                    required
                    minLength={4}
                    placeholder="Scegli una password (min. 4 caratteri) *"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:border-[#111214]"
                  />

                  {errorMsg && (
                    <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">
                      {errorMsg}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    style={{ backgroundColor: siteConfig.accentColor }}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white hover:opacity-95 cursor-pointer"
                  >
                    {loading ? 'Creazione account...' : 'Registrati e Ordina'}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {currentUser.role === 'owner' ? (
                <div className="p-5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-4">
                  <div className="text-sm text-zinc-700">
                    Sei autenticato come <strong>Proprietario</strong>. Puoi aprire il pannello gestionale per modificare menu, prezzi, orari, testi e gestire gli ordini.
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenOwnerPanel();
                      }}
                      style={{ backgroundColor: siteConfig.accentColor }}
                      className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white cursor-pointer"
                    >
                      Apri Pannello Gestionale
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-300 text-xs font-semibold text-zinc-700 hover:bg-white cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" /> Esci
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Saved profile form */}
                  <form onSubmit={handleSaveProfile} className="space-y-3 pb-6 border-b border-zinc-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        Dati di Consegna Salvati
                      </span>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-red-600 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Esci
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="Nome"
                        className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 text-sm"
                      />
                      <input
                        type="tel"
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        placeholder="Telefono"
                        className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 text-sm"
                      />
                    </div>
                    <input
                      type="text"
                      value={profileAddress}
                      onChange={(e) => setProfileAddress(e.target.value)}
                      placeholder="Indirizzo a Catania"
                      className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 text-sm"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-emerald-700 font-medium">
                        {profileSaved ? 'Profilo aggiornato!' : ''}
                      </span>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-[#111214] text-white text-xs font-semibold cursor-pointer"
                      >
                        Salva Dati
                      </button>
                    </div>
                  </form>

                  {/* Customer Order History */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      <Package className="w-4 h-4" />
                      <span>I Miei Ordini ({orders.length})</span>
                    </div>

                    {loadingOrders ? (
                      <p className="text-sm text-zinc-500">Caricamento ordini...</p>
                    ) : orders.length === 0 ? (
                      <p className="text-sm text-zinc-500">
                        Non hai ancora effettuato ordini con questo account.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {orders.map((ord) => (
                          <div
                            key={ord.id}
                            className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2 text-sm">
                              <span className="font-mono-tabular font-semibold text-[#111214]">
                                {ord.id} · {ord.total.toFixed(2).replace('.', ',')} €
                              </span>
                              <span className="text-xs font-medium text-zinc-700">
                                {STATUS_LABELS[ord.status] || ord.status}
                              </span>
                            </div>
                            <div className="text-xs text-zinc-600">
                              {ord.items.map((it) => `${it.quantity}× ${it.name}`).join(', ')}
                            </div>
                            <div className="flex items-center justify-between pt-1 text-xs text-zinc-500">
                              <span>
                                {new Date(ord.createdAt).toLocaleDateString('it-IT', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  onReorderItems(ord.items);
                                  onClose();
                                }}
                                className="inline-flex items-center gap-1 font-semibold text-[#111214] hover:underline cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" /> Riordina
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

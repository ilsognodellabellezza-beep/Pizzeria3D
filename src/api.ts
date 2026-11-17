import type {
  CartItem,
  DeliveryType,
  MenuItem,
  Order,
  OrderStatus,
  PaymentMethod,
  PublicUser,
  SiteConfig,
} from './types';

const TOKEN_STORAGE_KEY = 'nxp_auth_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage restriction errors
  }
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(url, { ...options, headers });
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) {
    throw new Error(data.error || `Errore di rete (${res.status})`);
  }
  return data;
}

export interface BootstrapResponse {
  siteConfig: SiteConfig;
  categories: string[];
  menuItems: MenuItem[];
}

export const api = {
  bootstrap: () => apiFetch<BootstrapResponse>('/api/bootstrap'),

  login: (identifier: string, password: string) =>
    apiFetch<{ token: string; user: PublicUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    }),

  register: (payload: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    address: string;
  }) =>
    apiFetch<{ token: string; user: PublicUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  me: () => apiFetch<{ user: PublicUser }>('/api/auth/me'),

  updateProfile: (payload: { fullName: string; phone: string; address: string }) =>
    apiFetch<{ user: PublicUser }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  placeOrder: (payload: {
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    deliveryType: DeliveryType;
    requestedTime: string;
    address: string;
    floorOrNotes: string;
    kitchenNotes: string;
    items: CartItem[];
    paymentMethod: PaymentMethod;
    cardNumber?: string;
    cardExpiry?: string;
    cardCvc?: string;
    cashChangeFor?: string;
    cashBillAmount?: number;
  }) =>
    apiFetch<{ order: Order }>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  myOrders: () => apiFetch<{ orders: Order[] }>('/api/orders/my'),

  trackOrder: (id: string) => apiFetch<{ order: Order }>(`/api/orders/${encodeURIComponent(id)}`),

  adminUpdateSite: (siteConfig: Partial<SiteConfig>) =>
    apiFetch<{ siteConfig: SiteConfig }>('/api/admin/site', {
      method: 'PUT',
      body: JSON.stringify(siteConfig),
    }),

  adminUpdateCategories: (categories: string[]) =>
    apiFetch<{ categories: string[] }>('/api/admin/categories', {
      method: 'PUT',
      body: JSON.stringify({ categories }),
    }),

  adminCreateMenuItem: (item: Partial<MenuItem>) =>
    apiFetch<{ item: MenuItem; menuItems: MenuItem[]; categories: string[] }>('/api/admin/menu', {
      method: 'POST',
      body: JSON.stringify(item),
    }),

  adminUpdateMenuItem: (id: string, patch: Partial<MenuItem>) =>
    apiFetch<{ item: MenuItem; menuItems: MenuItem[]; categories: string[] }>(
      `/api/admin/menu/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: JSON.stringify(patch),
      },
    ),

  adminDeleteMenuItem: (id: string) =>
    apiFetch<{ menuItems: MenuItem[] }>(`/api/admin/menu/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  adminOverview: () =>
    apiFetch<{ orders: Order[]; customers: PublicUser[] }>('/api/admin/overview'),

  adminUpdateOrder: (id: string, patch: { status?: OrderStatus; internalNotes?: string }) =>
    apiFetch<{ order: Order }>(`/api/admin/orders/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
};

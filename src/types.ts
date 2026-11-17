export type PizzaFormat = 'normale' | 'maxi';
export type DoughType = 'classico' | 'integrale' | 'carbone';
export type SauceBase = 'pomodoro' | 'bianca' | 'pistacchio';

export type ToppingId =
  | 'salame'
  | 'mortadella'
  | 'pistacchio'
  | 'porchetta'
  | 'crocchette'
  | 'funghi'
  | 'olive'
  | 'cipolla'
  | 'basilico';

export interface CustomPizzaConfig {
  format: PizzaFormat;
  dough: DoughType;
  base: SauceBase;
  toppings: ToppingId[];
}

export interface OpeningHour {
  day: string;
  hours: string;
  closed?: boolean;
}

export interface CustomerReview {
  id: string;
  author: string;
  neighborhood: string;
  rating: number;
  text: string;
  date: string;
}

export interface SiteConfig {
  name: string;
  tagline: string;
  heroHeadline: string;
  heroSubheadline: string;
  heroImageUrl: string;
  promoBanner: string;
  promoActive: boolean;
  accentColor: string;
  storyTitle: string;
  storyParagraph: string;
  address: string;
  neighborhood: string;
  phone: string;
  email: string;
  mapsUrl: string;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  estimatedDeliveryMinutes: string;
  acceptCardOnline: boolean;
  acceptCashOnDelivery: boolean;
  hours: OpeningHour[];
  reviews: CustomerReview[];
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  description: string;
  priceNormal: number;
  priceMaxi: number | null;
  imageUrl: string;
  available: boolean;
  featured: boolean;
  ingredients: string[];
}

export interface CartItem {
  cartKey: string;
  menuItemId: string | null;
  name: string;
  format: PizzaFormat | 'standard';
  unitPrice: number;
  quantity: number;
  imageUrl: string;
  notes?: string;
}

export type UserRole = 'customer' | 'owner';

export interface PublicUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phone: string;
  address: string;
  role: UserRole;
  createdAt: string;
}

export type OrderStatus =
  | 'ricevuto'
  | 'preparazione'
  | 'forno'
  | 'consegna'
  | 'consegnato'
  | 'annullato';

export type PaymentMethod = 'carta' | 'contanti';
export type DeliveryType = 'domicilio' | 'asporto';

export interface Order {
  id: string;
  userId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryType: DeliveryType;
  requestedTime: string;
  address: string;
  floorOrNotes: string;
  kitchenNotes: string;
  internalNotes?: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: 'pagato_carta' | 'alla_consegna';
  cardLast4?: string;
  cashChangeFor?: string;
  cashBillAmount?: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export type AppPage = 'home' | 'menu' | 'storia' | 'contatti';

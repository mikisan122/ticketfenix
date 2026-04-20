/**
 * Data structures for TicketFenix
 */

export interface Event {
  id: string;
  title: string;
  category: string;
  date: string;
  location: string;
  price: number;
  image: string;
  description: string;
  featured?: boolean;
  ticketmasterId?: string;
}

export interface TicketPurchase {
  id: string;
  eventId: string;
  quantity: number;
  total: number;
  userName: string;
  userEmail: string;
  paymentMethod: string;
  purchaseDate: string;
  status: 'success' | 'pending';
}

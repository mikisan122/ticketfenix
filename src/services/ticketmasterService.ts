import axios from 'axios';

export interface TicketmasterEvent {
  id: string;
  name: string;
  dates: {
    start: {
      localDate: string;
      localTime: string;
    };
    status: {
      code: string;
    };
  };
  priceRanges?: Array<{
    min: number;
    max: number;
    currency: string;
  }>;
  seatmap?: {
    staticUrl: string;
  };
  classifications?: Array<{
    segment: { name: string };
    genre: { name: string };
  }>;
  _embedded?: {
    venues?: Array<{
      name: string;
      city: { name: string };
      capacity?: number;
    }>;
  };
}

export const ticketmasterService = {
  /**
   * Fetch event details from our local backend proxy
   * @param eventId The Ticketmaster event ID
   */
  async getEventDetails(eventId: string): Promise<TicketmasterEvent | null> {
    try {
      const response = await axios.get(`/api/ticketmaster/events/${eventId}`);
      return response.data;
    } catch (error: any) {
      // Don't log 404 as an error in console, it just means availability isn't linked for this demo ID
      if (error.response?.status !== 404) {
        console.error('Error fetching event details via backend proxy:', error);
      }
      return null;
    }
  },

  /**
   * Search for events via our local backend proxy
   * @param keyword Artist or event name
   */
  async searchEvents(keyword: string): Promise<TicketmasterEvent[]> {
    try {
      const response = await axios.get(`/api/ticketmaster/search`, {
        params: {
          keyword,
          size: 10,
        },
      });
      return response.data._embedded?.events || [];
    } catch (error) {
      console.error('Error searching events via backend proxy:', error);
      return [];
    }
  },

  /**
   * Simplistic mock of "available seats" since Discovery API doesn't give real-time inventory count
   * usually it requires Commerce API. We can "calculate" a fake availability based on capacity
   * or just return the status.
   */
  getMockAvailability(event: TicketmasterEvent) {
    // If capacity is available, we return a derived number
    const capacity = event._embedded?.venues?.[0]?.capacity || 1000;
    
    // Use the event ID to seed a consistent-ish number for the demo
    const seed = event.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const available = Math.floor(((seed % 40) + 10) / 100 * capacity);
    
    return {
      total: capacity,
      available: event.dates.status.code === 'onsale' ? available : 0,
      status: event.dates.status.code
    };
  }
};

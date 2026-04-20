import { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Loader2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { EVENTS } from '../constants';
import EventCard from '../components/EventCard';
import { motion } from 'motion/react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Event } from '../types';
import { EventCardSkeleton } from '../components/Skeleton';

// Types for better error reporting
enum OperationType {
  LIST = 'list',
  GET = 'get',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
  }
}

export default function EventsList() {
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [dbEvents, setDbEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  };

  useEffect(() => {
    const path = 'events';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Event[];
      
      setDbEvents(eventsData);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const categories = ['Todos', 'Concierto', 'Deportes', 'Festival', 'Cultura'];

  const allEvents = [...dbEvents, ...EVENTS];

  const filteredEvents = allEvents.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          event.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || event.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 md:px-8 max-w-7xl mx-auto space-y-12">
      <div className="space-y-4 text-center md:text-left">
        <h1 className="text-5xl md:text-7xl font-display font-extrabold tracking-tighter uppercase">
          Explorar <span className="text-brand">Eventos</span>
        </h1>
        <p className="text-white/50 text-lg max-w-2xl">
          Busca y encuentra los boletos para tus conciertos, deportes y festivales favoritos.
        </p>
      </div>

      {/* Filters Hub */}
      <div className="flex flex-col lg:flex-row gap-6 items-center justify-between sticky top-24 z-30 py-6 bg-surface border border-border rounded-[8px] px-8">
        {/* Search */}
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <input 
            type="text" 
            placeholder="Busca artistas, recintos o ciudad..."
            className="w-full bg-dark border border-border rounded-[4px] py-3 pl-12 pr-6 text-white text-sm focus:outline-none focus:border-brand transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Categories */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar w-full lg:w-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2 rounded-[4px] text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
                selectedCategory === cat 
                ? 'bg-brand text-white border border-brand' 
                : 'bg-white/5 text-text-muted border border-border hover:bg-white/10 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Advanced Filters Button */}
        <button className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm font-bold">
          <SlidersHorizontal size={18} />
          <span>Filtros Avanzados</span>
        </button>
      </div>

      {/* Results Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {[...Array(8)].map((_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredEvents.map((event, idx) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
            >
              <EventCard event={event} />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center space-y-4">
          <div className="text-6xl">🎫</div>
          <h2 className="text-2xl font-bold">No encontramos eventos</h2>
          <p className="text-white/40">Intenta con otros términos de búsqueda o categoría.</p>
        </div>
      )}
    </div>
  );
}

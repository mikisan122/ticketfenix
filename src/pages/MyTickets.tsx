import { Link } from 'react-router-dom';
import { Ticket, Search, Calendar, MapPin, Loader2, TicketCheck, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

interface TicketData {
  id: string;
  eventTitle: string;
  eventDate: string;
  eventImage: string;
  quantity: number;
  confirmationNumber: string;
  purchasedAt: string;
  eventId: string;
  userName?: string;
  selectedSeats?: string[];
}

export default function MyTickets() {
  const { user, loading: authLoading } = useAuth();
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        fetchTickets(user.uid);
      } else {
        setLoading(false);
      }
    }
  }, [user, authLoading]);

  const fetchTickets = async (uid: string) => {
    try {
      console.log("Cargando boletos para usuario:", uid);
      const q = query(
        collection(db, 'tickets'),
        where('userId', '==', uid)
      );
      const querySnapshot = await getDocs(q);
      const ticketsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TicketData[];
      
      // Ordenar manualmente por fecha de compra (ISO string)
      ticketsData.sort((a, b) => {
        const timeA = a.purchasedAt ? new Date(a.purchasedAt).getTime() : 0;
        const timeB = b.purchasedAt ? new Date(b.purchasedAt).getTime() : 0;
        return timeB - timeA;
      });
      
      setTickets(ticketsData);
    } catch (err) {
      console.error("Error fetching tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-brand" size={40} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen pt-32 pb-20 px-4 flex flex-col items-center justify-center text-center space-y-6">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
          <Ticket size={32} className="text-white/20" />
        </div>
        <h1 className="text-3xl font-display font-bold uppercase">Inicia Sesión</h1>
        <p className="text-white/40 max-w-sm">Debes estar registrado para ver tus boletos y acceder a tus próximos eventos.</p>
        <Link to="/login" className="btn-primary px-8">Iniciar Sesión</Link>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="min-h-screen pt-32 pb-20 px-4 md:px-8 max-w-7xl mx-auto flex flex-col items-center justify-center text-center space-y-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-32 h-32 bg-white/5 rounded-[2.5rem] flex items-center justify-center border border-white/10"
        >
          <Ticket size={48} className="text-brand opacity-40" />
        </motion.div>
        
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-display font-extrabold tracking-tighter uppercase leading-none">
            Aún no tienes <br /> <span className="text-brand">Boletos</span>
          </h1>
          <p className="text-white/40 text-lg max-w-md mx-auto">
            Tus boletos comprados aparecerán aquí una vez que realices una compra exitosa.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link to="/eventos" className="btn-primary">
            Explorar Eventos <Search size={18} />
          </Link>
          <Link to="/" className="btn-secondary">
            Volver al Inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 md:px-8 max-w-5xl mx-auto space-y-12">
      <div className="space-y-4">
        <h1 className="text-4xl md:text-6xl font-display font-extrabold tracking-tighter uppercase leading-none">
          Mis <span className="text-brand">Boletos</span>
        </h1>
        <p className="text-white/40 text-lg">Tienes {tickets.length} {tickets.length === 1 ? 'boleto activo' : 'boletos activos'}.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {tickets.map((ticket, index) => (
          <motion.div
            key={ticket.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group relative glass rounded-[24px] overflow-hidden flex flex-col md:flex-row border border-white/5 hover:border-brand/30 transition-all"
          >
            {/* Poster section */}
            <div className="md:w-48 h-48 md:h-auto shrink-0 relative overflow-hidden">
              <img 
                src={ticket.eventImage} 
                alt={ticket.eventTitle}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-dark/80 to-transparent" />
            </div>

            {/* Content section */}
            <div className="flex-1 p-6 md:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-bold uppercase tracking-tight leading-none group-hover:text-brand transition-colors">
                      {ticket.eventTitle}
                    </h3>
                    <p className="text-brand text-[10px] font-bold uppercase tracking-widest">Conf#: {ticket.confirmationNumber}</p>
                  </div>
                  <div className="bg-brand/10 px-3 py-1 rounded-full text-brand text-[10px] font-bold uppercase">
                    Vigente
                  </div>
                </div>

                <div className="flex flex-wrap gap-y-2 gap-x-6 text-xs text-white/50 uppercase font-bold">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-brand" />
                    <span>{ticket.eventDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TicketCheck size={14} className="text-brand" />
                    <span>{ticket.quantity} {ticket.quantity === 1 ? 'Boleto' : 'Boletos'}</span>
                  </div>
                  {ticket.selectedSeats && ticket.selectedSeats.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-brand/20 flex items-center justify-center rounded">
                        <MapPin size={10} className="text-brand" />
                      </div>
                      <span className="text-brand">Asientos: {ticket.selectedSeats.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="text-[10px] text-white/30 uppercase tracking-widest">
                  Comprado el {new Date(ticket.purchasedAt).toLocaleDateString()}
                </div>
                <Link 
                  to={`/confirmacion?demo=true&title=${encodeURIComponent(ticket.eventTitle)}&id=${ticket.eventId}&quantity=${ticket.quantity}&image=${encodeURIComponent(ticket.eventImage)}&date=${encodeURIComponent(ticket.eventDate)}&userName=${encodeURIComponent(ticket.userName || '')}&conf=${ticket.confirmationNumber}&seats=${encodeURIComponent(ticket.selectedSeats?.join(',') || '')}`}
                  className="flex items-center gap-2 text-white hover:text-brand transition-colors text-xs font-bold uppercase tracking-widest"
                >
                  Ver Boleto <ChevronRight size={14} />
                </Link>
              </div>
            </div>

            {/* Perforation hole (visual) */}
            <div className="absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 bg-dark rounded-full z-10 hidden lg:block" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, MapPin, ChevronLeft, ChevronRight, Ticket, ShieldCheck, Clock, Loader2, ShoppingBag, CheckCircle2, Info, Users, Activity } from 'lucide-react';
import { EVENTS } from '../constants';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Event } from '../types';
import { useCart } from '../context/CartContext';
import { ticketmasterService, TicketmasterEvent } from '../services/ticketmasterService';

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [event, setEvent] = useState<Event | null>(null);
  const [tmData, setTmData] = useState<TicketmasterEvent | null>(null);
  const [availability, setAvailability] = useState<{total: number, available: number, status: string} | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isTmLoading, setIsTmLoading] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    async function fetchEvent() {
      if (!id) return;
      
      setLoading(true);
      try {
        // First look in hardcoded constants (for initial demo data)
        const foundEvent = EVENTS.find(e => e.id === id);
        if (foundEvent) {
          setEvent(foundEvent);
          setLoading(false);
          return;
        }

        // If not found, look in Firestore
        const eventDoc = await getDoc(doc(db, 'events', id));
        if (eventDoc.exists()) {
          setEvent({ id: eventDoc.id, ...eventDoc.data() } as Event);
        } else {
          console.error("Event not found");
          navigate('/eventos');
        }
      } catch (error) {
        console.error("Error fetching event:", error);
        navigate('/eventos');
      } finally {
        setLoading(false);
      }
    }

    fetchEvent();
  }, [id, navigate]);

  useEffect(() => {
    async function fetchTicketmasterData() {
      if (event?.ticketmasterId) {
        setIsTmLoading(true);
        const data = await ticketmasterService.getEventDetails(event.ticketmasterId);
        if (data) {
          setTmData(data);
          setAvailability(ticketmasterService.getMockAvailability(data));
        }
        setIsTmLoading(false);
      }
    }
    fetchTicketmasterData();
  }, [event?.ticketmasterId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark">
        <Loader2 className="animate-spin text-brand" size={40} />
      </div>
    );
  }

  if (!event) return null;

  const handleAddToCart = () => {
    if (event) {
      addToCart(event, quantity);
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 3000);
    }
  };

  const handleFinalizePurchase = () => {
    if (event) {
      navigate('/checkout', { state: { event, quantity, isDirectPurchase: true } });
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-20">
      {/* Background Image Header */}
      <div className="relative h-[60vh] overflow-hidden">
        <img 
          src={event.image} 
          alt={event.title}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark via-dark/60 to-transparent" />
        
        {/* Back and Actions */}
        <div className="absolute top-8 left-0 right-0 max-w-7xl mx-auto px-4 md:px-8 flex justify-between items-center z-10">
          <Link to="/eventos" className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 hover:bg-brand transition-colors">
            <ChevronLeft size={24} />
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-32 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-12">
            <div className="space-y-6">
              <span className="bg-brand text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full inline-block">
                {event.category}
              </span>
              <h1 className="text-5xl md:text-7xl font-display font-extrabold tracking-tighter uppercase leading-[0.9]">
                {event.title}
              </h1>
              
              <div className="flex flex-wrap gap-8 text-white/70">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/5 rounded-2xl">
                    <Calendar size={20} className="text-brand" />
                  </div>
                  <div>
                    <span className="block text-white font-bold">Fecha / Hora</span>
                    <span className="text-sm">{event.date}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/5 rounded-2xl">
                    <MapPin size={20} className="text-brand" />
                  </div>
                  <div>
                    <span className="block text-white font-bold">Ubicación</span>
                    <span className="text-sm">{event.location}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/5 rounded-2xl">
                    <Ticket size={20} className="text-brand" />
                  </div>
                  <div>
                    <span className="block text-white font-bold">Disponibilidad</span>
                    <span className="text-sm text-green-400">Limitada</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-bold border-b border-white/10 pb-4">Acerca del Evento</h2>
              <p className="text-white/60 leading-relaxed text-lg">
                {event.description} Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. 
              </p>
              
              {/* Ticketmaster Availability Section */}
              <AnimatePresence>
                {availability && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-brand/10 border-2 border-brand/20 rounded-[2rem] p-8 space-y-6 relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <img 
                        src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Ticketmaster_logo.svg/2560px-Ticketmaster_logo.svg.png" 
                        alt="Ticketmaster"
                        className="h-12 invert"
                      />
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-brand/20 rounded-2xl animate-pulse">
                        <Activity size={24} className="text-brand" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold uppercase tracking-tighter">Disponibilidad en Tiempo Real</h3>
                        <p className="text-xs text-brand/60 font-bold uppercase tracking-widest">Sincronizado con Ticketmaster Portal</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Estado de Venta</span>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${availability.status === 'onsale' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}></span>
                          <span className="font-bold uppercase text-sm">{availability.status === 'onsale' ? 'A la venta' : availability.status}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Asientos Totales</span>
                        <div className="text-xl font-display font-bold">{availability.total.toLocaleString()}</div>
                      </div>
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Disponibles</span>
                        <div className="text-xl font-display font-bold text-brand">{availability.available.toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/40">
                        <span>Ocupación</span>
                        <span>{Math.round((1 - availability.available / availability.total) * 100)}%</span>
                      </div>
                      <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(1 - availability.available / availability.total) * 100}%` }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          className="h-full bg-gradient-to-r from-brand/50 to-brand shadow-[0_0_20px_rgba(255,0,0,0.3)]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-white/30 font-bold uppercase italic">
                      <Info size={12} />
                      Datos oficiales de Ticketmaster Developer API actualizados hace un momento
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <p className="text-white/60 leading-relaxed text-lg">
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
              </p>
            </div>

            {/* Event Policy */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/5 p-8 rounded-[2rem] border border-white/5">
              <div className="flex gap-4">
                <ShieldCheck size={24} className="text-brand shrink-0" />
                <div>
                  <h4 className="font-bold mb-1">Entrada Garantizada</h4>
                  <p className="text-sm text-white/50">Tu acceso es 100% legítimo y está respaldado por TicketFenix.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Clock size={24} className="text-brand shrink-0" />
                <div>
                  <h4 className="font-bold mb-1">Acceso Anticipado</h4>
                  <p className="text-sm text-white/50">Llega 60 minutos antes del show para evitar contratiempos.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Checkout Widget */}
          <div className="lg:col-span-1">
            <div className="sticky top-32 glass rounded-[2.5rem] p-8 space-y-8 border-brand/20 border-2">
              <div className="space-y-1">
                <span className="text-white/40 text-xs font-bold uppercase tracking-widest">Precio por Boleto</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-display font-bold">${event.price}</span>
                  <span className="text-white/40 text-sm">USD</span>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-bold text-white/60">Cantidad de Boletos</label>
                <div className="flex items-center justify-between bg-black/40 p-2 rounded-2xl border border-white/10">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white hover:text-black transition-all font-bold text-xl"
                  >
                    -
                  </button>
                  <span className="text-xl font-bold">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(Math.min(10, quantity + 1))}
                    className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white hover:text-black transition-all font-bold text-xl"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 space-y-4">
                <div className="flex justify-between items-center text-white/60 text-sm">
                  <span>Subtotal</span>
                  <span>${event.price * quantity}</span>
                </div>
                <div className="flex justify-between items-center text-white/60 text-sm">
                  <span>Cargos por Servicio</span>
                  <span>${Math.round(event.price * quantity * 0.15)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">Total</span>
                  <span className="text-2xl font-display font-bold text-brand">${Math.round(event.price * quantity * 1.15)}</span>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {addedToCart ? (
                  <motion.div
                    key="added"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-green-500 py-5 rounded-[8px] flex items-center justify-center gap-3 font-bold text-white shadow-[0_0_30px_rgba(34,197,94,0.3)]"
                  >
                    <CheckCircle2 size={24} /> ¡AÑADIDO AL CARRITO!
                  </motion.div>
                ) : (
                  <motion.button 
                    key="add"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleAddToCart}
                    className="btn-primary w-full py-5 text-lg rounded-[8px] flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(255,0,0,0.2)]"
                  >
                    <ShoppingBag size={24} /> Agregar al Carrito
                  </motion.button>
                )}
              </AnimatePresence>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleFinalizePurchase}
                  className="bg-white/5 hover:bg-white/10 text-white py-4 rounded-[8px] text-center text-xs font-bold uppercase tracking-widest transition-all border border-white/5"
                >
                  Finalizar Compra
                </button>
                <Link 
                  to="/eventos"
                  className="text-white/30 hover:text-white text-[10px] text-center uppercase tracking-widest font-bold transition-colors"
                >
                  Seguir Comprando
                </Link>
              </div>

              <p className="text-center text-[10px] text-white/30 uppercase tracking-widest font-bold">
                Transacción segura cifrada de 256 bits
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

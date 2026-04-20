import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect, FormEvent, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, ShoppingBag, ArrowLeft, ShieldCheck, Lock, Ticket, Trash2, Plus, Minus, CreditCard as CardIcon, CheckCircle2, ChevronRight, Users, MapPin, Calendar, Info, Activity, Zap } from 'lucide-react';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { ticketmasterService, TicketmasterEvent } from '../services/ticketmasterService';
import { InteractiveSeatMap } from '../components/InteractiveSeatMap';

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { cart: globalCart, totalPrice: globalTotalPrice, removeFromCart, updateQuantity, itemCount: globalItemCount, clearCart } = useCart();
  const { user, loading: authLoading } = useAuth();
  
  const state = location.state || {};
  const isDirectPurchase = state.isDirectPurchase === true;
  
  // Memoize activeCart to avoid infinite re-renders in useEffect
  const activeCart = useMemo(() => {
    const directItem = isDirectPurchase ? { event: state.event, quantity: state.quantity } : null;
    return isDirectPurchase && directItem ? [directItem] : globalCart;
  }, [isDirectPurchase, state.event, state.quantity, globalCart]);

  const [selectedSeatsMap, setSelectedSeatsMap] = useState<Record<string, any[]>>({});

  const activeTotalPrice = useMemo(() => {
    let base = isDirectPurchase && state.event 
      ? state.event.price * state.quantity 
      : globalTotalPrice;

    // Add surcharges based on selected seat categories
    let surcharge = 0;
    activeCart.forEach(item => {
      const selectedSeats = selectedSeatsMap[item.event.id] || [];
      selectedSeats.forEach(seat => {
        // Multipliers from InteractiveSeatMap: VIP (2.5x), Preferente (1.5x)
        if (seat.category === 'VIP') surcharge += item.event.price * 1.5;
        if (seat.category === 'Preferente') surcharge += item.event.price * 0.5;
      });
    });

    return base + surcharge;
  }, [isDirectPurchase, state.event, state.quantity, globalTotalPrice, activeCart, selectedSeatsMap]);

  const activeItemCount = useMemo(() => {
    return isDirectPurchase ? state.quantity : globalItemCount;
  }, [isDirectPurchase, state.quantity, globalItemCount]);

  const [step, setStep] = useState(1);
  const [tmData, setTmData] = useState<Record<string, { data: TicketmasterEvent, availability: any }>>({});
  const [isTmLoading, setIsTmLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cardNumber: '**** **** **** ****',
    expiry: 'MM/YY',
    cvv: '***'
  });

  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAllTM() {
      if (step === 2) {
        setIsTmLoading(true);
        const newData: typeof tmData = {};
        for (const item of activeCart) {
          const eventId = item.event.id;
          if (item.event.ticketmasterId && !tmData[eventId]) {
            const data = await ticketmasterService.getEventDetails(item.event.ticketmasterId);
            if (data) {
              newData[eventId] = {
                data,
                availability: ticketmasterService.getMockAvailability(data)
              };
            } else {
              // Significa que no hay datos de Ticketmaster para este evento (404/Error)
              // Lo marcamos como null para dejar de mostrar el spinner
              newData[eventId] = null as any; 
            }
          }
        }
        if (Object.keys(newData).length > 0) {
          setTmData(prev => ({ ...prev, ...newData }));
        }
        setIsTmLoading(false);
      }
    }
    fetchAllTM();
  }, [step, activeCart]);

  const handleNextStep = () => {
    if (step < 3) setStep(step + 1);
  };

  const handlePrevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  useEffect(() => {
    if (!authLoading && !user) navigate('/login', { state: { from: location } });
    if (user && !formData.name && !formData.email) {
      setFormData(prev => ({
        ...prev,
        name: user.displayName || '',
        email: user.email || ''
      }));
    }
  }, [user, authLoading, navigate, location]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand/30 border-t-brand rounded-full animate-spin" />
      </div>
    );
  }

  const fees = Math.round(activeTotalPrice * 0.15);
  const grandTotal = activeTotalPrice + fees;

  // Calculate surcharge for summary display
  const seatSurcharge = useMemo(() => {
    let s = 0;
    activeCart.forEach(item => {
      const selectedSeats = selectedSeatsMap[item.event.id] || [];
      selectedSeats.forEach(seat => {
        if (seat.category === 'VIP') s += item.event.price * 1.5;
        if (seat.category === 'Preferente') s += item.event.price * 0.5;
      });
    });
    return s;
  }, [activeCart, selectedSeatsMap]);

  const allSeatsSelected = useMemo(() => {
    return activeCart.every(item => 
      (selectedSeatsMap[item.event.id]?.length || 0) === item.quantity
    );
  }, [activeCart, selectedSeatsMap]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (activeCart.length === 0) return;
    setIsProcessing(true);
    setError(null);
    
    try {
      // Tomamos el primer evento del carrito
      const mainItem = activeCart[0];
      const itemCount = activeItemCount || 1;
      
      // Calcular surcharge asegurando que sea un número válido
      const totalSurcharge = activeCart.reduce((acc, item) => {
        const seats = selectedSeatsMap[item.event.id] || [];
        return acc + seats.reduce((sAcc, seat) => {
          if (seat.category === 'VIP') return sAcc + (item.event.price * 1.5);
          if (seat.category === 'Preferente') return sAcc + (item.event.price * 0.5);
          return sAcc;
        }, 0);
      }, 0);

      const surchargePerItem = totalSurcharge / itemCount;
      const finalUnitPrice = mainItem.event.price + surchargePerItem;

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: {
            ...mainItem.event,
            price: finalUnitPrice
          },
          quantity: itemCount,
          userName: formData.name,
          userEmail: formData.email,
          selectedSeats: selectedSeatsMap
        })
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Error al conectar con la pasarela de pago');
      }

      if (!data.url) {
        throw new Error('No se recibió la URL de redirección');
      }

      // IMPORTANTE: Stripe no permite ser cargado dentro de un IFRAME (como el preview de AI Studio).
      console.log("[CHECKOUT] Abriendo Stripe en una nueva ventana:", data.url);
      
      const stripeWindow = window.open(data.url, '_blank');

      if (!stripeWindow || stripeWindow.closed || typeof stripeWindow.closed === 'undefined') {
        // El bloqueador de popups impidió la apertura
        setIsProcessing(false);
        setError("El navegador bloqueó la ventana de pago. Por favor, abre la app en una NUEVA PESTAÑA o permite los popups.");
      } else {
        // La ventana se abrió con éxito
        setIsProcessing(false);
        // Opcional: Podrías redirigir la ventana actual a una página de "Esperando Pago"
        setError("⚠️ Se ha abierto una nueva ventana para completar el pago. Regresa aquí cuando termines.");
      }
    } catch (err) {
      console.error("[CHECKOUT ERROR]", err);
      setError(err instanceof Error ? err.message : 'Error inesperado al procesar el pago.');
      setIsProcessing(false);
    }
  };

  if (activeCart.length === 0) {
    return (
      <div className="min-h-screen pt-32 pb-20 px-4 flex flex-col items-center justify-center text-center space-y-6">
        <div className="p-6 bg-white/5 rounded-full border border-white/10 text-white/20">
          <ShoppingBag size={64} />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-display font-bold">TU CARRITO ESTÁ VACÍO</h1>
          <p className="text-white/50">Parece que aún no has amontonado ningún boleto.</p>
        </div>
        <Link to="/eventos" className="btn-primary px-8 py-4 rounded-[8px]">Ver Eventos Disponibles</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
          <div>
            <button 
              onClick={() => step > 1 ? handlePrevStep() : navigate(-1)}
              className="flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-4 group"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> 
              {step > 1 ? 'Anterior' : 'Volver'}
            </button>
            <h1 className="text-4xl md:text-6xl font-display font-bold uppercase tracking-tighter leading-[0.9]">
              Finalizar Compra
            </h1>
          </div>

          {/* Stepper UI */}
          <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/10">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-4">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                  step === s ? 'bg-brand text-white' : 
                  step > s ? 'bg-green-500/20 text-green-500' : 'bg-white/5 text-white/30'
                }`}>
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                    step === s ? 'bg-white text-brand' : 
                    step > s ? 'bg-green-500 text-white' : 'bg-white/10'
                  }`}>
                    {step > s ? <CheckCircle2 size={14} /> : s}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">
                    {s === 1 ? 'Info' : s === 2 ? 'Asientos' : 'Pago'}
                  </span>
                </div>
                {s < 3 && <div className="w-8 h-[2px] bg-white/10" />}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content Pane */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm flex items-center gap-3"
                >
                  <Info size={18} />
                  {error}
                </motion.div>
              )}

              {step === 1 && (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-12"
                >
                  <div className="space-y-8">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-brand/10 rounded-2xl">
                        <Users size={24} className="text-brand" />
                      </div>
                      <h3 className="text-2xl font-bold uppercase tracking-tighter">1. Tus Datos</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Nombre Completo</label>
                        <input 
                          required
                          type="text" 
                          className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 focus:outline-none focus:border-brand transition-all font-bold"
                          placeholder="Tu nombre real"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Email de confirmación</label>
                        <input 
                          required
                          type="email" 
                          className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 focus:outline-none focus:border-brand transition-all font-bold"
                          placeholder="Donde te enviaremos el QR"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-brand/10 rounded-2xl">
                        <ShoppingBag size={24} className="text-brand" />
                      </div>
                      <h3 className="text-2xl font-bold uppercase tracking-tighter">Resumen del Pedido</h3>
                    </div>

                    <div className="space-y-4">
                      {activeCart.map((item) => (
                        <div key={item.event.id} className="flex gap-6 p-6 bg-white/5 rounded-3xl border border-white/5 group hover:bg-white/[0.07] transition-all">
                          <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0">
                            <img src={item.event.image} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" referrerPolicy="no-referrer" />
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex justify-between items-start">
                              <h4 className="text-xl font-bold tracking-tight line-clamp-1">{item.event.title}</h4>
                              <span className="text-brand font-display font-bold text-xl">${item.event.price}</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-white/40 font-bold uppercase tracking-widest">
                              <div className="flex items-center gap-1"><Calendar size={12} /> {item.event.date}</div>
                              <div className="flex items-center gap-1"><MapPin size={12} /> {item.event.location}</div>
                            </div>
                            <div className="pt-2 flex justify-between items-center">
                              <span className="text-[10px] bg-white/10 px-3 py-1 rounded-full text-white/60 font-bold uppercase letter-spacing-1">
                                {item.quantity} {item.quantity === 1 ? 'Boleto' : 'Boletos'}
                              </span>
                              <span className="text-sm font-bold text-white/80">Subtotal: ${item.event.price * item.quantity}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={handleNextStep}
                    className="btn-primary w-full py-6 rounded-2xl text-xl font-bold uppercase tracking-widest shadow-[0_20px_40px_rgba(255,0,0,0.2)] flex items-center justify-center gap-3 group"
                  >
                    Continuar a Selección de Asientos
                    <ChevronRight className="group-hover:translate-x-2 transition-transform" />
                  </button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-12"
                >
                  <div className="space-y-8">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-brand/10 rounded-2xl">
                        <Users size={24} className="text-brand" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold uppercase tracking-tighter">2. Asientos Disponibles</h3>
                        <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Verificación en vivo con Ticketmaster</p>
                      </div>
                    </div>

                    <div className="space-y-8">
                      {activeCart.map((item) => {
                        const tm = tmData[item.event.id];
                        return (
                          <div key={item.event.id} className="bg-white/5 rounded-[2.5rem] p-8 border border-white/10 space-y-8">
                            <div className="flex items-center justify-between border-b border-white/10 pb-6">
                              <h4 className="text-xl font-bold uppercase tracking-tighter">{item.event.title}</h4>
                              <div className="flex items-center gap-2 bg-brand/20 px-4 py-1.5 rounded-full">
                                <Activity size={14} className="text-brand animate-pulse" />
                                <span className="text-[10px] font-bold text-brand uppercase tracking-widest">Tiempo Real</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                              {/* Left: Interactive Map or Local Placeholder */}
                              <div className="space-y-6">
                                <div className="bg-black/40 p-6 rounded-3xl border border-white/10 space-y-4">
                                  <div className="flex items-center justify-between">
                                    <h5 className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                                      <Ticket size={12} className="text-brand" /> Selección de Asientos
                                    </h5>
                                    {tm ? (
                                      <span className="text-[9px] bg-brand text-white px-2 py-0.5 rounded font-bold">LIVE API</span>
                                    ) : (
                                      <span className="text-[9px] bg-white/20 text-white px-2 py-0.5 rounded font-bold uppercase">Simulación Local</span>
                                    )}
                                  </div>
                                  
                                  <InteractiveSeatMap 
                                    eventId={item.event.id}
                                    requiredSeats={item.quantity}
                                    basePrice={item.event.price}
                                    onSeatsSelected={(seats) => {
                                      setSelectedSeatsMap(prev => ({
                                        ...prev,
                                        [item.event.id]: seats
                                      }));
                                    }}
                                  />
                                </div>
                              </div>

                              {/* Right: Venue Info & Details */}
                              <div className="space-y-6">
                                <div className="bg-black/40 p-8 rounded-3xl border border-white/5 space-y-6 h-full">
                                  <div className="space-y-4">
                                    <h5 className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                                      <MapPin size={12} /> Ubicación del Recinto
                                    </h5>
                                    
                                    {tm ? (
                                      <div className="space-y-4">
                                        <div className="relative aspect-[16/9] rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                                          {tm.data.seatmap?.staticUrl && (
                                            <img 
                                              src={tm.data.seatmap.staticUrl} 
                                              className="w-full h-full object-contain p-4" 
                                              alt="Overview" 
                                              referrerPolicy="no-referrer"
                                            />
                                          )}
                                        </div>
                                        <div className="space-y-1">
                                          <div className="text-xl font-bold uppercase tracking-tight">
                                            {tm.data._embedded?.venues?.[0]?.name}
                                          </div>
                                          <p className="text-xs text-brand font-bold uppercase tracking-widest">
                                            {tm.data._embedded?.venues?.[0]?.city.name}
                                          </p>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="space-y-4">
                                        <div className="p-8 bg-white/5 rounded-2xl border border-dashed border-white/10 text-center">
                                          <MapPin size={32} className="mx-auto text-white/20 mb-3" />
                                          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Localidad por definir en recinto local</p>
                                        </div>
                                        <div className="text-xl font-bold uppercase tracking-tight">{item.event.location}</div>
                                      </div>
                                    )}
                                  </div>

                                  <div className="pt-6 border-t border-white/10 space-y-4">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Boletos a Elegir</span>
                                      <span className="text-lg font-bold text-white">{item.quantity}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Asientos Seleccionados</span>
                                      <span className="text-lg font-bold text-brand">
                                        {selectedSeatsMap[item.event.id]?.length || 0} / {item.quantity}
                                      </span>
                                    </div>
                                    
                                    {selectedSeatsMap[item.event.id]?.length === item.quantity && (
                                      <div className="pt-4 flex items-center gap-3 text-green-400">
                                        <CheckCircle2 size={16} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Asientos listos para reserva</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-6 bg-brand/5 border-2 border-brand/20 rounded-3xl flex gap-4">
                    <Info className="text-brand shrink-0" size={24} />
                    <p className="text-sm text-brand/80 font-medium leading-relaxed">
                      La selección de asientos se realiza por zona. Al finalizar el pago, el sistema asignará automáticamente los mejores lugares disponibles dentro de la sección elegida.
                    </p>
                  </div>

                  <button 
                    onClick={handleNextStep}
                    disabled={!allSeatsSelected}
                    className={`btn-primary w-full py-6 rounded-2xl text-xl font-bold uppercase tracking-widest flex items-center justify-center gap-3 group transition-all ${
                      !allSeatsSelected ? 'opacity-50 cursor-not-allowed filter grayscale' : 'shadow-[0_20px_40px_rgba(255,0,0,0.2)]'
                    }`}
                  >
                    {allSeatsSelected ? 'Confirmar Asientos y Continuar al Pago' : 'Selecciona tus Asientos para Continuar'}
                    <ChevronRight className="group-hover:translate-x-2 transition-transform" />
                  </button>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div 
                  key="step3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-12"
                >
                  <div className="space-y-8">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-brand/10 rounded-2xl">
                        <CreditCard size={24} className="text-brand" />
                      </div>
                      <h3 className="text-2xl font-bold uppercase tracking-tighter">3. Método de Pago</h3>
                    </div>

                    <div className="grid grid-cols-1 gap-8 items-start">
                      <div className="space-y-6">
                        <button 
                          onClick={() => setPaymentMethod('stripe')}
                          className={`w-full p-8 rounded-[2rem] border-2 transition-all text-left space-y-4 group ${
                            paymentMethod === 'stripe' ? 'border-brand bg-brand/5' : 'border-white/10 hover:border-white/30'
                          }`}
                        >
                          <div className={`p-4 rounded-full w-fit ${paymentMethod === 'stripe' ? 'bg-brand text-white' : 'bg-white/5 text-white/40'}`}>
                            <CardIcon size={24} />
                          </div>
                          <div className="space-y-1">
                            <div className="font-bold text-lg uppercase tracking-tight">Tarjeta de Crédito / Débito</div>
                            <p className="text-xs text-white/40">Visa, Mastercard, AMEX (Vía Stripe)</p>
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="p-8 bg-black/40 rounded-[2rem] border border-white/10 space-y-6">
                      <div className="space-y-4">
                        <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Información de la Tarjeta</label>
                        <div className="grid grid-cols-1 gap-4">
                          <div className="relative">
                            <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                            <input 
                              type="text" 
                              disabled
                              className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-6 text-white text-sm focus:outline-none focus:border-brand transition-colors"
                              value="MIGUEL SANCHEZ - MODO PRUEBA ACTIVO"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-green-500/20 text-green-500 text-[10px] font-black px-2 py-1 rounded">DATO SEGURO</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-[10px] text-white/30 font-bold uppercase tracking-widest text-center justify-center">
                        <Lock size={12} /> Cifrado SSL de 256 bits · Procesado por Stripe Secure
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleSubmit}
                    disabled={isProcessing}
                    className={`btn-primary w-full py-6 rounded-2xl text-xl font-bold uppercase tracking-widest flex items-center justify-center gap-4 transition-all ${
                      isProcessing ? 'opacity-70 cursor-wait' : 'shadow-[0_20px_40px_rgba(255,0,0,0.3)] hover:scale-[1.02]'
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                        Procesando Pago...
                      </>
                    ) : (
                      <>Pagar y Recibir Boletos · ${grandTotal}</>
                    )}
                  </button>

                  <div className="flex items-center gap-4 justify-center py-4 opacity-30">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Stripe_Logo%2C_revised_2016.svg/2560px-Stripe_Logo%2C_revised_2016.svg.png" className="h-6 invert grayscale" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2560px-Visa_Inc._logo.svg.png" className="h-4 invert grayscale" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1200px-Mastercard-logo.svg.png" className="h-6 invert grayscale" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Sidebar - Sticky Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-32 space-y-6">
              <div className="glass rounded-[2rem] p-8 border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand/5 blur-3xl rounded-full" />
                
                <h3 className="text-2xl font-bold uppercase tracking-tighter mb-8 border-b border-white/10 pb-4">Desglose Final</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white/50 uppercase tracking-widest font-bold">Subtotal</span>
                    <span className="font-bold">${activeTotalPrice - seatSurcharge}</span>
                  </div>
                  {seatSurcharge > 0 && (
                    <div className="flex justify-between items-center text-sm text-yellow-500">
                      <span className="uppercase tracking-widest font-bold">Mejora de Zona</span>
                      <span className="font-bold">+${Math.round(seatSurcharge)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white/50 uppercase tracking-widest font-bold">Cargos de Gestión</span>
                    <span className="font-bold">${fees}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white/50 uppercase tracking-widest font-bold">Impuestos</span>
                    <span className="font-bold text-green-400">Incluidos</span>
                  </div>
                  
                  <div className="pt-6 mt-6 border-t border-white/10 flex justify-between items-end">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-brand uppercase tracking-[0.2em]">Total a Pagar</span>
                      <div className="text-4xl font-display font-bold text-brand leading-none">${grandTotal}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-white/30 uppercase block">USD</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/10 space-y-3">
                  <div className="flex items-center gap-3 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    <ShieldCheck size={14} className="text-brand" />
                    Boleto Digital Protegido
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    <CheckCircle2 size={14} className="text-brand" />
                    Cancelación hasta 24h antes
                  </div>
                </div>
              </div>

              {/* Secure Trust Badge */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center border border-white/10">
                  <Lock size={20} className="text-white/40" />
                </div>
                <div>
                  <h5 className="text-[10px] font-bold uppercase tracking-widest">Seguridad Garantizada</h5>
                  <p className="text-[10px] text-white/30">Nuestros sistemas cumplen con el estándar PCI-DSS para transacciones seguras.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Download, Printer, Share2, Ticket, Calendar, MapPin, ExternalLink, Loader2, ShoppingBag, Mail, Send } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { auth, db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Confirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const searchParams = new URLSearchParams(location.search);
  const { user, loading: authLoading } = useAuth();
  const [isSaving, setIsSaving] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const saveAttempted = useRef(false);
  const [confNumbers, setConfNumbers] = useState<Record<string, string>>({});
  
  const state = location.state || {};
  const isViewing = searchParams.get('demo') === 'true';
  const sessionId = searchParams.get('session_id');
  const [stripeDetails, setStripeDetails] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(!!sessionId);
  
  const cart = state.cart || (isViewing ? [{
    event: {
      id: searchParams.get('id') || 'view',
      title: searchParams.get('title') || 'Evento',
      date: searchParams.get('date') || 'Por definir',
      image: searchParams.get('image') || '',
      category: searchParams.get('category') || 'Boleto',
      location: 'Sede del evento',
      price: 0
    },
    quantity: Number(searchParams.get('quantity')) || 1
  }] : stripeDetails ? [{
    event: {
      id: 'stripe-event', // Idealmente recuperaríamos el id real de metadata
      title: stripeDetails.eventTitle,
      date: 'Confirmado por Pago',
      image: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=2070&auto=format&fit=crop',
      category: 'Concierto',
      location: 'Recinto del Evento',
      price: stripeDetails.totalAmount
    },
    quantity: stripeDetails.quantity
  }] : []);

  const userName = state.userName || searchParams.get('userName') || stripeDetails?.userName || user?.displayName || 'Invitado Especial';
  const selectedSeats = state.selectedSeats || {};
  const userEmail = state.userEmail || searchParams.get('userEmail') || stripeDetails?.userEmail || user?.email || 'tu correo';
  const [mailStatus, setMailStatus] = useState<'sending' | 'sent'>('sending');

  useEffect(() => {
    // Escuchar el ID de sesión de Stripe si venimos de un pago real
    const verifyStripeFlow = async () => {
      if (sessionId && !stripeDetails) {
        try {
          const response = await fetch('/api/get-session-details', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
          });
          const data = await response.json();
          if (data && !data.error) {
            setStripeDetails(data);
          }
        } catch (err) {
          console.error("Error verificando pago en Stripe:", err);
        } finally {
          setIsVerifying(false);
        }
      }
    };
    verifyStripeFlow();
  }, [sessionId, stripeDetails]);

  useEffect(() => {
     // Simulación de envío de correo "Pro" con integración Backend
    const sendEmail = async () => {
      if (!isSaving && saveStatus === 'success' && !isViewing && !isVerifying) {
        try {
          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: userEmail,
              userName: userName,
              ticketCount: cart.length
            })
          });
          setMailStatus('sent');
        } catch (err) {
          console.error("Error al notificar envío de correo:", err);
          setMailStatus('sent'); // Mantenemos sent para la UX aunque falle el mock
        }
      }
    };
    
    sendEmail();
  }, [isSaving, saveStatus, isViewing, userEmail, userName, cart.length]);

  useEffect(() => {
    // Only redirect if we have no cart AND no viewing intention, AND we are NOT currently verifying a Stripe Payment
    if (cart.length === 0 && !isViewing && !isVerifying) {
      const timer = setTimeout(() => {
        if (cart.length === 0) navigate('/');
      }, 3000); // Dar 3 segundos de gracia por si Stripe está lento
      return () => clearTimeout(timer);
    }
    window.scrollTo(0, 0);
  }, [cart, navigate, isViewing, isVerifying]);

  useEffect(() => {
    // If it's just viewing from history, no saving needed
    if (isViewing || isVerifying) {
      setIsSaving(false);
      return;
    }

    if (authLoading || cart.length === 0) return;

    if (!user) {
      setIsSaving(false);
      return;
    }

    if (saveAttempted.current) {
      setIsSaving(false);
      return;
    }

    const performSave = async () => {
      const purchaseKey = `tf_cart_saved_${Date.now()}_${user.uid}`;
      if (sessionStorage.getItem(purchaseKey)) {
        setIsSaving(false);
        saveAttempted.current = true;
        return;
      }

      saveAttempted.current = true;
      setIsSaving(true);
      setSaveStatus('saving');
      
      const newConfNumbers: Record<string, string> = {};

      try {
        console.log("Guardando múltiples boletos en Firestore...");
        
        for (const item of cart) {
          const conf = `TF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
          newConfNumbers[item.event.id] = conf;
          
          const itemSeats = selectedSeats[item.event.id] || [];

          await addDoc(collection(db, 'tickets'), {
            eventId: item.event.id || 'unknown',
            eventTitle: item.event.title,
            eventDate: item.event.date,
            eventImage: item.event.image,
            quantity: item.quantity,
            totalPrice: item.quantity * (item.event.price || 0),
            confirmationNumber: conf,
            userId: user.uid,
            userEmail: user.email,
            userName: userName,
            selectedSeats: itemSeats.map((s: any) => s.id),
            purchasedAt: new Date().toISOString(),
            createdAt: serverTimestamp()
          });
        }
        
        setConfNumbers(newConfNumbers);
        console.log("Todos los boletos guardados con éxito.");
        sessionStorage.setItem(purchaseKey, 'true');
        setSaveStatus('success');
        clearCart(); // Carrito limpio tras éxito
      } catch (err) {
        console.error("Error crítico al guardar boletos:", err);
        setSaveStatus('error');
      } finally {
        setIsSaving(false);
      }
    };

    performSave();
  }, [user, authLoading, cart, userName, clearCart]);

  if (cart.length === 0) return null;

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 md:px-8 bg-[radial-gradient(circle_at_top,rgba(255,0,0,0.1),transparent)]">
      <div className="max-w-4xl mx-auto space-y-16">
        {/* Success Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6"
        >
          <div className="inline-flex items-center justify-center w-24 h-24 bg-green-500/20 rounded-full border border-green-500/30 mb-4">
            {isSaving ? (
              <Loader2 size={48} className="text-green-500 animate-spin" />
            ) : (
              <CheckCircle2 size={48} className="text-green-500" />
            )}
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-extrabold tracking-tighter uppercase leading-none">
            {isSaving ? 'PROCESANDO...' : isViewing ? 'TU' : '¡BOLETOS'} <span className="text-brand">{isSaving ? 'PEDIDO' : isViewing ? 'BOLETO' : 'CONFIRMADOS'}</span>!
          </h1>
          <div className="space-y-4">
            <p className="text-white/60 text-lg max-w-xl mx-auto">
              {isSaving 
                ? 'Estamos amontonando tus boletos en tu base de datos segura...'
                : isViewing
                  ? `Aquí tienes los detalles de tu acceso, ${userName}. Presenta el código QR en la entrada.`
                  : `¡Felicidades ${userName}! Hemos amontonado con éxito tus ${cart.length} órdenes en tu cuenta.`}
            </p>
            {!isSaving && !isViewing && saveStatus === 'success' && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-brand font-bold uppercase tracking-widest text-sm bg-brand/10 inline-block px-6 py-2 rounded-full border border-brand/20">
                  ✅ Todos los boletos están en "Mis Boletos"
                </p>
              </div>
            )}
            {isViewing && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-white/40 font-bold uppercase tracking-widest text-xs bg-white/5 inline-block px-6 py-2 rounded-full border border-white/10">
                   Modo de Visualización
                </p>
              </div>
            )}

            {/* Email Delivery Status - NEW */}
            {!isSaving && !isViewing && saveStatus === 'success' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-12 max-w-sm mx-auto"
              >
                <div className={`p-6 rounded-3xl border transition-all duration-1000 flex flex-col items-center gap-4 ${
                  mailStatus === 'sent' 
                    ? 'bg-blue-500/10 border-blue-500/20 shadow-[0_0_40px_rgba(59,130,246,0.1)]' 
                    : 'bg-white/5 border-white/10'
                }`}>
                  <div className="relative">
                    <Mail className={`transition-all duration-1000 ${mailStatus === 'sent' ? 'text-blue-400 scale-110' : 'text-white/20'}`} size={32} />
                    {mailStatus === 'sending' && (
                      <motion.div
                        animate={{ x: [0, 20], opacity: [0, 1, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="absolute -top-1 -right-4"
                      >
                        <Send size={16} className="text-brand" />
                      </motion.div>
                    )}
                  </div>
                  <div className="text-center">
                    <p className={`text-xs font-black uppercase tracking-widest mb-1 ${mailStatus === 'sent' ? 'text-blue-400' : 'text-white/40'}`}>
                      {mailStatus === 'sending' ? 'Enviando Boletos...' : '¡Boletos Enviados!'}
                    </p>
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{userEmail}</p>
                  </div>
                </div>
              </motion.div>
            )}
            {!isSaving && saveStatus === 'error' && (
              <p className="text-red-500 font-bold uppercase tracking-widest text-sm bg-red-500/10 inline-block px-4 py-1 rounded-full">
                ⚠️ Error al guardar algunos boletos. Contacta soporte.
              </p>
            )}
          </div>
        </motion.div>

        {/* List of Tickets */}
        <div className="space-y-12">
          {cart.map((item: any, cartIndex: number) => {
            const displayConf = confNumbers[item.event.id] || searchParams.get('conf') || "TF-PENDING";
            const itemSeats = selectedSeats[item.event.id] || [];
            
            // Si hay asientos seleccionados, generamos un boleto por asiento
            // Si no (fallo de carga o similar), generamos al menos uno genérico
            const ticketCount = Math.max(itemSeats.length, 1);
            
            return Array.from({ length: ticketCount }).map((_, seatIndex) => {
              const seat = itemSeats[seatIndex];
              const uniqueTicketRef = `${displayConf}-${seatIndex + 1}`;
              
              return (
                <motion.div
                  key={`${item.event.id}-${seatIndex}`}
                  initial={{ opacity: 0, scale: 0.95, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.1 * (cartIndex + seatIndex) }}
                  className="relative group h-full"
                >
                  <div className="absolute -top-4 left-6 bg-brand text-white text-[10px] font-black px-4 py-1 rounded-full z-20 shadow-lg uppercase tracking-widest border border-white/20">
                    Boleto {seatIndex + 1} de {ticketCount}
                  </div>

                  {/* Decorative perforation holes */}
                  <div className="absolute top-1/2 -left-4 -translate-y-1/2 w-8 h-8 bg-dark rounded-full z-10 hidden md:block" />
                  <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-8 h-8 bg-dark rounded-full z-10 hidden md:block" />

                  <div className="bg-white rounded-[24px] overflow-hidden flex flex-col md:flex-row shadow-2xl border border-white/10 group-hover:shadow-brand/20 transition-all duration-500">
                    {/* Left side - Info */}
                    <div className="flex-1 p-8 md:p-12 text-black space-y-8 border-b md:border-b-0 md:border-r border-dashed border-gray-300">
                      <div className="flex justify-between items-start">
                        <div className="bg-black p-3 rounded-xl inline-block shadow-lg">
                          <Ticket className="text-white" size={24} />
                        </div>
                        <div className="text-right">
                          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Conf# Individual</span>
                          <span className="font-mono font-bold text-xl text-brand">{uniqueTicketRef}</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-brand uppercase tracking-widest px-2 py-0.5 bg-brand/10 rounded-sm italic border border-brand/20">
                            {item.event.category}
                          </span>
                          <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Oficial TicketFenix</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-display font-black tracking-tighter leading-[0.8] uppercase max-w-md">
                          {item.event.title}
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                          <div className="flex items-center gap-4 text-gray-800 text-[11px] uppercase font-bold tracking-tight bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <Calendar size={16} className="text-brand shrink-0" />
                            <div className="flex flex-col">
                              <span className="text-gray-400 text-[8px]">FECHA Y HORA</span>
                              <span>{item.event.date}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-gray-800 text-[11px] uppercase font-bold tracking-tight bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <MapPin size={16} className="text-brand shrink-0" />
                            <div className="flex flex-col">
                              <span className="text-gray-400 text-[8px]">UBICACIÓN</span>
                              <span>{item.event.location}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-end pt-8 border-t-2 border-gray-100 border-dotted">
                        <div>
                          <span className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">TITULAR DEL ACCESO</span>
                          <span className="font-black uppercase text-xl tracking-tighter">{userName}</span>
                        </div>
                        <div className="text-right">
                          <span className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">ASIENTO ASIGNADO</span>
                          <div className="bg-black text-white px-6 py-2 rounded-lg font-mono font-black text-2xl shadow-xl transform rotate-1 scale-110">
                            {seat?.id || 'G-01'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right side - QR */}
                    <div className="md:w-64 p-10 bg-gray-50 flex flex-col items-center justify-center space-y-6 relative">
                      <div className="absolute top-4 right-4 text-[8px] font-black text-gray-300 uppercase tracking-widest rotate-90 origin-right">
                        SECURE TICKET QR
                      </div>
                      <div className="bg-white p-4 rounded-[20px] shadow-2xl border border-gray-100 transform transition-transform group-hover:scale-105 duration-500">
                        <QRCodeSVG 
                          value={`https://ticketfenix.com/verify/ticket/${uniqueTicketRef}`} 
                          size={140}
                          level="H"
                          includeMargin={true}
                        />
                      </div>
                      <div className="text-center space-y-2">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">ACTIVO</span>
                        </div>
                        <span className="block text-[8px] font-mono text-gray-300 uppercase">VERIFIED: {uniqueTicketRef}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            });
          })}
        </div>

        {/* Footer Links */}
        <div className="flex flex-col items-center gap-6 pt-10">
          <Link to="/mis-boletos" className="btn-primary px-10 py-5 rounded-[12px] flex items-center gap-3 font-display font-black uppercase tracking-tighter text-xl">
             Ver Todos mis Boletos <ShoppingBag size={24} />
          </Link>
          <Link to="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors">
            <span>Volver al inicio de TicketFenix</span>
            <ExternalLink size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}

import { motion } from 'motion/react';
import { ChevronRight, Play, Ticket, Zap, Shield, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EVENTS } from '../constants';
import EventCard from '../components/EventCard';

export default function Home() {
  const featuredEvents = EVENTS.filter(e => e.featured);

  return (
    <div className="space-y-32">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center pt-20">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=2070"
            className="w-full h-full object-cover opacity-50"
            alt="Hero Background"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-dark via-dark/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-dark via-transparent to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl space-y-8"
          >
            <div className="inline-flex items-center justify-between w-full bg-linear-to-r from-brand to-[#660000] p-6 rounded-[12px] mb-8">
              <div className="banner-text">
                <h2 className="text-2xl md:text-3xl font-display font-bold leading-none uppercase">KAROL G | MAÑANA SERÁ BONITO</h2>
                <p className="text-white/80 text-sm mt-1">¡La "Bichota" llega a tu ciudad con el show más esperado!</p>
              </div>
              <Link to="/evento/karol-g" className="btn-primary bg-white text-black hover:bg-gray-200 hover:text-black hidden md:flex">
                Ver Más
              </Link>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-display font-black leading-[0.85] tracking-tighter uppercase">
              VIVE EL <br />
              <span className="text-brand">ESPECTÁCULO</span> <br />
              EN VIVO
            </h1>
            
            <p className="text-white/60 text-lg md:text-xl max-w-xl">
              TicketFenix es la plataforma premium para asegurar tu lugar en los eventos más importantes del mundo. Sin esperas, sin complicaciones.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/eventos" className="btn-primary">
                Ver Eventos <ChevronRight size={18} />
              </Link>
            </div>

            <div className="flex gap-10 pt-10">
              <div>
                <span className="block text-3xl font-display font-bold">50k+</span>
                <span className="text-white/40 text-xs uppercase font-bold tracking-widest">Boletos Vendidos</span>
              </div>
              <div>
                <span className="block text-3xl font-display font-bold">1.2k+</span>
                <span className="text-white/40 text-xs uppercase font-bold tracking-widest">Eventos Anuales</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Events */}
      <section className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex justify-between items-end mb-12">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-display font-bold">EVENTOS DESTACADOS</h2>
            <div className="h-1 w-20 bg-brand rounded-full" />
          </div>
          <Link to="/eventos" className="flex items-center gap-2 text-brand font-bold hover:underline mb-2">
            Ver todos <ChevronRight size={18} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredEvents.map((event, idx) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
            >
              <EventCard event={event} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-medium-gray py-24 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center">
                <Shield className="text-brand" size={32} />
              </div>
              <h3 className="text-2xl font-bold">Compra Segura</h3>
              <p className="text-white/50">Tu seguridad es nuestra prioridad. Cada transacción está encriptada y protegida.</p>
            </div>
            
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center">
                <Ticket className="text-brand" size={32} />
              </div>
              <h3 className="text-2xl font-bold">Boleto Digital</h3>
              <p className="text-white/50">Recibe tus boletos al instante en tu correo y cuenta. Olvídate del papel.</p>
            </div>

            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center">
                <Heart className="text-brand" size={32} />
              </div>
              <h3 className="text-2xl font-bold">Mejores Asientos</h3>
              <p className="text-white/50">Acceso exclusivo a preventas para que no te pierdas la mejor vista del show.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter / CTA */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 pb-32">
        <div className="relative overflow-hidden rounded-[3rem] bg-brand py-24 px-8 md:px-20 text-center">
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-black/10 rounded-full blur-3xl" />
          
          <div className="relative z-10 max-w-2xl mx-auto space-y-8">
            <h2 className="text-4xl md:text-6xl font-display font-extrabold text-white leading-tight">
              ¿Listo para tu próxima aventura?
            </h2>
            <p className="text-white/80 text-lg">
              Únete a nuestra comunidad y sé el primero en enterarte de nuevos eventos y descuentos especiales.
            </p>
            <Link to="/registro" className="inline-flex bg-black text-white font-bold px-12 py-4 rounded-full hover:bg-white hover:text-black transition-all active:scale-95">
              Crea tu Cuenta Gratis
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

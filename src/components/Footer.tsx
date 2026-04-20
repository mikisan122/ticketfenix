import { Ticket } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-black border-t border-white/5 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-20">
          <div className="col-span-1 md:col-span-2 space-y-6">
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-brand p-1.5 rounded-lg">
                <Ticket className="text-white w-6 h-6" />
              </div>
              <span className="font-display text-2xl font-bold tracking-tighter">
                TICKET<span className="text-brand">FENIX</span>
              </span>
            </Link>
            <p className="text-white/50 text-sm leading-relaxed max-w-md">
              La plataforma definitiva para vivir las mejores experiencias en vivo. Seguridad, rapidez y exclusividad en cada boleto.
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-6 uppercase tracking-widest text-sm">Explorar</h4>
            <ul className="space-y-4 text-sm text-white/60">
              <li><Link to="/eventos" className="hover:text-brand transition-colors">Todos los Eventos</Link></li>
              <li><Link to="/eventos" className="hover:text-brand transition-colors">Conciertos</Link></li>
              <li><Link to="/eventos" className="hover:text-brand transition-colors">Deportes</Link></li>
              <li><Link to="/eventos" className="hover:text-brand transition-colors">Festivales</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-white/40 text-xs">
            © 2024 TicketFenix Inc. Todos los derechos reservados.
          </p>
          <div className="flex gap-8 text-xs text-white/40">
         
          </div>
        </div>
      </div>
    </footer>
  );
}

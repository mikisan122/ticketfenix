import { Link, useLocation } from 'react-router-dom';
import { Ticket, Search, User, ShoppingBag, Menu, X, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, loading } = useAuth();
  const { itemCount } = useCart();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Inicio', path: '/' },
    { name: 'Eventos', path: '/eventos' },
    { name: 'Mis Boletos', path: '/mis-boletos' },
  ];

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-white/5 ${
        isScrolled ? 'bg-dark/80 backdrop-blur-md py-3 shadow-2xl' : 'bg-transparent py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <span className="font-display text-2xl font-black tracking-widest text-brand uppercase">
            TICKETFENIX
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link ${
                location.pathname === link.path ? 'text-brand' : 'text-white'
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-5">
          <Link 
            to="/checkout" 
            className="relative p-2 text-white hover:text-brand transition-colors"
            title="Carrito de Compras"
          >
            <ShoppingBag size={22} />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-brand text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-dark animate-in fade-in zoom-in duration-300">
                {itemCount}
              </span>
            )}
          </Link>

          {user?.email === 'plantillas.ms@gmail.com' && (
            <Link to="/admin" className="text-[10px] font-bold uppercase tracking-widest text-white/30 hover:text-brand transition-colors">
              Admin
            </Link>
          )}
          {loading ? (
            <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'User'} className="w-8 h-8 rounded-full border border-brand" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center">
                    <User size={16} className="text-brand" />
                  </div>
                )}
                <span className="text-xs font-bold text-white uppercase hidden lg:inline">{user.displayName || user.email?.split('@')[0]}</span>
              </div>
              <button 
                onClick={() => signOut(auth)}
                className="text-white/40 hover:text-red-500 transition-colors p-2"
                title="Cerrar Sesión"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" className="px-5 py-2 border border-border rounded-[4px] text-xs font-bold uppercase tracking-wider hover:bg-brand hover:border-brand transition-all">
                Iniciar Sesión
              </Link>
              <Link to="/registro" className="bg-brand text-white px-5 py-2 rounded-[4px] text-xs font-bold uppercase tracking-wider hover:bg-brand-hover transition-all active:scale-95">
                Registro
              </Link>
            </>
          )}
        </div>

        {/* Mobile Toggle */}
        <button 
          className="md:hidden text-white"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass-dark border-t border-white/10"
          >
            <div className="flex flex-col p-6 gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`text-lg font-medium ${
                    location.pathname === link.path ? 'text-brand' : 'text-white'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
              <Link
                to="/checkout"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between text-lg font-medium text-white"
              >
                <div className="flex items-center gap-3">
                  <ShoppingBag size={20} className="text-brand" />
                  Carrito
                </div>
                {itemCount > 0 && (
                  <span className="bg-brand text-white text-xs font-bold px-3 py-1 rounded-full">
                    {itemCount} {itemCount === 1 ? 'Ítem' : 'Ítems'}
                  </span>
                )}
              </Link>
              <div className="h-px bg-white/10" />
              {loading ? (
                <div className="h-10 bg-white/5 animate-pulse rounded-lg" />
              ) : user ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName || 'User'} className="w-10 h-10 rounded-full border border-brand" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center">
                        <User size={20} className="text-brand" />
                      </div>
                    )}
                    <span className="text-lg font-bold text-white uppercase">{user.displayName || user.email?.split('@')[0]}</span>
                  </div>
                  <button
                    onClick={() => {
                      signOut(auth);
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 text-lg font-medium text-red-500"
                  >
                    <LogOut size={20} />
                    Cerrar Sesión
                  </button>
                  {user.email === 'plantillas.ms@gmail.com' && (
                    <Link
                      to="/admin"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-white/30"
                    >
                      Acceso Panel Admin
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <Link
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 text-lg font-medium text-white"
                  >
                    <User size={20} />
                    Iniciar Sesión
                  </Link>
                  <Link
                    to="/registro"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 text-lg font-medium text-brand"
                  >
                    <Ticket size={20} />
                    Registro VIP
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

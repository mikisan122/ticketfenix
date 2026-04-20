import { useState, FormEvent } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { Ticket, Mail, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useToast } from '../context/ToastContext';

export default function Login() {
  const { showToast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const navigate = useNavigate();

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
        showToast('Sesión iniciada correctamente', 'success');
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        if (formData.name) {
          await updateProfile(userCredential.user, { displayName: formData.name });
        }
        showToast('¡Bienvenido! Cuenta creada con éxito', 'success');
      }
      navigate(-1); // Return to previous page (like checkout)
    } catch (err: any) {
      console.error("Auth error:", err);
      let message = 'Ocurrió un error inesperado. Inténtalo de nuevo.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        message = 'Credenciales inválidas. Verifica tu correo y contraseña.';
      } else if (err.code === 'auth/email-already-in-use') {
        message = 'Este correo ya está registrado.';
      } else if (err.code === 'auth/weak-password') {
        message = 'La contraseña es muy débil. Usa al menos 6 caracteres.';
      }
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      showToast('Bienvenido con Google', 'success');
      navigate('/');
    } catch (error: any) {
      console.error("Error logging in with Google:", error);
      const errorCode = error.code || 'unknown';
      let message = 'Error al iniciar sesión con Google';
      
      if (errorCode === 'auth/unauthorized-domain') {
        message = 'Este dominio no está autorizado en la consola de Firebase.';
      } else if (errorCode === 'auth/popup-blocked') {
        message = 'El navegador bloqueó la ventana emergente.';
      } else if (errorCode === 'auth/popup-closed-by-user') {
        message = 'La ventana de inicio de sesión se cerró antes de completar el proceso.';
        showToast(message, 'info');
        return;
      }
      
      showToast(`${message} (${errorCode})`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Visual */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-black">
        <img 
          src="https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=2070" 
          className="w-full h-full object-cover opacity-60"
          alt="Concert vibe"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-dark to-transparent" />
        
        <div className="absolute bottom-20 left-20 z-10 space-y-4">
          <div className="bg-brand p-2 rounded-xl inline-block">
            <Ticket className="text-white" size={32} />
          </div>
          <h2 className="text-6xl font-display font-bold tracking-tighter leading-none">
            TU ACCESO <br /> <span className="text-brand">VIP</span> A LOS MEJORES EVENTOS
          </h2>
          <p className="text-white/60 text-lg max-w-md">
            Únete a la comunidad de TicketFenix y no te pierdas ni un solo momento inolvidable.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-dark">
        <div className="max-w-md w-full space-y-12">
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2 lg:hidden">
              <div className="bg-brand p-1.5 rounded-lg">
                <Ticket className="text-white w-6 h-6" />
              </div>
              <span className="font-display text-2xl font-bold tracking-tighter">
                TICKET<span className="text-brand">FENIX</span>
              </span>
            </Link>
            <h1 className="text-4xl md:text-5xl font-display font-bold uppercase tracking-tight">
              {isLogin ? 'BIENVENIDO DE VUELTA' : 'CREA TU CUENTA'}
            </h1>
            <p className="text-white/50">
              {isLogin 
                ? 'Ingresa tus credenciales para acceder a tus boletos.' 
                : 'Regístrate para comenzar a vivir experiencias únicas.'}
            </p>
          </div>

          <div className="space-y-6">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex gap-3 text-red-500 text-sm italic"
              >
                <AlertCircle size={18} className="shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            <button 
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-white/90 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <span>G</span>}
              Continuar con Google
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-dark px-4 text-white/30 tracking-widest font-bold">O usa tu correo</span></div>
            </div>

            <form onSubmit={handleAuth} className="space-y-6">
              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Nombre Completo</label>
                  <input 
                    type="text" 
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 focus:outline-none focus:border-brand transition-colors"
                    placeholder="Tu nombre completo"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                  <input 
                    type="email" 
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-14 pr-6 focus:outline-none focus:border-brand transition-colors"
                    placeholder="email@ejemplo.com"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                  <input 
                    type="password" 
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-14 pr-6 focus:outline-none focus:border-brand transition-colors"
                    placeholder="••••••••"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              </div>

              {isLogin && (
                <div className="text-right">
                  <button type="button" className="text-xs text-brand hover:underline font-bold">¿Olvidaste tu contraseña?</button>
                </div>
              )}

              <button type="submit" className="btn-primary w-full py-4 text-lg">
                {isLogin ? 'Entrar' : 'Registrarse'} <ArrowRight size={20} />
              </button>
            </form>
          </div>

          <div className="text-center text-white/40 text-sm">
            {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-white hover:text-brand font-bold underline underline-offset-4"
            >
              {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

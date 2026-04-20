import { useState, FormEvent, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Image as ImageIcon, Calendar, MapPin, DollarSign, FileText, CheckCircle2, Loader2, Trash2, ExternalLink, Edit3, XCircle, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp, getDocFromServer, doc, onSnapshot, query, orderBy, deleteDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { Event } from '../types';
import { useAuth } from '../context/AuthContext';

// Types for better error reporting
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
  }
}

export default function Admin() {
  const navigate = useNavigate();
  const { user: currentUser, loading: isAuthChecking } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'Concierto',
    date: '',
    location: '',
    price: '',
    image: '',
    description: ''
  });
  const [isTestingConnection, setIsTestingConnection] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errorHeader, setErrorHeader] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Today's date for input min attribute
  const today = new Date().toISOString().split('T')[0];

  // Manage authorization
  useEffect(() => {
    if (!isAuthChecking && currentUser?.email === 'plantillas.ms@gmail.com') {
      setIsAuthenticated(true);
    }
  }, [currentUser, isAuthChecking]);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    console.log("Suscribiendo a eventos para gestión...");
    const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Event[];
      setEvents(eventsData);
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  // Test connection to Firestore on mount
  useState(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
          alert("Error de conexión: El cliente de base de datos está fuera de línea. Verifica la configuración.");
        }
      } finally {
        setIsTestingConnection(false);
      }
    }
    testConnection();
  });

  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  };

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') { // Simple simulation password
      setIsAuthenticated(true);
    } else {
      setErrorHeader('Contraseña incorrecta');
      setTimeout(() => setErrorHeader(null), 3000);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsAuthenticated(false);
    navigate('/');
  };

  const handleEditClick = (event: Event) => {
    setEditingId(event.id);
    setFormData({
      title: event.title,
      category: event.category,
      date: event.date,
      location: event.location,
      price: String(event.price),
      image: event.image,
      description: event.description
    });
    setActiveTab('create');
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      title: '',
      category: 'Concierto',
      date: '',
      location: '',
      price: '',
      image: '',
      description: ''
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Additional validation for date
    if (new Date(formData.date) < new Date(today)) {
      setErrorHeader('La fecha no puede ser anterior a hoy');
      setTimeout(() => setErrorHeader(null), 3000);
      return;
    }

    setIsLoading(true);

    if (!currentUser) {
      setErrorHeader('Debes iniciar sesión con Google para guardar');
      setIsLoading(false);
      return;
    }

    try {
      const path = 'events';
      const eventPayload = {
        ...formData,
        price: Number(formData.price),
        featured: false,
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        // Update existing
        await updateDoc(doc(db, path, editingId), eventPayload).catch(err => {
          handleFirestoreError(err, OperationType.UPDATE, `${path}/${editingId}`);
          throw err;
        });
        console.log('Evento actualizado:', editingId);
      } else {
        // Create new
        const docRef = await addDoc(collection(db, path), {
          ...eventPayload,
          createdAt: serverTimestamp()
        }).catch(err => {
          handleFirestoreError(err, OperationType.CREATE, path);
          throw err;
        });
        console.log('Evento agregado con ID:', docRef.id);
      }

      setIsSuccess(true);
      resetForm();
      
      setTimeout(() => {
        setIsSuccess(false);
        setActiveTab('manage');
      }, 2000);
    } catch (error) {
      console.error("Firestore error:", error);
      if (error instanceof Error && error.message.includes('permission-denied')) {
        setErrorHeader('Error de permisos: Identidad no autorizada');
      } else {
        setErrorHeader('Error al guardar en la base de datos');
      }
      setTimeout(() => setErrorHeader(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      setIsLoading(true);
      await deleteDoc(doc(db, 'events', id));
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Delete error:", error);
      setErrorHeader('Error al eliminar el evento');
      setTimeout(() => setErrorHeader(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark">
        <Loader2 className="animate-spin text-brand" size={32} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark px-4">
        <div className="max-w-md w-full space-y-4">
          <form onSubmit={handleLogin} className="bg-surface border border-border p-8 rounded-[12px] space-y-6 shadow-2xl">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-display font-bold uppercase tracking-widest text-white">Acceso Admin</h1>
              <p className="text-white/40 text-xs text-balance">Ingresa la clave maestra para gestionar el portal</p>
              {!currentUser && (
                <div className="mt-4 p-3 bg-brand/10 border border-brand/20 rounded-lg">
                  <p className="text-[10px] text-brand font-bold uppercase tracking-wider leading-relaxed">
                    Nota: Para guardar cambios en la base de datos, primero debes iniciar sesión con tu cuenta de Google autorizada.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <input 
                type="password"
                placeholder="Contraseña"
                className="w-full bg-dark border border-border rounded-[4px] py-3 px-4 focus:outline-none focus:border-brand transition-colors text-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary w-full py-3 rounded-[4px]">
              Ingresar
            </button>
          </form>
          
          <button 
            onClick={() => navigate('/')}
            className="w-full text-center text-text-muted hover:text-white text-xs font-bold uppercase tracking-widest transition-colors py-2"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark px-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6"
        >
          <div className="inline-flex items-center justify-center w-24 h-24 bg-brand/20 rounded-full border border-brand/30">
            <CheckCircle2 size={48} className="text-brand" />
          </div>
          <h1 className="text-4xl font-display font-bold uppercase tracking-tighter">
            {editingId ? 'Cambios Guardados' : 'Evento Publicado'}
          </h1>
          <p className="text-white/50">
            {editingId 
              ? 'Los cambios se han guardado correctamente.' 
              : 'El evento ha sido agregado exitosamente a la plataforma.'}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 md:px-8">
      {/* Error Toast */}
      <div className={`fixed top-10 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ${errorHeader ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0'}`}>
        <div className="bg-red-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3">
          <XCircle size={18} />
          <span className="font-bold text-sm uppercase tracking-wider">{errorHeader}</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-display font-black uppercase tracking-tighter">
              PANEL DE <span className="text-brand">CONTROL</span>
            </h1>
            <div className="flex items-center gap-4">
              <p className="text-white/50 text-lg">Administración de eventos y contenidos de TicketFenix.</p>
              <button 
                onClick={handleLogout}
                className="text-white/30 hover:text-red-500 transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
              >
                <LogOut size={14} /> Salir
              </button>
            </div>
          </div>
          
          <div className="flex bg-surface border border-border p-1 rounded-[8px]">
            <button 
              onClick={() => {
                resetForm();
                setActiveTab('create');
              }}
              className={`px-6 py-2 rounded-[6px] text-xs font-bold uppercase tracking-widest transition-all ${
                activeTab === 'create' ? 'bg-brand text-white' : 'text-text-muted hover:text-white'
              }`}
            >
              {editingId ? 'Editar' : 'Crear'}
            </button>
            <button 
              onClick={() => setActiveTab('manage')}
              className={`px-6 py-2 rounded-[6px] text-xs font-bold uppercase tracking-widest transition-all ${
                activeTab === 'manage' ? 'bg-brand text-white' : 'text-text-muted hover:text-white'
              }`}
            >
              Gestionar ({events.length})
            </button>
          </div>
        </div>

        {activeTab === 'create' ? (
          <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-[12px] p-8 md:p-12 space-y-10">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h2 className="text-xl font-bold uppercase tracking-widest">
                  {editingId ? 'Editar Evento' : 'Crear Nuevo Evento'}
                </h2>
                {editingId && (
                  <button 
                    onClick={resetForm}
                    className="text-white/40 hover:text-white text-xs font-bold uppercase tracking-widest underline"
                  >
                    Cancelar Edición
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Event Title */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                    <Plus size={14} className="text-brand" /> Título del Evento
                  </label>
                  <input 
                    required
                    type="text"
                    placeholder="Ej: Rock Arena 2024"
                    className="w-full bg-dark border border-border rounded-[4px] py-3 px-4 focus:outline-none focus:border-brand transition-colors"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Categoría</label>
                  <select 
                    className="w-full bg-dark border border-border rounded-[4px] py-3 px-4 focus:outline-none focus:border-brand transition-colors appearance-none"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  >
                    <option>Concierto</option>
                    <option>Deportes</option>
                    <option>Festival</option>
                    <option>Cultura</option>
                  </select>
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                    <Calendar size={14} className="text-brand" /> Fecha
                  </label>
                  <input 
                    required
                    type="date"
                    min={today}
                    className="w-full bg-dark border border-border rounded-[4px] py-3 px-4 focus:outline-none focus:border-brand transition-colors text-white"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                  />
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                    <MapPin size={14} className="text-brand" /> Ubicación
                  </label>
                  <input 
                    required
                    type="text"
                    placeholder="Ej: Auditorio Nacional, CDMX"
                    className="w-full bg-dark border border-border rounded-[4px] py-3 px-4 focus:outline-none focus:border-brand transition-colors"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                  />
                </div>

                {/* Price */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                    <DollarSign size={14} className="text-brand" /> Precio Base ($)
                  </label>
                  <input 
                    required
                    type="number"
                    placeholder="Ej: 850"
                    className="w-full bg-dark border border-border rounded-[4px] py-3 px-4 focus:outline-none focus:border-brand transition-colors"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                  />
                </div>

                {/* Image URL */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                    <ImageIcon size={14} className="text-brand" /> URL de Imagen
                  </label>
                  <input 
                    required
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-dark border border-border rounded-[4px] py-3 px-4 focus:outline-none focus:border-brand transition-colors"
                    value={formData.image}
                    onChange={(e) => setFormData({...formData, image: e.target.value})}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                  <FileText size={14} className="text-brand" /> Descripción del Evento
                </label>
                <textarea 
                  required
                  rows={4}
                  placeholder="Describe el evento, artistas invitados, duración, etc..."
                  className="w-full bg-dark border border-border rounded-[4px] py-4 px-6 focus:outline-none focus:border-brand transition-colors resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                ></textarea>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="btn-primary w-full py-5 text-xl rounded-[8px] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" /> {editingId ? 'Guardando...' : 'Publicando...'}
                </>
              ) : (
                editingId ? 'Guardar Cambios' : 'Publicar Evento'
              )}
            </button>
          </form>
        ) : (
          <div className="bg-surface border border-border rounded-[12px] overflow-hidden">
            <div className="p-8 border-b border-border">
              <h2 className="text-xl font-bold uppercase tracking-widest">Gestionar Eventos Existentes</h2>
              <p className="text-white/40 text-sm mt-1">Aquí puedes ver y eliminar los eventos publicados en tiempo real.</p>
            </div>
            
            <div className="divide-y divide-border">
              {events.length > 0 ? (
                events.map((event) => (
                  <div key={event.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-6">
                      <img 
                        src={event.image} 
                        alt={event.title} 
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 object-cover rounded-[4px] border border-border"
                      />
                      <div>
                        <h3 className="font-bold uppercase tracking-tight">{event.title}</h3>
                        <div className="flex items-center gap-4 mt-1 text-xs text-white/40">
                          <span className="flex items-center gap-1"><Calendar size={12} /> {event.date}</span>
                          <span className="flex items-center gap-1"><MapPin size={12} /> {event.location}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {deleteConfirmId === event.id ? (
                        <div className="flex items-center gap-2 bg-red-500/10 p-1 px-3 rounded-full border border-red-500/20">
                          <span className="text-[10px] font-bold text-red-500 uppercase tracking-tighter">¿Borrar?</span>
                          <button 
                            onClick={() => handleDeleteEvent(event.id)}
                            className="p-1 px-2 bg-red-500 text-white rounded text-[10px] font-bold uppercase"
                          >
                            Sí
                          </button>
                          <button 
                            onClick={() => setDeleteConfirmId(null)}
                            className="p-1 px-2 bg-white/10 text-white rounded text-[10px] font-bold uppercase"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <>
                          <button 
                             onClick={() => navigate(`/evento/${event.id}`)}
                             className="p-2 text-white/40 hover:text-brand transition-colors"
                             title="Ver Evento"
                          >
                            <ExternalLink size={20} />
                          </button>
                          <button 
                             onClick={() => handleEditClick(event)}
                             className="p-2 text-white/40 hover:text-blue-400 transition-colors"
                             title="Editar Evento"
                          >
                            <Edit3 size={20} />
                          </button>
                          <button 
                            onClick={() => setDeleteConfirmId(event.id)}
                            className="p-2 text-white/40 hover:text-red-500 transition-colors"
                            title="Eliminar Evento"
                          >
                            <Trash2 size={20} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-20 text-center space-y-4">
                  <div className="text-4xl">📭</div>
                  <p className="text-white/40 font-bold uppercase tracking-widest text-xs">No hay eventos en la base de datos</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

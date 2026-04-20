import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import EventsList from './pages/Events';
import EventDetail from './pages/EventDetail';
import Checkout from './pages/Checkout';
import Confirmation from './pages/Confirmation';
import Login from './pages/Login';
import MyTickets from './pages/MyTickets';
import Admin from './pages/Admin';

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <CartProvider>
          <Router>
            <ScrollToTop />
            <div className="flex flex-col min-h-screen">
              <ConditionalNavbar />
              <main className="flex-grow">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/eventos" element={<EventsList />} />
                  <Route path="/evento/:id" element={<EventDetail />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/confirmacion" element={<Confirmation />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/registro" element={<Login />} />
                  <Route path="/mis-boletos" element={<MyTickets />} />
                  <Route path="/admin" element={<Admin />} />
                </Routes>
              </main>
              <ConditionalFooter />
            </div>
          </Router>
        </CartProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

// Don't show Navbar/Footer on login pages
function ConditionalNavbar() {
  const location = useLocation();
  const hideOn = ['/login', '/registro'];
  if (hideOn.includes(location.pathname)) return null;
  return <Navbar />;
}

function ConditionalFooter() {
  const location = useLocation();
  const hideOn = ['/login', '/registro', '/checkout'];
  if (hideOn.includes(location.pathname)) return null;
  return <Footer />;
}

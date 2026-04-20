import React, { createContext, useContext, useState, useEffect } from 'react';
import { Event } from '../types';
import { useToast } from './ToastContext';

interface CartItem {
  event: Event;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (event: Event, quantity: number) => void;
  removeFromCart: (eventId: string) => void;
  updateQuantity: (eventId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const [cart, setCart] = useState<CartItem[]>(() => {
    const savedCart = localStorage.getItem('tf_cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  useEffect(() => {
    localStorage.setItem('tf_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (event: Event, quantity: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.event.id === event.id);
      if (existing) {
        showToast(`Cantidad actualizada: ${event.title}`, 'info');
        return prev.map(item => 
          item.event.id === event.id 
            ? { ...item, quantity: item.quantity + quantity } 
            : item
        );
      }
      showToast(`¡Agregado al carrito: ${event.title}!`, 'success');
      return [...prev, { event, quantity }];
    });
  };

  const removeFromCart = (eventId: string) => {
    setCart(prev => {
      const remaining = prev.filter(item => item.event.id !== eventId);
      showToast('Evento eliminado del carrito', 'info');
      return remaining;
    });
  };

  const updateQuantity = (eventId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(eventId);
      return;
    }
    setCart(prev => prev.map(item => 
      item.event.id === eventId ? { ...item, quantity } : item
    ));
  };

  const clearCart = () => setCart([]);

  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
  const totalPrice = cart.reduce((total, item) => total + (item.event.price * item.quantity), 0);

  return (
    <CartContext.Provider value={{ 
      cart, 
      addToCart, 
      removeFromCart, 
      updateQuantity, 
      clearCart, 
      itemCount, 
      totalPrice 
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

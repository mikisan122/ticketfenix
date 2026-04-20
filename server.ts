import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Stripe from "stripe";
import axios from "axios";
import { Resend } from 'resend';
import QRCode from 'qrcode';
import "dotenv/config";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Resend Client Initialization (Lazy)
  let resendClient: Resend | null = null;
  const getResend = () => {
    if (!resendClient) {
      const key = process.env.RESEND_API_KEY;
      if (!key) {
        console.warn("MAIL SERVICE: No se encuentra RESEND_API_KEY. Operando en modo simulación.");
        return null;
      }
      resendClient = new Resend(key);
    }
    return resendClient;
  };

  const TICKETMASTER_API_KEY = process.env.VITE_TICKETMASTER_API_KEY || process.env.TICKETMASTER_API_KEY;
  const TM_BASE_URL = 'https://app.ticketmaster.com/discovery/v2';

  // In-memory cache for Ticketmaster responses to avoid 429 (Rate Limits)
  const tmCache: Record<string, { data: any, timestamp: number }> = {};
  const CACHE_TTL = 1000 * 60 * 15; // 15 minutes

  // Ticketmaster Proxy Routes
  app.get("/api/ticketmaster/events/:id", async (req, res) => {
    try {
      if (!TICKETMASTER_API_KEY) {
        return res.status(500).json({ error: "Ticketmaster API Key not configured" });
      }

      const { id } = req.params;

      // Check cache first
      const cached = tmCache[id];
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        console.log(`Sirviendo evento desde cache: ${id}`);
        return res.json(cached.data);
      }

      const url = `${TM_BASE_URL}/events/${id}.json`;
      console.log(`Proxificando petición a Ticketmaster: ${url}`);

      const response = await axios.get(url, {
        params: { apikey: TICKETMASTER_API_KEY },
      });

      // Store in cache
      tmCache[id] = {
        data: response.data,
        timestamp: Date.now()
      };

      res.json(response.data);
    } catch (error: any) {
      const status = error.response?.status;
      
      if (status === 429) {
        console.error("Ticketmaster API Rate Limit Exceeded (429)");
        return res.status(429).json({ 
          error: "Rate limit exceeded. Please try again in a few minutes.",
          retryAfter: error.response?.headers?.['retry-after']
        });
      }

      if (status === 404) {
        console.warn(`Evento Ticketmaster no encontrado (404): ${req.params.id}`);
        return res.status(404).json({ error: "Event not found", tmStatus: 404 });
      }
      
      console.error("Error en TM Proxy (Get Event):", error.message);
      res.status(status || 500).json({ 
        error: "Failed to fetch event from Ticketmaster",
        details: error.response?.data || error.message 
      });
    }
  });

  app.get("/api/ticketmaster/search", async (req, res) => {
    try {
      if (!TICKETMASTER_API_KEY) {
        return res.status(500).json({ error: "Ticketmaster API Key not configured" });
      }

      const { keyword, size = 10 } = req.query;
      
      // Use query params as cache key for search
      const cacheKey = `search_${keyword}_${size}`;
      const cached = tmCache[cacheKey];
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        console.log(`Sirviendo búsqueda desde cache: ${keyword}`);
        return res.json(cached.data);
      }

      const response = await axios.get(`${TM_BASE_URL}/events.json`, {
        params: { 
          apikey: TICKETMASTER_API_KEY,
          keyword,
          size
        },
      });

      tmCache[cacheKey] = {
        data: response.data,
        timestamp: Date.now()
      };

      res.json(response.data);
    } catch (error: any) {
      if (error.response?.status === 429) {
        return res.status(429).json({ error: "Rate limit exceeded" });
      }
      console.error("Error in TM Proxy (Search):", error.message);
      res.status(error.response?.status || 500).json({ 
        error: "Failed to search events in Ticketmaster",
        details: error.response?.data || error.message 
      });
    }
  });

  // Stripe initialization helper
  let stripe: Stripe | null = null;
  const getStripe = () => {
    if (!stripe) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) {
        console.warn("CRÍTICO: No se encontró STRIPE_SECRET_KEY en las variables de entorno.");
        return null;
      }
      
      // Basic validation of the key format
      if (!key.startsWith('sk_')) {
        console.error("ERROR: El formato de STRIPE_SECRET_KEY es inválido. Debe empezar con 'sk_'.");
        return null;
      }

      console.log("Iniciando cliente de Stripe con una clave válida...");
      stripe = new Stripe(key, {
        apiVersion: '2025-02-24.acacia' as any, // Using a stable recent version
      });
    }
    return stripe;
  };

  // API Route for Stripe Checkout
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { event, quantity, userName, userEmail } = req.body;
      console.log(`[STRIPE] Recibida petición: ${quantity} x ${event.title} para ${userName} (${userEmail})`);
      
      const stripeClient = getStripe();
      
      // Intentar obtener la URL de la app dinámicamente o de env
      const origin = req.headers.origin || "";
      const referer = req.headers.referer || "";
      let appUrl = process.env.APP_URL;
      
      if (!appUrl) {
        if (origin) {
          appUrl = origin;
        } else if (referer) {
          try {
            const url = new URL(referer);
            appUrl = `${url.protocol}//${url.host}`;
          } catch (e) {
            appUrl = `http://localhost:${PORT}`;
          }
        } else {
          appUrl = `http://localhost:${PORT}`;
        }
      }

      // Limpiar slash final si existe
      if (appUrl.endsWith('/')) appUrl = appUrl.slice(0, -1);

      if (!stripeClient) {
        console.error("[STRIPE] ERROR: No hay STRIPE_SECRET_KEY configurada.");
        return res.status(500).json({ error: "Debe configurar STRIPE_SECRET_KEY en las variables de entorno." });
      }

      console.log("[STRIPE] Redireccionando a:", appUrl);

      // Create Checkout Sessions from body params
      const session = await stripeClient.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: event.title,
                description: `Boletos para: ${event.title}. Titular: ${userName}`,
                images: [event.image].filter(Boolean),
              },
              unit_amount: Math.round(Number(event.price) * 100), // Stripe uses cents
            },
            quantity: Number(quantity),
          },
        ],
        mode: 'payment',
        payment_method_types: ['card'],
        customer_email: userEmail,
        metadata: {
          userName,
          userEmail,
          eventTitle: event.title,
          eventId: event.id
        },
        success_url: `${appUrl}/confirmacion?session_id={CHECKOUT_SESSION_ID}&userName=${encodeURIComponent(userName)}&userEmail=${encodeURIComponent(userEmail)}`,
        cancel_url: `${appUrl}/checkout?cancelled=true`,
      });

      console.log("[STRIPE] Sesión creada:", session.id);
      res.json({ url: session.url });
    } catch (err) {
      console.error("[STRIPE CRITICAL ERROR]", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Error interno al crear sesión de pago" });
    }
  });

  // API Route to verify Stripe Session and get details
  app.post("/api/get-session-details", async (req, res) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId) return res.status(400).json({ error: "Session ID is required" });

      const stripeClient = getStripe();
      if (!stripeClient) return res.status(500).json({ error: "Stripe not configured" });

      const session = await stripeClient.checkout.sessions.retrieve(sessionId, {
        expand: ['line_items', 'payment_intent'],
      });

      // Data normalization for frontend
      const details = {
        userName: session.metadata?.userName || session.customer_details?.name || "Cliente",
        userEmail: session.metadata?.userEmail || session.customer_details?.email || "",
        totalAmount: session.amount_total ? session.amount_total / 100 : 0,
        status: session.payment_status,
        eventTitle: session.line_items?.data[0]?.description?.split('.')[0] || "Evento",
        quantity: session.line_items?.data[0]?.quantity || 1,
      };

      res.json(details);
    } catch (err) {
      console.error("[STRIPE SESSION ERROR]", err);
      res.status(500).json({ error: "Error al recuperar detalles de la sesión" });
    }
  });

  // Real Email Sender Route
  app.post("/api/send-email", async (req, res) => {
    try {
      const { email, userName, ticketCount } = req.body;
      const resend = getResend();
      
      if (!resend) {
        console.log(`[SIMULACIÓN] No hay API Key de Resend. Simulando envío para: ${email}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return res.json({ success: true, message: "Simulation success" });
      }

      console.log(`[MAIL SERVICE] Generando y enviando boletos para: ${email}`);
      
      // Generate a QR buffer for the email attachment (Better compatibility)
      const qrBuffer = await QRCode.toBuffer(`https://ticketfenix.com/verify/${email}`, {
        margin: 1,
        width: 400,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      
      const { data, error } = await resend.emails.send({
        from: 'TicketFenix <onboarding@resend.dev>',
        to: [email],
        subject: `🎟️ ¡Tus Boletos de TicketFenix están listos!`,
        attachments: [
          {
            filename: 'ticket-qr.png',
            content: qrBuffer,
          }
        ],
        html: `
          <div style="font-family: sans-serif; background-color: #000; color: #fff; padding: 40px; border-radius: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #333;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #ff0000; font-size: 32px; letter-spacing: -1px; margin: 0;">TICKETFENIX</h1>
              <p style="color: #666; font-size: 10px; margin-top: 5px; text-transform: uppercase;">Boletos Premium Amontonados</p>
            </div>
            
            <div style="background-color: #111; padding: 30px; border-radius: 15px; border-left: 4px solid #ff0000;">
              <h2 style="margin: 0; font-size: 20px;">¡Hola, ${userName}!</h2>
              <p style="color: #ccc; line-height: 1.6;">Hemos amontonado con éxito tus <strong>${ticketCount} boletos</strong>. Ya están disponibles en tu cuenta y listos para ser presentados en el evento.</p>
            </div>

            <div style="text-align: center; margin-top: 40px; background: #fff; padding: 20px; border-radius: 15px; color: #000;">
              <p style="font-size: 12px; font-weight: bold; margin-bottom: 20px; text-transform: uppercase; color: #666;">Tu Código de Acceso General</p>
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://ticketfenix.com/verify/${email}" alt="QR Ticket" style="width: 200px; height: 200px; display: block; margin: 0 auto;" />
              <p style="font-family: monospace; font-size: 14px; margin-top: 20px; color: #ff0000; font-weight: bold;">VERIFIED SECURE ACCESS</p>
            </div>

            <div style="margin-top: 40px; text-align: center;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/mis-boletos" style="background-color: #ff0000; color: #fff; padding: 15px 30px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">Ver todos mis boletos</a>
            </div>

            <p style="color: #444; font-size: 10px; text-align: center; margin-top: 40px; text-transform: uppercase;">Código de Rastreo: TF-${Math.random().toString(36).substring(7).toUpperCase()}</p>
          </div>
        `
      });

      if (error) {
        console.error("[RESEND ERROR]", error);
        return res.status(400).json({ error });
      }

      res.json({ success: true, data });
    } catch (err) {
      console.error("[MAIL SERVICE CRITICAL ERROR]", err);
      res.status(500).json({ error: "Critial fail sending email" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
    if (!process.env.STRIPE_SECRET_KEY) {
      console.warn("Reminder: Set STRIPE_SECRET_KEY in your environment variables.");
    }
  });
}

startServer();

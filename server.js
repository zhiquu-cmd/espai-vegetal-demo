/**
 * ESPAI VEGETAL - MVP de Menu de Soporte estilo WhatsApp
 * ------------------------------------------------------
 * Demo local sencilla en Node.js + Express.
 * - Sin base de datos
 * - Estado de conversacion en memoria
 * - Sin dependencias innecesarias
 *
 * Estructura:
 *  - GET  /              -> sirve la interfaz visual (public/index.html)
 *  - POST /chat          -> recibe un mensaje del usuario y devuelve la respuesta del bot
 *  - POST /reset         -> reinicia la conversacion del usuario
 */

const express = require('express');
const path = require('path');

const app = express();
// Render/Heroku style platforms provide PORT via env var
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------
// 1) ESTADO DE CONVERSACION EN MEMORIA
// ---------------------------------------------------------------
// Guardamos por sessionId el estado actual del menu en el que esta cada usuario.
// En produccion esto seria una base de datos o Redis.
const sessions = new Map();

function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, { state: 'welcome', startedAt: new Date() });
  }
  return sessions.get(sessionId);
}

// ---------------------------------------------------------------
// 2) CONTENIDO DEL BOT (textos reales de la floristeria)
// ---------------------------------------------------------------
const MENU_PRINCIPAL = {
  text:
    "Como podemos ayudarte hoy? Elige una opcion escribiendo su numero:\n\n" +
    "1. Horarios y ubicacion\n" +
    "2. Encargos y recogida\n" +
    "3. Ramos y precios\n" +
    "4. Hablar con una persona",
  options: [
    { id: '1', label: 'Horarios y ubicacion' },
    { id: '2', label: 'Encargos y recogida' },
    { id: '3', label: 'Ramos y precios' },
    { id: '4', label: 'Hablar con una persona' }
  ]
};

const RESPUESTAS = {
  '1': {
    text:
      "HORARIOS Y UBICACION\n\n" +
      "Atelier principal:\n" +
      "Lunes a sabado: 9:30 - 14:00 / 17:00 - 20:30\n" +
      "Domingos: cerrado\n\n" +
      "Direccion: Castellon de la Plana\n" +
      "Tienda Plaza Santa Clara abierta tambien por las mañanas.\n\n" +
      "Telefono: +34 964 205 102",
    followUp: 'Quieres ver el menu de nuevo? Escribe "menu" o pulsa el boton.'
  },
  '2': {
    text:
      "ENCARGOS Y RECOGIDA\n\n" +
      "Aceptamos encargos por WhatsApp con un minimo de 3 horas de antelacion.\n\n" +
      "Recogida en atelier o entrega a domicilio:\n" +
      "- Castellon y Grao: 11 EUR\n" +
      "- Almazora: 15 EUR\n" +
      "- Villarreal y Burriana: 18 EUR\n" +
      "- Benicassim: 20 EUR\n\n" +
      "Para bodas y eventos pide consulta privada.",
    followUp: 'Quieres ver el menu de nuevo? Escribe "menu" o pulsa el boton.'
  },
  '3': {
    text:
      "RAMOS Y PRECIOS\n\n" +
      "Ramo de autor pequeño: desde 35 EUR\n" +
      "Ramo de autor mediano: desde 55 EUR\n" +
      "Ramo de autor grande: desde 85 EUR\n" +
      "Centros de mesa: desde 45 EUR\n" +
      "Orquideas decoradas: desde 40 EUR\n\n" +
      "Tambien disponemos de flor preservada y plantas exclusivas.\n" +
      "Te enviamos fotos por WhatsApp antes de cada entrega.",
    followUp: 'Quieres ver el menu de nuevo? Escribe "menu" o pulsa el boton.'
  },
  '4': {
    text:
      "HABLAR CON UNA PERSONA\n\n" +
      "Te transferimos con nuestro equipo. En horario comercial respondemos en menos de 15 minutos.\n\n" +
      "Susana o el equipo del atelier te atendera personalmente para ayudarte con tu pedido, boda o consulta especial.\n\n" +
      "Mientras tanto, puedes dejarnos un mensaje y te respondemos en cuanto estemos disponibles.",
    followUp: 'Conversacion escalada a un agente humano. Escribe "menu" para volver al menu principal.'
  }
};

const BIENVENIDA = {
  text:
    "Hola, bienvenido a Espai Vegetal.\n" +
    "Atelier floral en Castellon desde 1974.\n\n" +
    "Soy el asistente virtual y estoy aqui para ayudarte rapido.",
  showMenu: true
};

// ---------------------------------------------------------------
// 3) MOTOR DE CONVERSACION
// ---------------------------------------------------------------
// Recibe un mensaje del usuario y devuelve la respuesta del bot.
function procesarMensaje(session, mensaje) {
  const texto = (mensaje || '').trim().toLowerCase();

  // Comandos globales
  if (texto === 'menu' || texto === 'hola' || texto === 'inicio') {
    session.state = 'menu';
    return {
      messages: [MENU_PRINCIPAL.text],
      options: MENU_PRINCIPAL.options,
      state: session.state
    };
  }

  // Opciones del menu principal
  if (['1', '2', '3', '4'].includes(texto)) {
    const respuesta = RESPUESTAS[texto];
    session.state = texto === '4' ? 'escalado_humano' : 'respuesta';
    return {
      messages: [respuesta.text, respuesta.followUp],
      options: [
        { id: 'menu', label: 'Volver al menu principal' }
      ],
      state: session.state
    };
  }

  // Si esta en escalado humano, dejamos pasar texto libre
  if (session.state === 'escalado_humano') {
    return {
      messages: [
        "Mensaje recibido. Un miembro del equipo te respondera en breve.",
        "Si quieres volver al menu automatico, escribe \"menu\"."
      ],
      options: [
        { id: 'menu', label: 'Volver al menu principal' }
      ],
      state: session.state
    };
  }

  // Mensaje no reconocido
  return {
    messages: [
      "No he entendido tu mensaje. Estas son las opciones disponibles:",
      MENU_PRINCIPAL.text
    ],
    options: MENU_PRINCIPAL.options,
    state: 'menu'
  };
}

// ---------------------------------------------------------------
// 4) RUTAS
// ---------------------------------------------------------------

// Ruta inicial: devuelve la bienvenida y el menu
app.post('/start', (req, res) => {
  const { sessionId } = req.body;
  const session = getSession(sessionId);
  session.state = 'menu';

  res.json({
    messages: [BIENVENIDA.text, MENU_PRINCIPAL.text],
    options: MENU_PRINCIPAL.options,
    state: session.state
  });
});

// Recibe mensajes del usuario y devuelve respuesta del bot
app.post('/chat', (req, res) => {
  const { sessionId, message } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId requerido' });
  }
  const session = getSession(sessionId);
  const respuesta = procesarMensaje(session, message);
  res.json(respuesta);
});

// Reinicia la sesion
app.post('/reset', (req, res) => {
  const { sessionId } = req.body;
  sessions.delete(sessionId);
  res.json({ ok: true });
});

// ---------------------------------------------------------------
// 5) ARRANQUE
// ---------------------------------------------------------------
app.listen(PORT, () => {
  console.log('---------------------------------------------');
  console.log(' ESPAI VEGETAL - Demo de soporte WhatsApp');
  console.log(' Servidor en marcha en http://localhost:' + PORT);
  console.log('---------------------------------------------');
});

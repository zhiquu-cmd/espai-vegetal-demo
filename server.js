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
    sessions.set(sessionId, {
      // Nuevo motor: usamos estadoActual y datosTemporales
      estadoActual: 'menu_principal',
      datosTemporales: {},
      startedAt: new Date()
    });
  }
  return sessions.get(sessionId);
}

// ---------------------------------------------------------------
// 2) CONTENIDO DEL BOT (textos reales de la floristeria)
// ---------------------------------------------------------------
const MENU_PRINCIPAL = {
  text:
    "¿En qué podemos ayudarte? Elige una opción:",
  options: [
    { id: '1', label: 'Ramo o regalo' },
    { id: '2', label: 'Bodas y eventos' },
    { id: '3', label: 'Plantas' },
    { id: '4', label: 'Envíos' },
    { id: '5', label: 'Horarios y contacto' },
    { id: '6', label: 'Hablar con el equipo' }
  ],
  long:
    "\n" +
    "1️⃣  Encargar un ramo o regalo\n" +
    "2️⃣  Bodas y eventos\n" +
    "3️⃣  Plantas e interiorismo botánico\n" +
    "4️⃣  Envíos a domicilio\n" +
    "5️⃣  Horarios, ubicación y contacto\n" +
    "6️⃣  Hablar con Susana o el equipo\n\n" +
    "Escribe el número o pulsa un botón."
};

// Textos reutilizables
const INFO_ATELIER =
  "HORARIOS Y UBICACION\n\n" +
  "Atelier principal:\n" +
  "Lunes a sabado: 9:30 - 14:00 / 17:00 - 20:30\n" +
  "Domingos: cerrado\n\n" +
  "Direccion: Castellon de la Plana\n" +
  "Tienda Plaza Santa Clara abierta tambien por las mañanas.\n\n" +
  "Telefono: +34 964 205 102";

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
// Utilidad: limpieza de texto (minusculas y trim)
function limpiar(texto) {
  return (texto || '').toString().toLowerCase().trim();
}

// Respuestas de conveniencia
function respuestaMenuPrincipal() {
  return {
    messages: [
      MENU_PRINCIPAL.text,
      MENU_PRINCIPAL.long
    ],
    options: MENU_PRINCIPAL.options,
    estado: 'menu_principal'
  };
}

function mensajeNoEntendido() {
  return {
    messages: [
      'No he entendido tu mensaje.',
      'Puedes elegir una opcion del menu o escribir "menu" para volver.'
    ],
    options: [
      { id: 'menu', label: 'Volver al menu principal' }
    ]
  };
}

function respuestaDespedida() {
  return {
    messages: [
      'Gracias por tu visita. Cuando quieras, escribe "hola" o "menu" para continuar.',
      INFO_ATELIER
    ],
    options: [
      { id: 'menu', label: 'Volver al menu principal' }
    ],
    estado: 'despedida'
  };
}

// Handlers de flujo
function manejarMenuPrincipal(session, texto) {
  // Acepta numero o palabras clave
  if (['1', 'ramos', 'ramo', 'ramo personalizado'].includes(texto)) {
    session.estadoActual = 'ramo_submenu';
    return {
      messages: [
        'RAMOS PERSONALIZADOS',
        '¿Que te interesa? Elige una opcion:',
        '1. Presupuesto y estilo',
        '2. Entrega o recogida'
      ],
      options: [
        { id: '1', label: 'Presupuesto y estilo' },
        { id: '2', label: 'Entrega o recogida' },
        { id: 'menu', label: 'Volver al menu principal' }
      ],
      estado: session.estadoActual
    };
  }

  if (['2', 'bodas', 'eventos', 'boda'].includes(texto)) {
    session.estadoActual = 'bodas_pregunta_fecha';
    session.datosTemporales = {};
    return {
      messages: [
        'BODAS Y EVENTOS',
        '¿Que fecha tienes prevista? (ej. 14/09/2026 o "mayo 2027")'
      ],
      options: [
        { id: 'volver', label: 'Volver' },
        { id: 'menu', label: 'Menu principal' }
      ],
      estado: session.estadoActual
    };
  }

  if (['3', 'interiorismo', 'plantas', 'decoracion'].includes(texto)) {
    session.estadoActual = 'interiorismo_submenu';
    return {
      messages: [
        'INTERIORISMO VEGETAL',
        'Servicios disponibles:',
        '- Mantenimiento de plantas en locales y oficinas',
        '- Diseño de rincones verdes y escaparates',
        '- Asesoramiento de especies segun luz y espacio'
      ],
      options: [
        { id: 'menu', label: 'Volver al menu principal' },
        { id: '5', label: 'Hablar con una persona' }
      ],
      estado: session.estadoActual
    };
  }

  if (['4', 'envios', 'envío', 'reparto', 'entregas'].includes(texto)) {
    session.estadoActual = 'envios_submenu';
    return {
      messages: [
        'ENVIOS Y REPARTO',
        'Tarifas orientativas:',
        '- Castellon y Grao: 11 EUR',
        '- Almazora: 15 EUR',
        '- Villarreal y Burriana: 18 EUR',
        '- Benicassim: 20 EUR',
        '',
        'Para otras zonas consulta disponibilidad.'
      ],
      options: [
        { id: 'menu', label: 'Volver al menu principal' },
        { id: '5', label: 'Hablar con una persona' }
      ],
      estado: session.estadoActual
    };
  }

  if (['5', 'horarios', 'ubicacion', 'ubicación', 'direccion', 'dirección', 'telefono', 'teléfono', 'contacto'].includes(texto)) {
    return {
      messages: [INFO_ATELIER],
      options: [
        { id: 'menu', label: 'Volver al menu principal' }
      ],
      estado: 'info_atelier'
    };
  }

  if (['6', 'persona', 'agente', 'hablar', 'equipo', 'susana'].includes(texto)) {
    session.estadoActual = 'escalado_humano';
    return {
      messages: [
        'Te ponemos en contacto con nuestro equipo. Suelen responder en menos de 15 minutos en horario comercial.',
        'Mientras tanto, puedes dejarnos aqui tu mensaje.'
      ],
      options: [
        { id: 'menu', label: 'Volver al menu principal' }
      ],
      estado: session.estadoActual
    };
  }

  return mensajeNoEntendido();
}

function manejarSubmenuRamo(session, texto) {
  if (['1', 'presupuesto', 'precio', 'estilo'].includes(texto)) {
    session.estadoActual = 'ramo_pregunta_presupuesto';
    return {
      messages: [
        'Perfecto. ¿Cual es tu presupuesto aproximado? (ej. 35, 50, 80 EUR)'
      ],
      options: [
        { id: 'volver', label: 'Volver' },
        { id: 'menu', label: 'Menu principal' }
      ],
      estado: session.estadoActual
    };
  }
  if (['2', 'entrega', 'recogida'].includes(texto)) {
    session.estadoActual = 'ramo_pregunta_entrega';
    return {
      messages: [
        '¿Entrega a domicilio o recogida en atelier? Escribe "entrega" o "recogida". Si es entrega, indica direccion y poblacion.'
      ],
      options: [
        { id: 'entrega', label: 'Entrega a domicilio' },
        { id: 'recogida', label: 'Recogida en atelier' },
        { id: 'menu', label: 'Menu principal' }
      ],
      estado: session.estadoActual
    };
  }
  return mensajeNoEntendido();
}

function manejarPresupuestoRamo(session, texto) {
  // Extraer primer numero como presupuesto
  const match = texto.match(/\d{1,4}/);
  if (!match) {
    return {
      messages: [
        'Puedes indicarme un numero aproximado en EUR? (ej. 45)'
      ],
      options: [ { id: 'menu', label: 'Menu principal' } ],
      estado: session.estadoActual
    };
  }
  const presupuesto = parseInt(match[0], 10);
  session.datosTemporales.presupuesto = presupuesto;
  session.estadoActual = 'ramo_pregunta_entrega';
  return {
    messages: [
      `Anotado presupuesto ~ ${presupuesto} EUR.`,
      '¿Entrega a domicilio o recogida en atelier? Si es entrega, indica direccion y poblacion.'
    ],
    options: [
      { id: 'entrega', label: 'Entrega a domicilio' },
      { id: 'recogida', label: 'Recogida en atelier' },
      { id: 'menu', label: 'Menu principal' }
    ],
    estado: session.estadoActual
  };
}

function manejarEntregaRamo(session, texto) {
  const esEntrega = texto.includes('entrega');
  const esRecogida = texto.includes('recogida');

  if (esEntrega) session.datosTemporales.modalidad = 'entrega';
  if (esRecogida) session.datosTemporales.modalidad = 'recogida';

  // Si es entrega e incluye direccion basica
  if (session.datosTemporales.modalidad === 'entrega' && /[a-záéíóúñ]+\s+\d+/.test(texto)) {
    session.datosTemporales.direccion = texto;
  }

  // Cuando tengamos al menos modalidad, devolvemos resumen y pasamos a humano
  if (session.datosTemporales.modalidad) {
    session.estadoActual = 'escalado_humano';
    const resumen = [
      'Resumen de tu encargo:',
      session.datosTemporales.presupuesto ? `- Presupuesto: ~ ${session.datosTemporales.presupuesto} EUR` : null,
      `- Modalidad: ${session.datosTemporales.modalidad}`,
      session.datosTemporales.direccion ? `- Direccion: ${session.datosTemporales.direccion}` : null,
    ].filter(Boolean).join('\n');

    return {
      messages: [
        resumen,
        'Genial. Un miembro del equipo te confirma disponibilidad y opciones de estilo en breve.',
        'Puedes escribir cualquier detalle extra (color, tipo de flores, fecha/hora) o "menu" para volver.'
      ],
      options: [
        { id: 'menu', label: 'Volver al menu principal' }
      ],
      estado: session.estadoActual
    };
  }

  // Pedir aclaracion
  return {
    messages: [
      '¿Prefieres entrega a domicilio o recogida en atelier? Escribe "entrega" o "recogida". Si es entrega, añade la direccion.'
    ],
    options: [
      { id: 'entrega', label: 'Entrega a domicilio' },
      { id: 'recogida', label: 'Recogida en atelier' },
      { id: 'menu', label: 'Menu principal' }
    ],
    estado: session.estadoActual
  };
}

function manejarFechaBoda(session, texto) {
  // Aceptamos algo que parezca fecha/mes/año
  if (!/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/.test(texto)) {
    return {
      messages: [
        '¿Me indicas la fecha aproximada? (ej. 14/09/2026 o "mayo 2027")'
      ],
      options: [ { id: 'menu', label: 'Menu principal' } ],
      estado: session.estadoActual
    };
  }
  session.datosTemporales.fechaBoda = texto;
  session.estadoActual = 'bodas_pregunta_invitados';
  return {
    messages: [
      'Gracias. ¿Numero aproximado de invitados?'
    ],
    options: [ { id: 'volver', label: 'Volver' }, { id: 'menu', label: 'Menu' } ],
    estado: session.estadoActual
  };
}

function manejarInvitadosBoda(session, texto) {
  const match = texto.match(/\d{1,4}/);
  if (!match) {
    return {
      messages: [ '¿Cuantos invitados aproximadamente? (ej. 80, 120)' ],
      options: [ { id: 'menu', label: 'Menu principal' } ],
      estado: session.estadoActual
    };
  }
  session.datosTemporales.invitados = parseInt(match[0], 10);
  session.estadoActual = 'bodas_pregunta_lugar';
  return {
    messages: [ '¿En que ciudad o lugar se celebra?' ],
    options: [ { id: 'volver', label: 'Volver' }, { id: 'menu', label: 'Menu' } ],
    estado: session.estadoActual
  };
}

function manejarLugarBoda(session, texto) {
  if (!texto || texto.length < 3) {
    return {
      messages: [ 'Indica la ciudad o el espacio aproximado (ej. Castellon, Masia X).'],
      options: [ { id: 'menu', label: 'Menu principal' } ],
      estado: session.estadoActual
    };
  }
  session.datosTemporales.lugar = texto;
  session.estadoActual = 'bodas_pregunta_telefono';
  return {
    messages: [ 'Perfecto. ¿Me das un telefono de contacto?' ],
    options: [ { id: 'volver', label: 'Volver' }, { id: 'menu', label: 'Menu' } ],
    estado: session.estadoActual
  };
}

function manejarTelefonoBoda(session, texto) {
  const tel = (texto || '').replace(/[^\d+]/g, '');
  if (!/\d{6,}/.test(tel)) {
    return {
      messages: [ '¿Puedes escribir un telefono valido? (ej. 612345678)' ],
      options: [ { id: 'menu', label: 'Menu principal' } ],
      estado: session.estadoActual
    };
  }
  session.datosTemporales.telefono = tel;
  session.estadoActual = 'escalado_humano';
  const resumen = [
    'Gracias. Hemos registrado tu solicitud:',
    `- Fecha: ${session.datosTemporales.fechaBoda}`,
    `- Invitados: ${session.datosTemporales.invitados}`,
    `- Lugar: ${session.datosTemporales.lugar}`,
    `- Telefono: ${session.datosTemporales.telefono}`
  ].join('\n');
  return {
    messages: [
      resumen,
      'Nuestro equipo te contactara para una propuesta personalizada. Puedes escribir detalles extra o "menu" para volver.'
    ],
    options: [ { id: 'menu', label: 'Volver al menu principal' } ],
    estado: session.estadoActual
  };
}

function manejarSubmenuInteriorismo(session, texto) {
  // Simplemente redirigimos a humano si pide presupuesto o visita
  if (/(presupuesto|cita|visita|propuesta)/.test(texto)) {
    session.estadoActual = 'escalado_humano';
    return {
      messages: [
        'Te ponemos con el equipo para coordinar visita o presupuesto.',
        'Escribe cualquier detalle (metros, luz, tipo de espacio) o "menu" para volver.'
      ],
      options: [ { id: 'menu', label: 'Menu principal' } ],
      estado: session.estadoActual
    };
  }
  return {
    messages: [
      '¿Quieres un presupuesto o agendar una visita?'
    ],
    options: [ { id: 'menu', label: 'Menu principal' }, { id: '5', label: 'Hablar con una persona' } ],
    estado: session.estadoActual
  };
}

function manejarSubmenuEnvios(session, texto) {
  if (['menu', 'volver'].includes(texto)) return respuestaMenuPrincipal();
  return {
    messages: [
      'Si necesitas saber si llegamos a tu zona concreta, escribe la poblacion o codigo postal.'
    ],
    options: [ { id: 'menu', label: 'Menu principal' }, { id: '5', label: 'Hablar con una persona' } ],
    estado: session.estadoActual
  };
}

function manejarEscaladoHumano(session, texto) {
  // Texto libre, mantenemos estado y damos acuse
  return {
    messages: [
      'Mensaje recibido. Un miembro del equipo te respondera en breve.',
      'Escribe "menu" para volver al menu principal cuando quieras.'
    ],
    options: [ { id: 'menu', label: 'Volver al menu principal' } ],
    estado: session.estadoActual
  };
}

// Recibe un mensaje del usuario y devuelve la respuesta del bot.
function procesarMensaje(session, mensaje) {
  const texto = limpiar(mensaje);

  // COMANDOS GLOBALES
  if (['menu', 'inicio', 'hola', 'volver'].includes(texto)) {
    session.estadoActual = 'menu_principal';
    session.datosTemporales = {};
    return respuestaMenuPrincipal();
  }
  if (['salir', 'cancelar'].includes(texto)) {
    session.estadoActual = 'despedida';
    return respuestaDespedida();
  }

  // ENRUTAMIENTO POR ESTADO
  switch (session.estadoActual) {
    case 'menu_principal':
      return manejarMenuPrincipal(session, texto);
    case 'ramo_submenu':
      return manejarSubmenuRamo(session, texto);
    case 'ramo_pregunta_presupuesto':
      return manejarPresupuestoRamo(session, texto);
    case 'ramo_pregunta_entrega':
      return manejarEntregaRamo(session, texto);
    case 'bodas_pregunta_fecha':
      return manejarFechaBoda(session, texto);
    case 'bodas_pregunta_invitados':
      return manejarInvitadosBoda(session, texto);
    case 'bodas_pregunta_lugar':
      return manejarLugarBoda(session, texto);
    case 'bodas_pregunta_telefono':
      return manejarTelefonoBoda(session, texto);
    case 'interiorismo_submenu':
      return manejarSubmenuInteriorismo(session, texto);
    case 'envios_submenu':
      return manejarSubmenuEnvios(session, texto);
    case 'escalado_humano':
      return manejarEscaladoHumano(session, texto);
    default:
      const fallback = mensajeNoEntendido();
      const menu = respuestaMenuPrincipal();
      return {
        messages: [...fallback.messages, ...menu.messages],
        options: menu.options,
        estado: 'menu_principal'
      };
  }
}

// ---------------------------------------------------------------
// 4) RUTAS
// ---------------------------------------------------------------

// Ruta inicial: devuelve la bienvenida y el menu
app.post('/start', (req, res) => {
  const { sessionId } = req.body;
  const session = getSession(sessionId);
  session.estadoActual = 'menu_principal';

  const menu = respuestaMenuPrincipal();
  res.json({
    messages: [BIENVENIDA.text, ...menu.messages],
    options: menu.options,
    estado: session.estadoActual
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

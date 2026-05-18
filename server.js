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

// Centralizamos todas las URLs aqui para editarlas facil
const ENLACES = {
  catalogoGeneral: "https://espaivegetal.com",
  flores: {
    naturales: "https://espaivegetal.com/12-natural",
    secas: "https://espaivegetal.com/13-seco",
    artificiales: "https://espaivegetal.com/14-artificial"
  },
  plantas: "https://espaivegetal.com/19-plantas",
  accesorios: "https://espaivegetal.com/31-accesorios",
  sanValentin: "https://espaivegetal.com/75-flores-san-valentin",
  diaDeLaMadre: "https://espaivegetal.com/54-dia-de-la-madre",
  novedades: "https://espaivegetal.com/novedades",
  masVendidos: "https://espaivegetal.com/mas-vendidos",
  ofertas: "https://espaivegetal.com/productos-rebajados",
  whatsapp: "https://wa.me/34692139016"
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
function respuestaEnvios() {
  return {
    messages: [
      'ENVIOS A DOMICILIO',
      'Tarifas orientativas:',
      '- Castellon y Grao: 11 EUR',
      '- Almazora: 15 EUR',
      '- Villarreal y Burriana: 18 EUR',
      '- Benicassim: 20 EUR',
      '',
      'Para otras zonas, consulta disponibilidad. Indica direccion y poblacion si quieres que lo confirmemos.'
    ],
    options: [
      { id: 'menu', label: 'Volver al menu principal' },
      { id: '6', label: 'Hablar con el equipo' }
    ],
    estado: 'menu_principal'
  };
}

function respuestaHorarios() {
  return {
    messages: [
      INFO_ATELIER,
      `Web: ${ENLACES.catalogoGeneral}`,
      `WhatsApp: ${ENLACES.whatsapp}`
    ],
    options: [ { id: 'menu', label: 'Volver al menu principal' } ],
    estado: 'menu_principal'
  };
}

function respuestaEscalado() {
  return {
    messages: [
      'Te ponemos en contacto con nuestro equipo. Suelen responder en menos de 15 minutos en horario comercial.',
      'Mientras tanto, puedes dejarnos aqui tu mensaje.'
    ],
    options: [ { id: 'menu', label: 'Volver al menu principal' } ],
    estado: 'escalado_humano'
  };
}

function manejarMenuPrincipal(session, texto) {
  // Exacto segun especificacion del usuario
  if (texto === '1') {
    session.estadoActual = 'ramo_submenu';
    return {
      messages: [
        'Perfecto. ¿Qué tipo de ramo buscas?',
        '\n' +
          '1.1  Ramo de cumpleaños o felicitación\n' +
          '1.2  Ramo romántico\n' +
          '1.3  Ramo de condolencias\n' +
          '1.4  Ramo a medida (Susana lo diseña)\n\n' +
          'Escribe el número.'
      ],
      options: [
        { id: '1.1', label: 'Cumpleaños' },
        { id: '1.2', label: 'Romántico' },
        { id: '1.3', label: 'Condolencias' },
        { id: '1.4', label: 'A medida' },
        { id: 'menu', label: '← Volver al menú' }
      ],
      estado: session.estadoActual
    };
  }

  if (texto === '2') {
    session.estadoActual = 'bodas_pregunta_fecha';
    session.datosTemporales = {};
    return {
      messages: [
        'Qué emoción 🌿 Te ayudo a preparar tu consulta de boda.',
        'Susana diseña cada boda como una pieza única. Te haré 4 preguntas rápidas para que ella pueda preparar una propuesta personalizada.',
        'Primera pregunta: ¿para qué fecha es la boda? (puedes poner mes/año aproximado, no hace falta día exacto)'
      ],
      options: [ { id: 'menu', label: '← Volver al menú' } ],
      estado: session.estadoActual
    };
  }

  if (texto === '3') {
    session.estadoActual = 'interiorismo_submenu';
    return {
      messages: [
        'Trabajamos con plantas exclusivas y diseño botánico para hogares, hoteles, restaurantes y boutiques.',
        '¿Qué te interesa más?',
        '\n' +
          '3.1  Plantas para regalar\n' +
          '3.2  Plantas para mi hogar\n' +
          '3.3  Proyecto de interiorismo (hotel, restaurante, oficina)\n',
        `Catálogo de plantas: ${ENLACES.plantas} · Accesorios: ${ENLACES.accesorios}`
      ],
      options: [
        { id: '3.1', label: 'Para regalar' },
        { id: '3.2', label: 'Para mi hogar' },
        { id: '3.3', label: 'Proyecto profesional' },
        { id: 'menu', label: '← Volver al menú' }
      ],
      estado: session.estadoActual
    };
  }

  if (texto === '4') {
    session.estadoActual = 'menu_principal';
    return respuestaEnvios();
  }

  if (texto === '5') {
    session.estadoActual = 'menu_principal';
    return respuestaHorarios();
  }

  if (texto === '6') {
    session.estadoActual = 'escalado_humano';
    return respuestaEscalado();
  }

  return mensajeNoEntendido();
}

function manejarSubmenuRamo(session, texto) {
  // Especificación: 1.1-1.4 definen tipoRamo y pasan a presupuesto con opciones A-D
  const tipos = {
    '1.1': 'cumpleaños',
    '1.2': 'romántico',
    '1.3': 'condolencias',
    '1.4': 'a medida'
  };

  if (tipos[texto]) {
    session.datosTemporales.tipoRamo = tipos[texto];
  }

  if (session.datosTemporales.tipoRamo) {
    session.estadoActual = 'ramo_pregunta_presupuesto';
    return {
      messages: [
        'Genial. ¿Qué presupuesto manejas para el ramo?',
        '\n' +
          'A) 35-50 €  (ramo pequeño)\n' +
          'B) 50-80 €  (ramo mediano)\n' +
          'C) 80-150 € (ramo grande)\n' +
          'D) Sin límite, quiero algo especial\n',
        `También puedes ver el catálogo: Naturales ${ENLACES.flores.naturales} · Secas ${ENLACES.flores.secas} · Artificiales ${ENLACES.flores.artificiales}`
      ],
      options: [
        { id: 'A', label: '35-50 €' },
        { id: 'B', label: '50-80 €' },
        { id: 'C', label: '80-150 €' },
        { id: 'D', label: 'Algo especial' }
      ],
      estado: session.estadoActual
    };
  }

  return mensajeNoEntendido();
}

function manejarPresupuestoRamo(session, texto) {
  // Guardamos la seleccion tal cual (A/B/C/D o texto libre)
  session.datosTemporales.presupuesto = texto;
  session.estadoActual = 'ramo_pregunta_entrega';
  return {
    messages: [
      'Perfecto. Última pregunta: ¿quieres recogerlo en tienda o entrega a domicilio?',
      '\n' +
        '1) Recoger en la tienda (Castellón)\n' +
        '2) Entrega a domicilio\n'
    ],
    options: [
      { id: 'recoger', label: 'Recoger en tienda' },
      { id: 'domicilio', label: 'Entrega a domicilio' }
    ],
    estado: session.estadoActual
  };
}

function manejarEntregaRamo(session, texto) {
  // Aceptar ids de botones o atajos numericos
  let entrega = texto;
  if (texto === '1') entrega = 'recoger';
  if (texto === '2') entrega = 'domicilio';

  session.datosTemporales.entrega = entrega;
  session.estadoActual = 'escalado_humano';

  // Mapear presupuesto si viene como A/B/C/D a texto humano
  const mapaPres = {
    'a': '35-50 € (ramo pequeño)',
    'b': '50-80 € (ramo mediano)',
    'c': '80-150 € (ramo grande)',
    'd': 'Sin límite (algo especial)'
  };
  const presKey = (session.datosTemporales.presupuesto || '').toString().trim().toLowerCase();
  const presupuestoTexto = mapaPres[presKey] || session.datosTemporales.presupuesto;

  const resumen = [
    '¡Genial! 🌸 Aquí tienes el resumen de tu pedido:',
    '',
    `• Tipo de ramo: ${session.datosTemporales.tipoRamo || '-'}`,
    `• Presupuesto: ${presupuestoTexto || '-'}`,
    `• Entrega: ${session.datosTemporales.entrega || '-'}`
  ].join('\n');

  return {
    messages: [
      resumen,
      'Te paso ahora con el equipo. En menos de 15 minutos te enviarán fotos de propuestas reales por WhatsApp para que elijas la que más te guste 💚',
      'Si quieres adelantar algo, escríbenos aquí lo que tengas en mente (colores, ocasión, mensaje para la tarjeta...)'
    ],
    options: [ { id: 'menu', label: '← Volver al menú' } ],
    estado: session.estadoActual
  };
}

function manejarFechaBoda(session, texto) {
  // Según especificación: guardar tal cual y avanzar
  session.datosTemporales.fechaBoda = texto;
  session.estadoActual = 'bodas_pregunta_invitados';
  return {
    messages: [
      `Anotado: ${texto} ✨`,
      'Segunda pregunta: ¿cuántos invitados aproximadamente?'
    ],
    estado: session.estadoActual
  };
}

function manejarInvitadosBoda(session, texto) {
  session.datosTemporales.invitados = texto;
  session.estadoActual = 'bodas_pregunta_lugar';
  return {
    messages: [
      `Perfecto, ${texto} invitados.`,
      '¿Dónde se celebra? (ciudad o nombre del lugar si lo sabes)'
    ],
    estado: session.estadoActual
  };
}

function manejarLugarBoda(session, texto) {
  session.datosTemporales.lugar = texto;
  session.estadoActual = 'bodas_pregunta_telefono';
  return {
    messages: [
      `Anotado: ${texto} 🌿`,
      'Última pregunta: ¿en qué número de WhatsApp prefieres que Susana te contacte?'
    ],
    estado: session.estadoActual
  };
}

// En produccion, esta funcion enviaria un email/Slack/WhatsApp Business
function notificarAlEquipo(payload) {
  try {
    console.log('[NOTIFICACION]', JSON.stringify(payload, null, 2));
  } catch (e) {
    console.log('[NOTIFICACION]', payload);
  }
}

function manejarTelefonoBoda(session, texto) {
  session.datosTemporales.telefono = texto;
  session.estadoActual = 'escalado_humano';

  notificarAlEquipo({
    tipo: 'Nueva consulta de boda',
    datos: session.datosTemporales
  });

  const bloque = [
    `📅 Fecha: ${session.datosTemporales.fechaBoda}`,
    `👥 Invitados: ${session.datosTemporales.invitados}`,
    `📍 Lugar: ${session.datosTemporales.lugar}`,
    `📱 Contacto: ${session.datosTemporales.telefono}`
  ].join('\n');

  return {
    messages: [
      '¡Listo! 💚 Aquí tienes el resumen:',
      `\n${bloque}\n`,
      'Susana revisará tu consulta personalmente y te contactará en menos de 2 horas con una propuesta inicial.',
      'Mientras tanto, si quieres ir compartiendo ideas, fotos de inspiración o paleta de colores, escríbelas aquí 🌸'
    ],
    options: [ { id: 'menu', label: '← Volver al menú' } ],
    estado: session.estadoActual
  };
}

function manejarSubmenuInteriorismo(session, texto) {
  // Opciones 3.1/3.2/3.3 -> escalado con mensaje contextual
  if (texto === '3.1') {
    session.estadoActual = 'escalado_humano';
    return {
      messages: [
        'Plantas para regalar. Te ayudamos a elegir la especie y maceta segun estilo y presupuesto.',
        'Nuestro equipo te responde en breve. Puedes indicar presupuesto y poblacion.'
      ],
      options: [ { id: 'menu', label: 'Menu principal' } ],
      estado: session.estadoActual
    };
  }
  if (texto === '3.2') {
    session.estadoActual = 'escalado_humano';
    return {
      messages: [
        'Plantas para tu hogar. Indica luz (mucha, media, poca), metros y estilo deseado.',
        'Nuestro equipo prepara sugerencias personalizadas.'
      ],
      options: [ { id: 'menu', label: 'Menu principal' } ],
      estado: session.estadoActual
    };
  }
  if (texto === '3.3') {
    session.estadoActual = 'escalado_humano';
    return {
      messages: [
        'Proyecto profesional (hotel/restaurante/oficina). Indica metros, tipo de espacio y ubicacion.',
        'Coordinamos visita o presupuesto con el equipo.'
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

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
      sessionId,
      historial: [],
      startedAt: new Date()
    });
  }
  return sessions.get(sessionId);
}

// ---------------------------------------------------------------
// 2) CONTENIDO DEL BOT (textos reales de la floristeria)
// ---------------------------------------------------------------
const MENU_PRINCIPAL = {
  text: '¿Qué buscas hoy?',
  options: [
    { id: '1', label: '🌸 Comprar flores' },
    { id: '2', label: '🌿 Comprar planta' },
    { id: '3', label: '🎁 Regalo especial' },
    { id: '4', label: '💒 Bodas y eventos' },
    { id: '5', label: '🏛️ Interiorismo' },
    { id: '6', label: 'ℹ️ Info y contacto' }
  ],
  long:
    "\n" +
    "1️⃣  Comprar flores o un ramo\n" +
    "2️⃣  Comprar una planta\n" +
    "3️⃣  Regalo para una ocasión especial\n" +
    "4️⃣  Bodas y eventos (consulta personalizada)\n" +
    "5️⃣  Interiorismo botánico (proyecto profesional)\n" +
    "6️⃣  Envíos, horarios y contacto\n\n" +
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

function respuestaAyuda() {
  return {
    messages: [
      '🌸 AYUDA RÁPIDA',
      '\n' +
        'Comandos que puedes usar en cualquier momento:\n' +
        "• 'menu' → volver al menú principal\n" +
        "• 'salir' → terminar conversación\n" +
        "• 'ayuda' → ver esta ayuda\n\n" +
        'O escribe directamente lo que necesitas y te ayudo.'
    ],
    options: [ { id: 'menu', label: '← Ver menú' } ],
    estado: 'menu_principal'
  };
}

function mensajeNoEntendido() {
  return {
    messages: [
      'Disculpa, no he entendido tu mensaje 🌿',
      "Puedes escribir 'menu' para ver todas las opciones disponibles."
    ],
    options: [
      { id: 'menu', label: '← Ver menú' }
    ]
  };
}

function respuestaDespedida() {
  return {
    messages: [
      'Gracias por contactar con Espai Vegetal 🌿',
      "Estamos aquí cuando nos necesites. Escribe 'hola' para volver a empezar."
    ],
    estado: 'despedida'
  };
}

// Handlers de flujo
function respuestaConEnlace({ texto, url, etiquetaBoton, extra = null }) {
  const msgs = [texto];
  if (extra) msgs.push(extra);
  msgs.push('💳 Pago seguro online · Envío en 24h');
  return {
    messages: msgs,
    options: [
      { id: 'comprar', label: etiquetaBoton, url, tipo: 'externo' },
      { id: 'menu', label: '← Volver al menú' }
    ],
    estado: 'menu_principal'
  };
}

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
    messages: [INFO_ATELIER, `Web: ${ENLACES.catalogoGeneral}`, `WhatsApp: ${ENLACES.whatsapp}`],
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
  // Según nuevo embudo
  if (texto === '1') {
    session.estadoActual = 'flores_submenu';
    return {
      messages: [
        'Perfecto 🌸 ¿Qué tipo de flores prefieres?',
        '\n' +
          '1.1  Flores naturales frescas\n' +
          '1.2  Flores preservadas (duran meses)\n' +
          '1.3  Flores artificiales (sin mantenimiento)\n' +
          '1.4  No sé, enséñame lo más vendido\n'
      ],
      options: [
        { id: '1.1', label: 'Naturales' },
        { id: '1.2', label: 'Preservadas' },
        { id: '1.3', label: 'Artificiales' },
        { id: '1.4', label: 'Lo más vendido' },
        { id: 'menu', label: '← Volver al menú' }
      ],
      estado: session.estadoActual
    };
  }

  if (texto === '2') {
    // Link directo a plantas
    return respuestaConEnlace({
      texto:
        '🌿 Tenemos plantas de interior, decorativas y exclusivas, todas con asesoramiento sobre cuidados. Mira el catálogo y compra online:',
      url: ENLACES.plantas,
      etiquetaBoton: 'Ver todas las plantas →',
      extra: "Si tienes dudas sobre qué planta encaja con tu espacio, escribe 'ayuda' y te asesoramos personalmente."
    });
  }

  if (texto === '3') {
    session.estadoActual = 'regalo_submenu';
    return {
      messages: [
        '🎁 ¿Para qué ocasión es el regalo?'
      ],
      options: [
        { id: '3.1', label: 'Cumpleaños' },
        { id: '3.2', label: 'Aniversario o pareja' },
        { id: '3.3', label: 'Día de la Madre' },
        { id: '3.4', label: 'Condolencias' },
        { id: '3.5', label: 'Solo porque sí 💚' },
        { id: 'menu', label: '← Volver' }
      ],
      estado: session.estadoActual
    };
  }

  if (texto === '4') {
    // BODAS formulario conversacional
    session.estadoActual = 'bodas_pregunta_fecha';
    return {
      messages: [
        'Qué emoción 🌿',
        'Las bodas son siempre proyectos a medida. Susana diseña cada una como una pieza única.',
        'Te haré 4 preguntas rápidas y ella te contactará personalmente con una propuesta.',
        'Primera pregunta: ¿para qué fecha es la boda?'
      ],
      options: [ { id: 'menu', label: '← Cancelar y volver' } ],
      estado: session.estadoActual
    };
  }

  if (texto === '5') {
    // INTERIORISMO: escalar a humano con CTA WhatsApp
    session.estadoActual = 'escalado_humano';
    return {
      messages: [
        '🏛️ Diseñamos proyectos de interiorismo botánico para hoteles, restaurantes, boutiques y oficinas.',
        'Susana hace una visita al espacio, propone un diseño a medida y se encarga del mantenimiento si lo necesitas.',
        'Te paso con ella para concretar una primera reunión sin compromiso.'
      ],
      options: [
        { id: 'whatsapp', label: 'Hablar por WhatsApp →', url: ENLACES.whatsapp, tipo: 'externo' },
        { id: 'menu', label: '← Volver al menú' }
      ],
      estado: session.estadoActual
    };
  }

  if (texto === '6') {
    session.estadoActual = 'info_submenu';
    return {
      messages: ['¿Qué información necesitas?'],
      options: [
        { id: '6.1', label: '🚚 Envíos y zonas' },
        { id: '6.2', label: '🕐 Horarios y ubicación' },
        { id: '6.3', label: '📱 Contacto directo' },
        { id: 'menu', label: '← Volver' }
      ],
      estado: session.estadoActual
    };
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

// Nuevo: FLORES → embudo a tienda
function manejarSubmenuFlores(session, texto) {
  if (texto === '1.1') {
    return respuestaConEnlace({
      texto:
        '🌸 Nuestras flores naturales son frescas, escogidas a mano cada mañana. Catálogo completo con compra online:',
      url: ENLACES.flores.naturales || ENLACES.floresNaturales || ENLACES.catalogoGeneral,
      etiquetaBoton: 'Ver flores naturales →'
    });
  }
  if (texto === '1.2') {
    return respuestaConEnlace({
      texto:
        '💐 Las flores preservadas son una de nuestras especialidades. Duran meses sin agua y son perfectas como regalo duradero:',
      url: ENLACES.flores.secas || ENLACES.floresPreservadas || ENLACES.catalogoGeneral,
      etiquetaBoton: 'Ver flores preservadas →'
    });
  }
  if (texto === '1.3') {
    return respuestaConEnlace({
      texto: '🌿 Belleza sin mantenimiento. Calidad indistinguible de las naturales:',
      url: ENLACES.flores.artificiales || ENLACES.floresArtificiales || ENLACES.catalogoGeneral,
      etiquetaBoton: 'Ver flores artificiales →'
    });
  }
  if (texto === '1.4') {
    return respuestaConEnlace({
      texto: '✨ Los favoritos de nuestros clientes este mes:',
      url: ENLACES.masVendidos,
      etiquetaBoton: 'Ver más vendidos →'
    });
  }
  return mensajeNoEntendido();
}

// Nuevo: REGALO → tienda o humano
function manejarSubmenuRegalo(session, texto) {
  if (texto === '3.1') {
    return respuestaConEnlace({
      texto:
        '🎂 Para un cumpleaños recomendamos un ramo natural en colores alegres. Elige el tuyo:',
      url: ENLACES.flores.naturales || ENLACES.floresNaturales || ENLACES.catalogoGeneral,
      etiquetaBoton: 'Elegir ramo de cumpleaños →'
    });
  }
  if (texto === '3.2') {
    return respuestaConEnlace({
      texto: '💕 Tenemos una sección especial para regalos románticos:',
      url: ENLACES.sanValentin,
      etiquetaBoton: 'Ver regalos románticos →'
    });
  }
  if (texto === '3.3') {
    return respuestaConEnlace({
      texto: '💐 Selección preparada con cariño para el Día de la Madre:',
      url: ENLACES.diaDeLaMadre,
      etiquetaBoton: 'Ver Día de la Madre →'
    });
  }
  if (texto === '3.4') {
    session.estadoActual = 'escalado_humano';
    return {
      messages: [
        'Lo sentimos mucho 🤍',
        'Para arreglos de condolencias preferimos atenderte personalmente para asegurar el tono y la entrega correctos.',
        'Te paso con nuestro equipo, te atenderán en breve por WhatsApp.'
      ],
      options: [
        { id: 'whatsapp', label: 'Abrir WhatsApp →', url: ENLACES.whatsapp, tipo: 'externo' },
        { id: 'menu', label: '← Volver' }
      ],
      estado: session.estadoActual
    };
  }
  if (texto === '3.5') {
    return respuestaConEnlace({
      texto:
        '🌿 Un detalle sin motivo es siempre el mejor motivo. Nuestra selección de novedades:',
      url: ENLACES.novedades,
      etiquetaBoton: 'Ver novedades →'
    });
  }
  return mensajeNoEntendido();
}

// Nuevo: INFO
function manejarSubmenuInfo(session, texto) {
  if (texto === '6.1') {
    return {
      messages: [
        '🚚 ENVÍOS A DOMICILIO',
        '\n' +
          '• Castellón y Grao: 11 €\n' +
          '• Almazora: 15 €\n' +
          '• Villarreal: 18 €\n' +
          '• Burriana: 18 €\n' +
          '• Benicàssim: 20 €\n' +
          "• L'Alcora: 28 €\n" +
          '• Oropesa del Mar: 33 €\n',
        'Envío en el mismo día si pides antes de las 12:00.',
        '¿Quieres comprar ya?'
      ],
      options: [
        { id: 'catalogo', label: 'Ver tienda online →', url: ENLACES.catalogoGeneral, tipo: 'externo' },
        { id: 'menu', label: '← Volver' }
      ],
      estado: session.estadoActual
    };
  }
  if (texto === '6.2') {
    return {
      messages: [
        '🕐 HORARIOS Y UBICACIÓN',
        '\n' +
          'Atelier principal:\n' +
          'Lunes a sábado: 9:30 - 14:00 / 17:00 - 20:30\n' +
          'Domingos: cerrado\n\n' +
          '📍 Castellón de la Plana\n' +
          '☎️ +34 964 205 102\n'
      ],
      options: [ { id: 'menu', label: '← Volver al menú' } ],
      estado: session.estadoActual
    };
  }
  if (texto === '6.3') {
    return {
      messages: [
        '📱 Contacta con nosotros directamente:',
        '\n' +
          'WhatsApp: +34 692 139 016\n' +
          'Email: info@espaivegetal.com\n' +
          'Instagram: @espaivegetal\n'
      ],
      options: [
        { id: 'whatsapp', label: 'Abrir WhatsApp →', url: ENLACES.whatsapp, tipo: 'externo' },
        { id: 'menu', label: '← Volver' }
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
  try { session.historial.push({ t: new Date().toISOString(), m: texto }); } catch (e) {}
  notificarAlEquipo({ sessionId: session.sessionId, mensaje: texto });
  return {
    messages: [
      'Mensaje recibido ✓',
      "Un miembro del equipo te responderá en breve. Si quieres volver al menú automático, escribe 'menu'."
    ],
    options: [
      { id: 'whatsapp', label: 'Abrir WhatsApp →', url: ENLACES.whatsapp, tipo: 'externo' },
      { id: 'menu', label: '← Volver al menú' }
    ],
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
  if (['ayuda'].includes(texto)) {
    return respuestaAyuda();
  }

  // ENRUTAMIENTO POR ESTADO
  switch (session.estadoActual) {
    case 'menu_principal':
      return manejarMenuPrincipal(session, texto);
    case 'ramo_submenu':
      return manejarSubmenuRamo(session, texto);
    case 'flores_submenu':
      return manejarSubmenuFlores(session, texto);
    case 'regalo_submenu':
      return manejarSubmenuRegalo(session, texto);
    case 'ramo_pregunta_presupuesto':
      return manejarPresupuestoRamo(session, texto);
    case 'ramo_pregunta_entrega':
      return manejarEntregaRamo(session, texto);
    case 'info_submenu':
      return manejarSubmenuInfo(session, texto);
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

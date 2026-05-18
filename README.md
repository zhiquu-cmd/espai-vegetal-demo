# Espai Vegetal · Demo MVP de soporte estilo WhatsApp

Demo local de un asistente conversacional para una floristería boutique.
Pensada para enseñar a un socio cómo funcionaría un bot de soporte en WhatsApp,
**sin necesidad de conectar nada real**: todo corre en tu ordenador.

---

## ¿Qué hace?

Una página web simple que simula la experiencia de WhatsApp con el asistente
de Espai Vegetal. Muestra:

1. Horarios y ubicación
2. Encargos y recogida
3. Ramos y precios
4. Hablar con una persona (escalado humano simulado)

El usuario puede:
- Hacer clic en los botones de opciones rápidas
- Escribir el número de la opción (1, 2, 3, 4)
- Escribir "menu" para volver al menú principal
- Reiniciar la conversación con el botón ↻ de la cabecera

---

## Estructura de archivos

```
espai-vegetal-demo/
├── package.json          → dependencias (solo Express)
├── server.js             → backend Node.js con la lógica del bot
└── public/
    ├── index.html        → interfaz visual del chat
    ├── style.css         → estilos (paleta floral, elegante)
    └── app.js            → cliente JavaScript del chat
```

---

## Cómo ejecutarlo

Necesitas tener Node.js instalado (versión 16 o superior).
Si no lo tienes, descárgalo desde https://nodejs.org

Abre una terminal en la carpeta del proyecto y ejecuta:

```
npm install
npm start
```

Cuando veas el mensaje:

```
 ESPAI VEGETAL - Demo de soporte WhatsApp
 Servidor en marcha en http://localhost:3000
```

Abre tu navegador en **http://localhost:3000** y verás la demo.

Para parar el servidor: `Ctrl + C` en la terminal.

---

## Arquitectura (explicación sencilla)

```
   ┌─────────────────┐         POST /chat          ┌─────────────────┐
   │   Navegador     │ ─────────────────────────▶  │  Servidor       │
   │   (chat web)    │                              │  Node + Express │
   │                 │ ◀─────────────────────────  │                 │
   └─────────────────┘     respuesta del bot        └─────────────────┘
                                                            │
                                                            ▼
                                                    Memoria interna
                                                    (Map de sesiones)
```

- El **navegador** muestra la conversación y manda mensajes al servidor.
- El **servidor Express** decide qué responder según el mensaje y el estado
  de la sesión.
- Las **sesiones** se guardan en memoria (un `Map` de JavaScript). Al reiniciar
  el servidor se borran. Esto es a propósito: es una demo, no producción.

---

## Flujo de usuario de ejemplo

1. El usuario abre la página → ve la bienvenida + el menú con 4 opciones.
2. Escribe `2` o pulsa el botón "Encargos y recogida".
3. El asistente le devuelve la información de encargos y precios de envío.
4. El asistente le ofrece "Volver al menú principal".
5. El usuario vuelve al menú o escribe `4` para hablar con una persona.
6. Si elige hablar con una persona, el estado pasa a `escalado_humano` y
   cualquier mensaje libre se acepta como mensaje para el equipo.

---

## Cómo se llevaría esto a WhatsApp real (siguiente paso)

Esta demo es un prototipo de la **lógica conversacional**. Para convertirla
en un bot real de WhatsApp tendrías que:

1. **Cuenta de WhatsApp Business API** (a través de Meta o de un proveedor
   como Twilio, 360dialog, MessageBird, Wati o Vonage). Esto da acceso a la
   API oficial de WhatsApp para empresas.

2. **Sustituir el endpoint `/chat`** por un webhook que reciba los mensajes
   reales de WhatsApp. La lógica del `procesarMensaje()` se mantiene igual.

3. **Usar WhatsApp Flows** (la nueva funcionalidad oficial de Meta) para
   mostrar menús interactivos nativos con botones, listas y formularios en
   vez de mensajes de texto plano. La estructura `options` que ya tenemos en
   este código mapea uno a uno con los botones de Flows.

4. **Persistir las sesiones** en una base de datos real (PostgreSQL, Redis,
   Firebase) en vez del `Map` en memoria.

5. **Notificaciones al equipo humano** cuando alguien elige "Hablar con una
   persona": correo, Slack, Telegram o panel propio.

La buena noticia: la **arquitectura ya está pensada para eso**. El motor del
bot (`procesarMensaje`) es agnóstico al canal. Cambias el "transporte" (web,
WhatsApp, Instagram, Messenger…) y la lógica se reutiliza.

---

## Decisiones técnicas

- **Sin frameworks frontend**: HTML/CSS/JS puro para que cualquier persona
  pueda leer el código.
- **Una sola dependencia**: Express. Nada más.
- **Sin base de datos**: estado en memoria, suficiente para una demo.
- **Diseño con identidad floral**: paleta crema, verde botánico, dorado mate
  y tipografía serif elegante en la cabecera para reforzar el branding.

---

## Para enseñarle al socio

Cuando lo abras delante de tu socio, prueba este recorrido en este orden:

1. Llega la bienvenida sola
2. Pulsa **"Horarios y ubicación"** (botón directo)
3. Pulsa **"Volver al menú principal"**
4. Esta vez escribe a mano un `3` y pulsa enviar
5. Vuelve al menú y prueba **"Hablar con una persona"**
6. Escribe un mensaje libre cualquiera: el bot lo recibe como si fuera para el
   equipo humano
7. Pulsa el botón ↻ arriba a la derecha para reiniciar

Esto deja claro en 60 segundos cómo funcionaría con clientes reales.

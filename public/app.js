/* ----------------------------------------------------
   ESPAI VEGETAL - Cliente del asistente
   Gestiona el chat y la comunicacion con el servidor
   ---------------------------------------------------- */

// Generamos un sessionId unico por pestaña
const sessionId = 'session-' + Math.random().toString(36).slice(2, 10);

const chatBody = document.getElementById('chatBody');
const quickOptions = document.getElementById('quickOptions');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const resetBtn = document.getElementById('resetBtn');

// ----- Utilidades de UI -----

function getTime() {
  const d = new Date();
  return d.getHours().toString().padStart(2, '0') + ':' +
         d.getMinutes().toString().padStart(2, '0');
}

function addBubble(text, who) {
  const bubble = document.createElement('div');
  bubble.className = 'bubble ' + who;
  bubble.innerHTML = formatText(text) +
    '<div class="bubble-time">' + getTime() + '</div>';
  chatBody.appendChild(bubble);
  chatBody.scrollTop = chatBody.scrollHeight;
}

// Convierte saltos de linea, marca títulos en mayusculas y resalta numeros
function formatText(text) {
  // Resaltar lineas que parecen titulos (todo mayusculas) en color botanico
  return text
    .split('\n')
    .map(line => {
      if (/^[A-ZÑÁÉÍÓÚ\s]+$/.test(line.trim()) && line.trim().length > 3) {
        return '<strong>' + line + '</strong>';
      }
      return line;
    })
    .join('\n');
}

function showTyping() {
  const typing = document.createElement('div');
  typing.className = 'typing';
  typing.id = 'typingIndicator';
  typing.innerHTML = '<span></span><span></span><span></span>';
  chatBody.appendChild(typing);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function hideTyping() {
  const typing = document.getElementById('typingIndicator');
  if (typing) typing.remove();
}

function renderOptions(options) {
  quickOptions.innerHTML = '';
  if (!options || !options.length) return;

  options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn' + (idx === 0 && opt.id === 'menu' ? ' primary' : '');
    btn.textContent = opt.label;
    btn.addEventListener('click', () => sendMessage(opt.id));
    quickOptions.appendChild(btn);
  });
}

// ----- Comunicacion con el servidor -----

async function sendMessage(message) {
  if (!message || !message.trim()) return;

  addBubble(message, 'user');
  messageInput.value = '';
  quickOptions.innerHTML = '';
  showTyping();

  try {
    // Pequeño retraso intencional para que se sienta natural
    await new Promise(resolve => setTimeout(resolve, 600));

    const res = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message })
    });

    const data = await res.json();
    hideTyping();

    // Mostramos cada mensaje con un pequeño delay para que se sienta como conversacion
    for (let i = 0; i < data.messages.length; i++) {
      addBubble(data.messages[i], 'bot');
      if (i < data.messages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 400));
      }
    }

    renderOptions(data.options);

  } catch (err) {
    hideTyping();
    addBubble('Error de conexion. Reintenta en un momento.', 'bot');
    console.error(err);
  }
}

async function start() {
  showTyping();
  try {
    await new Promise(resolve => setTimeout(resolve, 500));
    const res = await fetch('/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });
    const data = await res.json();
    hideTyping();

    for (let i = 0; i < data.messages.length; i++) {
      addBubble(data.messages[i], 'bot');
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    renderOptions(data.options);

  } catch (err) {
    hideTyping();
    addBubble('No se pudo conectar con el servidor.', 'bot');
  }
}

async function reset() {
  await fetch('/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId })
  });
  chatBody.innerHTML = '';
  quickOptions.innerHTML = '';
  start();
}

// ----- Eventos -----

sendBtn.addEventListener('click', () => sendMessage(messageInput.value));

messageInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') sendMessage(messageInput.value);
});

resetBtn.addEventListener('click', reset);

// Arranque automatico
start();

/* js/ui/confetti.js */
import { $ } from '../core/dom.js';

const COLORS = ['#ff3d8b', '#2de0d0', '#fff4e0', '#ff6fa8', '#4a3d7a', '#ffc2d9'];

// Anima piezas de confeti (estilo sticker: relleno plano + contorno) sobre un canvas
function run(canvas, count, duration, onDone) {
  const ctx = canvas.getContext('2d');
  const particles = Array.from({ length: count }, () => ({
    x: canvas.width / 2,
    y: canvas.height / 2,
    vx: (Math.random() - 0.5) * 14,
    vy: (Math.random() - 0.5) * 14 - 5,
    size: Math.random() * 7 + 6,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotation: Math.random() * 360,
    rotSpeed: (Math.random() - 0.5) * 14,
    life: 1
  }));

  let frame;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    particles.forEach(p => {
      if (p.life <= 0) return;
      alive = true;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.28;
      p.rotation += p.rotSpeed;
      p.life -= 0.011;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation * Math.PI / 180);
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
      ctx.fillStyle = p.color;
      ctx.strokeStyle = '#0a0718';
      ctx.lineWidth = 2;
      ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
      ctx.strokeRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
      ctx.restore();
    });
    if (alive) frame = requestAnimationFrame(animate);
  }
  animate();

  setTimeout(() => {
    cancelAnimationFrame(frame);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (onDone) onDone();
  }, duration);
}

// Confeti dentro del modal del ganador (Wheel of Fortune)
export function launchConfetti() {
  const canvas = $('confettiCanvas');
  if (!canvas) return;
  const card = canvas.parentElement;
  canvas.width = card.offsetWidth;
  canvas.height = card.offsetHeight;
  run(canvas, 90, 4000);
}

// Confeti sobre cualquier contenedor (Slots, Blackjack). El contenedor debe tener position: relative.
export function burstConfetti(host, count = 70) {
  if (!host) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'fx-confetti';
  canvas.width = host.offsetWidth;
  canvas.height = host.offsetHeight;
  host.appendChild(canvas);
  run(canvas, count, 3200, () => canvas.remove());
}

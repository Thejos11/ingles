/* js/ui/achievements.js */
import { playWin } from '../core/audio.js';
import { $, toast } from '../core/dom.js';

export function showAchievementToast(name, desc, icon) {
  const container = $('achievementToasts');
  const t = document.createElement('div');
  t.className = 'achievement-toast';
  t.innerHTML = `<div class="achievement-icon">${icon}</div>
                 <div class="achievement-text"><h4>Achievement Unlocked!</h4><p>${name} - ${desc}</p></div>`;
  container.appendChild(t);
  playWin();
  setTimeout(() => {
    t.style.animation = 'slideInRight 0.4s reverse both';
    setTimeout(() => t.remove(), 400);
  }, 4000);
}

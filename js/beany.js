/**
 * beany.js — Beany circle animation engine
 * Controls the visual representation: circle, eyes, mood emoji, gesture emoji
 */

// Action → gesture emoji mapping
const GESTURE_MAP = {
  '贴住': '👉👈',
  '贴': '👉👈',
  '压': '💕',
  '压了压': '💕',
  '蹭': '💫',
  '沉了沉': '⬇️',
  '沉': '⬇️',
  '不动': '💤',
  '没动': '...',
  '没醒': '💤',
  '睡着': '💤',
  '睡': '💤',
  '窝': '🔄',
  '拱': '🐾',
  '缩': '😰',
  '趴平': '⬇️😌',
  '放松': '🌸',
  '眯': '😌',
  '贴了贴': '👉👈',
};

// Mood → face/emoji mapping
const MOOD_EMOJI = {
  '安心': '😌',
  '软': '💫',
  '柔软': '🌸',
  '困': '😴',
  '好奇': '🤔',
  '迷糊': '😵‍💫',
  '不安': '😟',
  '开心': '😊',
  '舒服': '😊',
  '放松': '😌',
  '温暖': '🥰',
  '依赖': '🥺',
  '平静': '😐',
  '冷淡': '😑',
  '回避': '😤',
  '不满': '😾',
  '满意': '😊',
  '舍不得': '🥺',
  '睡着了': '😴💤',
};

// Mood → eye style
const EYE_STYLES = {
  '安心': 'closed',     // ^_^ relaxed
  '软': 'closed',
  '柔软': 'closed',
  '困': 'sleepy',
  '好奇': 'wide',
  '迷糊': 'sleepy',
  '不安': 'wide',
  '开心': 'closed',
  '舒服': 'closed',
  '放松': 'closed',
  '温暖': 'closed',
  '依赖': 'closed',
  '平静': 'normal',
  '冷淡': 'normal',
  '回避': 'normal',
  '不满': 'normal',
  '满意': 'closed',
  '舍不得': 'closed',
  '睡着了': 'sleepy',
};

// Action → position class
const POSITION_MAP = {
  '贴住': 'beany-left',
  '贴': 'beany-left',
  '压': 'beany-right',
  '压了压': 'beany-right',
  '沉了沉': 'beany-down',
  '沉': 'beany-down',
  '不动': 'beany-sleep',
  '没动': 'beany-sleep',
  '没醒': 'beany-sleep',
  '睡着': 'beany-sleep',
  '睡': 'beany-sleep',
  '趴平': 'beany-down',
  '眯': 'beany-center',
  '蹭': 'beany-center',
  '拱': 'beany-center',
  '缩': 'beany-down',
  '窝': 'beany-center',
  '放松': 'beany-center',
  '贴了贴': 'beany-left',
};

// Default fallback
const DEFAULT_GESTURE = '✨';
const DEFAULT_MOOD = '😐';
const DEFAULT_EYE = 'normal';
const DEFAULT_POS = 'beany-center';

class BeanyAnimator {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.warn(`Container #${containerId} not found`);
      return;
    }
    
    this.circle = null;
    this.moodEl = null;
    this.gestureEl = null;
    this.eyesEl = null;
    
    this.init();
  }
  
  init() {
    // Create Beany circle
    this.circle = document.createElement('div');
    this.circle.className = 'beany-circle beany-center';
    this.circle.id = 'beany-circle';
    
    // Create eyes
    this.eyesEl = document.createElement('div');
    this.eyesEl.className = 'eyes';
    for (let i = 0; i < 2; i++) {
      const eye = document.createElement('div');
      eye.className = 'eye';
      this.eyesEl.appendChild(eye);
    }
    this.circle.appendChild(this.eyesEl);
    
    // Mood emoji container
    this.moodEl = document.createElement('div');
    this.moodEl.className = 'beany-mood-emoji';
    this.moodEl.textContent = DEFAULT_MOOD;
    this.circle.appendChild(this.moodEl);
    
    // Gesture emoji container
    this.gestureEl = document.createElement('div');
    this.gestureEl.className = 'beany-gesture';
    this.circle.appendChild(this.gestureEl);
    
    this.container.innerHTML = '';
    this.container.appendChild(this.circle);
  }
  
  setColor(color) {
    if (this.circle) {
      this.circle.style.backgroundColor = color;
    }
  }
  
  setEyes(style) {
    if (!this.eyesEl) return;
    const eyes = this.eyesEl.querySelectorAll('.eye');
    eyes.forEach(e => {
      e.className = 'eye';
      if (style) e.classList.add(style);
    });
  }
  
  setMood(mood) {
    if (!this.moodEl) return;
    const emoji = MOOD_EMOJI[mood] || DEFAULT_MOOD;
    this.moodEl.textContent = emoji;
    this.moodEl.style.animation = 'none';
    void this.moodEl.offsetWidth; // Trigger reflow
    this.moodEl.style.animation = 'float 0.6s ease-out';
    
    // Set eye style based on mood
    const eyeStyle = EYE_STYLES[mood] || DEFAULT_EYE;
    this.setEyes(eyeStyle);
  }
  
  setGesture(action) {
    if (!this.gestureEl) return;
    
    // Find matching gesture emoji
    let gesture = DEFAULT_GESTURE;
    for (const [key, val] of Object.entries(GESTURE_MAP)) {
      if (action.includes(key)) {
        gesture = val;
        break;
      }
    }
    
    this.gestureEl.textContent = gesture;
    this.gestureEl.style.animation = 'none';
    void this.gestureEl.offsetWidth;
    this.gestureEl.style.animation = 'gesturePop 0.5s ease-out';
    
    // Position the gesture emoji randomly in upper-right area of circle
    const x = 30 + Math.random() * 40;
    const y = -20 - Math.random() * 20;
    this.gestureEl.style.left = `${x}%`;
    this.gestureEl.style.top = `${y}%`;
  }
  
  setPosition(action) {
    if (!this.circle) return;
    
    let posClass = DEFAULT_POS;
    for (const [key, val] of Object.entries(POSITION_MAP)) {
      if (action.includes(key)) {
        posClass = val;
        break;
      }
    }
    
    this.circle.className = `beany-circle ${posClass}`;
    
    // If sleeping, reduce opacity
    if (posClass === 'beany-sleep') {
      this.circle.style.opacity = '0.8';
    } else {
      this.circle.style.opacity = '1';
    }
  }
  
  playReaction(actionStr, moodStr) {
    // Play the full reaction animation sequence
    this.setMood(moodStr);
    this.setGesture(actionStr);
    this.setPosition(actionStr);
    
    // Small scale bounce when reacting
    if (this.circle) {
      this.circle.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
      this.circle.style.transform = this.circle.style.transform; // Trigger
    }
  }
  
  reset() {
    if (this.circle) {
      this.circle.className = 'beany-circle beany-center';
      this.circle.style.opacity = '1';
    }
    this.setEyes('normal');
    if (this.moodEl) this.moodEl.textContent = '';
    if (this.gestureEl) this.gestureEl.textContent = '';
  }
}

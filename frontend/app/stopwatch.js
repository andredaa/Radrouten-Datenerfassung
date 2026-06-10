// Stopwatch functionality
class Stopwatch {
  constructor(buttonId) {
    this.button = document.getElementById(buttonId);
    this.interval = null;
    this.seconds = 0;
    this.running = false;
    
    this.init();
  }
  
  init() {
    // Click to start/stop
    this.button.addEventListener('click', () => {
      if (this.running) {
        this.stop();
      } else {
        this.start();
      }
    });
    
    // Double-click to reset
    this.button.addEventListener('dblclick', (e) => {
      e.preventDefault();
      this.reset();
    });
  }
  
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  
  start() {
    this.running = true;
    this.button.classList.add('running');
    this.interval = setInterval(() => {
      this.seconds++;
      this.button.textContent = this.formatTime(this.seconds);
    }, 1000);
  }
  
  stop() {
    this.running = false;
    this.button.classList.remove('running');
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
  
  reset() {
    this.stop();
    this.seconds = 0;
    this.button.textContent = this.formatTime(this.seconds);
  }
  
  getElapsedTime() {
    return this.seconds;
  }
  
  isRunning() {
    return this.running;
  }
}

// Initialize when DOM is ready (only if button exists)
export let stopwatch;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const stopwatchBtn = document.getElementById('stopwatchBtn');
    if (stopwatchBtn) {
      stopwatch = new Stopwatch('stopwatchBtn');
    }
  });
} else {
  const stopwatchBtn = document.getElementById('stopwatchBtn');
  if (stopwatchBtn) {
    stopwatch = new Stopwatch('stopwatchBtn');
  }
}

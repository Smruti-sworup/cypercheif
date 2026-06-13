// Programmatic Sound Synthesizer using Web Audio API
// Eliminates the need to host/download mp3/wav files and ensures zero latency

let isMuted = localStorage.getItem('sound_muted') === 'true';

const SoundSynth = {
  isMuted() {
    return isMuted;
  },

  setMuted(muted) {
    isMuted = muted;
    localStorage.setItem('sound_muted', muted ? 'true' : 'false');
  },

  createContext() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    return new AudioContext();
  },

  // 1. General Button Click
  playClick() {
    if (isMuted) return;
    const ctx = this.createContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  },

  // 2. Chess/Ludo Game Move
  playMove() {
    if (isMuted) return;
    const ctx = this.createContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  },

  // 3. Victory/Win Event
  playWin() {
    if (isMuted) return;
    const ctx = this.createContext();
    if (!ctx) return;

    const playTone = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    // Arpeggio in C Major: C4 -> E4 -> G4 -> C5
    playTone(261.63, now, 0.15);       // C4
    playTone(329.63, now + 0.15, 0.15); // E4
    playTone(392.00, now + 0.30, 0.15); // G4
    playTone(523.25, now + 0.45, 0.50); // C5
  },

  // 4. Defeat/Lose Event
  playLose() {
    if (isMuted) return;
    const ctx = this.createContext();
    if (!ctx) return;

    const playTone = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    // Dissonant descending progression: Eb3 -> D3 -> C#3 (long)
    playTone(155.56, now, 0.2);       // Eb3
    playTone(146.83, now + 0.2, 0.2); // D3
    playTone(138.59, now + 0.4, 0.6); // C#3
  },

  // 5. Chat or Invite Notification
  playNotification() {
    if (isMuted) return;
    const ctx = this.createContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Bright dual chime
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.08); // E6

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  }
};

export default SoundSynth;

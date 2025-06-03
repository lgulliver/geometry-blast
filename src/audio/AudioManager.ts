export class AudioManager {
  private context: AudioContext | null = null;
  private masterVolume: number = 0.3;
  private enabled: boolean = true;

  constructor() {
    try {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
      this.enabled = false;
    }
  }

  private createOscillator(frequency: number, type: OscillatorType = 'sine'): OscillatorNode | null {
    if (!this.context || !this.enabled) return null;

    const oscillator = this.context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.context.currentTime);
    return oscillator;
  }

  private createGain(volume: number = 1): GainNode | null {
    if (!this.context || !this.enabled) return null;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(volume * this.masterVolume, this.context.currentTime);
    return gain;
  }

  playShoot(): void {
    if (!this.context || !this.enabled) return;

    const oscillator = this.createOscillator(800, 'square');
    const gain = this.createGain(0.1);
    
    if (!oscillator || !gain) return;

    oscillator.connect(gain);
    gain.connect(this.context.destination);

    // Quick frequency sweep
    oscillator.frequency.exponentialRampToValueAtTime(400, this.context.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.1);

    oscillator.start();
    oscillator.stop(this.context.currentTime + 0.1);
  }

  playEnemyHit(): void {
    if (!this.context || !this.enabled) return;

    const oscillator = this.createOscillator(200, 'sawtooth');
    const gain = this.createGain(0.15);
    
    if (!oscillator || !gain) return;

    oscillator.connect(gain);
    gain.connect(this.context.destination);

    oscillator.frequency.exponentialRampToValueAtTime(100, this.context.currentTime + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.2);

    oscillator.start();
    oscillator.stop(this.context.currentTime + 0.2);
  }

  playExplosion(): void {
    if (!this.context || !this.enabled) return;

    // Create explosion with noise
    const bufferSize = this.context.sampleRate * 0.5;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate white noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const gain = this.createGain(0.2);
    if (!gain) return;

    source.connect(gain);
    gain.connect(this.context.destination);

    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.5);

    source.start();
    source.stop(this.context.currentTime + 0.5);
  }

  playPlayerDeath(): void {
    if (!this.context || !this.enabled) return;

    // Dramatic falling tone
    const oscillator = this.createOscillator(440, 'square');
    const gain = this.createGain(0.2);
    
    if (!oscillator || !gain) return;

    oscillator.connect(gain);
    gain.connect(this.context.destination);

    oscillator.frequency.exponentialRampToValueAtTime(60, this.context.currentTime + 1.0);
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 1.0);

    oscillator.start();
    oscillator.stop(this.context.currentTime + 1.0);
  }

  playWaveComplete(): void {
    if (!this.context || !this.enabled) return;

    // Triumphant ascending tone
    const oscillator = this.createOscillator(220, 'sine');
    const gain = this.createGain(0.15);
    
    if (!oscillator || !gain) return;

    oscillator.connect(gain);
    gain.connect(this.context.destination);

    oscillator.frequency.exponentialRampToValueAtTime(440, this.context.currentTime + 0.3);
    oscillator.frequency.exponentialRampToValueAtTime(660, this.context.currentTime + 0.6);
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.8);

    oscillator.start();
    oscillator.stop(this.context.currentTime + 0.8);
  }

  playPowerUp(): void {
    if (!this.context || !this.enabled) return;

    // Pleasant ascending chime
    const oscillator = this.createOscillator(330, 'sine');
    const gain = this.createGain(0.12);
    
    if (!oscillator || !gain) return;

    oscillator.connect(gain);
    gain.connect(this.context.destination);

    // Quick ascending tones
    oscillator.frequency.exponentialRampToValueAtTime(550, this.context.currentTime + 0.15);
    oscillator.frequency.exponentialRampToValueAtTime(880, this.context.currentTime + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.4);

    oscillator.start();
    oscillator.stop(this.context.currentTime + 0.4);
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  // Resume audio context (required for some browsers)
  resume(): void {
    if (this.context && this.context.state === 'suspended') {
      this.context.resume();
    }
  }
}

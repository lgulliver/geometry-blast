import { Vector2 } from '../utils/Vector2';
import { randomFloat } from '../utils/Math';

interface ShakeEvent {
  intensity: number;
  duration: number;
  frequency: number;
  decay: number;
  timeRemaining: number;
}

export class ScreenShakeSystem {
  private shakeEvents: ShakeEvent[] = [];
  private currentOffset: Vector2 = new Vector2(0, 0);
  private enabled: boolean = true;
  private debugMode: boolean = false;

  constructor() {}

  // Add a shake event
  addShake(intensity: number, duration: number = 0.3, frequency: number = 30): void {
    if (!this.enabled) return;
    
    this.shakeEvents.push({
      intensity: intensity,
      duration: duration,
      frequency: frequency,
      decay: 0.9,
      timeRemaining: duration
    });
    
    // Log shake events when debug mode is enabled
    if (this.debugMode) {
      console.log(`📳 Screen Shake: Intensity=${intensity.toFixed(1)}, Duration=${duration.toFixed(2)}s`);
    }
  }

  // Convenience methods for common shake types
  addExplosionShake(distance: number = 0, maxDistance: number = 200): void {
    const intensity = Math.max(0, Math.min(15, 15 * (1 - distance / maxDistance)));
    this.addShake(intensity, 0.4, 25);
  }

  addPlayerHitShake(): void {
    this.addShake(8, 0.3, 35);
  }

  addEnemyHitShake(): void {
    this.addShake(3, 0.15, 40);
  }

  addPowerUpShake(): void {
    this.addShake(2, 0.2, 20);
  }

  addLandingShake(): void {
    this.addShake(5, 0.25, 30);
  }

  // Update the shake system
  update(deltaTime: number): void {
    // Reset offset
    this.currentOffset.x = 0;
    this.currentOffset.y = 0;

    // Process all active shake events
    for (let i = this.shakeEvents.length - 1; i >= 0; i--) {
      const shake = this.shakeEvents[i];
      shake.timeRemaining -= deltaTime;

      if (shake.timeRemaining <= 0) {
        this.shakeEvents.splice(i, 1);
        continue;
      }

      // Calculate shake intensity with decay
      const lifeFactor = shake.timeRemaining / shake.duration;
      const currentIntensity = shake.intensity * lifeFactor * shake.decay;

      // Generate shake offset using high frequency noise
      const time = (shake.duration - shake.timeRemaining) * shake.frequency;
      const shakeX = Math.sin(time * 2.1) * Math.cos(time * 1.7) * currentIntensity;
      const shakeY = Math.cos(time * 1.9) * Math.sin(time * 2.3) * currentIntensity;

      // Add random component for more natural feel
      const randomX = (Math.random() - 0.5) * currentIntensity * 0.5;
      const randomY = (Math.random() - 0.5) * currentIntensity * 0.5;

      this.currentOffset.x += shakeX + randomX;
      this.currentOffset.y += shakeY + randomY;

      // Apply decay
      shake.decay *= 0.99;
    }

    // Clamp the offset to reasonable values
    const maxOffset = 20;
    this.currentOffset.x = Math.max(-maxOffset, Math.min(maxOffset, this.currentOffset.x));
    this.currentOffset.y = Math.max(-maxOffset, Math.min(maxOffset, this.currentOffset.y));
  }

  // Apply the shake offset to the canvas context
  applyShake(ctx: CanvasRenderingContext2D): void {
    if (!this.enabled || (this.currentOffset.x === 0 && this.currentOffset.y === 0)) {
      return;
    }

    ctx.translate(this.currentOffset.x, this.currentOffset.y);
  }

  // Remove the shake offset from the canvas context
  removeShake(ctx: CanvasRenderingContext2D): void {
    if (!this.enabled || (this.currentOffset.x === 0 && this.currentOffset.y === 0)) {
      return;
    }

    ctx.translate(-this.currentOffset.x, -this.currentOffset.y);
  }

  // Get current shake offset (useful for UI elements that shouldn't shake)
  getCurrentOffset(): Vector2 {
    return this.currentOffset.clone();
  }

  // Control shake system
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clear();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // Get current shake intensity (for effects that scale with shake)
  getCurrentIntensity(): number {
    if (!this.enabled || this.shakeEvents.length === 0) return 0;
    
    return Math.sqrt(this.currentOffset.x * this.currentOffset.x + this.currentOffset.y * this.currentOffset.y);
  }

  // Clear all shake events
  clear(): void {
    this.shakeEvents = [];
    this.currentOffset.x = 0;
    this.currentOffset.y = 0;
  }

  // Debug info
  getActiveShakeCount(): number {
    return this.shakeEvents.length;
  }

  getTotalIntensity(): number {
    return this.shakeEvents.reduce((total, shake) => {
      const lifeFactor = shake.timeRemaining / shake.duration;
      return total + (shake.intensity * lifeFactor);
    }, 0);
  }

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  isDebugMode(): boolean {
    return this.debugMode;
  }
}

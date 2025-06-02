import { Entity } from './Entity'
import { Vector2 } from '../utils/Vector2'
import { Color } from '../utils/Color'

export enum PowerUpType {
  RAPID_FIRE,
  MULTI_SHOT,
  SHIELD,
  BOMB
}

export class PowerUp extends Entity {
  public type: PowerUpType;
  private pulseTimer: number = 0;
  private lifetime: number = 15.0; // 15 seconds before disappearing
  private age: number = 0;

  constructor(x: number, y: number, type: PowerUpType) {
    super(x, y);
    this.type = type;
    this.radius = 12;
    this.setupByType();
  }

  private setupByType(): void {
    switch (this.type) {
      case PowerUpType.RAPID_FIRE:
        this.color = Color.yellow();
        break;
      case PowerUpType.MULTI_SHOT:
        this.color = Color.orange();
        break;
      case PowerUpType.SHIELD:
        this.color = Color.cyan();
        break;
      case PowerUpType.BOMB:
        this.color = Color.red();
        break;
    }
  }

  update(deltaTime: number): void {
    this.pulseTimer += deltaTime * 4;
    this.age += deltaTime;
    
    // Slow rotation
    this.rotation += deltaTime;
    
    // Expire after lifetime
    if (this.age >= this.lifetime) {
      this.destroy();
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(this.rotation);

    // Pulsing glow effect
    const pulse = Math.sin(this.pulseTimer) * 0.3 + 0.7;
    const glowRadius = this.radius * (1 + pulse * 0.5);

    // Outer glow
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
    gradient.addColorStop(0, this.color.withAlpha(0.6).toString());
    gradient.addColorStop(0.7, this.color.withAlpha(0.3).toString());
    gradient.addColorStop(1, this.color.withAlpha(0).toString());
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // Power-up symbol based on type
    ctx.strokeStyle = this.color.toString();
    ctx.fillStyle = this.color.withAlpha(0.8).toString();
    ctx.lineWidth = 2;

    switch (this.type) {
      case PowerUpType.RAPID_FIRE:
        // Lightning bolt
        ctx.beginPath();
        ctx.moveTo(-4, -8);
        ctx.lineTo(2, -2);
        ctx.lineTo(-2, -2);
        ctx.lineTo(4, 8);
        ctx.lineTo(-2, 2);
        ctx.lineTo(2, 2);
        ctx.closePath();
        break;

      case PowerUpType.MULTI_SHOT:
        // Triple arrows
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(i * 3 - 2, 6);
          ctx.lineTo(i * 3, -6);
          ctx.lineTo(i * 3 + 2, 6);
          ctx.stroke();
        }
        break;

      case PowerUpType.SHIELD:
        // Shield shape
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(6, -4);
        ctx.lineTo(6, 4);
        ctx.lineTo(0, 8);
        ctx.lineTo(-6, 4);
        ctx.lineTo(-6, -4);
        ctx.closePath();
        break;

      case PowerUpType.BOMB:
        // Explosion symbol
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Explosion spikes
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 / 8) * i;
          ctx.beginPath();
          ctx.moveTo(Math.cos(angle) * 5, Math.sin(angle) * 5);
          ctx.lineTo(Math.cos(angle) * 9, Math.sin(angle) * 9);
          ctx.stroke();
        }
        break;
    }

    if (this.type !== PowerUpType.BOMB) {
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }
}

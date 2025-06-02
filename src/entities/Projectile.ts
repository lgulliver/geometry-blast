import { Entity } from './Entity'
import { Vector2 } from '../utils/Vector2'
import { Color } from '../utils/Color'

export class Projectile extends Entity {
  private speed: number = 400;
  private lifetime: number = 2.0;
  private age: number = 0;
  private trail: Vector2[] = [];

  constructor(x: number, y: number, direction: Vector2) {
    super(x, y);
    this.velocity = direction.normalize().multiply(this.speed);
    this.color = Color.yellow();
    this.radius = 3;
  }

  update(deltaTime: number): void {
    // Update position
    this.position = this.position.add(this.velocity.multiply(deltaTime));

    // Add to trail
    this.trail.push(this.position.clone());
    if (this.trail.length > 8) {
      this.trail.shift();
    }

    // Update age and check lifetime
    this.age += deltaTime;
    if (this.age >= this.lifetime) {
      this.destroy();
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    // Render trail
    for (let i = 0; i < this.trail.length; i++) {
      const alpha = (i + 1) / this.trail.length * 0.5;
      const radius = this.radius * alpha;
      
      ctx.fillStyle = this.color.withAlpha(alpha).toString();
      ctx.beginPath();
      ctx.arc(this.trail[i].x, this.trail[i].y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Render projectile
    ctx.fillStyle = this.color.toString();
    ctx.strokeStyle = Color.white().toString();
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Glow effect
    ctx.fillStyle = this.color.withAlpha(0.3).toString();
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

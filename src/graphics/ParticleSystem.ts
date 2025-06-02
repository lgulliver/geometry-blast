import { Vector2 } from '../utils/Vector2'
import { Color } from '../utils/Color'
import { randomFloat } from '../utils/Math'

export class Particle {
  public position: Vector2;
  public velocity: Vector2;
  public color: Color;
  public size: number;
  public life: number;
  public maxLife: number;
  public active: boolean;

  constructor(
    position: Vector2,
    velocity: Vector2,
    color: Color,
    size: number = 2,
    life: number = 1
  ) {
    this.position = position.clone();
    this.velocity = velocity.clone();
    this.color = color;
    this.size = size;
    this.life = this.maxLife = life;
    this.active = true;
  }

  update(deltaTime: number): void {
    if (!this.active) return;

    this.position = this.position.add(this.velocity.multiply(deltaTime));
    this.life -= deltaTime;

    if (this.life <= 0) {
      this.active = false;
    }

    // Apply friction
    this.velocity = this.velocity.multiply(0.98);
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    const alpha = this.life / this.maxLife;
    const currentSize = this.size * alpha;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color.toString();
    
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, currentSize, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
}

export class ParticleSystem {
  private particles: Particle[] = [];

  update(deltaTime: number): void {
    this.particles = this.particles.filter(particle => {
      particle.update(deltaTime);
      return particle.active;
    });
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.particles.forEach(particle => particle.render(ctx));
  }

  addParticle(particle: Particle): void {
    this.particles.push(particle);
  }

  createExplosion(position: Vector2, color: Color, count: number = 20): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomFloat(50, 200);
      const velocity = Vector2.fromAngle(angle, speed);
      const size = randomFloat(2, 6);
      const life = randomFloat(0.5, 1.5);

      this.addParticle(new Particle(position, velocity, color, size, life));
    }
  }

  createPlayerDeathExplosion(position: Vector2): void {
    // Main explosion
    this.createExplosion(position, Color.cyan(), 30);
    
    // Secondary explosions
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const offset = Vector2.fromAngle(Math.random() * Math.PI * 2, randomFloat(10, 30));
        this.createExplosion(position.add(offset), Color.orange(), 15);
      }, i * 100);
    }
  }

  createEnemyDeathExplosion(position: Vector2, enemyColor: Color): void {
    this.createExplosion(position, enemyColor, 15);
    this.createExplosion(position, Color.white(), 8);
  }

  createPickupEffect(position: Vector2): void {
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 / 10) * i;
      const velocity = Vector2.fromAngle(angle, 100);
      const particle = new Particle(position, velocity, Color.yellow(), 3, 0.8);
      this.addParticle(particle);
    }
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  clear(): void {
    this.particles = [];
  }
}

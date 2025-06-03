import { Vector2 } from '../utils/Vector2'
import { Color } from '../utils/Color'
import { randomFloat } from '../utils/Math'

export enum ParticleType {
  CIRCLE = 'circle',
  SPARK = 'spark',
  STREAK = 'streak',
  TRIANGLE = 'triangle',
  STAR = 'star'
}

export class Particle {
  public position: Vector2;
  public velocity: Vector2;
  public acceleration: Vector2;
  public color: Color;
  public size: number;
  public initialSize: number;
  public life: number;
  public maxLife: number;
  public active: boolean;
  public type: ParticleType;
  public rotation: number;
  public rotationSpeed: number;
  public scale: number;
  public trail: Vector2[];
  public maxTrailLength: number;

  constructor(
    position: Vector2,
    velocity: Vector2,
    color: Color,
    size: number = 2,
    life: number = 1,
    type: ParticleType = ParticleType.CIRCLE
  ) {
    this.position = position.clone();
    this.velocity = velocity.clone();
    this.acceleration = new Vector2(0, 0);
    this.color = color;
    this.size = this.initialSize = size;
    this.life = this.maxLife = life;
    this.active = true;
    this.type = type;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 10;
    this.scale = 1;
    this.trail = [this.position.clone()];
    this.maxTrailLength = type === ParticleType.STREAK ? 8 : 3;
  }

  update(deltaTime: number): void {
    if (!this.active) return;

    // Update physics
    this.velocity = this.velocity.add(this.acceleration.multiply(deltaTime));
    this.position = this.position.add(this.velocity.multiply(deltaTime));
    this.life -= deltaTime;

    // Update rotation
    this.rotation += this.rotationSpeed * deltaTime;

    // Update trail
    this.trail.unshift(this.position.clone());
    if (this.trail.length > this.maxTrailLength) {
      this.trail.pop();
    }

    if (this.life <= 0) {
      this.active = false;
      return;
    }

    // Update properties based on life
    const lifeFactor = this.life / this.maxLife;
    this.scale = lifeFactor;
    
    // Different size curves for different particle types
    switch (this.type) {
      case ParticleType.SPARK:
        this.size = this.initialSize * (0.5 + 0.5 * lifeFactor);
        break;
      case ParticleType.STREAK:
        this.size = this.initialSize * lifeFactor;
        break;
      default:
        this.size = this.initialSize * lifeFactor;
    }

    // Apply friction based on particle type
    const friction = this.type === ParticleType.SPARK ? 0.95 : 0.98;
    this.velocity = this.velocity.multiply(friction);
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    const alpha = Math.max(0, this.life / this.maxLife);
    if (alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(this.rotation);
    ctx.scale(this.scale, this.scale);

    switch (this.type) {
      case ParticleType.CIRCLE:
        this.renderCircle(ctx);
        break;
      case ParticleType.SPARK:
        this.renderSpark(ctx);
        break;
      case ParticleType.STREAK:
        this.renderStreak(ctx);
        break;
      case ParticleType.TRIANGLE:
        this.renderTriangle(ctx);
        break;
      case ParticleType.STAR:
        this.renderStar(ctx);
        break;
    }

    ctx.restore();
  }

  private renderCircle(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.color.toString();
    ctx.beginPath();
    ctx.arc(0, 0, this.size, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderSpark(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = this.color.toString();
    ctx.lineWidth = Math.max(1, this.size * 0.5);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-this.size, 0);
    ctx.lineTo(this.size, 0);
    ctx.moveTo(0, -this.size);
    ctx.lineTo(0, this.size);
    ctx.stroke();
  }

  private renderStreak(ctx: CanvasRenderingContext2D): void {
    if (this.trail.length < 2) return;
    
    ctx.strokeStyle = this.color.toString();
    ctx.lineWidth = this.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(this.trail[0].x - this.position.x, this.trail[0].y - this.position.y);
    
    for (let i = 1; i < this.trail.length; i++) {
      const alpha = (this.trail.length - i) / this.trail.length;
      ctx.globalAlpha *= alpha;
      ctx.lineTo(this.trail[i].x - this.position.x, this.trail[i].y - this.position.y);
    }
    
    ctx.stroke();
  }

  private renderTriangle(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.color.toString();
    ctx.beginPath();
    ctx.moveTo(0, -this.size);
    ctx.lineTo(-this.size * 0.866, this.size * 0.5);
    ctx.lineTo(this.size * 0.866, this.size * 0.5);
    ctx.closePath();
    ctx.fill();
  }

  private renderStar(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.color.toString();
    ctx.strokeStyle = this.color.withAlpha(0.8).toString();
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
      const outerRadius = this.size;
      const innerRadius = this.size * 0.4;
      
      if (i === 0) {
        ctx.moveTo(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius);
      } else {
        ctx.lineTo(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius);
      }
      
      const innerAngle = angle + Math.PI / 5;
      ctx.lineTo(Math.cos(innerAngle) * innerRadius, Math.sin(innerAngle) * innerRadius);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private sparkPool: Particle[] = [];
  private maxParticles: number = 2000;

  update(deltaTime: number): void {
    // Update all active particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.update(deltaTime);
      
      if (!particle.active) {
        // Return spark particles to pool
        if (particle.type === ParticleType.SPARK && this.sparkPool.length < 100) {
          this.sparkPool.push(particle);
        }
        this.particles.splice(i, 1);
      }
    }

    // Limit particle count for performance
    if (this.particles.length > this.maxParticles) {
      this.particles.splice(0, this.particles.length - this.maxParticles);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Render particles back to front for proper blending
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].render(ctx);
    }
  }

  addParticle(particle: Particle): void {
    this.particles.push(particle);
  }

  private getSparkFromPool(): Particle | null {
    return this.sparkPool.pop() || null;
  }

  private createParticle(
    position: Vector2, 
    velocity: Vector2, 
    color: Color, 
    size: number, 
    life: number, 
    type: ParticleType = ParticleType.CIRCLE
  ): Particle {
    if (type === ParticleType.SPARK) {
      const pooled = this.getSparkFromPool();
      if (pooled) {
        // Reset pooled particle
        pooled.position = position.clone();
        pooled.velocity = velocity.clone();
        pooled.color = color;
        pooled.size = pooled.initialSize = size;
        pooled.life = pooled.maxLife = life;
        pooled.active = true;
        pooled.rotation = Math.random() * Math.PI * 2;
        pooled.scale = 1;
        pooled.trail = [position.clone()];
        return pooled;
      }
    }
    
    return new Particle(position, velocity, color, size, life, type);
  }

  // Enhanced explosion with multiple particle types
  createExplosion(position: Vector2, color: Color, count: number = 20, intensity: number = 1): void {
    const baseSpeed = 50 * intensity;
    const maxSpeed = 200 * intensity;
    
    // Main explosion particles (circles)
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomFloat(baseSpeed, maxSpeed);
      const velocity = Vector2.fromAngle(angle, speed);
      const size = randomFloat(2, 6) * intensity;
      const life = randomFloat(0.5, 1.5);

      this.addParticle(this.createParticle(position, velocity, color, size, life, ParticleType.CIRCLE));
    }

    // Sparks for extra visual impact
    const sparkCount = Math.floor(count * 0.5);
    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomFloat(maxSpeed * 0.5, maxSpeed * 1.5);
      const velocity = Vector2.fromAngle(angle, speed);
      const size = randomFloat(3, 8) * intensity;
      const life = randomFloat(0.2, 0.8);

      this.addParticle(this.createParticle(position, velocity, color.withAlpha(0.8), size, life, ParticleType.SPARK));
    }

    // Some streak particles for dynamic feel
    const streakCount = Math.floor(count * 0.3);
    for (let i = 0; i < streakCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomFloat(maxSpeed * 0.8, maxSpeed * 1.2);
      const velocity = Vector2.fromAngle(angle, speed);
      const size = randomFloat(1, 3) * intensity;
      const life = randomFloat(0.3, 1.0);

      this.addParticle(this.createParticle(position, velocity, Color.white().withAlpha(0.9), size, life, ParticleType.STREAK));
    }
  }

  // Enhanced player death explosion
  createPlayerDeathExplosion(position: Vector2): void {
    // Main cyan explosion
    this.createExplosion(position, Color.cyan(), 40, 1.5);
    
    // White core explosion
    this.createExplosion(position, Color.white(), 20, 1.0);
    
    // Add some stars for extra flair
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 / 8) * i;
      const velocity = Vector2.fromAngle(angle, randomFloat(100, 150));
      const size = randomFloat(4, 8);
      const life = randomFloat(1.0, 2.0);
      
      this.addParticle(this.createParticle(position, velocity, Color.cyan().withAlpha(0.8), size, life, ParticleType.STAR));
    }
    
    // Secondary explosions with delay
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const offset = Vector2.fromAngle(Math.random() * Math.PI * 2, randomFloat(20, 50));
        this.createExplosion(position.add(offset), Color.orange(), 15, 0.8);
      }, i * 150);
    }
  }

  // Enhanced enemy death explosion
  createEnemyDeathExplosion(position: Vector2, enemyColor: Color): void {
    this.createExplosion(position, enemyColor, 20, 1.0);
    this.createExplosion(position, Color.white(), 10, 0.8);
    
    // Add triangular debris
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = Vector2.fromAngle(angle, randomFloat(80, 120));
      const size = randomFloat(3, 6);
      const life = randomFloat(0.8, 1.5);
      
      this.addParticle(this.createParticle(position, velocity, enemyColor.withAlpha(0.9), size, life, ParticleType.TRIANGLE));
    }
  }

  // Muzzle flash effect
  createMuzzleFlash(position: Vector2, direction: Vector2, color: Color = Color.yellow()): void {
    const baseAngle = Math.atan2(direction.y, direction.x);
    const spread = Math.PI / 6; // 30 degree spread
    
    for (let i = 0; i < 8; i++) {
      const angle = baseAngle + (Math.random() - 0.5) * spread;
      const speed = randomFloat(150, 300);
      const velocity = Vector2.fromAngle(angle, speed);
      const size = randomFloat(2, 5);
      const life = randomFloat(0.1, 0.3);
      
      this.addParticle(this.createParticle(position, velocity, color.withAlpha(0.8), size, life, ParticleType.SPARK));
    }
    
    // Add a few streak particles for the flash
    for (let i = 0; i < 3; i++) {
      const angle = baseAngle + (Math.random() - 0.5) * spread * 0.5;
      const speed = randomFloat(200, 400);
      const velocity = Vector2.fromAngle(angle, speed);
      const size = randomFloat(1, 2);
      const life = randomFloat(0.05, 0.15);
      
      this.addParticle(this.createParticle(position, velocity, Color.white().withAlpha(0.9), size, life, ParticleType.STREAK));
    }
  }

  // Engine trail effect
  createEngineTrail(position: Vector2, direction: Vector2, color: Color = Color.blue()): void {
    const baseAngle = Math.atan2(-direction.y, -direction.x); // Opposite direction
    const spread = Math.PI / 8; // 22.5 degree spread
    
    for (let i = 0; i < 3; i++) {
      const angle = baseAngle + (Math.random() - 0.5) * spread;
      const speed = randomFloat(30, 80);
      const velocity = Vector2.fromAngle(angle, speed);
      const size = randomFloat(1, 3);
      const life = randomFloat(0.3, 0.8);
      
      this.addParticle(this.createParticle(position, velocity, color.withAlpha(0.6), size, life, ParticleType.CIRCLE));
    }
  }

  // Impact effect for projectile hits
  createImpactEffect(position: Vector2, normal: Vector2, color: Color): void {
    const reflectionAngle = Math.atan2(normal.y, normal.x);
    const spread = Math.PI / 3; // 60 degree spread
    
    for (let i = 0; i < 12; i++) {
      const angle = reflectionAngle + (Math.random() - 0.5) * spread;
      const speed = randomFloat(50, 150);
      const velocity = Vector2.fromAngle(angle, speed);
      const size = randomFloat(1, 4);
      const life = randomFloat(0.3, 0.8);
      
      this.addParticle(this.createParticle(position, velocity, color, size, life, ParticleType.SPARK));
    }
  }

  createPickupEffect(position: Vector2): void {
    // Ring of stars
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 / 12) * i;
      const velocity = Vector2.fromAngle(angle, 120);
      const size = randomFloat(3, 6);
      const life = randomFloat(0.8, 1.5);
      
      this.addParticle(this.createParticle(position, velocity, Color.yellow(), size, life, ParticleType.STAR));
    }
    
    // Inner explosion
    this.createExplosion(position, Color.gold(), 15, 0.8);
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  clear(): void {
    this.particles = [];
    this.sparkPool = [];
  }
}

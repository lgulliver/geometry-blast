import { Entity } from './Entity'
import { Vector2 } from '../utils/Vector2'
import { Color } from '../utils/Color'

export interface PlayerPowerUps {
  rapidFire: boolean;
  rapidFireTimer: number;
  multiShot: boolean;
  multiShotTimer: number;
  shield: boolean;
  shieldTimer: number;
  shieldHits: number;
}

export class Player extends Entity {
  private speed: number = 500;
  private shootCooldown: number = 1;
  private maxShootCooldown: number = 0.1;
  private thrustParticles: Vector2[] = [];
  public powerUps: PlayerPowerUps;

  constructor(x: number, y: number) {
    super(x, y);
    this.color = Color.cyan();
    this.radius = 8;
    this.powerUps = {
      rapidFire: false,
      rapidFireTimer: 0,
      multiShot: false,
      multiShotTimer: 0,
      shield: false,
      shieldTimer: 0,
      shieldHits: 0
    };
  }

  update(deltaTime: number): void {
    // Update position
    this.position = this.position.add(this.velocity.multiply(deltaTime));

    // Apply friction
    this.velocity = this.velocity.multiply(0.95);

    // Update shoot cooldown with rapid fire consideration
    const shootCooldownRate = this.powerUps.rapidFire ? 3.0 : 1.0;
    if (this.shootCooldown > 0) {
      this.shootCooldown -= deltaTime * shootCooldownRate;
    }

    // Update power-up timers
    this.updatePowerUpTimers(deltaTime);

    // Update thrust particles
    this.thrustParticles = this.thrustParticles.filter(particle => {
      particle.x += (Math.random() - 0.5) * 20 * deltaTime;
      particle.y += (Math.random() - 0.5) * 20 * deltaTime;
      return Math.random() > 0.1;
    });
  }

  private updatePowerUpTimers(deltaTime: number): void {
    if (this.powerUps.rapidFire) {
      this.powerUps.rapidFireTimer -= deltaTime;
      if (this.powerUps.rapidFireTimer <= 0) {
        this.powerUps.rapidFire = false;
      }
    }

    if (this.powerUps.multiShot) {
      this.powerUps.multiShotTimer -= deltaTime;
      if (this.powerUps.multiShotTimer <= 0) {
        this.powerUps.multiShot = false;
      }
    }

    if (this.powerUps.shield) {
      this.powerUps.shieldTimer -= deltaTime;
      if (this.powerUps.shieldTimer <= 0 || this.powerUps.shieldHits <= 0) {
        this.powerUps.shield = false;
      }
    }
  }

  activatePowerUp(type: string): void {
    switch (type) {
      case 'RAPID_FIRE':
        this.powerUps.rapidFire = true;
        this.powerUps.rapidFireTimer = 10.0;
        break;
      case 'MULTI_SHOT':
        this.powerUps.multiShot = true;
        this.powerUps.multiShotTimer = 8.0;
        break;
      case 'SHIELD':
        this.powerUps.shield = true;
        this.powerUps.shieldTimer = 15.0;
        this.powerUps.shieldHits = 3;
        break;
    }
  }

  takeDamage(): boolean {
    if (this.powerUps.shield) {
      this.powerUps.shieldHits--;
      return false; // Shield absorbed the damage
    }
    return true; // Damage taken
  }

  move(direction: Vector2): void {
    const force = direction.multiply(this.speed);
    this.velocity = this.velocity.add(force.multiply(0.025)); // Approximate deltaTime
    
    // Add thrust particles
    if (direction.magnitude() > 0.1) {
      const oppositeDirection = direction.multiply(-1).normalize();
      for (let i = 0; i < 3; i++) {
        this.thrustParticles.push(
          this.position.add(oppositeDirection.multiply(this.radius + Math.random() * 5))
        );
      }
    }

    // Rotate to face movement direction
    if (direction.magnitude() > 0.1) {
      this.rotation = direction.angle();
    }
  }

  canShoot(): boolean {
    return this.shootCooldown <= 0;
  }

  shoot(): void {
    this.shootCooldown = this.maxShootCooldown;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    // Render thrust particles
    ctx.fillStyle = Color.orange().withAlpha(0.6).toString();
    this.thrustParticles.forEach(particle => {
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Render shield effect
    if (this.powerUps.shield) {
      const shieldRadius = this.radius + 8;
      const shieldAlpha = Math.sin(Date.now() * 0.01) * 0.3 + 0.4;
      
      ctx.strokeStyle = Color.cyan().withAlpha(shieldAlpha).toString();
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, shieldRadius, 0, Math.PI * 2);
      ctx.stroke();
      
      // Shield hit indicators
      for (let i = 0; i < this.powerUps.shieldHits; i++) {
        const angle = (Math.PI * 2 / 3) * i;
        const x = this.position.x + Math.cos(angle) * (shieldRadius + 5);
        const y = this.position.y + Math.sin(angle) * (shieldRadius + 5);
        
        ctx.fillStyle = Color.cyan().toString();
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Render player ship
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(this.rotation);
    ctx.scale(this.scale.x, this.scale.y);

    // Ship body (triangle)
    let shipColor = this.color;
    if (this.powerUps.rapidFire) {
      shipColor = Color.yellow();
    }
    if (this.powerUps.multiShot) {
      shipColor = Color.orange();
    }
    
    ctx.strokeStyle = shipColor.toString();
    ctx.fillStyle = shipColor.withAlpha(0.3).toString();
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(this.radius, 0);
    ctx.lineTo(-this.radius * 0.6, -this.radius * 0.8);
    ctx.lineTo(-this.radius * 0.3, 0);
    ctx.lineTo(-this.radius * 0.6, this.radius * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Engine glow
    ctx.fillStyle = shipColor.withAlpha(0.5).toString();
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

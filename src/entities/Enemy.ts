import { Entity } from './Entity'
import { Vector2 } from '../utils/Vector2'
import { Color, randomColor } from '../utils/Color'
import { randomFloat } from '../utils/Math'

export enum EnemyType {
  WANDERER,
  CHASER,
  SHOOTER,
  SPLITTER
}

export class Enemy extends Entity {
  public type: EnemyType;
  public health: number;
  public maxHealth: number;
  private speed: number;
  private shootCooldown: number = 0;
  private behavior: any = {};

  constructor(x: number, y: number, type: EnemyType) {
    super(x, y);
    this.type = type;
    this.setupByType();
  }

  private setupByType(): void {
    switch (this.type) {
      case EnemyType.WANDERER:
        this.color = Color.green();
        this.radius = 8;
        this.health = this.maxHealth = 1;
        this.speed = 80;
        this.behavior.direction = Vector2.fromAngle(Math.random() * Math.PI * 2);
        this.behavior.changeTimer = 0;
        break;

      case EnemyType.CHASER:
        this.color = Color.red();
        this.radius = 10;
        this.health = this.maxHealth = 2;
        this.speed = 120;
        break;

      case EnemyType.SHOOTER:
        this.color = Color.purple();
        this.radius = 12;
        this.health = this.maxHealth = 3;
        this.speed = 60;
        this.behavior.shootTimer = 0;
        break;

      case EnemyType.SPLITTER:
        this.color = Color.orange();
        this.radius = 15;
        this.health = this.maxHealth = 4;
        this.speed = 50;
        this.behavior.hasSplit = false;
        break;
    }
  }

  update(deltaTime: number, playerPosition: Vector2, canvasWidth: number, canvasHeight: number): void {
    this.updateBehavior(deltaTime, playerPosition, canvasWidth, canvasHeight);
    
    // Update position
    this.position = this.position.add(this.velocity.multiply(deltaTime));

    // Wrap around screen
    this.wrapPosition(canvasWidth, canvasHeight);

    // Update cooldowns
    if (this.shootCooldown > 0) {
      this.shootCooldown -= deltaTime;
    }
  }

  private updateBehavior(deltaTime: number, playerPosition: Vector2, canvasWidth: number, canvasHeight: number): void {
    switch (this.type) {
      case EnemyType.WANDERER:
        this.behavior.changeTimer += deltaTime;
        if (this.behavior.changeTimer > 2.0) {
          this.behavior.direction = Vector2.fromAngle(Math.random() * Math.PI * 2);
          this.behavior.changeTimer = 0;
        }
        this.velocity = this.behavior.direction.multiply(this.speed);
        break;

      case EnemyType.CHASER:
        const toPlayer = playerPosition.subtract(this.position).normalize();
        this.velocity = toPlayer.multiply(this.speed);
        this.rotation = toPlayer.angle();
        break;

      case EnemyType.SHOOTER:
        // Move in a circular pattern
        this.behavior.shootTimer += deltaTime;
        const center = new Vector2(canvasWidth / 2, canvasHeight / 2);
        const toCenter = center.subtract(this.position);
        const perpendicular = new Vector2(-toCenter.y, toCenter.x).normalize();
        this.velocity = perpendicular.multiply(this.speed);
        
        // Face player
        const toPlayerShooter = playerPosition.subtract(this.position);
        this.rotation = toPlayerShooter.angle();
        break;

      case EnemyType.SPLITTER:
        // Slow movement towards player
        const toPlayerSplitter = playerPosition.subtract(this.position).normalize();
        this.velocity = toPlayerSplitter.multiply(this.speed);
        this.rotation = toPlayerSplitter.angle();
        break;
    }
  }

  takeDamage(damage: number): boolean {
    this.health -= damage;
    return this.health <= 0;
  }

  canShoot(): boolean {
    return this.type === EnemyType.SHOOTER && this.shootCooldown <= 0;
  }

  shoot(): Vector2 {
    this.shootCooldown = 1.5;
    return Vector2.fromAngle(this.rotation);
  }

  shouldSplit(): boolean {
    return this.type === EnemyType.SPLITTER && !this.behavior.hasplit && this.health <= this.maxHealth / 2;
  }

  split(): Enemy[] {
    this.behavior.hasplit = true;
    const splitEnemies: Enemy[] = [];
    
    for (let i = 0; i < 3; i++) {
      const angle = (Math.PI * 2 / 3) * i;
      const offset = Vector2.fromAngle(angle, this.radius * 2);
      const splitEnemy = new Enemy(
        this.position.x + offset.x,
        this.position.y + offset.y,
        EnemyType.WANDERER
      );
      splitEnemy.velocity = offset.normalize().multiply(150);
      splitEnemies.push(splitEnemy);
    }
    
    return splitEnemies;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(this.rotation);
    ctx.scale(this.scale.x, this.scale.y);

    // Health bar
    if (this.health < this.maxHealth) {
      const barWidth = this.radius * 2;
      const barHeight = 3;
      const healthPercent = this.health / this.maxHealth;
      
      ctx.fillStyle = Color.red().toString();
      ctx.fillRect(-barWidth / 2, -this.radius - 8, barWidth, barHeight);
      
      ctx.fillStyle = Color.green().toString();
      ctx.fillRect(-barWidth / 2, -this.radius - 8, barWidth * healthPercent, barHeight);
    }

    // Enemy body based on type
    ctx.strokeStyle = this.color.toString();
    ctx.fillStyle = this.color.withAlpha(0.4).toString();
    ctx.lineWidth = 2;

    switch (this.type) {
      case EnemyType.WANDERER:
        // Simple triangle
        ctx.beginPath();
        ctx.moveTo(this.radius, 0);
        ctx.lineTo(-this.radius * 0.7, -this.radius * 0.7);
        ctx.lineTo(-this.radius * 0.7, this.radius * 0.7);
        ctx.closePath();
        break;

      case EnemyType.CHASER:
        // Diamond shape
        ctx.beginPath();
        ctx.moveTo(this.radius, 0);
        ctx.lineTo(0, -this.radius);
        ctx.lineTo(-this.radius, 0);
        ctx.lineTo(0, this.radius);
        ctx.closePath();
        break;

      case EnemyType.SHOOTER:
        // Pentagon
        const sides = 5;
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
          const angle = (Math.PI * 2 / sides) * i;
          const x = Math.cos(angle) * this.radius;
          const y = Math.sin(angle) * this.radius;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        break;

      case EnemyType.SPLITTER:
        // Octagon
        const splitSides = 8;
        ctx.beginPath();
        for (let i = 0; i < splitSides; i++) {
          const angle = (Math.PI * 2 / splitSides) * i;
          const x = Math.cos(angle) * this.radius;
          const y = Math.sin(angle) * this.radius;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        break;
    }

    ctx.fill();
    ctx.stroke();

    // Center dot
    ctx.fillStyle = Color.white().toString();
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

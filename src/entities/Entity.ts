import { Vector2 } from '../utils/Vector2'
import { Color } from '../utils/Color'

export abstract class Entity {
  public position: Vector2;
  public velocity: Vector2;
  public rotation: number;
  public scale: Vector2;
  public color: Color;
  public active: boolean;
  public radius: number;

  constructor(x: number = 0, y: number = 0) {
    this.position = new Vector2(x, y);
    this.velocity = Vector2.zero();
    this.rotation = 0;
    this.scale = new Vector2(1, 1);
    this.color = Color.white();
    this.active = true;
    this.radius = 10;
  }

  abstract update(deltaTime: number, ...args: any[]): void;
  abstract render(ctx: CanvasRenderingContext2D): void;

  destroy(): void {
    this.active = false;
  }

  isColliding(other: Entity): boolean {
    return this.position.distance(other.position) < (this.radius + other.radius);
  }

  wrapPosition(canvasWidth: number, canvasHeight: number): void {
    if (this.position.x < -this.radius) {
      this.position.x = canvasWidth + this.radius;
    } else if (this.position.x > canvasWidth + this.radius) {
      this.position.x = -this.radius;
    }

    if (this.position.y < -this.radius) {
      this.position.y = canvasHeight + this.radius;
    } else if (this.position.y > canvasHeight + this.radius) {
      this.position.y = -this.radius;
    }
  }

  keepInBounds(canvasWidth: number, canvasHeight: number): void {
    this.position.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.position.x));
    this.position.y = Math.max(this.radius, Math.min(canvasHeight - this.radius, this.position.y));
  }
}

export class Vector2 {
  constructor(public x: number = 0, public y: number = 0) {}

  static zero(): Vector2 {
    return new Vector2(0, 0);
  }

  static from(x: number, y: number): Vector2 {
    return new Vector2(x, y);
  }

  static fromAngle(angle: number, magnitude: number = 1): Vector2 {
    return new Vector2(
      Math.cos(angle) * magnitude,
      Math.sin(angle) * magnitude
    );
  }

  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  add(other: Vector2): Vector2 {
    return new Vector2(this.x + other.x, this.y + other.y);
  }

  subtract(other: Vector2): Vector2 {
    return new Vector2(this.x - other.x, this.y - other.y);
  }

  multiply(scalar: number): Vector2 {
    return new Vector2(this.x * scalar, this.y * scalar);
  }

  divide(scalar: number): Vector2 {
    return new Vector2(this.x / scalar, this.y / scalar);
  }

  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize(): Vector2 {
    const mag = this.magnitude();
    if (mag === 0) return Vector2.zero();
    return this.divide(mag);
  }

  distance(other: Vector2): number {
    return this.subtract(other).magnitude();
  }

  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  rotate(angle: number): Vector2 {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Vector2(
      this.x * cos - this.y * sin,
      this.x * sin + this.y * cos
    );
  }

  dot(other: Vector2): number {
    return this.x * other.x + this.y * other.y;
  }

  lerp(other: Vector2, t: number): Vector2 {
    return new Vector2(
      this.x + (other.x - this.x) * t,
      this.y + (other.y - this.y) * t
    );
  }
}

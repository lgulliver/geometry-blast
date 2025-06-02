export class Color {
  constructor(
    public r: number = 255,
    public g: number = 255,
    public b: number = 255,
    public a: number = 1
  ) {}

  static white(): Color {
    return new Color(255, 255, 255, 1);
  }

  static black(): Color {
    return new Color(0, 0, 0, 1);
  }

  static red(): Color {
    return new Color(255, 0, 0, 1);
  }

  static green(): Color {
    return new Color(0, 255, 0, 1);
  }

  static blue(): Color {
    return new Color(0, 0, 255, 1);
  }

  static yellow(): Color {
    return new Color(255, 255, 0, 1);
  }
  
  static orange(): Color {
    return new Color(255, 165, 0, 1);
  }

  static purple(): Color {
    return new Color(128, 0, 128, 1);
  }

  static cyan(): Color {
    return new Color(0, 255, 255, 1);
  }
  
  static gray(): Color {
    return new Color(128, 128, 128, 1);
  }

  toString(): string {
    if (this.a === 1) {
      return `rgb(${this.r}, ${this.g}, ${this.b})`;
    }
    return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
  }

  withAlpha(alpha: number): Color {
    return new Color(this.r, this.g, this.b, alpha);
  }

  lerp(other: Color, t: number): Color {
    return new Color(
      this.r + (other.r - this.r) * t,
      this.g + (other.g - this.g) * t,
      this.b + (other.b - this.b) * t,
      this.a + (other.a - this.a) * t
    );
  }
}

export function randomColor(): Color {
  const colors = [
    Color.red(),
    Color.green(),
    Color.blue(),
    Color.yellow(),
    Color.orange(),
    Color.purple(),
    Color.cyan()
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

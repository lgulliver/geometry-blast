import { Vector2 } from '../utils/Vector2';
import { Entity } from '../entities/Entity';

interface GridPoint {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  velocity: Vector2;
  mass: number;
}

interface WarpInfluence {
  position: Vector2;
  strength: number;
  radius: number;
  type: 'push' | 'pull';
  decay: number;
}

export class GridWarpSystem {
  private gridSize: number;
  private gridPoints: GridPoint[][];
  private canvasWidth: number;
  private canvasHeight: number;
  private cols: number;
  private rows: number;
  private influences: WarpInfluence[] = [];
  private springConstant: number = 0.08;
  private damping: number = 0.95;
  private maxDisplacement: number = 15;
  private debugMode: boolean = false;

  constructor(canvasWidth: number, canvasHeight: number, gridSize: number = 50) {
    this.gridSize = gridSize;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.cols = Math.ceil(canvasWidth / gridSize) + 1;
    this.rows = Math.ceil(canvasHeight / gridSize) + 1;
    
    this.initializeGrid();
  }

  private initializeGrid(): void {
    this.gridPoints = [];
    for (let row = 0; row < this.rows; row++) {
      this.gridPoints[row] = [];
      for (let col = 0; col < this.cols; col++) {
        const x = col * this.gridSize;
        const y = row * this.gridSize;
        this.gridPoints[row][col] = {
          x: x,
          y: y,
          targetX: x,
          targetY: y,
          velocity: new Vector2(0, 0),
          mass: 1.0
        };
      }
    }
  }

  resize(newWidth: number, newHeight: number): void {
    this.canvasWidth = newWidth;
    this.canvasHeight = newHeight;
    this.cols = Math.ceil(newWidth / this.gridSize) + 1;
    this.rows = Math.ceil(newHeight / this.gridSize) + 1;
    this.initializeGrid();
  }

  // Add warp influence from entity movement
  addEntityInfluence(entity: Entity, strength: number = 1.0): void {
    const radius = Math.max(20, entity.radius * 2);
    this.influences.push({
      position: entity.position.clone(),
      strength: strength * 30,
      radius: radius,
      type: 'push',
      decay: 0.98
    });
  }

  // Add explosion warp
  addExplosionWarp(position: Vector2, strength: number = 2.0): void {
    this.influences.push({
      position: position.clone(),
      strength: strength * 60,
      radius: 80,
      type: 'push',
      decay: 0.92
    });
  }

  // Add gravitational pull (for power-ups or special effects)
  addGravityWell(position: Vector2, strength: number = 1.0): void {
    this.influences.push({
      position: position.clone(),
      strength: strength * 40,
      radius: 60,
      type: 'pull',
      decay: 0.95
    });
  }

  update(deltaTime: number): void {
    // Update influences (decay them over time)
    for (let i = this.influences.length - 1; i >= 0; i--) {
      const influence = this.influences[i];
      influence.strength *= influence.decay;
      
      // Remove weak influences
      if (influence.strength < 1) {
        this.influences.splice(i, 1);
      }
    }

    // Apply influences to grid points
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const point = this.gridPoints[row][col];
        const pointPos = new Vector2(point.targetX, point.targetY);
        
        // Reset forces
        let forceX = 0;
        let forceY = 0;
        
        // Apply all influences
        this.influences.forEach(influence => {
          const distance = pointPos.distance(influence.position);
          
          if (distance < influence.radius && distance > 0) {
            const normalizedDistance = distance / influence.radius;
            const falloff = 1 - (normalizedDistance * normalizedDistance);
            const forceMagnitude = influence.strength * falloff;
            
            const direction = pointPos.subtract(influence.position).normalize();
            
            if (influence.type === 'push') {
              forceX += direction.x * forceMagnitude;
              forceY += direction.y * forceMagnitude;
            } else {
              forceX -= direction.x * forceMagnitude;
              forceY -= direction.y * forceMagnitude;
            }
          }
        });
        
        // Apply spring force back to original position
        const originalX = col * this.gridSize;
        const originalY = row * this.gridSize;
        const springForceX = (originalX - point.x) * this.springConstant;
        const springForceY = (originalY - point.y) * this.springConstant;
        
        // Update velocity with forces
        point.velocity.x += (forceX + springForceX) * deltaTime;
        point.velocity.y += (forceY + springForceY) * deltaTime;
        
        // Apply damping
        point.velocity.x *= this.damping;
        point.velocity.y *= this.damping;
        
        // Update position
        point.x += point.velocity.x * deltaTime;
        point.y += point.velocity.y * deltaTime;
        
        // Limit displacement
        const displacement = Math.sqrt(
          Math.pow(point.x - originalX, 2) + 
          Math.pow(point.y - originalY, 2)
        );
        
        if (displacement > this.maxDisplacement) {
          const ratio = this.maxDisplacement / displacement;
          point.x = originalX + (point.x - originalX) * ratio;
          point.y = originalY + (point.y - originalY) * ratio;
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    // Draw horizontal lines
    for (let row = 0; row < this.rows; row++) {
      ctx.beginPath();
      for (let col = 0; col < this.cols; col++) {
        const point = this.gridPoints[row][col];
        if (col === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      }
      ctx.stroke();
    }
    
    // Draw vertical lines
    for (let col = 0; col < this.cols; col++) {
      ctx.beginPath();
      for (let row = 0; row < this.rows; row++) {
        const point = this.gridPoints[row][col];
        if (row === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      }
      ctx.stroke();
    }
    
    ctx.restore();
  }

  // Debug method to render influences
  renderDebug(ctx: CanvasRenderingContext2D): void {
    if (!this.debugMode) return;
    
    ctx.save();
    
    this.influences.forEach(influence => {
      ctx.strokeStyle = influence.type === 'push' ? 'rgba(255, 0, 0, 0.3)' : 'rgba(0, 0, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(influence.position.x, influence.position.y, influence.radius, 0, Math.PI * 2);
      ctx.stroke();
      
      // Draw strength indicator
      ctx.fillStyle = influence.type === 'push' ? 'rgba(255, 0, 0, 0.5)' : 'rgba(0, 0, 255, 0.5)';
      const strengthRadius = Math.min(10, influence.strength / 10);
      ctx.beginPath();
      ctx.arc(influence.position.x, influence.position.y, strengthRadius, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Show grid points in debug mode
    ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const point = this.gridPoints[row][col];
        const originalX = col * this.gridSize;
        const originalY = row * this.gridSize;
        
        // Only draw points that have moved significantly
        const dx = point.x - originalX;
        const dy = point.y - originalY;
        if (dx * dx + dy * dy > 4) {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    
    // Show debug info text
    ctx.font = '12px Courier New';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(`Grid Warp: ${this.influences.length} influences`, 10, 70);
    
    ctx.restore();
  }

  getInfluenceCount(): number {
    return this.influences.length;
  }

  clear(): void {
    this.influences = [];
    this.initializeGrid();
  }
  
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }
  
  isDebugMode(): boolean {
    return this.debugMode;
  }
}

import { Vector2 } from '../utils/Vector2'
import { Entity } from '../entities/Entity'

export enum CollisionShape {
  CIRCLE,
  RECTANGLE,
  POLYGON
}

export interface CollisionData {
  entity: Entity;
  shape: CollisionShape;
  bounds?: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

export interface CollisionResult {
  entityA: Entity;
  entityB: Entity;
  penetration: number;
  normal: Vector2;
  contactPoint: Vector2;
}

// Spatial partitioning grid for efficient collision detection
export class SpatialGrid {
  private cellSize: number;
  private cols: number;
  private rows: number;
  private grid: Map<string, CollisionData[]>;
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(canvasWidth: number, canvasHeight: number, cellSize: number = 100) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.cellSize = cellSize;
    this.cols = Math.ceil(canvasWidth / cellSize);
    this.rows = Math.ceil(canvasHeight / cellSize);
    this.grid = new Map();
  }

  // Getters for debug rendering
  get debugInfo() {
    return {
      cols: this.cols,
      rows: this.rows,
      cellSize: this.cellSize,
      canvasWidth: this.canvasWidth,
      canvasHeight: this.canvasHeight
    };
  }

  private getKey(col: number, row: number): string {
    return `${col},${row}`;
  }

  private getCellCoords(x: number, y: number): { col: number; row: number } {
    return {
      col: Math.floor(x / this.cellSize),
      row: Math.floor(y / this.cellSize)
    };
  }

  clear(): void {
    this.grid.clear();
  }

  insert(collisionData: CollisionData): void {
    const entity = collisionData.entity;
    const bounds = this.calculateBounds(entity);
    
    // Store bounds for later use
    collisionData.bounds = bounds;
    
    // Find all cells this entity overlaps
    const startCol = Math.max(0, Math.floor(bounds.minX / this.cellSize));
    const endCol = Math.min(this.cols - 1, Math.floor(bounds.maxX / this.cellSize));
    const startRow = Math.max(0, Math.floor(bounds.minY / this.cellSize));
    const endRow = Math.min(this.rows - 1, Math.floor(bounds.maxY / this.cellSize));
    
    for (let col = startCol; col <= endCol; col++) {
      for (let row = startRow; row <= endRow; row++) {
        const key = this.getKey(col, row);
        if (!this.grid.has(key)) {
          this.grid.set(key, []);
        }
        this.grid.get(key)!.push(collisionData);
      }
    }
  }

  private calculateBounds(entity: Entity): { minX: number; maxX: number; minY: number; maxY: number } {
    // For now, use circle bounds - can be extended for other shapes
    return {
      minX: entity.position.x - entity.radius,
      maxX: entity.position.x + entity.radius,
      minY: entity.position.y - entity.radius,
      maxY: entity.position.y + entity.radius
    };
  }

  query(bounds: { minX: number; maxX: number; minY: number; maxY: number }): CollisionData[] {
    const result = new Set<CollisionData>();
    
    const startCol = Math.max(0, Math.floor(bounds.minX / this.cellSize));
    const endCol = Math.min(this.cols - 1, Math.floor(bounds.maxX / this.cellSize));
    const startRow = Math.max(0, Math.floor(bounds.minY / this.cellSize));
    const endRow = Math.min(this.rows - 1, Math.floor(bounds.maxY / this.cellSize));
    
    for (let col = startCol; col <= endCol; col++) {
      for (let row = startRow; row <= endRow; row++) {
        const key = this.getKey(col, row);
        const cell = this.grid.get(key);
        if (cell) {
          cell.forEach(data => result.add(data));
        }
      }
    }
    
    return Array.from(result);
  }

  resize(newWidth: number, newHeight: number): void {
    this.canvasWidth = newWidth;
    this.canvasHeight = newHeight;
    this.cols = Math.ceil(newWidth / this.cellSize);
    this.rows = Math.ceil(newHeight / this.cellSize);
    // Grid will be rebuilt on next frame
  }
}

export class CollisionSystem {
  private spatialGrid: SpatialGrid;
  private debugMode: boolean = false;

  constructor(canvasWidth: number, canvasHeight: number, debugMode: boolean = false) {
    this.spatialGrid = new SpatialGrid(canvasWidth, canvasHeight);
    this.debugMode = debugMode;
  }

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  resize(width: number, height: number): void {
    this.spatialGrid.resize(width, height);
  }

  // Enhanced collision detection methods
  private checkCircleCollision(entityA: Entity, entityB: Entity): CollisionResult | null {
    const distance = entityA.position.distance(entityB.position);
    const combinedRadius = entityA.radius + entityB.radius;
    
    if (distance < combinedRadius) {
      const penetration = combinedRadius - distance;
      const normal = entityB.position.subtract(entityA.position).normalize();
      const contactPoint = entityA.position.add(normal.multiply(entityA.radius));
      
      return {
        entityA,
        entityB,
        penetration,
        normal,
        contactPoint
      };
    }
    
    return null;
  }

  private checkAABBCollision(entityA: Entity, entityB: Entity): boolean {
    const boundsA = {
      minX: entityA.position.x - entityA.radius,
      maxX: entityA.position.x + entityA.radius,
      minY: entityA.position.y - entityA.radius,
      maxY: entityA.position.y + entityA.radius
    };
    
    const boundsB = {
      minX: entityB.position.x - entityB.radius,
      maxX: entityB.position.x + entityB.radius,
      minY: entityB.position.y - entityB.radius,
      maxY: entityB.position.y + entityB.radius
    };
    
    return !(boundsA.maxX < boundsB.minX || 
             boundsA.minX > boundsB.maxX || 
             boundsA.maxY < boundsB.minY || 
             boundsA.minY > boundsB.maxY);
  }

  // Fast AABB pre-check followed by precise circle collision
  checkCollision(entityA: Entity, entityB: Entity): CollisionResult | null {
    // Quick AABB check first
    if (!this.checkAABBCollision(entityA, entityB)) {
      return null;
    }
    
    // Precise circle collision
    return this.checkCircleCollision(entityA, entityB);
  }

  // Batch collision detection with spatial partitioning
  detectCollisions(
    groupA: Entity[],
    groupB: Entity[],
    callback: (result: CollisionResult) => void
  ): void {
    // Clear and rebuild spatial grid
    this.spatialGrid.clear();
    
    // Insert group B entities into spatial grid
    groupB.forEach(entity => {
      if (entity.active) {
        this.spatialGrid.insert({
          entity,
          shape: CollisionShape.CIRCLE
        });
      }
    });
    
    // Check group A entities against spatially partitioned group B
    groupA.forEach(entityA => {
      if (!entityA.active) return;
      
      const bounds = {
        minX: entityA.position.x - entityA.radius,
        maxX: entityA.position.x + entityA.radius,
        minY: entityA.position.y - entityA.radius,
        maxY: entityA.position.y + entityA.radius
      };
      
      const potentialCollisions = this.spatialGrid.query(bounds);
      
      potentialCollisions.forEach(collisionData => {
        const entityB = collisionData.entity;
        if (!entityB.active) return;
        
        const result = this.checkCollision(entityA, entityB);
        if (result) {
          callback(result);
        }
      });
    });
  }

  // Optimized collision detection for entities vs single target
  detectCollisionsWithTarget(
    entities: Entity[],
    target: Entity,
    callback: (result: CollisionResult) => void
  ): void {
    if (!target.active) return;
    
    entities.forEach(entity => {
      if (!entity.active) return;
      
      const result = this.checkCollision(entity, target);
      if (result) {
        callback(result);
      }
    });
  }

  // Debug rendering for spatial grid
  renderDebug(ctx: CanvasRenderingContext2D): void {
    if (!this.debugMode) return;
    
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
    ctx.lineWidth = 1;
    
    const debugInfo = this.spatialGrid.debugInfo;
    
    // Draw grid lines
    for (let i = 0; i <= debugInfo.cols; i++) {
      const x = i * debugInfo.cellSize;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, debugInfo.canvasHeight);
      ctx.stroke();
    }
    
    for (let j = 0; j <= debugInfo.rows; j++) {
      const y = j * debugInfo.cellSize;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(debugInfo.canvasWidth, y);
      ctx.stroke();
    }
    
    ctx.restore();
  }
}

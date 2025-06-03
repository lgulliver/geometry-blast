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
  private springConstant: number = 1.0; 
  private damping: number = 0.5; 
  private maxDisplacement: number = 25; 
  private gridOpacity: number = 0.15; // Grid base opacity
  private gridWidth: number = 1.0; // Grid line width
  private debugMode: boolean = false;

  constructor(canvasWidth: number, canvasHeight: number, gridSize: number = 30) { // Smaller grid for finer distortions
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
        
        // Create slight variations in mass for more natural movement
        // Geometry Wars 3 grid points don't all move the same way
        const massFactor = 0.9 + (Math.random() * 0.2);
        
        // Add slight initial displacement to avoid perfect grid
        const jitter = 0.2; // Small jitter factor
        const jitterX = (Math.random() * 2 - 1) * jitter;
        const jitterY = (Math.random() * 2 - 1) * jitter;
        
        this.gridPoints[row][col] = {
          x: x + jitterX,
          y: y + jitterY,
          targetX: x,
          targetY: y,
          velocity: new Vector2(0, 0),
          mass: massFactor // Varied masses create more natural movement
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

  // Add warp influence from entity movement - Geometry Wars 3 style
  addEntityInfluence(entity: Entity, strength: number = 1.0): void {
    // Extract velocity if available, or estimate from historical positions
    let velocity = new Vector2(0, 0);
    if ('velocity' in entity) {
      velocity = (entity as any).velocity;
    }
    
    // Calculate speed-based influence - more responsive to slow entities
    const speed = velocity.magnitude();
    const speedFactor = Math.min(2.0, Math.max(1.0, speed / 3)); // More conservative speed scaling
    
    // Create much tighter radius around entities for focused distortion
    const radius = Math.max(8, entity.radius * 1.2 + speedFactor * 3); // Much smaller, tighter radius
    
    // Create stronger influence for the smaller area
    const influenceStrength = strength * 150 * speedFactor; // Stronger to compensate for smaller radius
    
    console.log(`Adding entity influence: strength=${influenceStrength.toFixed(2)}, radius=${radius.toFixed(2)}, pos=(${entity.position.x.toFixed(1)}, ${entity.position.y.toFixed(1)})`);
    
    // Create entity trail influence
    this.influences.push({
      position: entity.position.clone(),
      strength: influenceStrength,
      radius: radius,
      type: 'push', // Push for standard entities
      decay: 0.97 // Slightly slower decay for more visible trails
    });
    
    // For fast-moving entities, create additional trail points
    if (speed > 3 && 'lastPosition' in entity) {
      const lastPos = (entity as any).lastPosition;
      if (lastPos) {
        // Create a smaller influence at the previous position
        this.influences.push({
          position: lastPos.clone(),
          strength: influenceStrength * 0.6,
          radius: radius * 0.6,
          type: 'push',
          decay: 0.94
        });
      }
    }
  }

  // Add explosion warp - enhanced for Geometry Wars 3 style
  addExplosionWarp(position: Vector2, strength: number = 2.0): void {
    // Main explosion push
    this.influences.push({
      position: position.clone(),
      strength: strength * 120, // Stronger for smaller radius
      radius: 35, // Much smaller, more focused radius
      type: 'push',
      decay: 0.91 // Slightly faster decay
    });
    
    // GW3 adds secondary ripple effects
    setTimeout(() => {
      // Delayed secondary pulse
      if (strength > 1.0) {
        this.influences.push({
          position: position.clone(),
          strength: strength * 60,
          radius: 20, // Smaller secondary effect
          type: 'pull', // Pull for the secondary effect
          decay: 0.93
        });
      }
    }, 100);
  }

  // Add gravitational pull (for power-ups or special effects)
  addGravityWell(position: Vector2, strength: number = 1.0): void {
    // Main gravity well with Geometry Wars 3 style pulsing effect
    this.influences.push({
      position: position.clone(),
      strength: strength * 80, // Stronger for smaller radius
      radius: 25, // Tighter influence area
      type: 'pull',
      decay: 0.93 // Slightly faster decay for more dynamic feel
    });
  }

  // Add ambient pulse effect like Geometry Wars 3
  addAmbientPulse(centerX: number = -1, centerY: number = -1, strength: number = 0.5): void {
    // Use provided center or random position
    const x = centerX >= 0 ? centerX : Math.random() * this.canvasWidth;
    const y = centerY >= 0 ? centerY : Math.random() * this.canvasHeight;
    
    // Create a gentle wave/pulse influence
    this.influences.push({
      position: new Vector2(x, y),
      strength: strength * 30,
      radius: 80 + Math.random() * 40, // Smaller, more focused radius for variety
      type: Math.random() > 0.3 ? 'push' : 'pull', // Mix of push and pull
      decay: 0.95 + Math.random() * 0.03 // Random decay for variety
    });
  }

  // Start ambient pulses like in Geometry Wars 3 background
  startAmbientPulses(): void {
    // Create an initial pulse
    this.addAmbientPulse();
    
    // Set up repeating pulses
    const addRandomPulse = () => {
      // Add a gentle random pulse somewhere
      this.addAmbientPulse(-1, -1, 0.2 + Math.random() * 0.4);
      
      // Schedule next pulse in 2-5 seconds
      const nextDelay = 2000 + Math.random() * 3000;
      setTimeout(addRandomPulse, nextDelay);
    };
    
    // Schedule first ambient pulse
    setTimeout(addRandomPulse, 2000);
  }

  update(deltaTime: number): void {
    // Adjust deltaTime for more consistent behavior across different frame rates
    // Geometry Wars uses fixed timestep physics
    const fixedDeltaTime = Math.min(deltaTime, 1/30); // Cap at 30fps physics min
    
    // Update influences (decay them over time)
    for (let i = this.influences.length - 1; i >= 0; i--) {
      const influence = this.influences[i];
      
      // Apply non-linear decay for more natural fading
      const decayFactor = influence.strength > 20 ? 
        influence.decay * 0.99 : influence.decay;
      
      influence.strength *= decayFactor;
      
      // Remove weak influences
      if (influence.strength < 1) {
        this.influences.splice(i, 1);
      }
    }

    // Calculate influence map for optimization - divide grid into cells
    // This is similar to how Geometry Wars 3 optimizes grid calculations
    const cellSize = this.gridSize * 2; // Larger cells for higher performance
    const cellCols = Math.ceil(this.canvasWidth / cellSize) + 1;
    const cellRows = Math.ceil(this.canvasHeight / cellSize) + 1;
    
    // Create influence map
    const influenceMap: { forces: Vector2, count: number }[][] = [];
    for (let row = 0; row < cellRows; row++) {
      influenceMap[row] = [];
      for (let col = 0; col < cellCols; col++) {
        influenceMap[row][col] = { forces: new Vector2(0, 0), count: 0 };
      }
    }
    
    // Pre-calculate influence forces for each cell
    this.influences.forEach(influence => {
      // Calculate affected cells (optimization)
      const cellX = Math.floor(influence.position.x / cellSize);
      const cellY = Math.floor(influence.position.y / cellSize);
      const radius = Math.ceil(influence.radius / cellSize);
      
      // Calculate influence for surrounding cells
      for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          const r = cellY + dr;
          const c = cellX + dc;
          
          if (r >= 0 && r < cellRows && c >= 0 && c < cellCols) {
            // Calculate cell center
            const cellCenterX = (c + 0.5) * cellSize;
            const cellCenterY = (r + 0.5) * cellSize;
            const cellCenter = new Vector2(cellCenterX, cellCenterY);
            
            const distance = cellCenter.distance(influence.position);
            
            if (distance < influence.radius + cellSize) {
              // Calculate force for this cell
              const normalizedDistance = Math.max(0.1, distance / influence.radius);
              
              // Use improved falloff curve for more Geometry Wars like effect
              // This creates a sharper peak and smoother falloff
              const falloff = 1 / (normalizedDistance * normalizedDistance + 0.2);
              const forceMagnitude = influence.strength * falloff;
              
              const direction = cellCenter.subtract(influence.position).normalize();
              let forceX = 0;
              let forceY = 0;
              
              if (influence.type === 'push') {
                forceX = direction.x * forceMagnitude;
                forceY = direction.y * forceMagnitude;
              } else {
                forceX = -direction.x * forceMagnitude;
                forceY = -direction.y * forceMagnitude;
              }
              
              // Add force to influence map
              influenceMap[r][c].forces.x += forceX;
              influenceMap[r][c].forces.y += forceY;
              influenceMap[r][c].count++;
            }
          }
        }
      }
    });

    // Apply influences and update grid points
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const point = this.gridPoints[row][col];
        
        // Reset forces
        let forceX = 0;
        let forceY = 0;
        
        // Get cell influence
        const cellRow = Math.floor(row * this.gridSize / cellSize);
        const cellCol = Math.floor(col * this.gridSize / cellSize);
        
        if (cellRow >= 0 && cellRow < cellRows && 
            cellCol >= 0 && cellCol < cellCols) {
          const cellInfluence = influenceMap[cellRow][cellCol];
          
          if (cellInfluence.count > 0) {
            forceX = cellInfluence.forces.x;
            forceY = cellInfluence.forces.y;
          }
        }
        
        // Apply spring force back to original position (Geometry Wars style)
        const originalX = col * this.gridSize;
        const originalY = row * this.gridSize;
        
        // Non-linear spring force gives more GW3-like effect
        const dx = originalX - point.x;
        const dy = originalY - point.y;
        const displacement = Math.sqrt(dx * dx + dy * dy);
        
        // Enhanced spring force calculation with healing speed multipliers
        let springMultiplier = 1.0;
        let snapThreshold = 0;
        
        // Apply special behavior for instant healing mode
        if (this.springConstant >= 0.35) { // Instant mode detection - lower threshold
          springMultiplier = 6.0; // Reduced multiplier for more visible distortion
          snapThreshold = 0.8; // Much smaller snap threshold - let distortion be visible longer
          
          // Snap to grid for small displacements in instant mode
          if (displacement < snapThreshold) {
            point.x = originalX;
            point.y = originalY;
            point.velocity.x *= 0.3; // Less aggressive velocity dampening when snapping
            point.velocity.y *= 0.3;
          }
        } else if (this.springConstant >= 0.2) { // Fast mode
          springMultiplier = 5.0; // Reduced from 20x
        } else { // Medium/slow modes
          springMultiplier = 1.0;
        }
        
        // Enhanced spring force for faster healing
        const springFactor = this.springConstant * springMultiplier * (1 + displacement * 0.05);
        
        const springForceX = dx * springFactor;
        const springForceY = dy * springFactor;
        
        // Update velocity with forces - use mass for point variations
        const massReciprocal = 1 / point.mass;
        point.velocity.x += (forceX + springForceX) * fixedDeltaTime * massReciprocal;
        point.velocity.y += (forceY + springForceY) * fixedDeltaTime * massReciprocal;
        
        // Apply damping with healing speed enhancements
        let pointDamping = this.damping + (Math.sin(col + row) * 0.01);
        let dampingMultiplier = 1.0;
        
        // Enhanced damping for instant mode
        if (this.springConstant >= 0.35) { // Instant mode - match new threshold
          dampingMultiplier = 1.2; // Slight damping increase for controlled healing
        }
        
        point.velocity.x *= pointDamping * dampingMultiplier;
        point.velocity.y *= pointDamping * dampingMultiplier;
        
        // Update position
        point.x += point.velocity.x * fixedDeltaTime;
        point.y += point.velocity.y * fixedDeltaTime;
        
        // Limit displacement with non-linear clamping (softer limit at edges)
        const currentDisplacement = Math.sqrt(
          Math.pow(point.x - originalX, 2) + 
          Math.pow(point.y - originalY, 2)
        );
        
        if (currentDisplacement > this.maxDisplacement) {
          // Soft limiting like in Geometry Wars 3
          const excess = currentDisplacement - this.maxDisplacement;
          const dampingFactor = 1 - Math.min(1, excess / 10);
          const ratio = this.maxDisplacement / currentDisplacement;
          
          // Apply soft limit
          point.x = originalX + (point.x - originalX) * ratio * dampingFactor;
          point.y = originalY + (point.y - originalY) * ratio * dampingFactor;
          
          // Reflect velocity for more energetic response
          point.velocity.x *= -0.5;
          point.velocity.y *= -0.5;
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    
    // Use additive blending for a glowing effect like in Geometry Wars 3
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = this.gridWidth;
    
    // Create gradient colors for grid lines (base color: blue-green-cyan)
    const baseColor = 'rgba(0, 180, 230, ';
    const activeColor = 'rgba(60, 230, 255, ';
    
    // Calculate base opacity based on active influences
    const influenceFactor = Math.min(1, this.influences.length * 0.1);
    const baseOpacity = this.gridOpacity * (1 + influenceFactor * 0.5);
    
    // Draw horizontal lines with dynamic glow
    for (let row = 0; row < this.rows; row++) {
      // Calculate distortion factor for this row
      let rowDistortion = 0;
      for (let col = 0; col < this.cols; col++) {
        const point = this.gridPoints[row][col];
        const originalY = row * this.gridSize;
        rowDistortion += Math.abs(point.y - originalY);
      }
      rowDistortion = Math.min(1, rowDistortion / (this.cols * 5));
      
      // Set line style based on distortion
      const opacity = baseOpacity + rowDistortion * 0.3;
      ctx.strokeStyle = rowDistortion > 0.2 ? 
        activeColor + opacity + ')' : 
        baseColor + opacity + ')';
      
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
    
    // Draw vertical lines with dynamic glow
    for (let col = 0; col < this.cols; col++) {
      // Calculate distortion factor for this column
      let colDistortion = 0;
      for (let row = 0; row < this.rows; row++) {
        const point = this.gridPoints[row][col];
        const originalX = col * this.gridSize;
        colDistortion += Math.abs(point.x - originalX);
      }
      colDistortion = Math.min(1, colDistortion / (this.rows * 5));
      
      // Set line style based on distortion
      const opacity = baseOpacity + colDistortion * 0.3;
      ctx.strokeStyle = colDistortion > 0.2 ? 
        activeColor + opacity + ')' : 
        baseColor + opacity + ')';
      
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
    
    // Reset blend mode
    ctx.globalCompositeOperation = 'source-over';
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

  /**
   * Set grid healing speed preset
   * Controls how quickly the grid returns to normal after distortions
   */
  setHealingSpeed(speed: 'slow' | 'medium' | 'fast' | 'instant'): void {
    switch(speed) {
      case 'slow':
        this.springConstant = 0.08;
        this.damping = 0.95;
        break;
      case 'medium':
        this.springConstant = 0.15;
        this.damping = 0.92;
        break;
      case 'fast':
        this.springConstant = 0.25;
        this.damping = 0.85;
        break;
      case 'instant':
        this.springConstant = 0.4;  // Moderate spring for visible distortion that heals in ~0.5s
        this.damping = 0.75;        // Higher damping for controlled movement
        break;
    }
    
    console.log(`Grid healing speed set to: ${speed} (spring=${this.springConstant}, damping=${this.damping})`);
  }
  
  /**
   * Get current healing speed parameters
   */
  getHealingSpeed(): { springConstant: number, damping: number } {
    return {
      springConstant: this.springConstant,
      damping: this.damping
    };
  }
  
  /**
   * Get the current healing speed preset based on parameters
   */
  getHealingSpeedPreset(): 'slow' | 'medium' | 'fast' | 'instant' | 'custom' {
    if (Math.abs(this.springConstant - 0.08) < 0.01 && Math.abs(this.damping - 0.95) < 0.01) {
      return 'slow';
    } else if (Math.abs(this.springConstant - 0.15) < 0.01 && Math.abs(this.damping - 0.92) < 0.01) {
      return 'medium';
    } else if (Math.abs(this.springConstant - 0.25) < 0.01 && Math.abs(this.damping - 0.85) < 0.01) {
      return 'fast';
    } else if (Math.abs(this.springConstant - 0.4) < 0.05 && Math.abs(this.damping - 0.75) < 0.05) {
      return 'instant';
    } else {
      return 'custom';
    }
  }
}

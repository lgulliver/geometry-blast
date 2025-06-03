import { Player } from '../entities/Player'
import { Enemy, EnemyType } from '../entities/Enemy'
import { Projectile } from '../entities/Projectile'
import { PowerUp, PowerUpType } from '../entities/PowerUp'
import { InputManager } from '../input/InputManager'
import { ParticleSystem } from '../graphics/ParticleSystem'
import { GridWarpSystem } from '../graphics/GridWarpSystem'
import { ScreenShakeSystem } from '../graphics/ScreenShakeSystem'
import { AudioManager } from '../audio/AudioManager'
import { CollisionSystem } from './CollisionSystem'
import { Vector2 } from '../utils/Vector2'
import { Color } from '../utils/Color'
import { randomFloat, randomInt, randomChoice } from '../utils/Math'

export enum GameState {
  PLAYING,
  GAME_OVER,
  PAUSED
}

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private inputManager: InputManager;
  private particleSystem: ParticleSystem;
  private gridWarpSystem: GridWarpSystem;
  private screenShakeSystem: ScreenShakeSystem;
  private audioManager: AudioManager;
  private collisionSystem: CollisionSystem;
  
  private player: Player;
  private enemies: Enemy[] = [];
  private playerProjectiles: Projectile[] = [];
  private enemyProjectiles: Projectile[] = [];
  private powerUps: PowerUp[] = [];
  
  private score: number = 0;
  private lives: number = 3;
  private wave: number = 1;
  private gameState: GameState = GameState.PLAYING;
  
  private enemySpawnTimer: number = 0;
  private waveTimer: number = 0;
  private invulnerabilityTimer: number = 0;
  
  // UI elements
  private scoreElement: HTMLElement;
  private livesElement: HTMLElement;
  private gameOverElement: HTMLElement;
  private finalScoreElement: HTMLElement;
  private restartButton: HTMLElement;

  // Performance tracking
  private collisionTime: number = 0;
  private collisionCount: number = 0;
  private frameCount: number = 0;
  private lastPerformanceReport: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    
    // Special handling for iOS Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIOS) {
      console.log('iOS device detected, applying special setup');
      // Force a delay to ensure proper setup
      setTimeout(() => this.setupCanvas(), 300);
    }
    
    // Initialize canvas sizing and mobile handling FIRST
    this.setupCanvas();
    this.setupMobileOptimizations();
    
    // Now create input manager with proper canvas size
    this.inputManager = new InputManager(canvas);
    this.particleSystem = new ParticleSystem();
    this.gridWarpSystem = new GridWarpSystem(
      this.canvas.width / (window.devicePixelRatio || 1), 
      this.canvas.height / (window.devicePixelRatio || 1)
    );
    // Set default grid healing speed to 'instant' for snappy, responsive distortions
    this.gridWarpSystem.setHealingSpeed('instant');
    this.gridWarpSystem.startAmbientPulses();
    
    this.screenShakeSystem = new ScreenShakeSystem();
    this.audioManager = new AudioManager();
    this.collisionSystem = new CollisionSystem(
      this.canvas.width / (window.devicePixelRatio || 1), 
      this.canvas.height / (window.devicePixelRatio || 1),
      false // Set to true to enable debug rendering
    );
    
    // Listen for pause events from mobile controls
    document.addEventListener('gamePauseToggle', (e: CustomEvent) => {
      if (e.detail?.paused) {
        this.pauseGame();
      } else {
        this.resumeGame();
      }
    });
    
    // Listen for pause events from mobile controls
    document.addEventListener('gamePauseToggle', (e: CustomEvent) => {
      if (e.detail?.paused) {
        this.pauseGame();
      } else {
        this.resumeGame();
      }
    });
    
    // Get UI elements
    this.scoreElement = document.getElementById('score')!;
    this.livesElement = document.getElementById('lives')!;
    this.gameOverElement = document.getElementById('gameOver')!;
    this.finalScoreElement = document.getElementById('finalScore')!;
    this.restartButton = document.getElementById('restartBtn')!;
    
    this.restartButton.addEventListener('click', () => this.restartGame());
    
    // Setup resize handler
    window.addEventListener('resize', () => this.handleResize());
    
    // Initialize game state and entities
    this.initializeGame();
  }

  private setupCanvas(): void {
    const updateCanvasSize = () => {
      const devicePixelRatio = window.devicePixelRatio || 1;
      
      // Enhanced mobile detection
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                      ('ontouchstart' in window) ||
                      (window.navigator.maxTouchPoints > 0);
      
      let targetWidth, targetHeight;
      
      if (isMobile) {
        // Use full viewport for mobile devices
        targetWidth = window.innerWidth;
        targetHeight = window.innerHeight;
        
        // For iOS Safari, use visualViewport if available to handle address bar
        if (window.visualViewport) {
          targetWidth = window.visualViewport.width;
          targetHeight = window.visualViewport.height;
        }
        
        // Ensure minimum playable size
        if (targetWidth < 320) targetWidth = 320;
        if (targetHeight < 240) targetHeight = 240;
        
        console.log('Mobile canvas sizing:', {
          window: { width: window.innerWidth, height: window.innerHeight },
          visualViewport: window.visualViewport ? 
            { width: window.visualViewport.width, height: window.visualViewport.height } : 'not available',
          target: { width: targetWidth, height: targetHeight }
        });
      } else {
        // Desktop: use reasonable game window size
        targetWidth = Math.min(window.innerWidth - 40, 1200);
        targetHeight = Math.min(window.innerHeight - 40, 800);
      }
      
      // Set canvas CSS size first
      this.canvas.style.width = targetWidth + 'px';
      this.canvas.style.height = targetHeight + 'px';
      
      // Set actual canvas resolution
      this.canvas.width = targetWidth * devicePixelRatio;
      this.canvas.height = targetHeight * devicePixelRatio;
      
      // Clear and reset the context
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(devicePixelRatio, devicePixelRatio);
      
      console.log('Canvas updated:', {
        cssSize: { width: targetWidth, height: targetHeight },
        actualSize: { width: this.canvas.width, height: this.canvas.height },
        devicePixelRatio,
        isMobile
      });
    };
    
    updateCanvasSize();
    
    // Listen for visual viewport changes (iOS Safari address bar)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateCanvasSize);
    }
  }

  private setupMobileOptimizations(): void {
    // Prevent scroll on mobile
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    
    // Prevent zoom on double tap
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (event) => {
      const now = (new Date()).getTime();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, false);
    
    // Add mobile viewport meta tag if not present
    let viewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    
    // Handle orientation change with a delay to ensure proper resize
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.handleResize(), 100);
    });
  }

  private handleResize(): void {
    this.setupCanvas();
    this.inputManager.updateLayout();
    
    // Update collision system dimensions
    const canvasWidth = this.canvas.width / (window.devicePixelRatio || 1);
    const canvasHeight = this.canvas.height / (window.devicePixelRatio || 1);
    this.collisionSystem.resize(canvasWidth, canvasHeight);
    
    // Update grid warp system dimensions
    this.gridWarpSystem.resize(canvasWidth, canvasHeight);
    
    // Update player position if out of bounds
    if (this.player) {
      const pos = this.player.position;
      const newX = Math.max(20, Math.min(canvasWidth - 20, pos.x));
      const newY = Math.max(20, Math.min(canvasHeight - 20, pos.y));
      this.player.position = new Vector2(newX, newY);
    }
  }

  private initializeGame(): void {
    this.player = new Player(this.canvas.width / 2, this.canvas.height / 2);
    this.enemies = [];
    this.playerProjectiles = [];
    this.enemyProjectiles = [];
    this.powerUps = [];
    this.particleSystem.clear();
    this.gridWarpSystem.clear();
    this.screenShakeSystem.clear();
    
    // Start ambient grid pulses for Geometry Wars 3-like background effect
    this.gridWarpSystem.startAmbientPulses();
    
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.gameState = GameState.PLAYING;
    this.enemySpawnTimer = 0;
    this.waveTimer = 0;
    this.invulnerabilityTimer = 0;

    this.updateUI();
    this.spawnWave();
  }

  private spawnWave(): void {
    // Shorter waves - reduced enemy count
    const enemyCount = Math.min(3 + this.wave * 1, 12);
    
    for (let i = 0; i < enemyCount; i++) {
      this.spawnEnemy();
    }

    // Chance to spawn power-up at wave start
    if (this.wave > 1 && Math.random() < 0.4) {
      this.spawnPowerUp();
    }
  }

  private spawnEnemy(): void {
    const side = randomInt(0, 3); // 0: top, 1: right, 2: bottom, 3: left
    let x: number, y: number;

    switch (side) {
      case 0: // top
        x = randomFloat(0, this.canvas.width);
        y = -50;
        break;
      case 1: // right
        x = this.canvas.width + 50;
        y = randomFloat(0, this.canvas.height);
        break;
      case 2: // bottom
        x = randomFloat(0, this.canvas.width);
        y = this.canvas.height + 50;
        break;
      default: // left
        x = -50;
        y = randomFloat(0, this.canvas.height);
        break;
    }

    // Choose enemy type based on wave
    let type: EnemyType;
    if (this.wave < 3) {
      type = randomChoice([EnemyType.WANDERER, EnemyType.CHASER]);
    } else if (this.wave < 6) {
      type = randomChoice([EnemyType.WANDERER, EnemyType.CHASER, EnemyType.SHOOTER]);
    } else {
      type = randomChoice([EnemyType.WANDERER, EnemyType.CHASER, EnemyType.SHOOTER, EnemyType.SPLITTER]);
    }

    this.enemies.push(new Enemy(x, y, type));
  }

  private spawnPowerUp(x?: number, y?: number): void {
    // Use provided position or random position in canvas
    const posX = x !== undefined ? x : randomFloat(100, this.canvas.width - 100);
    const posY = y !== undefined ? y : randomFloat(100, this.canvas.height - 100);
    
    // Choose random power-up type
    const types = [PowerUpType.RAPID_FIRE, PowerUpType.MULTI_SHOT, PowerUpType.SHIELD, PowerUpType.BOMB];
    const type = randomChoice(types);
    
    this.powerUps.push(new PowerUp(posX, posY, type));
  }

  update(deltaTime: number): void {
    // Check for pause button toggle
    if (this.inputManager.isPausePressed()) {
      if (this.gameState === GameState.PAUSED) {
        this.resumeGame();
      } else {
        this.pauseGame();
      }
    }
    
    if (this.gameState !== GameState.PLAYING) return;

    const input = this.inputManager.getInputState();

    // Update invulnerability timer
    if (this.invulnerabilityTimer > 0) {
      this.invulnerabilityTimer -= deltaTime;
    }

    // Update player
    if (input.isMoving) {
      this.player.move(input.movement);
      
      // Apply grid warp from player movement (Geometry Wars 3 style)
      const speed = this.player.velocity.magnitude();
      if (speed > 0.5) { // Lowered from 2 to 0.5 for more responsive grid effects
        const warpStrength = Math.min(1.5, speed / 2); // Adjusted scaling
        this.gridWarpSystem.addEntityInfluence(this.player, warpStrength);
        console.log(`Player speed: ${speed.toFixed(2)}, warp strength: ${warpStrength.toFixed(2)}`);
      }
    }
    this.player.update(deltaTime);
    this.player.keepInBounds(this.canvas.width, this.canvas.height);

    // Player shooting
    if (input.isShooting && this.player.canShoot()) {
      this.player.shoot();
      this.audioManager.playShoot();
      
      if (this.player.powerUps.multiShot) {
        // Multi-shot creates 3 projectiles in a spread
        const baseDirection = input.shooting;
        const spreadAngle = Math.PI / 8; // 22.5 degrees spread
        
        for (let i = -1; i <= 1; i++) {
          const angle = baseDirection.angle() + (i * spreadAngle);
          const direction = Vector2.fromAngle(angle);
          const projectile = new Projectile(
            this.player.position.x,
            this.player.position.y,
            direction
          );
          this.playerProjectiles.push(projectile);
          
          // Add small grid warp from projectile
          this.gridWarpSystem.addEntityInfluence(projectile, 0.3);
        }
      } else {
        // Single shot
        const projectile = new Projectile(
          this.player.position.x,
          this.player.position.y,
          input.shooting
        );
        this.playerProjectiles.push(projectile);
        
        // Add small grid warp from projectile
        this.gridWarpSystem.addEntityInfluence(projectile, 0.4);
      }
      
      // Add small grid warp from gun recoil
      this.gridWarpSystem.addEntityInfluence(this.player, 0.5);
    }

    // Update enemies
    this.enemies.forEach(enemy => {
      enemy.update(deltaTime, this.player.position, this.canvas.width, this.canvas.height);
      
      // Apply grid warp effect from fast-moving enemies
      const speed = enemy.velocity.magnitude();
      if (speed > 1.0) { // Lowered from 2.5 to 1.0 for more visible effects
        const warpStrength = Math.min(1.2, speed / 3); // Adjusted scaling
        this.gridWarpSystem.addEntityInfluence(enemy, warpStrength);
        console.log(`Enemy speed: ${speed.toFixed(2)}, warp strength: ${warpStrength.toFixed(2)}`);
      }

      // Enemy shooting
      if (enemy.canShoot()) {
        const shootDirection = enemy.shoot();
        const projectile = new Projectile(
          enemy.position.x,
          enemy.position.y,
          shootDirection
        );
        projectile.color = Color.red();
        this.enemyProjectiles.push(projectile);
      }

      // Check for splitting
      if (enemy.shouldSplit()) {
        const splitEnemies = enemy.split();
        this.enemies.push(...splitEnemies);
      }
    });

    // Update power-ups
    this.powerUps.forEach(powerUp => {
      powerUp.update(deltaTime);
    });

    // Update projectiles
    this.playerProjectiles.forEach(projectile => {
      projectile.update(deltaTime);
      projectile.wrapPosition(this.canvas.width, this.canvas.height);
    });

    this.enemyProjectiles.forEach(projectile => {
      projectile.update(deltaTime);
      projectile.wrapPosition(this.canvas.width, this.canvas.height);
    });

    // Update particle system
    this.particleSystem.update(deltaTime);
    
    // Update visual systems
    this.gridWarpSystem.update(deltaTime);
    this.screenShakeSystem.update(deltaTime);

    // Collision detection
    this.handleCollisions();

    // Performance reporting (every 180 frames, ~3 seconds, and only when there are many entities)
    this.frameCount++;
    if (this.frameCount >= 180) {
      const currentTime = performance.now();
      const entityCount = this.enemies.length + this.playerProjectiles.length + this.enemyProjectiles.length + this.powerUps.length;
      
      // Only log performance when there are significant entities or in debug mode
      if (entityCount > 15 || this.collisionSystem['debugMode']) {
        if (this.lastPerformanceReport > 0 && this.collisionCount > 0) {
          const avgCollisionTime = this.collisionTime / this.collisionCount;
          const frameRate = 180000 / (currentTime - this.lastPerformanceReport);
          
          console.log(`🎯 Performance [Wave ${this.wave}]:`, {
            'Entities': entityCount,
            'Avg Collision': `${avgCollisionTime.toFixed(3)}ms`,
            'FPS': `${frameRate.toFixed(1)}`,
            'Spatial Grid': `${this.collisionSystem['spatialGrid'].debugInfo.cols}x${this.collisionSystem['spatialGrid'].debugInfo.rows}`
          });
        }
      }
      
      this.lastPerformanceReport = currentTime;
      this.collisionTime = 0;
      this.collisionCount = 0;
      this.frameCount = 0;
    }

    // Remove inactive entities
    this.playerProjectiles = this.playerProjectiles.filter(p => p.active);
    this.enemyProjectiles = this.enemyProjectiles.filter(p => p.active);
    this.enemies = this.enemies.filter(e => e.active);
    this.powerUps = this.powerUps.filter(p => p.active);

    // Spawn new enemies - faster spawning for shorter waves
    this.enemySpawnTimer += deltaTime;
    if (this.enemySpawnTimer > 2.0 && this.enemies.length < 10) { // Reduced from 3.0 to 2.0, and from 15 to 10
      this.spawnEnemy();
      this.enemySpawnTimer = 0;
    }

    // Check wave completion
    if (this.enemies.length === 0) {
      this.wave++;
      this.audioManager.playWaveComplete();
      this.waveTimer = 0;
      this.spawnWave();
    }

    // Update UI
    this.updateUI();
  }

  private handleCollisions(): void {
    // Performance tracking
    const startTime = performance.now();
    
    // Enhanced collision detection using spatial partitioning
    
    // Player projectiles vs enemies - O(n) instead of O(n²)
    this.collisionSystem.detectCollisions(
      this.playerProjectiles.filter(p => p.active),
      this.enemies.filter(e => e.active),
      (result) => {
        const projectile = result.entityA as Projectile;
        const enemy = result.entityB as Enemy;
        
        projectile.destroy();
        
        if (enemy.takeDamage(1)) {
          this.score += this.getEnemyScore(enemy.type);
          this.audioManager.playEnemyHit();
          this.particleSystem.createEnemyDeathExplosion(enemy.position, enemy.color);
          
          // Add grid warp effect on enemy death (Geometry Wars 3 style)
          this.gridWarpSystem.addExplosionWarp(enemy.position, 1.0 + (enemy.radius / 20));
          this.screenShakeSystem.addEnemyHitShake();
          
          // Chance to spawn power-up on enemy death
          if (Math.random() < 0.15) { // 15% chance
            this.spawnPowerUp(enemy.position.x, enemy.position.y);
          }
          
          enemy.destroy();
        } else {
          // Enemy hit but not destroyed
          this.gridWarpSystem.addEntityInfluence(enemy, 0.6);
        }
      }
    );

    // Enemy projectiles vs player (only if not invulnerable)
    if (this.invulnerabilityTimer <= 0) {
      this.collisionSystem.detectCollisionsWithTarget(
        this.enemyProjectiles.filter(p => p.active),
        this.player,
        (result) => {
          const projectile = result.entityA as Projectile;
          projectile.destroy();
          this.playerHit();
        }
      );

      // Enemies vs player
      this.collisionSystem.detectCollisionsWithTarget(
        this.enemies.filter(e => e.active),
        this.player,
        (result) => {
          this.playerHit();
        }
      );
    }

    // Player vs power-ups
    this.collisionSystem.detectCollisionsWithTarget(
      this.powerUps.filter(p => p.active),
      this.player,
      (result) => {
        const powerUp = result.entityA as PowerUp;
        this.collectPowerUp(powerUp);
        powerUp.destroy();
      }
    );

    // Performance tracking
    const endTime = performance.now();
    this.collisionTime += (endTime - startTime);
    this.collisionCount++;
  }

  private getEnemyScore(type: EnemyType): number {
    switch (type) {
      case EnemyType.WANDERER: return 10;
      case EnemyType.CHASER: return 20;
      case EnemyType.SHOOTER: return 50;
      case EnemyType.SPLITTER: return 100;
      default: return 10;
    }
  }

  private playerHit(): void {
    // Check if shield absorbs the damage
    if (!this.player.takeDamage()) {
      // Shield absorbed the hit - just play a different sound effect
      this.audioManager.playEnemyHit(); // Reuse enemy hit sound for shield
      this.particleSystem.createExplosion(this.player.position, Color.cyan(), 8);
      
      // Add mild grid warp when shield absorbs damage
      this.gridWarpSystem.addEntityInfluence(this.player, 1.2);
      this.screenShakeSystem.addShake(3, 0.2);
      return;
    }
    
    this.lives--;
    this.invulnerabilityTimer = 2.0; // 2 seconds of invulnerability
    
    // Add dramatic grid warp and screen shake when player is hit
    this.gridWarpSystem.addExplosionWarp(this.player.position, 2.0);
    this.screenShakeSystem.addPlayerHitShake();
    
    if (this.lives <= 0) {
      this.gameOver();
    } else {
      this.audioManager.playExplosion();
      this.particleSystem.createExplosion(this.player.position, Color.cyan(), 15);
    }
  }

  private gameOver(): void {
    this.gameState = GameState.GAME_OVER;
    this.audioManager.playPlayerDeath();
    this.particleSystem.createPlayerDeathExplosion(this.player.position);
    this.finalScoreElement.textContent = `Final Score: ${this.score}`;
    this.gameOverElement.classList.remove('hidden');
  }
  
  private pauseGame(): void {
    if (this.gameState === GameState.PLAYING) {
      this.gameState = GameState.PAUSED;
      // Add a small vibration feedback on mobile if available
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate(50);
        } catch (e) {
          // Ignore vibration errors
        }
      }
      
      // Optionally play pause sound
      // this.audioManager.playPause();
    }
  }
  
  private resumeGame(): void {
    if (this.gameState === GameState.PAUSED) {
      this.gameState = GameState.PLAYING;
      
      // Add a small vibration feedback on mobile if available
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([20, 30, 20]);
        } catch (e) {
          // Ignore vibration errors
        }
      }
      
      // Optionally play resume sound
      // this.audioManager.playResume();
    }
  }

  private restartGame(): void {
    this.gameOverElement.classList.add('hidden');
    this.initializeGame();
  }

  private updateUI(): void {
    this.scoreElement.textContent = `Score: ${this.score}`;
    this.livesElement.textContent = `Lives: ${this.lives}`;
  }

  render(): void {
    // Clear canvas with fade effect
    this.ctx.fillStyle = 'rgba(17, 17, 17, 0.1)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply screen shake offset
    this.ctx.save();
    const shakeOffset = this.screenShakeSystem.getCurrentOffset();
    this.ctx.translate(shakeOffset.x, shakeOffset.y);

    // Render grid with warping effects
    this.renderGrid();

    // Render entities
    this.playerProjectiles.forEach(projectile => projectile.render(this.ctx));
    this.enemyProjectiles.forEach(projectile => projectile.render(this.ctx));
    this.enemies.forEach(enemy => enemy.render(this.ctx));
    this.powerUps.forEach(powerUp => powerUp.render(this.ctx));
    
    // Render player with invulnerability flashing
    if (this.invulnerabilityTimer <= 0 || Math.floor(this.invulnerabilityTimer * 10) % 2 === 0) {
      this.player.render(this.ctx);
    }

    // Render particles
    this.particleSystem.render(this.ctx);

    // Render collision system debug (if enabled)
    this.collisionSystem.renderDebug(this.ctx);
    
    // Render grid warp debug (if enabled)
    this.gridWarpSystem.renderDebug(this.ctx);

    // Render wave indicator
    this.renderWaveIndicator();
    
    // Render pause overlay when game is paused
    if (this.gameState === GameState.PAUSED) {
      this.renderPauseOverlay();
    }

    // Render mobile controls - force render on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIOS) {
      this.inputManager.getMobileControls().forceRender();
    } else {
      this.inputManager.getMobileControls().render();
    }

    // Restore canvas transform after screen shake
    this.ctx.restore();
  }

  private renderGrid(): void {
    // Render grid with warping effects
    this.gridWarpSystem.render(this.ctx);
  }

  private renderWaveIndicator(): void {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.font = '24px Courier New';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`Wave ${this.wave}`, this.canvas.width / 2, 50);
    
    // Only show minimal debug info when collision debug is enabled
    if (this.collisionSystem['debugMode']) {
      this.ctx.font = '14px Courier New';
      this.ctx.textAlign = 'left';
      this.ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
      this.ctx.fillText(`Debug Mode (Press C to toggle)`, 10, 30);
    }
  }
  
  private renderPauseOverlay(): void {
    // Semi-transparent overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Pause title
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.font = 'bold 36px Courier New';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2 - 40);
    
    // Instructions
    this.ctx.font = '20px Courier New';
    this.ctx.fillText('Tap the pause button to resume', this.canvas.width / 2, this.canvas.height / 2 + 20);
    
    // Display current score and wave
    this.ctx.font = '16px Courier New';
    this.ctx.fillText(`Score: ${this.score} | Wave: ${this.wave}`, this.canvas.width / 2, this.canvas.height / 2 + 60);
  }

  private collectPowerUp(powerUp: PowerUp): void {
    // Visual and audio feedback
    this.audioManager.playPowerUp();
    this.particleSystem.createPickupEffect(powerUp.position);
    
    // Add special gravity well effect for power-up collection (GW3-style)
    this.gridWarpSystem.addGravityWell(powerUp.position, 1.2);
    this.screenShakeSystem.addPowerUpShake();
    
    switch (powerUp.type) {
      case PowerUpType.RAPID_FIRE:
        this.player.activatePowerUp('RAPID_FIRE');
        break;
      case PowerUpType.MULTI_SHOT:
        this.player.activatePowerUp('MULTI_SHOT');
        break;
      case PowerUpType.SHIELD:
        this.player.activatePowerUp('SHIELD');
        break;
      case PowerUpType.BOMB:
        this.activateBomb();
        break;
    }
  }

  private activateBomb(): void {
    // Destroy all enemies and projectiles on screen
    this.enemies.forEach(enemy => {
      this.score += this.getEnemyScore(enemy.type);
      this.particleSystem.createEnemyDeathExplosion(enemy.position, enemy.color);
      enemy.destroy();
    });
    
    this.enemyProjectiles.forEach(projectile => {
      projectile.destroy();
    });
    
    // Create massive explosion effect
    this.particleSystem.createExplosion(this.player.position, Color.red(), 50);
    this.audioManager.playExplosion();
    
    // Create massive grid warp distortion (Geometry Wars 3 style)
    // First a strong push wave
    this.gridWarpSystem.addExplosionWarp(this.player.position, 3.0);
    
    // Then create ripple effects at different distances
    setTimeout(() => {
      // Secondary effects with delay
      const center = this.player.position;
      const radius = 100;
      
      // Create a ring of gravity wells around the player
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const pos = center.add(new Vector2(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius
        ));
        
        this.gridWarpSystem.addGravityWell(pos, 0.8);
      }
      
      // Add more intense screen shake
      this.screenShakeSystem.addExplosionShake(0, 150);
    }, 150);
  }

  /**
   * Test all visual effects in the game at once
   * This is a debug method called from console for testing
   */
  testVisualEffects(): void {
    console.log('🎆 Testing All Visual Effects...');
    
    // Use canvas center for effects
    const center = new Vector2(
      this.canvas.width / (window.devicePixelRatio || 1) / 2, 
      this.canvas.height / (window.devicePixelRatio || 1) / 2
    );
    
    // Test particle effects
    this.particleSystem.createExplosion(center, Color.red(), 30);
    this.particleSystem.createMuzzleFlash(center.add(new Vector2(50, 0)), new Vector2(-1, 0));
    this.particleSystem.createEngineTrail(center.add(new Vector2(-50, 0)), new Vector2(1, 0));
    
    // Test screen shake
    this.screenShakeSystem.addExplosionShake(0, 80);
    
    // Test grid warping
    this.gridWarpSystem.addExplosionWarp(center, 2.0);
    this.gridWarpSystem.addGravityWell(center.add(new Vector2(100, 100)), 1.5);
    
    console.log('✨ Visual effects test complete! Watch the screen for effects.');
  }

  /**
   * Toggle collision system debug visualization
   */
  toggleCollisionDebug(): void {
    const currentDebugMode = this.collisionSystem['debugMode'];
    this.collisionSystem['debugMode'] = !currentDebugMode;
    console.log(`🔍 Collision debug ${this.collisionSystem['debugMode'] ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Toggle grid warp system debug visualization
   */
  toggleGridWarpDebug(): void {
    const newDebugMode = !this.gridWarpSystem.isDebugMode();
    this.gridWarpSystem.setDebugMode(newDebugMode);
    console.log(`🌐 Grid warp debug ${newDebugMode ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Set the healing speed of grid distortions
   * Controls how quickly the grid returns to normal after distortions
   */
  setGridHealingSpeed(speed: 'slow' | 'medium' | 'fast' | 'instant'): void {
    this.gridWarpSystem.setHealingSpeed(speed);
    console.log(`🌐 Grid healing speed set to: ${speed}`);
  }
  
  /**
   * Get current grid healing speed preset
   */
  getGridHealingSpeedPreset(): string {
    return this.gridWarpSystem.getHealingSpeedPreset();
  }
  
  /**
   * Toggle screen shake system debug logging
   */
  toggleScreenShakeDebug(): void {
    const newDebugMode = !this.screenShakeSystem.isDebugMode();
    this.screenShakeSystem.setDebugMode(newDebugMode);
    console.log(`📳 Screen shake debug ${newDebugMode ? 'enabled' : 'disabled'}`);
  }

  // Debug method to enable mobile controls debug mode
  enableMobileDebug(): void {
    this.inputManager.getMobileControls()['debugMode'] = true;
    this.inputManager['debugMode'] = true;
    console.log('📱 Mobile Debug: ENABLED');
    console.log('  Touch events will be logged to console');
    console.log('  Call game.disableMobileDebug() to disable');
  }

  // Debug method to disable mobile controls debug mode
  disableMobileDebug(): void {
    this.inputManager.getMobileControls()['debugMode'] = false;
    this.inputManager['debugMode'] = false;
    console.log('📱 Mobile Debug: DISABLED');
  }

  // Debug method to stress test collision system
  stressTestCollisions(entityCount: number = 30): void {
    console.log(`🎯 Stress Testing Collision System with ${entityCount} entities...`);
    
    // Spawn extra enemies for testing
    for (let i = 0; i < entityCount; i++) {
      const x = Math.random() * this.canvas.width;
      const y = Math.random() * this.canvas.height;
      const types = [EnemyType.WANDERER, EnemyType.CHASER, EnemyType.SHOOTER];
      const type = types[Math.floor(Math.random() * types.length)];
      this.enemies.push(new Enemy(x, y, type));
    }
    
    // Enable collision debug automatically
    this.collisionSystem.setDebugMode(true);
    console.log('✅ Stress test entities spawned. Collision debug enabled.');
    console.log('Watch for performance metrics in console every ~3 seconds.');
  }

  start(): void {
    const gameLoop = (currentTime: number) => {
      const deltaTime = Math.min((currentTime - (gameLoop as any).lastTime || 0) / 1000, 0.05);
      (gameLoop as any).lastTime = currentTime;

      this.update(deltaTime);
      this.render();

      requestAnimationFrame(gameLoop);
    };

    requestAnimationFrame(gameLoop);
  }
}

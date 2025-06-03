import { Player } from '../entities/Player'
import { Enemy, EnemyType } from '../entities/Enemy'
import { Projectile } from '../entities/Projectile'
import { PowerUp, PowerUpType } from '../entities/PowerUp'
import { InputManager } from '../input/InputManager'
import { ParticleSystem } from '../graphics/ParticleSystem'
import { AudioManager } from '../audio/AudioManager'
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
  private audioManager: AudioManager;
  
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
    this.audioManager = new AudioManager();
    
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
    
    // Update player position if out of bounds
    if (this.player) {
      const pos = this.player.position;
      const newX = Math.max(20, Math.min(this.canvas.width - 20, pos.x));
      const newY = Math.max(20, Math.min(this.canvas.height - 20, pos.y));
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
        }
      } else {
        // Single shot
        const projectile = new Projectile(
          this.player.position.x,
          this.player.position.y,
          input.shooting
        );
        this.playerProjectiles.push(projectile);
      }
    }

    // Update enemies
    this.enemies.forEach(enemy => {
      enemy.update(deltaTime, this.player.position, this.canvas.width, this.canvas.height);

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

    // Collision detection
    this.handleCollisions();

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
    // Player projectiles vs enemies
    for (let i = this.playerProjectiles.length - 1; i >= 0; i--) {
      const projectile = this.playerProjectiles[i];
      
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        
        if (projectile.isColliding(enemy)) {
          projectile.destroy();
          
          if (enemy.takeDamage(1)) {
            this.score += this.getEnemyScore(enemy.type);
            this.audioManager.playEnemyHit();
            this.particleSystem.createEnemyDeathExplosion(enemy.position, enemy.color);
            
            // Chance to spawn power-up on enemy death
            if (Math.random() < 0.15) { // 15% chance
              this.spawnPowerUp(enemy.position.x, enemy.position.y);
            }
            
            enemy.destroy();
          }
          break;
        }
      }
    }

    // Enemy projectiles vs player
    if (this.invulnerabilityTimer <= 0) {
      for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
        const projectile = this.enemyProjectiles[i];
        
        if (projectile.isColliding(this.player)) {
          projectile.destroy();
          this.playerHit();
          break;
        }
      }

      // Enemies vs player
      for (const enemy of this.enemies) {
        if (enemy.isColliding(this.player)) {
          this.playerHit();
          break;
        }
      }
    }

    // Player vs power-ups
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const powerUp = this.powerUps[i];
      
      if (powerUp.isColliding(this.player)) {
        this.collectPowerUp(powerUp);
        powerUp.destroy();
      }
    }
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
      return;
    }
    
    this.lives--;
    this.invulnerabilityTimer = 2.0; // 2 seconds of invulnerability
    
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

    // Render grid
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
  }

  private renderGrid(): void {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 1;

    const gridSize = 50;
    
    for (let x = 0; x <= this.canvas.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }

    for (let y = 0; y <= this.canvas.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
  }

  private renderWaveIndicator(): void {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.font = '24px Courier New';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`Wave ${this.wave}`, this.canvas.width / 2, 50);
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
    this.particleSystem.createPickupEffect(powerUp.position);
    
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

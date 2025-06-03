import { Vector2 } from '../utils/Vector2'
import { Color } from '../utils/Color'

export interface TouchControl {
  id: string;
  position: Vector2;
  radius: number;
  isPressed: boolean;
  touchId?: number;
  pressEffect?: number; // For visual feedback on press (0-1)
}

export class MobileControls {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private moveStick: TouchControl;
  private shootButton: TouchControl;
  private fullscreenButton: TouchControl;
  private pauseButton: TouchControl;
  private isMobile: boolean;
  private moveStickOrigin: Vector2;
  private moveDirection: Vector2 = Vector2.zero();
  private lastFrameTime: number = 0;
  private isIOSSafari: boolean;
  private debugMode: boolean = true; // Set to true for debug logging
  private isPaused: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    
    // Device detection
    const userAgent = navigator.userAgent;
    this.isIOSSafari = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    this.isMobile = this.detectMobile();
    
    // Explicitly enable controls on iOS
    if (this.isIOSSafari) {
      if (this.debugMode) console.log('iOS device detected, forcing mobile controls');
      this.isMobile = true;
    }
    
    // Initialize controls with visual feedback effect
    this.moveStick = {
      id: 'move',
      position: new Vector2(80, canvas.height - 80),
      radius: 50,
      isPressed: false,
      pressEffect: 0
    };
    this.moveStickOrigin = this.moveStick.position.clone();
    
    this.shootButton = {
      id: 'shoot',
      position: new Vector2(canvas.width - 80, canvas.height - 80),
      radius: 40,
      isPressed: false,
      pressEffect: 0
    };
    
    this.fullscreenButton = {
      id: 'fullscreen',
      position: new Vector2(canvas.width - 40, 40),
      radius: 20,
      isPressed: false,
      pressEffect: 0
    };
    
    this.pauseButton = {
      id: 'pause',
      position: new Vector2(40, 40),
      radius: 20,
      isPressed: false,
      pressEffect: 0
    };
    
    // Set initial layout
    this.updateLayout();
    
    this.setupEventListeners();
    
    // Set up animation loop for smooth button effects
    requestAnimationFrame(this.updateEffects.bind(this));
  }
  
  // Smooth button effects update
  private updateEffects(timestamp: number): void {
    // Calculate delta time
    if (this.lastFrameTime === 0) this.lastFrameTime = timestamp;
    const deltaTime = (timestamp - this.lastFrameTime) / 1000;
    this.lastFrameTime = timestamp;
    
    // Update button effects
    const effectSpeed = 5.0; // Speed of effect transition
    
    const updateEffect = (control: TouchControl) => {
      if (control.pressEffect === undefined) control.pressEffect = 0;
      
      if (control.isPressed && control.pressEffect < 1) {
        control.pressEffect = Math.min(1, control.pressEffect + deltaTime * effectSpeed);
      } else if (!control.isPressed && control.pressEffect > 0) {
        control.pressEffect = Math.max(0, control.pressEffect - deltaTime * effectSpeed);
      }
    };
    
    updateEffect(this.moveStick);
    updateEffect(this.shootButton);
    updateEffect(this.fullscreenButton);
    updateEffect(this.pauseButton);
    
    // Continue the animation loop
    requestAnimationFrame(this.updateEffects.bind(this));
  }

  private detectMobile(): boolean {
    // Enhanced mobile detection for iOS Safari
    const userAgent = navigator.userAgent;
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const hasTouch = 'ontouchstart' in window || window.navigator.maxTouchPoints > 0;
    const isIOSSafari = this.isIOSSafari;
    const isFirefox = userAgent.includes('Firefox');
    const isIOSFirefox = isIOSSafari && isFirefox;
    
    // Also check for screen size as additional hint
    const isSmallScreen = window.innerWidth <= 1024 || window.innerHeight <= 768;
    const isMobile = isMobileUA || hasTouch || isIOSSafari || isIOSFirefox || isSmallScreen;
    
    // FOR DEBUGGING: Force mobile controls to show
    const forceShow = true; // Set to false once debugging is complete
    
    if (this.debugMode) {
      console.log('Mobile detection:', {
        userAgent,
        isMobileUA,
        hasTouch,
        isIOSSafari,
        isFirefox,
        isIOSFirefox,
        isSmallScreen,
        final: isMobile,
        forced: forceShow
      });
    }
    
    return isMobile || forceShow;
  }

  private setupEventListeners(): void {
    if (this.debugMode) console.log('Setting up mobile controls, isMobile:', this.isMobile);
    
    if (!this.isMobile) return;

    // iOS Safari needs special handling for touch events
    const options = { passive: false };
    
    // Touch events
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), options);
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), options);
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), options);
    this.canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this), options);
    
    // FOR DEBUGGING: Add mouse events to test controls on desktop
    this.canvas.addEventListener('mousedown', (e) => {
      const fakeTouch = {
        identifier: 0,
        clientX: e.clientX,
        clientY: e.clientY
      };
      const fakeEvent = {
        preventDefault: () => e.preventDefault(),
        changedTouches: [fakeTouch],
        touches: { length: 1 }
      };
      this.handleTouchStart(fakeEvent as any);
    });
    
    this.canvas.addEventListener('mousemove', (e) => {
      if (e.buttons === 1) { // Left mouse button held
        const fakeTouch = {
          identifier: 0,
          clientX: e.clientX,
          clientY: e.clientY
        };
        const fakeEvent = {
          preventDefault: () => e.preventDefault(),
          changedTouches: [fakeTouch],
          touches: { length: 1 }
        };
        this.handleTouchMove(fakeEvent as any);
      }
    });
    
    this.canvas.addEventListener('mouseup', (e) => {
      const fakeTouch = {
        identifier: 0,
        clientX: e.clientX,
        clientY: e.clientY
      };
      const fakeEvent = {
        preventDefault: () => e.preventDefault(),
        changedTouches: [fakeTouch],
        touches: { length: 0 }
      };
      this.handleTouchEnd(fakeEvent as any);
    });
    
    // Special handling for iOS Safari
    if (this.isIOSSafari) {
      // Add more aggressive handling for iOS Safari
      window.addEventListener('orientationchange', () => {
        // Delay layout update to ensure proper dimensions
        setTimeout(() => this.updateLayout(), 300);
      });
      
      // Force a relayout on scroll
      window.addEventListener('scroll', () => {
        if (window.scrollY > 0) {
          window.scrollTo(0, 0);
          this.updateLayout();
        }
      });
      
      // Attempt to lock orientation to portrait
      if ('orientation' in screen && 'lock' in (screen as any).orientation) {
        try {
          // Try to lock to portrait mode
          (screen as any).orientation.lock('portrait').catch((e: Error) => {
            if (this.debugMode) console.log('Failed to lock orientation:', e);
          });
        } catch (e) {
          if (this.debugMode) console.log('Orientation locking not supported');
        }
      }
    }
    
    // Prevent scrolling and zooming - critical for iOS Safari
    document.addEventListener('touchmove', (e) => {
      e.preventDefault();
      e.stopPropagation();
    }, options);
    
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault(); // Prevent pinch zoom
      }
    }, options);
    
    // Prevent iOS Safari bounce
    document.addEventListener('touchforcechange', (e) => e.preventDefault(), options);
    
    // Prevent context menu and selection
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.canvas.addEventListener('selectstart', (e) => e.preventDefault());
    
    // iOS Safari fullscreen handling
    if (this.isIOSSafari && (document.documentElement as any).webkitRequestFullscreen) {
      if (this.debugMode) console.log('iOS Safari fullscreen support detected');
    }
  }

  private handleTouchStart(event: TouchEvent): void {
    event.preventDefault();
    
    if (this.debugMode) {
      console.log('Touch start event:', {
        touches: event.touches.length,
        changedTouches: event.changedTouches.length
      });
    }
    
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const rect = this.canvas.getBoundingClientRect();
      const touchPos = new Vector2(
        touch.clientX - rect.left,
        touch.clientY - rect.top
      );
      
      if (this.debugMode) {
        console.log('Touch position (raw):', touchPos, 'Canvas rect:', rect);
      }
      
      // Scale for device pixel ratio - SIMPLIFIED for debugging
      const devicePixelRatio = window.devicePixelRatio || 1;
      
      // Use simple 1:1 scaling for debugging
      const canvasToClientRatio = this.canvas.width / this.canvas.clientWidth;
      touchPos.x *= canvasToClientRatio;
      touchPos.y *= canvasToClientRatio;
      
      if (this.debugMode) {
        console.log('Touch position (scaled):', touchPos, 'Ratios:', {
          DPR: devicePixelRatio,
          canvasToClient: canvasToClientRatio,
          canvas: { width: this.canvas.width, height: this.canvas.height },
          client: { width: this.canvas.clientWidth, height: this.canvas.clientHeight },
          moveStickOrigin: this.moveStickOrigin,
          shootButtonPos: this.shootButton.position
        });
      }
      
      // Check movement stick
      if (touchPos.distance(this.moveStickOrigin) <= this.moveStick.radius * 1.5) {
        this.moveStick.isPressed = true;
        this.moveStick.touchId = touch.identifier;
        this.moveStick.position = touchPos.clone();
        
        if (this.debugMode) {
          console.log('Move stick pressed at:', touchPos);
        }
      }
      
      // Check shoot button
      if (touchPos.distance(this.shootButton.position) <= this.shootButton.radius) {
        this.shootButton.isPressed = true;
        this.shootButton.touchId = touch.identifier;
        
        if (this.debugMode) {
          console.log('Shoot button pressed');
        }
      }
      
      // Check fullscreen button
      if (touchPos.distance(this.fullscreenButton.position) <= this.fullscreenButton.radius) {
        this.fullscreenButton.isPressed = true;
        this.fullscreenButton.touchId = touch.identifier;
        this.toggleFullscreen();
        
        if (this.debugMode) {
          console.log('Fullscreen button pressed');
        }
      }
      
      // Check pause button
      if (touchPos.distance(this.pauseButton.position) <= this.pauseButton.radius) {
        this.pauseButton.isPressed = true;
        this.pauseButton.touchId = touch.identifier;
        this.togglePause();
        
        if (this.debugMode) {
          console.log('Pause button pressed');
        }
      }
    }
  }

  private handleTouchMove(event: TouchEvent): void {
    event.preventDefault();
    
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      
      if (this.moveStick.touchId === touch.identifier && this.moveStick.isPressed) {
        const rect = this.canvas.getBoundingClientRect();
        const touchPos = new Vector2(
          touch.clientX - rect.left,
          touch.clientY - rect.top
        );
        
        // Scale for device pixel ratio - SIMPLIFIED for debugging
        const devicePixelRatio = window.devicePixelRatio || 1;
        
        // Use simple 1:1 scaling for debugging  
        const canvasToClientRatio = this.canvas.width / this.canvas.clientWidth;
        touchPos.x *= canvasToClientRatio;
        touchPos.y *= canvasToClientRatio;
        
        // Constrain to stick radius
        const direction = touchPos.subtract(this.moveStickOrigin);
        const distance = Math.min(direction.magnitude(), this.moveStick.radius);
        
        this.moveStick.position = this.moveStickOrigin.add(
          direction.normalize().multiply(distance)
        );
        
        // Update movement direction
        this.moveDirection = direction.normalize().multiply(distance / this.moveStick.radius);
      }
    }
  }

  private handleTouchEnd(event: TouchEvent): void {
    event.preventDefault();
    
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      
      if (this.moveStick.touchId === touch.identifier) {
        this.moveStick.isPressed = false;
        this.moveStick.touchId = undefined;
        this.moveStick.position = this.moveStickOrigin.clone();
        this.moveDirection = Vector2.zero();
      }
      
      if (this.shootButton.touchId === touch.identifier) {
        this.shootButton.isPressed = false;
        this.shootButton.touchId = undefined;
      }
      
      if (this.fullscreenButton.touchId === touch.identifier) {
        this.fullscreenButton.isPressed = false;
        this.fullscreenButton.touchId = undefined;
      }
      
      if (this.pauseButton.touchId === touch.identifier) {
        this.pauseButton.isPressed = false;
        this.pauseButton.touchId = undefined;
      }
    }
  }

  getMoveDirection(): Vector2 {
    if (this.debugMode && this.moveDirection.magnitude() > 0.1) {
      console.log('getMoveDirection called, returning:', this.moveDirection);
    }
    return this.moveDirection.clone();
  }

  isShootPressed(): boolean {
    return this.shootButton.isPressed;
  }
  
  isPausePressed(): boolean {
    const wasPaused = this.isPaused;
    this.isPaused = false;
    return wasPaused;
  }
  
  private togglePause(): void {
    this.isPaused = !this.isPaused;
    // Dispatch a custom event that Game.ts can listen for
    const pauseEvent = new CustomEvent('gamePauseToggle', { 
      detail: { paused: this.isPaused } 
    });
    document.dispatchEvent(pauseEvent);
  }

  private toggleFullscreen(): void {
    try {
      const elem = document.documentElement;
      
      // Check if already in fullscreen
      const isFullscreen = document.fullscreenElement || 
                          (document as any).webkitFullscreenElement || 
                          (document as any).mozFullScreenElement ||
                          (document as any).msFullscreenElement;
      
      if (!isFullscreen) {
        // Request fullscreen with iOS Safari support
        if (elem.requestFullscreen) {
          elem.requestFullscreen();
        } else if ((elem as any).webkitRequestFullscreen) {
          // iOS Safari
          (elem as any).webkitRequestFullscreen();
        } else if ((elem as any).mozRequestFullScreen) {
          (elem as any).mozRequestFullScreen();
        } else if ((elem as any).msRequestFullscreen) {
          (elem as any).msRequestFullscreen();
        } else {
          if (this.debugMode) console.log('Fullscreen not supported');
          // For iOS Safari without fullscreen API, try hiding address bar
          window.scrollTo(0, 1);
          setTimeout(() => window.scrollTo(0, 0), 100);
        }
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          (document as any).msExitFullscreen();
        }
      }
      
      // Force layout update after fullscreen change
      setTimeout(() => this.updateLayout(), 300);
    } catch (err) {
      if (this.debugMode) console.log(`Fullscreen error: ${err}`);
      // Fallback: try to hide address bar on iOS
      window.scrollTo(0, 1);
      setTimeout(() => window.scrollTo(0, 0), 100);
    }
  }

  updateLayout(): void {
    // Check if we're in portrait or landscape mode
    const isPortrait = window.innerHeight > window.innerWidth;
    
    // Get device pixel ratio to ensure correct positioning
    const devicePixelRatio = window.devicePixelRatio || 1;
    const width = this.canvas.width / devicePixelRatio;
    const height = this.canvas.height / devicePixelRatio;
    
    if (isPortrait) {
      // Portrait layout - improved ergonomics
      // Put controls at bottom of screen with good spacing
      const controlsY = height - 100;
      
      // Move stick on left side, moved up a bit for better thumb reach
      this.moveStickOrigin = new Vector2(80, controlsY);
      this.moveStick.position = this.moveStickOrigin.clone();
      
      // Shoot button on right side, moved up a bit
      this.shootButton.position = new Vector2(width - 80, controlsY);
      
      // Fullscreen button in top right with better touch target
      this.fullscreenButton.position = new Vector2(width - 35, 35);
      this.fullscreenButton.radius = 25; // Larger touch target
      
      // Pause button in top left
      this.pauseButton.position = new Vector2(35, 35);
      this.pauseButton.radius = 25; // Larger touch target
    } else {
      // Landscape layout (fallback)
      this.moveStickOrigin = new Vector2(80, height - 80);
      this.moveStick.position = this.moveStickOrigin.clone();
      this.shootButton.position = new Vector2(width - 80, height - 80);
      this.fullscreenButton.position = new Vector2(width - 45, 45);
      this.pauseButton.position = new Vector2(45, 45);
    }
    
    if (this.debugMode) {
      console.log('Mobile controls layout updated:', {
        orientation: isPortrait ? 'portrait' : 'landscape',
        screenDimensions: { width, height },
        moveStick: this.moveStickOrigin,
        shootButton: this.shootButton.position,
        devicePixelRatio
      });
    }
  }

  forceRender(): void {
    // Force rendering regardless of isMobile
    this._render(true);
  }

  render(): void {
    this._render(false);
  }

  private _render(force: boolean = false): void {
    if (!this.isMobile && !force) {
      return;
    }
    
    this.ctx.save();
    
    // Apply device pixel ratio adjustments
    const devicePixelRatio = window.devicePixelRatio || 1;
    this.ctx.scale(devicePixelRatio, devicePixelRatio);
    
    // Render movement stick base
    this.ctx.fillStyle = Color.white().withAlpha(0.5).toString(); // More visible for debugging
    this.ctx.strokeStyle = Color.white().withAlpha(0.8).toString(); // More visible for debugging
    this.ctx.lineWidth = 3; // Thicker for debugging
    this.ctx.beginPath();
    this.ctx.arc(
      this.moveStickOrigin.x / devicePixelRatio, 
      this.moveStickOrigin.y / devicePixelRatio, 
      this.moveStick.radius / devicePixelRatio, 
      0, Math.PI * 2
    );
    this.ctx.fill();
    this.ctx.stroke();
    
    // Render movement stick handle with animation effect
    const stickEffect = this.moveStick.pressEffect || 0;
    const stickColor = stickEffect > 0 ? 
                     Color.cyan().withAlpha(0.6 + 0.4 * stickEffect) : 
                     Color.white().withAlpha(0.6);
    this.ctx.fillStyle = stickColor.toString();
    this.ctx.strokeStyle = Color.white().withAlpha(0.8).toString();
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(
      this.moveStick.position.x / devicePixelRatio, 
      this.moveStick.position.y / devicePixelRatio, 
      (15 + stickEffect * 5) / devicePixelRatio, 
      0, Math.PI * 2
    );
    this.ctx.fill();
    this.ctx.stroke();
    
    // Render shoot button with animation effect
    const shootEffect = this.shootButton.pressEffect || 0;
    const shootColor = shootEffect > 0 ? 
                     Color.red().withAlpha(0.6 + 0.4 * shootEffect) :
                     Color.orange().withAlpha(0.6); // More visible for debugging
    this.ctx.fillStyle = shootColor.toString();
    this.ctx.strokeStyle = Color.orange().withAlpha(0.8 + 0.2 * shootEffect).toString(); // More visible
    this.ctx.lineWidth = 3; // Thicker for debugging
    this.ctx.beginPath();
    this.ctx.arc(
      this.shootButton.position.x / devicePixelRatio, 
      this.shootButton.position.y / devicePixelRatio, 
      (this.shootButton.radius + shootEffect * 5) / devicePixelRatio, 
      0, Math.PI * 2
    );
    this.ctx.fill();
    this.ctx.stroke();
    
    // Shoot button crosshair
    this.ctx.strokeStyle = Color.white().toString();
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    const crosshairSize = 12 + shootEffect * 4;
    const shootX = this.shootButton.position.x / devicePixelRatio;
    const shootY = this.shootButton.position.y / devicePixelRatio;
    this.ctx.moveTo(shootX - crosshairSize/devicePixelRatio, shootY);
    this.ctx.lineTo(shootX + crosshairSize/devicePixelRatio, shootY);
    this.ctx.moveTo(shootX, shootY - crosshairSize/devicePixelRatio);
    this.ctx.lineTo(shootX, shootY + crosshairSize/devicePixelRatio);
    this.ctx.stroke();
    
    // Render fullscreen button with animation effect
    const fullscreenEffect = this.fullscreenButton.pressEffect || 0;
    const fullscreenColor = fullscreenEffect > 0 ? 
                          Color.yellow().withAlpha(0.3 + 0.7 * fullscreenEffect) :
                          Color.gray().withAlpha(0.3);
    this.ctx.fillStyle = fullscreenColor.toString();
    this.ctx.strokeStyle = Color.white().withAlpha(0.6).toString();
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(
      this.fullscreenButton.position.x / devicePixelRatio, 
      this.fullscreenButton.position.y / devicePixelRatio, 
      this.fullscreenButton.radius / devicePixelRatio, 
      0, Math.PI * 2
    );
    this.ctx.fill();
    this.ctx.stroke();
    
    // Fullscreen button icon
    this.ctx.strokeStyle = Color.white().toString();
    this.ctx.lineWidth = 2;
    const iconSize = 8 + fullscreenEffect * 2;
    this.ctx.strokeRect(
      this.fullscreenButton.position.x / devicePixelRatio - iconSize/2,
      this.fullscreenButton.position.y / devicePixelRatio - iconSize/2,
      iconSize,
      iconSize
    );
    
    // Render pause button with animation effect
    const pauseEffect = this.pauseButton.pressEffect || 0;
    const pauseColor = pauseEffect > 0 ? 
                      Color.cyan().withAlpha(0.3 + 0.7 * pauseEffect) :
                      Color.gray().withAlpha(0.3);
    this.ctx.fillStyle = pauseColor.toString();
    this.ctx.strokeStyle = Color.white().withAlpha(0.6).toString();
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(
      this.pauseButton.position.x / devicePixelRatio, 
      this.pauseButton.position.y / devicePixelRatio, 
      this.pauseButton.radius / devicePixelRatio, 
      0, Math.PI * 2
    );
    this.ctx.fill();
    this.ctx.stroke();
    
    // Pause button icon (two lines)
    this.ctx.strokeStyle = Color.white().toString();
    this.ctx.lineWidth = 2;
    const pauseBarWidth = 3 + pauseEffect;
    const pauseBarHeight = 10 + pauseEffect * 2;
    const pauseBarSpacing = 5;
    
    // Left bar
    this.ctx.fillRect(
      this.pauseButton.position.x / devicePixelRatio - pauseBarSpacing - pauseBarWidth,
      this.pauseButton.position.y / devicePixelRatio - pauseBarHeight/2,
      pauseBarWidth,
      pauseBarHeight
    );
    
    // Right bar
    this.ctx.fillRect(
      this.pauseButton.position.x / devicePixelRatio + pauseBarSpacing,
      this.pauseButton.position.y / devicePixelRatio - pauseBarHeight/2,
      pauseBarWidth,
      pauseBarHeight
    );
    
    this.ctx.restore();
  }

  isMobileDevice(): boolean {
    return this.isMobile;
  }
}

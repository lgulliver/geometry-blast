import { Vector2 } from '../utils/Vector2'
import { MobileControls } from './MobileControls'

export interface InputState {
  movement: Vector2;
  shooting: Vector2;
  isMoving: boolean;
  isShooting: boolean;
}

export class InputManager {
  private keys: Set<string> = new Set();
  private gamepadIndex: number = -1;
  private touchStart: Vector2 = Vector2.zero();
  private currentTouch: Vector2 = Vector2.zero();
  private isTouching: boolean = false;
  private canvas: HTMLCanvasElement;
  private mobileControls: MobileControls;
  private debugMode: boolean = false; // Disabled by default

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.mobileControls = new MobileControls(canvas);
    
    if (this.debugMode) {
      console.log('InputManager initialized, mobile device:', this.mobileControls.isMobileDevice());
    }
    
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Only setup legacy touch/mouse events if not on mobile
    if (!this.mobileControls.isMobileDevice()) {
      this.setupDesktopEvents();
    }

    // Keyboard events
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      e.preventDefault();
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      e.preventDefault();
    });

    // Gamepad connection
    window.addEventListener('gamepadconnected', (e) => {
      this.gamepadIndex = e.gamepad.index;
      console.log('Gamepad connected:', e.gamepad.id);
    });

    window.addEventListener('gamepaddisconnected', () => {
      this.gamepadIndex = -1;
      console.log('Gamepad disconnected');
    });
  }

  private setupDesktopEvents(): void {
    // Touch events for desktop testing
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      this.touchStart = new Vector2(
        touch.clientX - rect.left,
        touch.clientY - rect.top
      );
      this.currentTouch = this.touchStart.clone();
      this.isTouching = true;
    });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (this.isTouching) {
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        this.currentTouch = new Vector2(
          touch.clientX - rect.left,
          touch.clientY - rect.top
        );
      }
    });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.isTouching = false;
    });

    // Mouse events (for desktop testing)
    let isMouseDown = false;
    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.touchStart = new Vector2(
        e.clientX - rect.left,
        e.clientY - rect.top
      );
      this.currentTouch = this.touchStart.clone();
      isMouseDown = true;
      this.isTouching = true;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (isMouseDown) {
        const rect = this.canvas.getBoundingClientRect();
        this.currentTouch = new Vector2(
          e.clientX - rect.left,
          e.clientY - rect.top
        );
      }
    });

    this.canvas.addEventListener('mouseup', () => {
      isMouseDown = false;
      this.isTouching = false;
    });
  }

  getInputState(): InputState {
    const movement = Vector2.zero();
    const shooting = Vector2.zero();
    let isMoving = false;
    let isShooting = false;

    // Mobile controls have priority
    if (this.mobileControls.isMobileDevice()) {
      const mobileMovement = this.mobileControls.getMoveDirection();
      const mobileShooting = this.mobileControls.isShootPressed();
      
      if (this.debugMode && (mobileMovement.magnitude() > 0.1 || mobileShooting)) {
        console.log('Mobile input:', {
          movement: mobileMovement,
          shooting: mobileShooting,
          movementMagnitude: mobileMovement.magnitude()
        });
      }
      
      if (mobileMovement.magnitude() > 0.1) {
        movement.x = mobileMovement.x;
        movement.y = mobileMovement.y;
        isMoving = true;
      }
      
      if (mobileShooting) {
        if (isMoving) {
          // Shoot in movement direction
          shooting.x = movement.x;
          shooting.y = movement.y;
        } else {
          // Default shoot direction
          shooting.y = -1;
        }
        isShooting = true;
      }
    }

    // Keyboard input (always available as fallback)
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) {
      movement.y -= 1;
      isMoving = true;
    }
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) {
      movement.y += 1;
      isMoving = true;
    }
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) {
      movement.x -= 1;
      isMoving = true;
    }
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) {
      movement.x += 1;
      isMoving = true;
    }

    // Shooting with IJKL, spacebar, or mouse
    if (this.keys.has('KeyI')) {
      shooting.y -= 1;
      isShooting = true;
    }
    if (this.keys.has('KeyK')) {
      shooting.y += 1;
      isShooting = true;
    }
    if (this.keys.has('KeyJ')) {
      shooting.x -= 1;
      isShooting = true;
    }
    if (this.keys.has('KeyL')) {
      shooting.x += 1;
      isShooting = true;
    }
    
    // Spacebar for shooting in movement direction
    if (this.keys.has('Space')) {
      if (isMoving) {
        shooting.x = movement.x;
        shooting.y = movement.y;
      } else {
        shooting.y = -1; // Default to shooting up
      }
      isShooting = true;
    }

    // Gamepad input
    if (this.gamepadIndex >= 0) {
      const gamepad = navigator.getGamepads()[this.gamepadIndex];
      if (gamepad) {
        // Left stick for movement
        if (Math.abs(gamepad.axes[0]) > 0.1 || Math.abs(gamepad.axes[1]) > 0.1) {
          movement.x = gamepad.axes[0];
          movement.y = gamepad.axes[1];
          isMoving = true;
        }

        // Right stick for shooting
        if (Math.abs(gamepad.axes[2]) > 0.1 || Math.abs(gamepad.axes[3]) > 0.1) {
          shooting.x = gamepad.axes[2];
          shooting.y = gamepad.axes[3];
          isShooting = true;
        }
      }
    }

    // Desktop touch/mouse input (only if not mobile)
    if (!this.mobileControls.isMobileDevice() && this.isTouching) {
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      
      // Movement from touch start to current position
      const moveVector = this.currentTouch.subtract(this.touchStart);
      if (moveVector.magnitude() > 10) {
        movement.x = moveVector.x / 100;
        movement.y = moveVector.y / 100;
        isMoving = true;
      }

      // Shooting towards touch position from center
      const shootVector = this.currentTouch.subtract(new Vector2(centerX, centerY));
      if (shootVector.magnitude() > 20) {
        shooting.x = shootVector.normalize().x;
        shooting.y = shootVector.normalize().y;
        isShooting = true;
      }
    }

    // Normalize movement vector
    if (movement.magnitude() > 1) {
      const normalized = movement.normalize();
      movement.x = normalized.x;
      movement.y = normalized.y;
    }

    // Normalize shooting vector
    if (shooting.magnitude() > 1) {
      const normalized = shooting.normalize();
      shooting.x = normalized.x;
      shooting.y = normalized.y;
    }

    return {
      movement,
      shooting,
      isMoving,
      isShooting
    };
  }

  getMobileControls(): MobileControls {
    return this.mobileControls;
  }

  isPausePressed(): boolean {
    return this.mobileControls.isPausePressed();
  }

  updateLayout(): void {
    this.mobileControls.updateLayout();
  }
}

import './style.css'
import { Game } from './game/Game'

// Handle iOS Safari fullscreen
const handleVisibilityChange = () => {
  // This is a workaround for Safari iOS to correctly resize after visibility changes
  if (document.visibilityState === 'visible') {
    window.scrollTo(0, 0);
  }
};

document.addEventListener('visibilitychange', handleVisibilityChange);

// Attempt to hide iOS Safari address bar
const hideAddressBar = () => {
  if ('standalone' in navigator && !(navigator as any).standalone) {
    // Not in standalone mode (home screen)
    window.scrollTo(0, 1);
    setTimeout(() => window.scrollTo(0, 0), 100);
  }
};

// Special initialization for iOS Safari
const initIOSSafari = () => {
  // Check if running in iOS Safari
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  
  if (isIOS) {
    console.log('iOS Safari detected, applying special handling');
    
    // Try to hide address bar on page load
    hideAddressBar();
    
    // And also after orientation changes
    window.addEventListener('orientationchange', () => {
      setTimeout(hideAddressBar, 300);
    });
    
    // Add iOS specific CSS class
    document.documentElement.classList.add('ios');
  }
};

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize iOS specific settings first
  initIOSSafari();
  
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  
  if (!canvas) {
    console.error('Game canvas not found!');
    return;
  }

  // Wait a bit for iOS to settle
  setTimeout(() => {
    const game = new Game(canvas);
    game.start();
    
    // Add debug shortcuts
    document.addEventListener('keydown', (event) => {
      if (event.key.toLowerCase() === 'c') {
        // Toggle collision debug
        game.toggleCollisionDebug();
      } else if (event.key.toLowerCase() === 'g') {
        // Toggle grid warp debug
        game.toggleGridWarpDebug();
      } else if (event.key.toLowerCase() === 's') {
        // Toggle screen shake debug
        game.toggleScreenShakeDebug();
      } else if (event.key.toLowerCase() === 'v') {
        // Test visual effects
        game.testVisualEffects();
      }
    });
    
    // Make game accessible for debugging
    (window as any).game = game;
    
    console.log('🎮 Geometry Blast initialized!');
    console.log('Controls:');
    console.log('  WASD or Arrow Keys - Move');
    console.log('  IJKL or Spacebar - Shoot');
    console.log('  Touch/Mouse - Move and shoot');
    console.log('  Gamepad - Left stick move, right stick shoot');
    console.log('Debug Commands:');
    console.log('  C - Toggle collision debug visualization');
    console.log('  G - Toggle grid warp debug visualization');
    console.log('  S - Toggle screen shake debug logging');
    console.log('  V - Test all visual effects');
    console.log('  game.enableMobileDebug() - Enable mobile input logging');
    console.log('  game.disableMobileDebug() - Disable mobile input logging');
    console.log('  game.stressTestCollisions(30) - Spawn entities for performance testing');
  }, 100);
});

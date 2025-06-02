import './style.css'
import { Game } from './game/Game'

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  
  if (!canvas) {
    console.error('Game canvas not found!');
    return;
  }

  const game = new Game(canvas);
  game.start();

  console.log('🎮 Geometry Blast initialized!');
  console.log('Controls:');
  console.log('  WASD or Arrow Keys - Move');
  console.log('  IJKL - Shoot');
  console.log('  Touch/Mouse - Move and shoot');
  console.log('  Gamepad - Left stick move, right stick shoot');
});

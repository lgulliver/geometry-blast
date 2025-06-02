# Copilot Instructions for Geometry Blast

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a TypeScript-based HTML5 game called "Geometry Blast" - a clone of Geometry Wars. The game features:

- Modern Canvas 2D rendering
- Entity-Component-System (ECS) architecture
- Touch controls for mobile devices
- Gamepad/controller support
- Particle effects and visual feedback
- Modular game engine design

## Coding Guidelines
- Use TypeScript with strict typing
- Follow object-oriented patterns for game entities
- Implement proper input abstraction for cross-platform support
- Use requestAnimationFrame for smooth animations
- Optimize for 60fps performance
- Keep game logic separate from rendering logic

## Architecture
- `src/game/` - Core game engine and systems
- `src/entities/` - Game objects (Player, Enemies, Projectiles)
- `src/input/` - Input handling for touch and controllers
- `src/graphics/` - Rendering and visual effects
- `src/audio/` - Sound management
- `src/utils/` - Utility functions and helpers

## Key Features to Implement
- Vector-based movement and physics
- Collision detection system
- Particle explosion effects
- Enemy AI with different behaviors
- Progressive difficulty scaling
- High score tracking

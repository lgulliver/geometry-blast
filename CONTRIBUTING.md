# Contributing to Geometry Blast

Thank you for your interest in contributing! Geometry Blast is an open-source, TypeScript-based HTML5 game. We welcome bug reports, feature requests, and pull requests.

## How to Contribute

1. **Fork the repository** and create your branch from `main`.
2. **Install dependencies:**
   ```sh
   npm install
   ```
3. **Start the dev server:**
   ```sh
   npm run dev
   ```
4. **Make your changes** (see Coding Guidelines below).
5. **Test your changes** on both desktop and mobile if possible.
6. **Commit and push** your branch.
7. **Open a Pull Request** with a clear description of your changes.

## Coding Guidelines
- Use **TypeScript** with strict typing.
- Follow the **ECS architecture** and keep logic modular.
- Keep game logic and rendering separate.
- Use `requestAnimationFrame` for animation.
- Optimize for 60fps.
- Use descriptive commit messages.

## Project Structure
- `src/game/` - Core game engine and systems
- `src/entities/` - Game objects (Player, Enemies, Projectiles)
- `src/input/` - Input handling (touch, gamepad, keyboard)
- `src/graphics/` - Rendering and effects
- `src/audio/` - Sound management
- `src/utils/` - Utility functions

## Reporting Issues
- Please include steps to reproduce, expected vs. actual behavior, and screenshots if possible.

## Feature Requests
- Open an issue describing your idea and why it would improve the game.

## Code of Conduct
Be respectful and constructive. Harassment or abuse will not be tolerated.

## License
By contributing, you agree that your contributions will be licensed under the GNU GPLv3 License.

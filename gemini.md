# Project Asteroid Gemini Prompt

## Prompt

Act as a world-class senior frontend engineer with deep expertise in React, TypeScript, and UI/UX design. Your task is to build a colony simulation game called "Project Asteroid" from scratch. The game should be a single-page application built with React and TypeScript.

### Core Gameplay Mechanics:

1.  **Game World**:
    *   The game is played on a 2D tile-based grid.
    *   The world should be procedurally generated based on a seed, containing different types of terrain like empty space, rock, valuable minerals, and rare gems. It should also have trees.
    *   The world should feel like a cross-section of an asteroid.

2.  **Colonists**:
    *   The player starts with a small number of autonomous colonists.
    *   Colonists have basic needs, such as energy, which is replenished by resting in beds.
    *   Colonists have a happiness/morale level, which affects their work efficiency.
    *   Colonists should automatically find tasks to do based on player designations and their own needs. They should prioritize survival (resting when low on energy) and then follow player orders.

3.  **Player Interaction**:
    *   The player's role is to guide the colony by designating tasks.
    *   **Designation Tools**: The player can designate areas for:
        *   **Mining**: Digging out rock, minerals, and gems.
        *   **Chopping**: Cutting down trees for logs.
        *   **Building**: Constructing floors, walls, doors, beds, and storage containers.
    *   The player can inspect colonists and tiles to see their status.

4.  **Resource Management**:
    *   Colonists harvest resources (minerals, gems, logs) from the environment.
    *   Harvested resources are initially dropped on the ground. Colonists must haul them to designated storage containers.
    *   Resources like logs are required for building structures.
    *   The primary goal is to collect a certain amount of minerals to reach milestones.

5.  **Game Loop & Time**:
    *   The game runs on a tick-based system.
    *   Implement a day/night cycle that affects the visuals.
    *   Random events can occur daily (e.g., meteor showers revealing new minerals, morale boosts, new colonists arriving).

### UI/UX Requirements:

*   **Main View**: A canvas-based rendering of the game world.
*   **HUD**: The Head-Up Display must be clean and informative, showing:
    *   Stored resources (Minerals, Gems, Logs).
    *   Colony-wide average happiness and work efficiency.
    *   Current day, time, and day/night indicator.
    *   Current goal progress.
*   **Control Panel**: A menu for selecting different actions (Inspect, Harvest, Build various structures).
*   **Inspector Panel**: A context-aware panel that shows details of a selected colonist or a hovered tile.
*   **Colonist Overview**: A quick-select panel to see and select all colonists.
*   **Logs**:
    *   A real-time game log showing important events and colonist actions.
    *   A visual activity log/timeline for each colonist, showing what they've been doing recently.
*   **Modals**:
    *   An introductory modal to explain the game to new players.
    *   Pop-up modals for significant random events.
*   **Settings**: A way to import/export the game state as a JSON file and regenerate the world with a new seed.

### Technical Requirements:

*   Use React with functional components and hooks.
*   Use TypeScript for static typing.
*   Use Tailwind CSS for styling.
*   The application should be a single `index.html` file that loads a bundled `index.tsx` module.
*   Code should be well-organized, clean, readable, and performant.

---

## Progress So Far

*   **V1: Initial Implementation**: The core game loop, procedural world generation, autonomous colonist AI (pathfinding, task selection), and basic UI panels were created in a single React component file.
*   **V2: Code Refactoring & Modularization**: The single-file application has been successfully refactored into a more maintainable and scalable structure.
    *   **Component-Based UI**: The UI has been broken down into reusable React components (`StatsPanel`, `BuildMenu`, `GameLogPanel`, etc.).
    *   **Separation of Concerns**:
        *   Game logic remains in the main `App.tsx` component.
        *   Type definitions are centralized in `types.ts`.
        *   Game constants are in `constants.ts`.
        *   Utility functions (pathfinding, noise generation, geometry) are in a `utils/` directory.
    *   **Project Structure**: The project now follows a standard React/TypeScript project structure.
*   **Current State**: The game is fully playable and matches all the requirements outlined in the prompt. The codebase is clean, modular, and ready for future feature additions.
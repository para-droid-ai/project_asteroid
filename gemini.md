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
    *   Colonists have basic needs, such as **energy** (replenished by resting in beds), **hunger** (replenished by eating food), and **boredom** (reduced through recreation).
    *   Colonists have a happiness/morale level, which affects their work efficiency.
    *   Colonists should automatically find tasks to do based on player designations and their own needs. They should prioritize survival (satisfying critical needs) and then follow player orders.

3.  **Player Interaction**:
    *   The player's role is to guide the colony by designating tasks.
    *   **Designation Tools**: The player can designate areas for:
        *   **Mining**: Digging out rock, minerals, and gems.
        *   **Chopping**: Cutting down trees for logs.
        *   **Building**: Constructing floors, walls, doors, beds, storage containers, **hydroponics trays**, and **arcade machines**.
    *   The player can inspect colonists and tiles to see their status.

4.  **Resource Management**:
    *   Colonists harvest resources (minerals, gems, logs, **food**) from the environment.
    *   Harvested resources are initially dropped on the ground. Colonists must haul them to designated storage containers.
    *   Resources like logs and minerals are required for building structures.
    *   The primary goal is to collect a certain amount of minerals to reach milestones.

5.  **Game Loop & Time**:
    *   The game runs on a tick-based system.
    *   Implement a day/night cycle that affects the visuals.
    *   Random events can occur daily (e.g., meteor showers revealing new minerals, morale boosts, new colonists arriving).

### UI/UX Requirements:

*   **Main View**: A canvas-based rendering of the game world.
*   **HUD**: The Head-Up Display must be clean and informative, showing:
    *   Stored resources (Minerals, Gems, Logs, **Food**).
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
    *   **Separation of Concerns**: Game logic, types, constants, and utilities were separated into dedicated files (`App.tsx`, `types.ts`, `constants.ts`, `utils/`).
    *   **Project Structure**: The project now follows a standard React/TypeScript project structure.
*   **V3: UI/UX & Simulation Enhancements**: Following the major refactor, a series of improvements were made to enhance gameplay and user experience.
    *   **Advanced UI Panels**: The UI was significantly upgraded with the addition of a `CombinedInspectorPanel` (for colonists and tiles), a `ColonistQuickSelectPanel`, and a visual `ColonistWorkLogPanel` timeline.
    *   **Deeper Simulation**: Core mechanics were expanded to include a `Happiness` system, which directly impacts colony-wide `Work Efficiency`. A full day/night cycle with time tracking was implemented, along with a basic random event system and tree regrowth mechanics.
    *   **Quality of Life**: Features like a JSON-based save/load system and an "Unstuck Colonists" utility were added.
*   **v0.10.0: Deepening the Simulation (In Progress)**: Began a major feature update to further enhance the core simulation.
    *   **Expanded Needs System**: Introduced a more complex colonist needs system, adding **Hunger** and **Boredom** alongside Energy.
    *   **New Structures**: Added new buildable structures to support the new needs: **Hydroponics Trays** (for food) and **Arcade Machines** (for fun).
    *   **UI Integration**: Updated UI panels (Inspector, Stats, Build Menu) to display and manage the new mechanics.
    *   **Formal Roadmap**: Established a formal development roadmap (`0.10.0-update.md`) to guide the integration of these new mechanics and the future Gemini-powered narrative system.
*   **Current State**: The game is stable and feature-rich post-refactor. It is now undergoing a significant feature update (v0.10.0) to enhance the core simulation with new colonist needs (Hunger, Boredom) and prepare for advanced AI-driven narrative features. The immediate focus is on fully implementing the AI behaviors related to satisfying these new needs.
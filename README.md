# Project Asteroid

![Project Asteroid Gameplay](https://storage.googleapis.com/project-asteroid-public/project-asteroid-screenshot.png)

A colony simulation game where you manage a group of survivors on a desolate asteroid. Guide your autonomous colonists by designating tasks like mining and building to ensure their survival and prosperity against the harshness of space.

This project was built with the assistance of Google's Gemini.

## Features

-   **Autonomous Colonists**: Your colonists think for themselves! They will work, eat, play, and rest based on their needs and your designated tasks.
-   **Procedural Generation**: Every new game creates a unique asteroid based on a seed, offering endless replayability.
-   **Resource Management**: Mine rock for stone, valuable minerals, and rare gems. Chop trees for lumber. Grow and harvest food.
-   **Building System**: Design and build your base with floors (wood/stone), walls (wood/stone), doors, beds, storage units, hydroponics trays, and even arcade machines. Upgrade wood structures to stone for better durability.
-   **Dynamic Events**: Face random events like meteor showers, morale shifts, and the arrival of new survivors.
-   **Day/Night Cycle**: A simple visual day/night cycle.
-   **Goals & Milestones**: Prove your colony is sustainable by reaching resource collection milestones.
-   **Save/Load System**: Export your game progress to a JSON file and import it later to continue.
-   **AI Narrator**: A dynamic "Colony Chronicle" powered by Google's Gemini API generates a unique story for your colony based on its progress and struggles.

## How to Play

1.  **The Start**: You begin with 3 colonists and a pre-designated shelter area. They will automatically start working on designated tasks.
2.  **Your Role**: You are the overseer. Your job is to designate tasks to ensure the colony's survival and growth.
3.  **Designate Tasks**: Use the **Controls** panel to select an action.
    -   **Harvest**: Designate rock, minerals, gems, or trees to be harvested. Click and drag to select a large area.
    -   **Build**: Select a structure to build (e.g., Stone Floor, Wood Wall, Bed) and designate where you want it.
    -   **Upgrade**: Select an upgrade action (e.g., Upg. Floor) to convert existing wood structures to stone.
4.  **Manage Needs**: Keep an eye on your colonists' happiness, energy, hunger, and boredom. Building beds, hydroponics trays for food, and arcade machines for fun is crucial for a healthy and efficient colony.
5.  **Expand**: As you gather resources, expand your base, build more facilities, and strive to meet the collection goals.

## Controls

-   **Left-Click**:
    -   In **Inspect** mode: Select a colonist or a tile.
    -   In **Designate** mode: Click and drag to create a designation area. Click a single tile to designate it. Clicking an existing designation will cancel it.
-   **Mouse Hover**: In **Inspect** mode, hover over a tile to see its details in the Inspector Panel.

## Technology Stack

-   **Frontend**: React 19, TypeScript
-   **AI**: Google Gemini
-   **Styling**: Tailwind CSS
-   **Graphics**: HTML5 Canvas API

## Project Structure

The project is organized into a modular structure for better maintainability.

```
/
├── components/         # Reusable React UI components
├── utils/              # Helper functions (pathfinding, noise, etc.)
├── App.tsx             # Main game component with core logic
├── index.tsx           # React app entry point
├── constants.ts        # Game constants (balancing, colors)
├── types.ts            # TypeScript type definitions
├── index.html          # Main HTML file
└── README.md           # This file
```

## Contributing

Contributions are welcome! If you have ideas for new features, bug fixes, or improvements, feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License.
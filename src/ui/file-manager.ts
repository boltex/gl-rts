import { CONFIG } from '../config';
import { Game } from '../game';

export class FileManager {
    private fileInput: HTMLInputElement | null = null;
    private fileInputFor: 'map' | 'entity' | 'animation' = 'map';

    private game: Game;

    constructor(game: Game) {
        this.game = game;
        this.initFileInput();
    }

    private initFileInput(): void {
        // Create file input for loading and saving maps
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.accept = '.json';
        this.fileInput.style.display = 'none';  // Hide the input from view
        this.fileInput.addEventListener('change', (event: Event) => {
            const target = event.target as HTMLInputElement;
            const file = target.files?.[0];
            if (file) {
                const reader = new FileReader();

                reader.onload = (e) => {
                    try {
                        const jsonData = JSON.parse(e.target?.result as string);

                        // Check which 'open' button was clicked to determine how to handle the file data.
                        switch (this.fileInputFor) {
                            case 'map':
                                // Check that the map data is valid before opening it.
                                // it should be an array of numbers totalling the product of the map dimensions.
                                if (!Array.isArray(jsonData) || jsonData.length !== CONFIG.GAME.MAP.WIDTH * CONFIG.GAME.MAP.HEIGHT) {
                                    throw new Error('Invalid map data');
                                }
                                this.game.openMap(jsonData);
                                break;
                            case 'entity':
                                console.log('Opening entity list file:', jsonData);
                                // todo
                                break;
                            case 'animation':
                                console.log('Opening animation list file:', jsonData);
                                // todo
                                break;
                            default:
                                console.log('unknown file input type');
                                break;
                        }
                    } catch (err) {
                        console.error('Error parsing JSON file:', err);
                    }
                };

                reader.readAsText(file);
            }
        });

        document.body.appendChild(this.fileInput);
    }

    openMapFile(): void {
        // Use a file picker dialog to select a map file.
        if (this.fileInput) {
            this.fileInputFor = 'map';
            this.fileInput.click();  // This opens the file picker dialog
        }
    }

    saveMapFile(): void {
        // No need for a file picker dialog, just save the map data to a file.
        this.game.saveMap(); // No param is default to save the current map.
    }

    openAnimationsFile(): void {
        // Todo
        console.log("todo openAnimationsFile");
    }

    saveAnimationsFile(): void {
        // Todo
        console.log("todo saveAnimationsFile");
    }

    openEntityListFile(): void {
        if (this.fileInput) {
            this.fileInputFor = 'entity';
            this.fileInput.click();  // This opens the file picker dialog
        }
    }

    saveEntityListFile(): void {
        // No need for a file picker dialog, just save the active entities
        this.game.saveEntities();
    }

    openAnimationListFile(): void {
        if (this.fileInput) {
            this.fileInputFor = 'animation';
            this.fileInput.click();  // This opens the file picker dialog
        }
    }

    saveAnimationListFile(): void {
        // No need for a file picker dialog, just save the active entities
        this.game.saveAnimationList();
    }
}


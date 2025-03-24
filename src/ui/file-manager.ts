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
                                // Animations are an array of EntityAnimation.
                                if (!Array.isArray(jsonData)) {
                                    throw new Error('Invalid animation data');
                                }
                                for (let i = 0; i < jsonData.length; i++) {
                                    // check that each animation has the required properties
                                    const anim = jsonData[i];
                                    // Check if anim.label is a string
                                    if (typeof anim.label !== 'string') {
                                        throw new Error('Invalid animation data');
                                    }
                                    // Check if anim.frames is an array of numbers
                                    if (!Array.isArray(anim.frames) || !anim.frames.every((frame: any) => typeof frame === 'number')) {
                                        throw new Error('Invalid animation data');
                                    }
                                }
                                this.game.openAnimations(jsonData);
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
        // Use a file picker dialog to select an animation file.
        if (this.fileInput) {
            this.fileInputFor = 'animation';
            this.fileInput.click();  // This opens the file picker dialog
        }
    }

    saveAnimationsFile(): void {
        // No need for a file picker dialog, just save the animations data to a file.
        this.game.saveAnimations(); // No param is default to save the current animations.
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


}


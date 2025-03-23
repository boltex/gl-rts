import { CONFIG } from '../config';
import { Game } from '../game';
import { FileManager } from './file-manager';

export class EditorManager {
    isMapEditorOpen: boolean = false;
    private mapEditorElement: HTMLDivElement | null = null;
    private tilePreview: HTMLDivElement | null = null;
    private tileInput: HTMLInputElement | null = null;
    private currentTileIndex: number = 0; // between 0 and CONFIG.GAME.TILE.DEPTH

    private animInput: HTMLInputElement | null = null;
    private animListText: HTMLInputElement | null = null;
    private currentAnimIndex: number = 0;

    private game: Game;
    private fileManager: FileManager;

    constructor(game: Game, fileManager: FileManager) {
        this.game = game;
        this.fileManager = fileManager;
    }

    toggleMapEditor(): void {
        if (!this.mapEditorElement) {
            this.buildMapEditor();
        } else {
            // Toggle visibility
            if (this.mapEditorElement.style.display === "none" || this.mapEditorElement.style.display === "") {
                this.mapEditorElement.style.display = "block";
                this.isMapEditorOpen = true;
            } else {
                this.mapEditorElement.style.display = "none";
                this.isMapEditorOpen = false;
            }
        }
    }

    getSelectedTileIndex(): number {
        return this.currentTileIndex;
    }

    setTileSelectIndex(index: number): void {
        this.currentTileIndex = index;
        if (this.tileInput) {
            this.tileInput.value = index.toString();
        }
        this.updateTilePreview();
    }

    incrementMapTile(): void {
        this.currentTileIndex = (this.currentTileIndex + 1) % CONFIG.GAME.TILE.DEPTH;
        if (this.tileInput) {
            this.tileInput.value = this.currentTileIndex.toString();
        }
        this.updateTilePreview();
    }

    decrementMapTile(): void {
        this.currentTileIndex = (this.currentTileIndex - 1 + CONFIG.GAME.TILE.DEPTH) % CONFIG.GAME.TILE.DEPTH;
        if (this.tileInput) {
            this.tileInput.value = this.currentTileIndex.toString();
        }
        this.updateTilePreview();
    }

    incrementAnimation(): void {
        this.currentAnimIndex = (this.currentAnimIndex + 1) % CONFIG.GAME.ANIMATIONS.TOTAL;
        if (this.animInput) {
            this.animInput.value = this.currentAnimIndex.toString();
        }
        this.updateAnimationPreview();
    }

    decrementAnimation(): void {
        this.currentAnimIndex = (this.currentAnimIndex - 1 + CONFIG.GAME.ANIMATIONS.TOTAL) % CONFIG.GAME.ANIMATIONS.TOTAL;
        if (this.animInput) {
            this.animInput.value = this.currentAnimIndex.toString();
        }
        this.updateAnimationPreview();
    }

    private updateTilePreview(): void {
        if (this.tilePreview) {
            // Calculate background position so that the preview shows only the selected tile.
            // Assuming vertical stacking: the Y offset is negative (tileIndex * 128)
            this.tilePreview.style.backgroundPosition = `0px -${this.currentTileIndex * CONFIG.GAME.TILE.SIZE}px`;

            // CONFIG.GAME.TILE.SIZE is 128 and CONFIG.GAME.TILE.DEPTH is 64 so background size is 128 * 64
            this.tilePreview.style.backgroundSize = `${CONFIG.GAME.TILE.SIZE}px ${CONFIG.GAME.TILE.SIZE * CONFIG.GAME.TILE.DEPTH}px`;
        }
    }

    updateAnimationPreview(): void {
        // Put the content of the current animation list into the animListText input.
        if (this.animListText) {
            this.animListText.value = JSON.stringify(this.game.animations[this.currentAnimIndex]);
        }
    }

    private buildMapEditor(): void {
        // Create the map editor container
        this.mapEditorElement = document.createElement("div");
        this.mapEditorElement.style.display = "block";
        this.mapEditorElement.id = "map-editor";

        // Create tile preview element using the atlas (using background positioning)
        this.tilePreview = document.createElement("div");
        this.tilePreview.id = "tile-preview";
        this.updateTilePreview();

        // Create Up and Down buttons
        const upTileButton = document.createElement("button");
        upTileButton.textContent = "▲";
        upTileButton.title = "Next tile (or press '+' key)";
        upTileButton.addEventListener("click", () => {
            this.incrementMapTile();
        });

        const downTileButton = document.createElement("button");
        downTileButton.textContent = "▼";
        downTileButton.title = "Previous tile (or press '-' key)";
        downTileButton.addEventListener("click", () => {
            this.decrementMapTile();
        });

        // Create number input to manually select tile index
        this.tileInput = document.createElement("input");
        this.tileInput.type = "number";
        this.tileInput.min = "0";
        this.tileInput.max = (CONFIG.GAME.TILE.DEPTH - 1).toString();
        this.tileInput.value = this.currentTileIndex.toString();
        this.tileInput.addEventListener("change", () => {
            if (this.tileInput) {
                let newValue = parseInt(this.tileInput.value, 10);
                if (isNaN(newValue)) newValue = 0;
                const min = 0;
                const max = CONFIG.GAME.TILE.DEPTH - 1;
                newValue = Math.max(min, Math.min(newValue, max));
                this.currentTileIndex = newValue;
                this.tileInput.value = newValue.toString();
                this.updateTilePreview();
            }
        });

        // Append elements to map editor container
        this.mapEditorElement.appendChild(this.tilePreview);
        this.mapEditorElement.appendChild(upTileButton);
        this.mapEditorElement.appendChild(downTileButton);
        this.mapEditorElement.appendChild(this.tileInput);

        // Insert newline
        this.mapEditorElement.appendChild(document.createElement("br"));

        // Create open and Save map buttons
        const openMapButton = document.createElement("button");
        openMapButton.textContent = "Open";
        openMapButton.addEventListener("click", () => {
            this.fileManager.openMapFile();
        });
        const saveMapButton = document.createElement("button");
        saveMapButton.textContent = "Save";
        saveMapButton.addEventListener("click", () => {
            this.fileManager.saveMapFile();
        });

        this.mapEditorElement.appendChild(openMapButton);
        this.mapEditorElement.appendChild(saveMapButton);

        this.mapEditorElement.appendChild(document.createElement("br"));
        this.mapEditorElement.appendChild(document.createElement("br"));
        // Create Up and Down buttons
        const upAnimButton = document.createElement("button");
        upAnimButton.textContent = "▲";
        upAnimButton.title = "Next animation (or press '+' key)";
        upAnimButton.addEventListener("click", () => {
            this.incrementAnimation();

        });

        const downAnimButton = document.createElement("button");
        downAnimButton.textContent = "▼";
        downAnimButton.title = "Previous animation (or press '-' key)";
        downAnimButton.addEventListener("click", () => {
            this.decrementAnimation();
        });

        // Create number input to manually select anim index
        this.animInput = document.createElement("input");
        this.animInput.type = "number";
        this.animInput.min = "0";
        this.animInput.max = (CONFIG.GAME.ANIMATIONS.TOTAL - 1).toString();
        this.animInput.value = this.currentAnimIndex.toString();
        this.animInput.addEventListener("change", () => {
            if (this.animInput) {
                let newValue = parseInt(this.animInput.value, 10);
                if (isNaN(newValue)) newValue = 0;
                const min = 0;
                const max = CONFIG.GAME.ANIMATIONS.TOTAL - 1;
                newValue = Math.max(min, Math.min(newValue, max));
                this.currentAnimIndex = newValue;
                this.animInput.value = newValue.toString();
                console.log('currentAnimIndex', newValue);
                this.updateAnimationPreview();
            }
        });

        // Create text input for animation lists to be parsed like: "[0,1,2,22,33,255]"
        this.animListText = document.createElement("input");
        this.animListText.type = "text";
        this.animListText.value = JSON.stringify(this.game.animations[this.currentAnimIndex]);
        this.animListText.addEventListener("change", () => {
            if (this.animListText) {
                console.log("animListText changed to:", this.animListText.value);
                // parse the input value into an array of numbers, checking that it is valid.
                const previousValue = this.animListText.value;
                try {
                    const animList = JSON.parse(this.animListText.value);
                    if (Array.isArray(animList) && animList.every((val: any) => typeof val === 'number')) {
                        this.game.animations[this.currentAnimIndex] = animList;
                    } else {
                        throw new Error('Invalid animation list');
                    }
                } catch (err) {
                    console.error('Error parsing animation list:', err);
                    // Reset to previous valid value
                    this.animListText.value = previousValue;
                }
            }
        });

        // Create open and Save buttons
        const openAnimationsButton = document.createElement("button");
        openAnimationsButton.textContent = "Open";
        openAnimationsButton.addEventListener("click", () => {
            this.game.fileManager.openAnimationsFile();
        });
        const saveAnimationsButton = document.createElement("button");
        saveAnimationsButton.textContent = "Save";
        saveAnimationsButton.addEventListener("click", () => {
            this.game.fileManager.saveAnimationsFile();
        });

        this.mapEditorElement.appendChild(upAnimButton);
        this.mapEditorElement.appendChild(downAnimButton);
        this.mapEditorElement.appendChild(this.animInput);
        this.mapEditorElement.appendChild(this.animListText);
        this.mapEditorElement.appendChild(openAnimationsButton);
        this.mapEditorElement.appendChild(saveAnimationsButton);

        // Append the map editor container to the document body
        document.body.appendChild(this.mapEditorElement);

        // Make the map editor draggable
        this.addDragElement(this.mapEditorElement);
        this.isMapEditorOpen = true;
    }

    private addDragElement(elm: HTMLElement): void {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

        elm.addEventListener("mousedown", dragMouseDown);

        function dragMouseDown(e: MouseEvent): void {
            // Only drag if mouse event is directly on the mapEditorElement, not on the buttons or input.
            if (e.target !== elm) {
                return;
            }
            e.preventDefault();
            // get the mouse cursor position at startup:
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.addEventListener("mouseup", closeDragElement);
            document.addEventListener("mousemove", elementDrag);
        }

        function elementDrag(e: MouseEvent): void {
            e.preventDefault();
            // calculate the new cursor position:
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            // set the element's new position:
            elm.style.top = (elm.offsetTop - pos2) + "px";
            elm.style.left = (elm.offsetLeft - pos1) + "px";
        }

        function closeDragElement(): void {
            // stop moving when mouse button is released:
            document.removeEventListener("mouseup", closeDragElement);
            document.removeEventListener("mousemove", elementDrag);
        }
    }

}


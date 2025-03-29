import { CONFIG } from '../config';
import { Game } from '../game';
import { FileManager } from './file-manager';

export class EditorManager {
    isMapEditorOpen: boolean = false;
    isAnimationPreviewVisible = false
    isAnimationPreviewPlaying = false;

    private mapEditorElement: HTMLDivElement | null = null;
    private tilePreview: HTMLDivElement | null = null;
    private tileInput: HTMLInputElement | null = null;
    private currentTileIndex: number = 0; // between 0 and CONFIG.GAME.TILE.DEPTH

    private animInput: HTMLInputElement | null = null;
    private animLabelInput: HTMLInputElement | null = null;
    private animListText: HTMLInputElement | null = null;
    private toggleAnimationVisibleButton: HTMLButtonElement | null = null;
    private toggleAnimationPlayPauseButton: HTMLButtonElement | null = null;

    currentAnimIndex: number = 0; // Current animation shown in the editor
    previewAnimationFrame: number = 0; // Current frame of the animation being previewed
    previewAnimationOrientation: number = 0; // Orientation of the previewed unit. (independant of the animation being previewed)

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
        this.currentAnimIndex = (this.currentAnimIndex + 1) % this.game.animations.length;
        if (this.animInput) {
            this.animInput.value = this.currentAnimIndex.toString();
        }
        this.updateAnimationPreview();
    }

    decrementAnimation(): void {
        this.currentAnimIndex = (this.currentAnimIndex - 1 + this.game.animations.length) % this.game.animations.length;
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
        if (this.game.animations[this.currentAnimIndex] == null) {
            // This specific animation of currentAnimIndex does not exist!
            this.currentAnimIndex = 0;
            if (this.game.animations[this.currentAnimIndex] == null) {
                // Not even the first animation list is initialized!
                this.game.animations[this.currentAnimIndex] = { label: "default" + this.currentAnimIndex.toString(), frames: [] };

            }
            if (this.animLabelInput) {
                this.animLabelInput.value = this.game.animations[this.currentAnimIndex].label;
            }
            if (this.animInput) {
                this.animInput.value = this.currentAnimIndex.toString();
            }
        }

        if (this.animLabelInput) {
            this.animLabelInput.value = this.game.animations[this.currentAnimIndex].label;
        }

        if (this.animListText) {
            this.animListText.value = JSON.stringify(this.game.animations[this.currentAnimIndex].frames);
        }

        // restart the preview animation
        this.previewAnimationFrame = 0;
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
        upAnimButton.title = "Next animation";
        upAnimButton.addEventListener("click", () => {
            this.incrementAnimation();

        });

        const downAnimButton = document.createElement("button");
        downAnimButton.textContent = "▼";
        downAnimButton.title = "Previous animation";
        downAnimButton.addEventListener("click", () => {
            this.decrementAnimation();
        });

        // Create Add and Delete buttons
        const addAnimButton = document.createElement("button");
        addAnimButton.textContent = "+";
        addAnimButton.title = "Add new animation";
        addAnimButton.addEventListener("click", () => {
            // Add a new animation with empty frames at the current index
            this.game.animations.splice(this.currentAnimIndex + 1, 0, { label: "new", frames: [1, 2, 3, 4, 5] });
            this.currentAnimIndex++;
            if (this.animInput) {
                this.animInput.value = this.currentAnimIndex.toString();
            }
            this.updateAnimationPreview();
        });

        // Create Delete button
        const deleteAnimButton = document.createElement("button");
        deleteAnimButton.textContent = "-";
        deleteAnimButton.title = "Delete current animation";
        deleteAnimButton.addEventListener("click", () => {
            if (this.game.animations.length > 1) {
                this.game.animations.splice(this.currentAnimIndex, 1); // This will remove the current animation at the current index
                this.currentAnimIndex = Math.min(this.currentAnimIndex, this.game.animations.length - 1);
                if (this.animInput) {
                    this.animInput.value = this.currentAnimIndex.toString();
                }
                this.updateAnimationPreview();
            }
        });

        // Create number input to manually select anim index
        this.animInput = document.createElement("input");
        this.animInput.type = "number";
        this.animInput.min = "0";
        this.animInput.max = (this.game.animations.length - 1).toString();
        this.animInput.value = this.currentAnimIndex.toString();
        this.animInput.addEventListener("change", () => {
            if (this.animInput) {
                let newValue = parseInt(this.animInput.value, 10);
                if (isNaN(newValue)) newValue = 0;
                const min = 0;
                const max = this.game.animations.length - 1;
                newValue = Math.max(min, Math.min(newValue, max));
                this.currentAnimIndex = newValue;
                this.animInput.value = newValue.toString();
                console.log('currentAnimIndex', newValue);
                this.updateAnimationPreview();
            }
        });

        // Create text input for animation label
        this.animLabelInput = document.createElement("input");
        this.animLabelInput.type = "text";
        // Add 'anim-name' class
        this.animLabelInput.className = "anim-name";
        this.animLabelInput.value = this.game.animations[this.currentAnimIndex].label;
        this.animLabelInput.addEventListener("change", () => {
            if (this.animLabelInput) {
                console.log("animLabelInput changed to:", this.animLabelInput.value);
                this.game.animations[this.currentAnimIndex].label = this.animLabelInput.value;
            }
        });

        // Create text input for animation lists to be parsed like: "[0,1,2,22,33,255]"
        this.animListText = document.createElement("input");
        this.animListText.type = "text";
        this.animListText.value = JSON.stringify(this.game.animations[this.currentAnimIndex].frames);
        this.animListText.addEventListener("change", () => {
            if (this.animListText) {
                console.log("animListText changed to:", this.animListText.value);
                // parse the input value into an array of numbers, checking that it is valid.
                const previousValue = this.animListText.value;
                try {
                    const animList = JSON.parse(this.animListText.value);
                    if (Array.isArray(animList) && animList.every((val: any) => {
                        // Now make sure the array of arrays is valid by limiting the number values to 255
                        return typeof val === 'number' && val >= 0 && val <= 255;
                    })) {
                        this.game.animations[this.currentAnimIndex].frames = animList;
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
            this.fileManager.openAnimationsFile();
        });
        const saveAnimationsButton = document.createElement("button");
        saveAnimationsButton.textContent = "Save";
        saveAnimationsButton.addEventListener("click", () => {
            this.fileManager.saveAnimationsFile();
        });

        // Create a 'Hide/Show' button for the main animation preview
        this.toggleAnimationVisibleButton = document.createElement("button");
        this.toggleAnimationVisibleButton.textContent = "Show";
        this.toggleAnimationVisibleButton.title = "Toggle animation visibility";
        this.toggleAnimationVisibleButton.addEventListener("click", () => {
            this.toggleAnimationVisibility();
        });

        // Create 'Play' and 'Pause' buttons for the main animation preview
        this.toggleAnimationPlayPauseButton = document.createElement("button");
        this.toggleAnimationPlayPauseButton.textContent = "Play";
        this.toggleAnimationPlayPauseButton.title = "Toggle animation play";
        this.toggleAnimationPlayPauseButton.addEventListener("click", () => {
            this.toggleAnimationPlayPause();
        });

        this.mapEditorElement.appendChild(upAnimButton);
        this.mapEditorElement.appendChild(downAnimButton);

        this.mapEditorElement.appendChild(addAnimButton);
        this.mapEditorElement.appendChild(deleteAnimButton);


        this.mapEditorElement.appendChild(this.animInput);
        this.mapEditorElement.appendChild(this.animLabelInput);
        this.mapEditorElement.appendChild(this.animListText);
        this.mapEditorElement.appendChild(openAnimationsButton);
        this.mapEditorElement.appendChild(saveAnimationsButton);

        this.mapEditorElement.appendChild(this.toggleAnimationVisibleButton);
        this.mapEditorElement.appendChild(this.toggleAnimationPlayPauseButton);


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
    toggleAnimationPlayPause(): void {
        if (this.isAnimationPreviewPlaying) {
            this.isAnimationPreviewPlaying = false;
        } else {
            this.isAnimationPreviewPlaying = true;
        }
        // change text from 'Play' to 'Pause' and vice versa
        if (this.toggleAnimationPlayPauseButton) {
            if (this.isAnimationPreviewPlaying) {
                this.toggleAnimationPlayPauseButton.textContent = "Pause";
            } else {
                this.toggleAnimationPlayPauseButton.textContent = "Play";
            }
        }
    }

    toggleAnimationVisibility(): void {
        if (this.isAnimationPreviewVisible) {
            this.isAnimationPreviewVisible = false;
        } else {
            this.isAnimationPreviewVisible = true;
        }
        // change text from 'Show' to 'Hide' and vice versa
        if (this.toggleAnimationVisibleButton) {
            if (this.isAnimationPreviewVisible) {
                this.toggleAnimationVisibleButton.textContent = "Hide";
            } else {
                this.toggleAnimationVisibleButton.textContent = "Show";
            }
        }
    }

    changeSelectedFrame(amount: number): void {
        // If paused and not animating, change the current frame shown of the selected animation (previewAnimationFrame). Roll over if exceeding the number of frames
        // Otherwise, if animating or not visible, ignore.
        if (!this.isAnimationPreviewPlaying && this.isAnimationPreviewVisible) {
            const animation = this.game.animations[this.currentAnimIndex];
            this.previewAnimationFrame = (this.previewAnimationFrame + amount + animation.frames.length) % animation.frames.length;
            console.log('previewAnimationFrame', this.previewAnimationFrame);
        }

    }

    changeSpriteNumber(amount: number): void {
        // If paused and not animating, change the sprite at the current slot of selected animation. 
        // which is the frame at this.game.animations[this.currentAnimIndex].frames[this.previewAnimationFrame]
        // 
        // Roll over if exceeding the number of sprites
        // Otherwise, if animating or not visible, ignore.
        console.log(amount);
        if (!this.isAnimationPreviewPlaying && this.isAnimationPreviewVisible) {
            const animation = this.game.animations[this.currentAnimIndex];
            console.log('was', animation.frames[this.previewAnimationFrame]);
            animation.frames[this.previewAnimationFrame] = (animation.frames[this.previewAnimationFrame] + amount + 256) % 256;
            console.log('sprite number', animation.frames[this.previewAnimationFrame]);
        }
        // Update the input text box with the new value
        if (this.animListText) {
            this.animListText.value = JSON.stringify(this.game.animations[this.currentAnimIndex].frames);
        }

    }


}


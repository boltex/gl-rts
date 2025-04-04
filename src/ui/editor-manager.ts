import { CONFIG } from '../config';
import { Game } from '../game';
import { FileManager } from './file-manager';

export class EditorManager {
    isMapEditorOpen: boolean = false;
    isAnimationPreviewPlaying = false;
    editorMode: "map" | "animation" = "map"; // Default to map editor mode

    private floatingPaletteElement: HTMLDivElement | null = null;
    private mapEditorContainerElement: HTMLDivElement | null = null;
    private animEditorContainerElement: HTMLDivElement | null = null;
    private tilePreview: HTMLDivElement | null = null;
    private tileInput: HTMLInputElement | null = null;
    private currentTileIndex: number = 0; // between 0 and CONFIG.GAME.TILE.DEPTH

    private animInput: HTMLInputElement | null = null;
    private animLabelInput: HTMLInputElement | null = null;
    private animListText: HTMLInputElement | null = null;
    private toggleAnimationPlayPauseButton: HTMLButtonElement | null = null;
    private totalAnimationsLabel: HTMLLabelElement | null = null;

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
        if (!this.floatingPaletteElement) {
            this.buildMapEditor();
        } else {
            // Toggle visibility
            if (this.floatingPaletteElement.style.display === "none" || this.floatingPaletteElement.style.display === "") {
                this.floatingPaletteElement.style.display = "block";
                this.isMapEditorOpen = true;
            } else {
                this.floatingPaletteElement.style.display = "none";
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
            // Select the current frame number in the text
            this.selectFrameInAnimList(this.previewAnimationFrame);
        }

        // restart the preview animation
        this.previewAnimationFrame = 0;
        this.selectFrameInAnimList(this.previewAnimationFrame);
        this.totalAnimationsLabel!.textContent = `Total animations: ${this.game.animations.length}`;

    }

    private buildMapEditor(): void {
        // Create the map editor container
        this.floatingPaletteElement = document.createElement("div");
        this.floatingPaletteElement.style.display = "block";
        this.floatingPaletteElement.id = "map-editor";

        // First should be a radio button to select between map and animation editor
        const mapEditorRadio = document.createElement("input");
        mapEditorRadio.type = "radio";
        mapEditorRadio.name = "editor-mode";
        mapEditorRadio.value = "map";
        mapEditorRadio.checked = true;
        mapEditorRadio.addEventListener("change", () => {
            this.editorMode = "map";
            this.floatingPaletteElement!.classList.remove("anim-mode");
            this.floatingPaletteElement!.classList.add("map-mode");
            // Update the visibility of the map editor container
            if (this.mapEditorContainerElement) {
                this.mapEditorContainerElement.style.display = "block";
            }
            if (this.animEditorContainerElement) {
                this.animEditorContainerElement.style.display = "none";
            }
            this.updateTilePreview();
            this.updateAnimationPreview();
        });
        const mapEditorLabel = document.createElement("label");
        mapEditorLabel.textContent = "Map";
        mapEditorLabel.appendChild(mapEditorRadio);
        this.floatingPaletteElement.appendChild(mapEditorLabel);

        const animationEditorRadio = document.createElement("input");
        animationEditorRadio.type = "radio";
        animationEditorRadio.name = "editor-mode";
        animationEditorRadio.value = "animation";
        animationEditorRadio.addEventListener("change", () => {
            this.editorMode = "animation";
            this.floatingPaletteElement!.classList.remove("map-mode");
            this.floatingPaletteElement!.classList.add("anim-mode");
            // Update the visibility of the animation editor container
            if (this.mapEditorContainerElement) {
                this.mapEditorContainerElement.style.display = "none";
            }
            if (this.animEditorContainerElement) {
                this.animEditorContainerElement.style.display = "block";
            }
            this.updateTilePreview();
            this.updateAnimationPreview();
        });
        const animationEditorLabel = document.createElement("label");
        animationEditorLabel.textContent = "Anim";
        animationEditorLabel.appendChild(animationEditorRadio);
        this.floatingPaletteElement.appendChild(animationEditorLabel);

        // Set the initial class for styling
        this.floatingPaletteElement.classList.add("map-mode");

        // * MAP EDITOR *

        // Create a div to hold all the map editor elements
        this.mapEditorContainerElement = document.createElement("div");
        this.mapEditorContainerElement.id = "map-editor-container";
        this.floatingPaletteElement.appendChild(this.mapEditorContainerElement);
        this.mapEditorContainerElement.appendChild(document.createElement("br"));

        // Show the total of tiles in the atlas
        const totalTilesLabel = document.createElement("label");
        totalTilesLabel.textContent = `Total tiles: ${CONFIG.GAME.TILE.DEPTH}`;
        this.mapEditorContainerElement.appendChild(totalTilesLabel);
        this.mapEditorContainerElement.appendChild(document.createElement("br"));

        // Create a label for the tile preview
        const tilePreviewLabel = document.createElement("label");
        tilePreviewLabel.textContent = "Tile preview:";
        this.mapEditorContainerElement.appendChild(tilePreviewLabel);

        this.mapEditorContainerElement.appendChild(document.createElement("br"));

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
        this.mapEditorContainerElement.appendChild(this.tilePreview);
        this.mapEditorContainerElement.appendChild(upTileButton);
        this.mapEditorContainerElement.appendChild(downTileButton);
        this.mapEditorContainerElement.appendChild(this.tileInput);

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

        this.mapEditorContainerElement.appendChild(document.createElement("br"));
        this.mapEditorContainerElement.appendChild(document.createElement("br"));

        this.mapEditorContainerElement.appendChild(openMapButton);
        this.mapEditorContainerElement.appendChild(saveMapButton);

        // * ANIMATION EDITOR *
        // Create a div to hold all the animation editor elements
        this.animEditorContainerElement = document.createElement("div");
        this.animEditorContainerElement.id = "anim-editor-container";
        this.floatingPaletteElement.appendChild(this.animEditorContainerElement);
        this.animEditorContainerElement.appendChild(document.createElement("br"));

        // Create a label for the animation preview that shows the total of animations
        this.totalAnimationsLabel = document.createElement("label");
        this.totalAnimationsLabel.textContent = `Total animations: ${this.game.animations.length}`;
        this.animEditorContainerElement.appendChild(this.totalAnimationsLabel);
        this.animEditorContainerElement.appendChild(document.createElement("br"));

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
            this.totalAnimationsLabel!.textContent = `Total animations: ${this.game.animations.length}`;
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
                this.totalAnimationsLabel!.textContent = `Total animations: ${this.game.animations.length}`;
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


        // Create 'Rewind' button for the main animation preview
        const rewindAnimationButton = document.createElement("button");
        rewindAnimationButton.textContent = "⏮";
        rewindAnimationButton.title = "Go to first frame";
        rewindAnimationButton.addEventListener("click", () => {
            this.rewindAnimation();
        });

        // Create 'Play' and 'Pause' buttons for the main animation preview
        this.toggleAnimationPlayPauseButton = document.createElement("button");
        if (this.isAnimationPreviewPlaying) {
            this.toggleAnimationPlayPauseButton.textContent = "⏸";
        } else {
            this.toggleAnimationPlayPauseButton.textContent = "▶";
        }
        this.toggleAnimationPlayPauseButton.title = "Toggle animation play";
        this.toggleAnimationPlayPauseButton.addEventListener("click", () => {
            this.toggleAnimationPlayPause();
        });

        // Create 'Fast Forward' button for the main animation preview
        const fastForwardAnimationButton = document.createElement("button");
        fastForwardAnimationButton.textContent = "⏭";
        fastForwardAnimationButton.title = "Go to last frame";
        fastForwardAnimationButton.addEventListener("click", () => {
            this.fastForwardAnimation();
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

        this.animEditorContainerElement.appendChild(upAnimButton);
        this.animEditorContainerElement.appendChild(downAnimButton);

        this.animEditorContainerElement.appendChild(addAnimButton);
        this.animEditorContainerElement.appendChild(deleteAnimButton);

        this.animEditorContainerElement.appendChild(this.animInput);
        this.animEditorContainerElement.appendChild(this.animLabelInput);

        this.animEditorContainerElement.appendChild(document.createElement("br"));
        this.animEditorContainerElement.appendChild(document.createElement("br"));

        this.animEditorContainerElement.appendChild(this.animListText);

        this.animEditorContainerElement.appendChild(document.createElement("br"));
        this.animEditorContainerElement.appendChild(document.createElement("br"));

        this.animEditorContainerElement.appendChild(rewindAnimationButton);
        this.animEditorContainerElement.appendChild(this.toggleAnimationPlayPauseButton);
        this.animEditorContainerElement.appendChild(fastForwardAnimationButton);

        this.animEditorContainerElement.appendChild(document.createElement("br"));
        this.animEditorContainerElement.appendChild(document.createElement("br"));

        this.animEditorContainerElement.appendChild(openAnimationsButton);
        this.animEditorContainerElement.appendChild(saveAnimationsButton);

        // Set the initial visibility of the map editor container
        if (this.mapEditorContainerElement) {
            this.mapEditorContainerElement.style.display = "block";
        }
        if (this.animEditorContainerElement) {
            this.animEditorContainerElement.style.display = "none";
        }

        // Append the map editor container to the document body
        document.body.appendChild(this.floatingPaletteElement);

        // Make the map editor draggable
        this.addDragElement(this.floatingPaletteElement);
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
                this.toggleAnimationPlayPauseButton.textContent = "⏸";
            } else {
                this.toggleAnimationPlayPauseButton.textContent = "▶";
            }
        }
    }

    rotatePreview(amount: number): void {
        // Adjust previewAnimationOrientation by amount
        // Roll over if exceeding the number of orientations (16, from 0 to 15)
        // Otherwise, if not visible, ignore.
        if (this.editorMode === "animation") {
            this.previewAnimationOrientation = (this.previewAnimationOrientation + amount + 16) % 16;
        }
    }

    changeSelectedFrame(amount: number): void {
        // If paused and not animating, change the current frame shown of the selected animation (previewAnimationFrame). Roll over if exceeding the number of frames
        // Otherwise, if animating or not visible, ignore.
        if (!this.isAnimationPreviewPlaying && this.editorMode === "animation") {
            const animation = this.game.animations[this.currentAnimIndex];
            this.previewAnimationFrame = (this.previewAnimationFrame + amount + animation.frames.length) % animation.frames.length;
            this.selectFrameInAnimList(this.previewAnimationFrame);
        }
    }

    rewindAnimation(): void {
        if (!this.isAnimationPreviewPlaying && this.editorMode === "animation") {
            this.previewAnimationFrame = 0; // Set to first frame
            this.selectFrameInAnimList(this.previewAnimationFrame);
        }
    }

    fastForwardAnimation(): void {
        if (!this.isAnimationPreviewPlaying && this.editorMode === "animation") {
            const animation = this.game.animations[this.currentAnimIndex];
            this.previewAnimationFrame = animation.frames.length - 1; // Set to last frame
            this.selectFrameInAnimList(this.previewAnimationFrame);
        }
    }

    changeSpriteNumber(amount: number): void {
        // If paused and not animating, change the sprite at the current slot of selected animation. 
        // which is the frame at this.game.animations[this.currentAnimIndex].frames[this.previewAnimationFrame]
        // 
        // Roll over if exceeding the number of sprites
        // Otherwise, if animating or not visible, ignore.
        if (!this.isAnimationPreviewPlaying && this.editorMode === "animation") {
            const animation = this.game.animations[this.currentAnimIndex];
            animation.frames[this.previewAnimationFrame] = (animation.frames[this.previewAnimationFrame] + amount + 256) % 256;
        }
        // Update the input text box with the new value
        if (this.animListText) {
            this.animListText.value = JSON.stringify(this.game.animations[this.currentAnimIndex].frames);
        }

    }

    private selectFrameInAnimList(index: number): void {
        if (!this.animListText) { return; };

        const text = this.animListText.value;
        try {
            const array = JSON.parse(text);
            if (!Array.isArray(array) || index < 0 || index >= array.length) {
                return;
            }

            // Start after the opening bracket
            let pos = text.indexOf('[') + 1;
            let currentIndex = 0;

            // Navigate to our target index
            while (currentIndex < index) {
                pos = text.indexOf(',', pos) + 1;
                if (pos <= 0) {
                    return;
                } // No comma found
                currentIndex++;
            }

            // Skip whitespace
            while (pos < text.length && /\s/.test(text[pos])) {
                pos++;
            }

            const start = pos;

            // Find the end (next comma or closing bracket)
            let end = text.indexOf(',', start);
            if (end === -1 || end > text.indexOf(']', start)) {
                end = text.indexOf(']', start);
            }

            // Adjust end to exclude trailing whitespace
            let adjustedEnd = end;
            while (adjustedEnd > start && /\s/.test(text[adjustedEnd - 1])) {
                adjustedEnd--;
            }

            this.animListText.setSelectionRange(start, adjustedEnd);
            this.animListText.focus();
        } catch (e) {
            console.error("Error selecting frame in animation list:", e);
        }
    }

}


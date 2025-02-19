import { CONFIG } from "./config";
import { Game } from "./game";

export class UIManager {

    // Command Acknowledged Widget Animation Properties
    widgetAnim: number = 0;
    widgetAnimTotal: number = CONFIG.UI.WIDGET.ANIMATION_FRAMES;
    widgetAnimX: number = 0;
    widgetAnimY: number = 0;

    private game: Game;
    private startButtonElement: HTMLButtonElement;
    private documentElementClassList: DOMTokenList; // Css rules rely on this to change cursor.
    private currentCursorClass: string = ""; // Mouse Cursor: cur-pointer, cur-target..

    // Map Editor properties
    isMapEditorOpen: boolean = false;
    private mapEditorElement: HTMLDivElement | null = null;
    private tilePreview: HTMLDivElement | null = null;
    private tileInput: HTMLInputElement | null = null;
    private fileInput: HTMLInputElement | null = null;
    private fileInputFor: 'map' | 'entity' | 'animation' = 'map';
    private currentTileIndex: number = 0; // between 0 and CONFIG.GAME.TILE.DEPTH

    private animInput: HTMLInputElement | null = null;
    private animListText: HTMLInputElement | null = null;
    private currentAnimIndex: number = 0;

    // Game Menu properties
    /*
        Options:
        - Screen Size (Radio buttons)
        - Game Speed (Range input)
        - Keyboard Scroll Speed (Range input)
        - Scroll Speed (Range input)
        - Drag Speed (Range input)
        - Invert Drag (Checkbox)
    */

    isMenuOpen: boolean = false;
    private oldSettings: any;
    private gameMenuElement: HTMLDivElement | null = null;
    private resolutionSelectElement: HTMLSelectElement | null = null;
    private gameSpeedRange: HTMLInputElement | null = null;
    private keyboardScrollSpeedRange: HTMLInputElement | null = null;
    private scrollSpeedRange: HTMLInputElement | null = null;
    private dragSpeedRange: HTMLInputElement | null = null;
    private invertDragCheckbox: HTMLInputElement | null = null;

    constructor(game: Game) {
        this.game = game;
        this.documentElementClassList = document.documentElement.classList;
        this.startButtonElement = document.createElement("button");
    }

    mainMenu(): void {
        // Create the start button
        this.startButtonElement.textContent = "Start Game";
        this.startButtonElement.classList.add("btn-start");
        document.body.appendChild(this.startButtonElement);
    }

    setCursor(newClass: string): void {
        if (this.currentCursorClass !== newClass) {
            if (this.currentCursorClass) {
                this.documentElementClassList.remove(this.currentCursorClass);
            }
            this.documentElementClassList.add(newClass);
            this.currentCursorClass = newClass;
        }
    }

    toggleGameMenu(): void {
        // Create the game menu elements
        if (!this.gameMenuElement) {
            this.buildGameMenu();
        } else {
            // Toggle visibility
            if (this.gameMenuElement.style.display === "none" || this.gameMenuElement.style.display === "") {
                this.gameMenuElement.style.display = "block";
                this.isMenuOpen = true;
            } else {
                this.gameMenuElement.style.display = "none";
                this.isMenuOpen = false;
            }
        }
        if (this.gameMenuElement) {
            // Set control values from the game options
            this.setMenuControlValues();
            // Preserve those settings in case the user changes them and cancels.
            this.oldSettings = {
                resolutionIndex: this.game.resolutionIndex,
                gameSpeedIndex: this.game.gameSpeedIndex,
                keyboardSpeedIndex: this.game.keyboardSpeedIndex,
                scrollSpeedIndex: this.game.scrollSpeedIndex,
                dragSpeedIndex: this.game.dragSpeedIndex,
                invertDrag: this.game.invertDrag
            };
        }
    }

    setMenuControlValues(): void {
        if (this.resolutionSelectElement) {
            this.resolutionSelectElement.selectedIndex = this.game.resolutionIndex;
        }
        if (this.gameSpeedRange) {
            this.gameSpeedRange.value = this.game.gameSpeedIndex.toString();
        }
        if (this.keyboardScrollSpeedRange) {
            this.keyboardScrollSpeedRange.value = this.game.keyboardSpeedIndex.toString();
        }
        if (this.scrollSpeedRange) {
            this.scrollSpeedRange.value = this.game.scrollSpeedIndex.toString();
        }
        if (this.dragSpeedRange) {
            this.dragSpeedRange.value = this.game.dragSpeedIndex.toString();
        }
        if (this.invertDragCheckbox) {
            this.invertDragCheckbox.checked = this.game.invertDrag;
        }
    }

    animateCursor(): void {
        if (this.widgetAnim) {
            this.widgetAnim += 1;
            if (this.widgetAnim > this.widgetAnimTotal) {
                this.widgetAnim = 0;
            }
        }
    }

    getStartButtonElement(): HTMLButtonElement {
        return this.startButtonElement;
    }

    getResolutionSelectElement(): HTMLSelectElement | null {
        return this.resolutionSelectElement;
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

        // Create open and Save map buttons
        const openMapButton = document.createElement("button");
        openMapButton.textContent = "Open";
        openMapButton.addEventListener("click", () => {
            this.openMapFile();
        });
        const saveMapButton = document.createElement("button");
        saveMapButton.textContent = "Save";
        saveMapButton.addEventListener("click", () => {
            this.saveMapFile();
        });
        // Append elements to map editor container
        this.mapEditorElement.appendChild(this.tilePreview);
        this.mapEditorElement.appendChild(upTileButton);
        this.mapEditorElement.appendChild(downTileButton);
        this.mapEditorElement.appendChild(this.tileInput);
        this.mapEditorElement.appendChild(this.fileInput);
        // Insert newline
        this.mapEditorElement.appendChild(document.createElement("br"));
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
        this.animInput.max = (CONFIG.GAME.TILE.DEPTH - 1).toString();
        this.animInput.value = this.currentAnimIndex.toString();
        this.animInput.addEventListener("change", () => {
            if (this.animInput) {
                let newValue = parseInt(this.animInput.value, 10);
                if (isNaN(newValue)) newValue = 0;
                const min = 0;
                const max = CONFIG.GAME.TILE.DEPTH - 1;
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
                try {
                    const animList = JSON.parse(this.animListText.value);
                    if (Array.isArray(animList) && animList.every((val: any) => typeof val === 'number')) {
                        this.game.animations[this.currentAnimIndex] = animList;
                    } else {
                        throw new Error('Invalid animation list');
                    }
                } catch (err) {
                    console.error('Error parsing animation list:', err);
                }
            }
        });

        // Create open and Save buttons
        const openAnimationsButton = document.createElement("button");
        openAnimationsButton.textContent = "Open";
        openAnimationsButton.addEventListener("click", () => {
            this.openAnimationsFile();
        });
        const saveAnimationsButton = document.createElement("button");
        saveAnimationsButton.textContent = "Save";
        saveAnimationsButton.addEventListener("click", () => {
            this.saveAnimationsFile();
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

    buildGameMenu(): void {
        this.gameMenuElement = document.createElement("div");
        this.gameMenuElement.id = "game-menu";
        this.gameMenuElement.style.display = "block";

        // 'Option' heading
        const heading = document.createElement("h2");
        heading.textContent = "Options";
        this.gameMenuElement.appendChild(heading);

        // Create the dropdown for screen resolution
        const gameResolution = document.createElement("label");
        gameResolution.htmlFor = "resolution-select";
        gameResolution.textContent = "Resolution";
        this.gameMenuElement.appendChild(gameResolution);
        this.resolutionSelectElement = document.createElement("select");
        this.resolutionSelectElement.id = "resolution-select";
        this.resolutionSelectElement.classList.add("resolution-select");

        // Populate the dropdown with options
        for (const { label, width, height } of CONFIG.DISPLAY.RESOLUTIONS) {
            const option = document.createElement("option");
            option.value = `${width}x${height}`;
            option.textContent = label;
            this.resolutionSelectElement.appendChild(option);
        }
        this.resolutionSelectElement.selectedIndex = CONFIG.DISPLAY.DEFAULT_RESOLUTION;
        this.resolutionSelectElement.addEventListener("change", () => {
            if (this.resolutionSelectElement) {
                const selectedResolutionIndex = this.resolutionSelectElement.selectedIndex;
                this.game.setResolution(selectedResolutionIndex);
            }
        });
        this.gameMenuElement.appendChild(this.resolutionSelectElement);
        this.gameMenuElement.appendChild(document.createElement("br"));

        // Create the game speed range input made of two buttons to decrement and increment, 
        // with a disabled range input in the middle.
        const gameSpeedLabel = document.createElement("label");
        gameSpeedLabel.textContent = "Game Speed";
        this.gameMenuElement.appendChild(gameSpeedLabel);

        const gameSpeedDecrement = document.createElement("button");
        gameSpeedDecrement.textContent = "-";
        gameSpeedDecrement.addEventListener("click", () => {
            this.game.decrementGameSpeed();
            if (this.gameSpeedRange) {
                this.gameSpeedRange.value = this.game.gameSpeedIndex.toString();
            }
        });
        this.gameMenuElement.appendChild(gameSpeedDecrement);
        this.gameSpeedRange = document.createElement("input");
        this.gameSpeedRange.type = "range";
        this.gameSpeedRange.min = "0";
        this.gameSpeedRange.max = "6";
        this.gameSpeedRange.step = "1";
        this.gameSpeedRange.value = "3";
        this.gameSpeedRange.disabled = true;
        this.gameSpeedRange.addEventListener("change", () => {
            console.log('gameSpeedRange changed to:', this.gameSpeedRange?.value);
        });
        this.gameMenuElement.appendChild(this.gameSpeedRange);
        const gameSpeedIncrement = document.createElement("button");
        gameSpeedIncrement.textContent = "+";
        gameSpeedIncrement.addEventListener("click", () => {
            this.game.incrementGameSpeed();
            if (this.gameSpeedRange) {
                this.gameSpeedRange.value = this.game.gameSpeedIndex.toString();
            }
        });
        this.gameMenuElement.appendChild(gameSpeedIncrement);
        this.gameMenuElement.appendChild(document.createElement("br"));

        // Create mouse scroll speed range input made of two buttons to decrement and increment, 
        // with a disabled range input in the middle.
        const scrollSpeedLabel = document.createElement("label");
        scrollSpeedLabel.textContent = "Mouse Scroll Speed";
        this.gameMenuElement.appendChild(scrollSpeedLabel);

        const scrollSpeedDecrement = document.createElement("button");
        scrollSpeedDecrement.textContent = "-";
        scrollSpeedDecrement.addEventListener("click", () => {
            this.game.decrementScrollSpeed();
            if (this.scrollSpeedRange) {
                this.scrollSpeedRange.value = this.game.scrollSpeedIndex.toString();
            }
        });
        this.gameMenuElement.appendChild(scrollSpeedDecrement);
        this.scrollSpeedRange = document.createElement("input");
        this.scrollSpeedRange.type = "range";
        this.scrollSpeedRange.min = "0";
        this.scrollSpeedRange.max = "6";
        this.scrollSpeedRange.step = "1";
        this.scrollSpeedRange.value = "3";
        this.scrollSpeedRange.disabled = true;
        this.gameMenuElement.appendChild(this.scrollSpeedRange);
        const scrollSpeedIncrement = document.createElement("button");
        scrollSpeedIncrement.textContent = "+";
        scrollSpeedIncrement.addEventListener("click", () => {
            this.game.incrementScrollSpeed();
            if (this.scrollSpeedRange) {
                this.scrollSpeedRange.value = this.game.scrollSpeedIndex.toString();
            }
        });
        this.gameMenuElement.appendChild(scrollSpeedIncrement);
        this.gameMenuElement.appendChild(document.createElement("br"));

        // Create keyboard scroll speed range input made of two buttons to decrement and increment, 
        // with a disabled range input in the middle.
        const keyboardScrollSpeedLabel = document.createElement("label");
        keyboardScrollSpeedLabel.textContent = "Keyboard Scroll Speed";
        this.gameMenuElement.appendChild(keyboardScrollSpeedLabel);

        const keyboardScrollSpeedDecrement = document.createElement("button");
        keyboardScrollSpeedDecrement.textContent = "-";
        keyboardScrollSpeedDecrement.addEventListener("click", () => {
            this.game.decrementKeyboardSpeed();
            if (this.keyboardScrollSpeedRange) {
                this.keyboardScrollSpeedRange.value = this.game.keyboardSpeedIndex.toString();
            }
        });
        this.gameMenuElement.appendChild(keyboardScrollSpeedDecrement);
        this.keyboardScrollSpeedRange = document.createElement("input");
        this.keyboardScrollSpeedRange.type = "range";
        this.keyboardScrollSpeedRange.min = "0";
        this.keyboardScrollSpeedRange.max = "6";
        this.keyboardScrollSpeedRange.step = "1";
        this.keyboardScrollSpeedRange.value = "3";
        this.keyboardScrollSpeedRange.disabled = true;
        this.gameMenuElement.appendChild(this.keyboardScrollSpeedRange);
        const keyboardScrollSpeedIncrement = document.createElement("button");
        keyboardScrollSpeedIncrement.textContent = "+";
        keyboardScrollSpeedIncrement.addEventListener("click", () => {
            this.game.incrementKeyboardSpeed();
            if (this.keyboardScrollSpeedRange) {
                this.keyboardScrollSpeedRange.value = this.game.keyboardSpeedIndex.toString();
            }
        });
        this.gameMenuElement.appendChild(keyboardScrollSpeedIncrement);
        this.gameMenuElement.appendChild(document.createElement("br"));

        // Create drag scroll speed range input made of two buttons to decrement and increment, 
        // with a disabled range input in the middle.
        const dragSpeedLabel = document.createElement("label");
        dragSpeedLabel.textContent = "Drag Scroll Speed";
        this.gameMenuElement.appendChild(dragSpeedLabel);

        const dragSpeedDecrement = document.createElement("button");
        dragSpeedDecrement.textContent = "-";
        dragSpeedDecrement.addEventListener("click", () => {
            this.game.decrementDragSpeed();
            if (this.dragSpeedRange) {
                this.dragSpeedRange.value = this.game.dragSpeedIndex.toString();
            }
        });
        this.gameMenuElement.appendChild(dragSpeedDecrement);
        this.dragSpeedRange = document.createElement("input");
        this.dragSpeedRange.type = "range";
        this.dragSpeedRange.min = "0";
        this.dragSpeedRange.max = "6";
        this.dragSpeedRange.step = "1";
        this.dragSpeedRange.value = "3";
        this.dragSpeedRange.disabled = true;
        this.gameMenuElement.appendChild(this.dragSpeedRange);
        const dragSpeedIncrement = document.createElement("button");
        dragSpeedIncrement.textContent = "+";
        dragSpeedIncrement.addEventListener("click", () => {
            this.game.incrementDragSpeed();
            if (this.dragSpeedRange) {
                this.dragSpeedRange.value = this.game.dragSpeedIndex.toString();
            }
        });
        this.gameMenuElement.appendChild(dragSpeedIncrement);
        this.gameMenuElement.appendChild(document.createElement("br"));

        // Create invert-drag checkbox
        const invertDragLabel = document.createElement("label");
        invertDragLabel.textContent = "Invert Drag Scroll";
        invertDragLabel.htmlFor = "invert-drag";
        this.gameMenuElement.appendChild(invertDragLabel);
        this.invertDragCheckbox = document.createElement("input");
        this.invertDragCheckbox.id = "invert-drag";
        this.invertDragCheckbox.type = "checkbox";
        this.invertDragCheckbox.checked = false;
        this.invertDragCheckbox.addEventListener("change", () => {
            this.game.changeInvertDrag(!!this.invertDragCheckbox?.checked);
            // No need to update the checkbox value as it updates itself.
        });
        this.gameMenuElement.appendChild(this.invertDragCheckbox);
        this.gameMenuElement.appendChild(document.createElement("br"));

        // Add 'OK' and 'Cancel' buttons
        const okButton = document.createElement("button");
        okButton.textContent = "OK";
        okButton.id = "ok-button";
        okButton.addEventListener("click", () => {
            // Close the menu, no need to apply the settings as they are already applied.
            // Save those to local storage.
            this.game.saveSettingsLocalStorage();
            this.toggleGameMenu();
        });
        this.gameMenuElement.appendChild(okButton);

        const cancelButton = document.createElement("button");
        cancelButton.textContent = "Cancel";
        cancelButton.id = "cancel-button";
        cancelButton.addEventListener("click", () => {
            // Close the menu and restore the old settings
            this.game.setResolution(this.oldSettings.resolutionIndex);
            this.game.setGameSpeed(this.oldSettings.gameSpeedIndex);
            this.game.setKeyboardSpeed(this.oldSettings.keyboardSpeedIndex);
            this.game.setScrollSpeed(this.oldSettings.scrollSpeedIndex);
            this.game.setDragSpeed(this.oldSettings.dragSpeedIndex);
            this.game.changeInvertDrag(this.oldSettings.invertDrag);
            this.toggleGameMenu();
        });
        this.gameMenuElement.appendChild(cancelButton);

        // Append the game menu container to the document body
        document.body.appendChild(this.gameMenuElement);
        this.isMenuOpen = true;
    }

    private addDragElement(elm: HTMLElement): void {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

        elm.addEventListener("mousedown", dragMouseDown);

        function dragMouseDown(e: MouseEvent): void {
            // Only drad if mouse event is directly on the mapEditorElement, not on the buttons or input.
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

    incrementMapTile() {
        this.currentTileIndex = (this.currentTileIndex + 1) % CONFIG.GAME.TILE.DEPTH;
        this.updateTilePreview();
        if (this.tileInput) {
            this.tileInput.value = this.currentTileIndex.toString();
        }
    }

    decrementMapTile(): void {
        this.currentTileIndex = (this.currentTileIndex - 1 + CONFIG.GAME.TILE.DEPTH) % CONFIG.GAME.TILE.DEPTH;
        this.updateTilePreview();
        if (this.tileInput) {
            this.tileInput.value = this.currentTileIndex.toString();
        }
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

    setTileSelectIndex(index: number): void {
        this.currentTileIndex = index;
        if (this.tileInput) {
            this.tileInput.value = index.toString();
        }
        this.updateTilePreview();
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


    updateAnimationPreview(): void {
        // Put the content of the current animation list into the animListText input.
        if (this.animListText) {
            this.animListText.value = JSON.stringify(this.game.animations[this.currentAnimIndex]);
        }
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


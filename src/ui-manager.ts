import { CONFIG } from "./config";
import { Game } from "./game";

export class UIManager {

    // Command Acknowledged Widget Animation Properties
    widgetAnim: number = 0;
    widgetAnimTotal: number = 6;
    widgetAnimX: number = 0;
    widgetAnimY: number = 0;

    private game: Game;
    private startButtonElement: HTMLButtonElement;
    private resolutionSelectElement: HTMLSelectElement;
    private documentElementClassList: DOMTokenList; // Css rules rely on this to change cursor.
    private currentCursorClass: string = ""; // Mouse Cursor: cur-pointer, cur-target..

    // Map Editor properties
    private mapEditorElement: HTMLDivElement | null = null;
    private tilePreview: HTMLDivElement | null = null;
    private tileInput: HTMLInputElement | null = null;
    private fileInput: HTMLInputElement | null = null;
    private fileInputFor: 'map' | 'entity' | 'animation' = 'map';
    private currentTileIndex: number = 0; // between 0 and CONFIG.GAME.TILE.DEPTH

    private animInput: HTMLInputElement | null = null;
    private animListText: HTMLInputElement | null = null;
    private currentAnimIndex: number = 0;

    constructor(game: Game) {
        this.game = game;
        this.documentElementClassList = document.documentElement.classList;
        this.startButtonElement = document.createElement("button");
        this.resolutionSelectElement = document.createElement("select");
    }

    mainMenu(): void {
        // Create the start button
        this.startButtonElement.textContent = "Start Game";
        this.startButtonElement.classList.add("btn-start");
        document.body.appendChild(this.startButtonElement);

        // Create the dropdown for screen resolution
        this.resolutionSelectElement.classList.add("resolution-select");

        // Populate the dropdown with options
        for (const { label, width, height } of CONFIG.DISPLAY.RESOLUTIONS) {
            const option = document.createElement("option");
            option.value = `${width}x${height}`;
            option.textContent = label;
            this.resolutionSelectElement.appendChild(option);
        }
        document.body.appendChild(this.resolutionSelectElement);
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
        console.log('Toggle Options Menu');
        // Further implementation for an in-game options menu.
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

    getResolutionSelectElement(): HTMLSelectElement {
        return this.resolutionSelectElement;
    }

    toggleMapEditor(): void {
        if (!this.mapEditorElement) {
            this.buildMapEditor();
        } else {
            // Toggle visibility
            if (this.mapEditorElement.style.display === "none" || this.mapEditorElement.style.display === "") {
                this.mapEditorElement.style.display = "block";
            } else {
                this.mapEditorElement.style.display = "none";
            }
        }
    }

    isMapEditorVisible(): boolean {
        return this.mapEditorElement !== null &&
            (this.mapEditorElement.style.display === "block");
    }

    getSelectedTileIndex(): number {
        return this.currentTileIndex;
    }

    private buildMapEditor(): void {
        // Create the map editor container
        this.mapEditorElement = document.createElement("div");
        this.mapEditorElement.id = "map-editor";
        Object.assign(this.mapEditorElement.style, {
            position: "absolute",
            top: "10px",
            right: "10px",
            width: "130px",
            height: "280px",
            textAlign: "center",
            backgroundColor: "#ccc",
            border: "1px solid #333",
            padding: "10px",
            zIndex: "10",
            cursor: "move",
            display: "block",
        });

        // Create tile preview element using the atlas (using background positioning)
        this.tilePreview = document.createElement("div");
        Object.assign(this.tilePreview.style, {
            width: `${CONFIG.GAME.TILE.SIZE}px`,
            height: `${CONFIG.GAME.TILE.SIZE}px`,
            backgroundImage: "url('images/map-tiles-vertical.png')",
            backgroundRepeat: "no-repeat",
            cursor: "default",
            marginBottom: "10px",
            border: "1px solid #333",
            pointerEvents: "none"
        });
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
                const newValue = parseInt(this.tileInput.value, 10);
                if (!isNaN(newValue) && newValue >= 0 && newValue < CONFIG.GAME.TILE.DEPTH) {
                    this.currentTileIndex = newValue;
                    this.updateTilePreview();
                }
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
                const newValue = parseInt(this.animInput.value, 10);
                if (!isNaN(newValue) && newValue >= 0 && newValue < CONFIG.GAME.TILE.DEPTH) {
                    this.currentAnimIndex = newValue;
                    // this.updateAnimPreview();
                    console.log('currentAnimIndex', newValue);
                    // todo
                }
            }
        });
        // Create text input for animation lists to be parsed like: "[0,1,2,22,33,255]"
        this.animListText = document.createElement("input");
        this.animListText.type = "text";
        this.animListText.style.width = "120px";
        this.animListText.value = "";
        this.animListText.addEventListener("change", () => {
            if (this.animListText) {
                console.log("animListText changed to:", this.animListText.value);
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
    }

    private addDragElement(elm: HTMLElement): void {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

        elm.addEventListener("mousedown", dragMouseDown);

        const self = this; // if needed for future reference

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
        //
        this.currentAnimIndex = (this.currentAnimIndex + 1) % CONFIG.GAME.ANIMATIONS.TOTAL;
        if (this.animInput) {
            this.animInput.value = this.currentAnimIndex.toString();
        }
        this.updateAnimationPreview();
    }

    decrementAnimation(): void {
        //
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
        //
        // Todo
        console.log("todo openAnimationsFile");
    }

    saveAnimationsFile(): void {
        //
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
        //
        //
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


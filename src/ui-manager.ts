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
    private currentTileIndex: number = 0; // between 0 and 63

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
            height: "180px",
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
            width: "128px",
            height: "128px",
            backgroundImage: "url('images/plancher-vertical.png')",
            backgroundRepeat: "no-repeat",
            cursor: "default",
            marginBottom: "10px",
            border: "1px solid #333",
        });
        this.updateTilePreview();

        // Create Up and Down buttons
        const upButton = document.createElement("button");
        upButton.textContent = "▲";
        upButton.addEventListener("click", () => {
            this.currentTileIndex = (this.currentTileIndex + 1) % 64;
            this.updateTilePreview();
            if (this.tileInput) {
                this.tileInput.value = this.currentTileIndex.toString();  // sync with input
            }
        });

        const downButton = document.createElement("button");
        downButton.textContent = "▼";
        downButton.addEventListener("click", () => {
            this.currentTileIndex = (this.currentTileIndex - 1 + 64) % 64;
            this.updateTilePreview();
            if (this.tileInput) {
                this.tileInput.value = this.currentTileIndex.toString();  // sync with input
            }
        });

        // Create number input to manually select tile index
        this.tileInput = document.createElement("input");
        this.tileInput.type = "number";
        this.tileInput.min = "0";
        this.tileInput.max = "63";
        this.tileInput.value = this.currentTileIndex.toString();
        this.tileInput.addEventListener("change", () => {
            if (this.tileInput) {
                console.log('digit changed', this.tileInput.value);
                const newValue = parseInt(this.tileInput.value, 10);
                if (!isNaN(newValue) && newValue >= 0 && newValue < 64) {
                    this.currentTileIndex = newValue;
                    this.updateTilePreview();
                }
            }
        });

        // Create open and Save buttons
        const openButton = document.createElement("button");
        openButton.textContent = "Open";
        openButton.addEventListener("click", () => {
            this.game.openMap();
        });
        const saveButton = document.createElement("button");
        saveButton.textContent = "Save";
        saveButton.addEventListener("click", () => {
            this.game.saveMap();
        });

        // Append elements to map editor container
        this.mapEditorElement.appendChild(this.tilePreview);
        this.mapEditorElement.appendChild(upButton);
        this.mapEditorElement.appendChild(downButton);
        this.mapEditorElement.appendChild(this.tileInput);
        // Insert newline
        this.mapEditorElement.appendChild(document.createElement("br"));
        this.mapEditorElement.appendChild(openButton);
        this.mapEditorElement.appendChild(saveButton);

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
    private updateTilePreview(): void {
        if (this.tilePreview) {
            // Calculate background position so that the preview shows only the selected tile.
            // Assuming vertical stacking: the Y offset is negative (tileIndex * 128)
            this.tilePreview.style.backgroundPosition = `0px -${this.currentTileIndex * 128}px`;
            // Optionally adjust background size if your atlas image size differs.
            this.tilePreview.style.backgroundSize = "128px 8192px";
        }
    }
    setTileSelectIndex(index: number): void {
        this.currentTileIndex = index;
        if (this.tileInput) {
            this.tileInput.value = index.toString();
        }
        this.updateTilePreview();
    }


}


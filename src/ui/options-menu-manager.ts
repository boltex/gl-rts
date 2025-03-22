import { CONFIG } from '../config';
import { Game } from '../game';

export class OptionsMenuManager {
    isMenuOpen: boolean = false;
    private oldSettings: any;
    private gameMenuElement: HTMLDivElement | null = null;
    private resolutionSelectElement: HTMLSelectElement | null = null;
    private gameSpeedRange: HTMLInputElement | null = null;
    private keyboardScrollSpeedRange: HTMLInputElement | null = null;
    private scrollSpeedRange: HTMLInputElement | null = null;
    private dragSpeedRange: HTMLInputElement | null = null;
    private invertDragCheckbox: HTMLInputElement | null = null;
    private toggleMusicCheckbox: HTMLInputElement | null = null;
    private musicVolumeRange: HTMLInputElement | null = null;
    private toggleSoundCheckbox: HTMLInputElement | null = null;
    private soundVolumeRange: HTMLInputElement | null = null;

    private game: Game;

    constructor(game: Game) {
        this.game = game;
    }

    toggleMenu(): void {
        // Create the game menu elements
        if (!this.gameMenuElement) {
            this.buildMenu();
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

    cancelMenu(): void {
        // Close the menu and restore the old settings
        this.game.setResolution(this.oldSettings.resolutionIndex);
        this.game.setGameSpeed(this.oldSettings.gameSpeedIndex);
        this.game.setKeyboardSpeed(this.oldSettings.keyboardSpeedIndex);
        this.game.setScrollSpeed(this.oldSettings.scrollSpeedIndex);
        this.game.setDragSpeed(this.oldSettings.dragSpeedIndex);
        this.game.changeInvertDrag(this.oldSettings.invertDrag);
        this.toggleMenu();
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

    getResolutionSelectElement(): HTMLSelectElement | null {
        return this.resolutionSelectElement;
    }

    buildMenu(): void {
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
        const gameSpeedLabel = document.createElement("label");
        gameSpeedLabel.textContent = "Game Speed";
        gameSpeedLabel.htmlFor = "game-speed";
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
        this.gameSpeedRange.id = "game-speed";
        this.gameSpeedRange.type = "range";
        this.gameSpeedRange.min = "0";
        this.gameSpeedRange.max = "6";
        this.gameSpeedRange.step = "1";
        this.gameSpeedRange.value = "3";
        this.gameSpeedRange.addEventListener("change", () => {
            if (this.gameSpeedRange) {
                this.game.setGameSpeed(parseInt(this.gameSpeedRange.value, 10));
            }
        });
        this.gameMenuElement.appendChild(this.gameSpeedRange);
        const gameSpeedIncrement = document.createElement("button");
        gameSpeedIncrement.classList.add("button-increment");
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
        const scrollSpeedLabel = document.createElement("label");
        scrollSpeedLabel.textContent = "Mouse Scroll Speed";
        scrollSpeedLabel.htmlFor = "scroll-speed";
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
        this.scrollSpeedRange.id = "scroll-speed";
        this.scrollSpeedRange.type = "range";
        this.scrollSpeedRange.min = "0";
        this.scrollSpeedRange.max = "6";
        this.scrollSpeedRange.step = "1";
        this.scrollSpeedRange.value = "3";
        this.scrollSpeedRange.addEventListener("change", () => {
            if (this.scrollSpeedRange) {
                this.game.setScrollSpeed(parseInt(this.scrollSpeedRange.value, 10));
            }
        });
        this.gameMenuElement.appendChild(this.scrollSpeedRange);
        const scrollSpeedIncrement = document.createElement("button");
        scrollSpeedIncrement.classList.add("button-increment");
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
        const keyboardScrollSpeedLabel = document.createElement("label");
        keyboardScrollSpeedLabel.textContent = "Keyboard Scroll Speed";
        keyboardScrollSpeedLabel.htmlFor = "keyboard-scroll-speed";
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
        this.keyboardScrollSpeedRange.id = "keyboard-scroll-speed";
        this.keyboardScrollSpeedRange.type = "range";
        this.keyboardScrollSpeedRange.min = "0";
        this.keyboardScrollSpeedRange.max = "6";
        this.keyboardScrollSpeedRange.step = "1";
        this.keyboardScrollSpeedRange.value = "3";
        this.keyboardScrollSpeedRange.addEventListener("change", () => {
            if (this.keyboardScrollSpeedRange) {
                console.log('keyboardScrollSpeedRange changed to:', this.keyboardScrollSpeedRange.value);
                this.game.setKeyboardSpeed(parseInt(this.keyboardScrollSpeedRange.value, 10));
            }
        });
        this.gameMenuElement.appendChild(this.keyboardScrollSpeedRange);
        const keyboardScrollSpeedIncrement = document.createElement("button");
        keyboardScrollSpeedIncrement.classList.add("button-increment");
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
        const dragSpeedLabel = document.createElement("label");
        dragSpeedLabel.htmlFor = "drag-speed";
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
        this.dragSpeedRange.id = "drag-speed";
        this.dragSpeedRange.type = "range";
        this.dragSpeedRange.min = "0";
        this.dragSpeedRange.max = "6";
        this.dragSpeedRange.step = "1";
        this.dragSpeedRange.value = "3";
        this.dragSpeedRange.addEventListener("change", () => {
            if (this.dragSpeedRange) {
                this.game.setDragSpeed(parseInt(this.dragSpeedRange.value, 10));
            }
        });
        this.gameMenuElement.appendChild(this.dragSpeedRange);
        const dragSpeedIncrement = document.createElement("button");
        dragSpeedIncrement.classList.add("button-increment");
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


        // Create toggle music checkbox
        const toggleMusicLabel = document.createElement("label");
        toggleMusicLabel.textContent = "Toggle Music";
        toggleMusicLabel.htmlFor = "toggle-music";
        this.gameMenuElement.appendChild(toggleMusicLabel);
        this.toggleMusicCheckbox = document.createElement("input");
        this.toggleMusicCheckbox.id = "toggle-music";
        this.toggleMusicCheckbox.type = "checkbox";
        this.toggleMusicCheckbox.checked = true;
        this.toggleMusicCheckbox.addEventListener("change", () => {
            // Toggle music
            this.game.toggleMusic();
        });
        this.gameMenuElement.appendChild(this.toggleMusicCheckbox);
        this.gameMenuElement.appendChild(document.createElement("br"));


        // Create music volume range input made of two buttons to decrement and increment, 
        const musicVolumeLabel = document.createElement("label");
        musicVolumeLabel.htmlFor = "music-volume";
        musicVolumeLabel.textContent = "Music Volume";
        this.gameMenuElement.appendChild(musicVolumeLabel);

        const musicVolumeDecrement = document.createElement("button");
        musicVolumeDecrement.textContent = "-";
        musicVolumeDecrement.addEventListener("click", () => {
            this.game.decrementMusicVolume();
        });
        this.gameMenuElement.appendChild(musicVolumeDecrement);
        this.musicVolumeRange = document.createElement("input");
        this.musicVolumeRange.id = "music-volume";
        this.musicVolumeRange.type = "range";
        this.musicVolumeRange.min = "0";
        this.musicVolumeRange.max = "100";
        this.musicVolumeRange.step = "1";
        this.musicVolumeRange.value = "50";
        this.musicVolumeRange.addEventListener("change", () => {
            if (this.musicVolumeRange) {
                this.game.setMusicVolume(
                    parseInt(this.musicVolumeRange.value, 10)
                );
            }
        });
        this.gameMenuElement.appendChild(this.musicVolumeRange);
        const musicVolumeIncrement = document.createElement("button");
        musicVolumeIncrement.textContent = "+";
        musicVolumeIncrement.classList.add("button-increment");
        musicVolumeIncrement.addEventListener("click", () => {
            this.game.incrementMusicVolume();
        });
        this.gameMenuElement.appendChild(musicVolumeIncrement);
        this.gameMenuElement.appendChild(document.createElement("br"));

        // Create toggle sound checkbox
        const toggleSoundLabel = document.createElement("label");
        toggleSoundLabel.textContent = "Toggle Sound";
        toggleSoundLabel.htmlFor = "toggle-sound";
        this.gameMenuElement.appendChild(toggleSoundLabel);
        this.toggleSoundCheckbox = document.createElement("input");
        this.toggleSoundCheckbox.id = "toggle-sound";
        this.toggleSoundCheckbox.type = "checkbox";
        this.toggleSoundCheckbox.checked = true;
        this.toggleSoundCheckbox.addEventListener("change", () => {
            // Toggle sound
            this.game.toggleSound();
        });
        this.gameMenuElement.appendChild(this.toggleSoundCheckbox);
        this.gameMenuElement.appendChild(document.createElement("br"));

        // Create music volume range input made of two buttons to decrement and increment, 
        const soundVolumeLabel = document.createElement("label");
        soundVolumeLabel.textContent = "Sound Volume";
        soundVolumeLabel.htmlFor = "sound-volume";
        this.gameMenuElement.appendChild(soundVolumeLabel);

        const soundVolumeDecrement = document.createElement("button");
        soundVolumeDecrement.textContent = "-";
        soundVolumeDecrement.addEventListener("click", () => {
            this.game.decrementSoundVolume();
        });
        this.gameMenuElement.appendChild(soundVolumeDecrement);
        this.soundVolumeRange = document.createElement("input");
        this.soundVolumeRange.id = "sound-volume";
        this.soundVolumeRange.type = "range";
        this.soundVolumeRange.min = "0";
        this.soundVolumeRange.max = "100";
        this.soundVolumeRange.step = "1";
        this.soundVolumeRange.value = "50";
        this.soundVolumeRange.addEventListener("change", () => {
            if (this.soundVolumeRange) {
                this.game.setSoundVolume(parseInt(this.soundVolumeRange.value, 10));
            }
        });
        this.gameMenuElement.appendChild(this.soundVolumeRange);
        const soundVolumeIncrement = document.createElement("button");
        soundVolumeIncrement.textContent = "+";
        soundVolumeIncrement.classList.add("button-increment");
        soundVolumeIncrement.addEventListener("click", () => {
            this.game.incrementSoundVolume();
        });
        this.gameMenuElement.appendChild(soundVolumeIncrement);
        this.gameMenuElement.appendChild(document.createElement("br"));


        // Add 'OK' and 'Cancel' buttons
        const okButton = document.createElement("button");
        okButton.textContent = "OK";
        okButton.id = "ok-button";
        okButton.addEventListener("click", () => {
            // Close the menu, no need to apply the settings as they are already applied.
            // Save those to local storage.
            this.game.saveSettingsLocalStorage();
            this.toggleMenu();
        });
        this.gameMenuElement.appendChild(okButton);

        const cancelButton = document.createElement("button");
        cancelButton.textContent = "Cancel";
        cancelButton.id = "cancel-button";
        cancelButton.addEventListener("click", () => {
            this.cancelMenu();
        });
        this.gameMenuElement.appendChild(cancelButton);

        // Append the game menu container to the document body
        document.body.appendChild(this.gameMenuElement);
        this.isMenuOpen = true;
    }

}


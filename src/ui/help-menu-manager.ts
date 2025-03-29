import { CONFIG } from '../config';
import { Game } from '../game';

export class HelpMenuManager {

    private game: Game;
    private helpMenuElement: HTMLDivElement | null = null;
    public isHelpMenuOpen: boolean = false;

    constructor(game: Game) {
        this.game = game;
        //
    }

    toggleHelp(): void {
        if (!this.helpMenuElement) {
            this.buildHelpMenu();
        } else {
            // Toggle visibility
            if (this.helpMenuElement.style.display === "none" || this.helpMenuElement.style.display === "") {
                this.helpMenuElement.style.display = "block";
                this.isHelpMenuOpen = true;
            } else {
                this.helpMenuElement.style.display = "none";
                this.isHelpMenuOpen = false;
            }
        }
    }

    private buildHelpMenu(): void {
        // Create the help menu container
        this.helpMenuElement = document.createElement("div");
        this.helpMenuElement.style.display = "block";
        this.helpMenuElement.id = "help-menu";

        // 'Main help' heading
        const heading = document.createElement("h2");
        heading.textContent = "Game Shortcuts";
        this.helpMenuElement.appendChild(heading);

        // Create a table for shortcuts
        const table = document.createElement("table");
        table.id = "shortcuts-table";

        CONFIG.SHORTCUT_KEYS.forEach((shortcut) => {
            const row = document.createElement("tr");

            const keyCell = document.createElement("td");
            keyCell.className = "shortcut-key";
            keyCell.textContent = shortcut.key;

            const actionCell = document.createElement("td");
            actionCell.className = "shortcut-action";
            actionCell.textContent = shortcut.action;

            row.appendChild(keyCell);
            row.appendChild(actionCell);
            table.appendChild(row);
        });

        this.helpMenuElement.appendChild(table);

        // 'Editor help' heading
        const editorHeading = document.createElement("h2");
        editorHeading.textContent = "Editor Shortcuts";
        this.helpMenuElement.appendChild(editorHeading);

        // Create a table for editor shortcuts
        const editorTable = document.createElement("table");
        editorTable.id = "shortcuts-table";
        CONFIG.EDITOR_KEYS.forEach((shortcut) => {
            const row = document.createElement("tr");

            const keyCell = document.createElement("td");
            keyCell.className = "shortcut-key";
            keyCell.textContent = shortcut.key;

            const actionCell = document.createElement("td");
            actionCell.className = "shortcut-action";
            actionCell.textContent = shortcut.action;

            row.appendChild(keyCell);
            row.appendChild(actionCell);
            editorTable.appendChild(row);
        });

        this.helpMenuElement.appendChild(editorTable);

        // Append the help menu container to the document body
        document.body.appendChild(this.helpMenuElement);
        this.isHelpMenuOpen = true;
    }
}

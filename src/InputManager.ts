import { Point } from './maths';
import { Game } from './main';

export class InputManager {
    private game: Game;
    public keysPressed: Record<string, boolean> = {};
    public mouseX: number = 0;
    public mouseY: number = 0; 
    public gameMouseX: number = 0;
    public gameMouseY: number = 0;
    public selecting: boolean = false;
    public selectionStart: Point = new Point(0,0);
    public selectionEnd: Point = new Point(0,0);
    public scrollVector: Point = new Point(0,0);

    constructor(game: Game) {
        this.game = game;
        this.addEventListeners();
    }

    private addEventListeners(): void {
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
        window.addEventListener('mousemove', this.handleMouseMove.bind(this));
        window.addEventListener('mousedown', this.handleMouseDown.bind(this));
        window.addEventListener('mouseup', this.handleMouseUp.bind(this));
        window.addEventListener('wheel', this.handleMouseWheel.bind(this), { passive: false });
    }

    public handleKeyDown(event: KeyboardEvent): void {
        this.keysPressed[event.key] = true;
        
        if (event.key === 'F10') {
            event.preventDefault();
            this.game.toggleGameMenu();
        }

        if (event.ctrlKey && (event.key === '+' || event.key === '-' || event.key === '=' || event.key === '_')) {
            event.preventDefault();
        }
    }

    public handleKeyUp(event: KeyboardEvent): void {
        this.keysPressed[event.key] = false;
    }

    public handleMouseMove(event: MouseEvent): void {
        this.updateMousePosition(event);
        this.updateScrollVector();
    }

    public handleMouseDown(event: MouseEvent): void {
        this.updateMousePosition(event);

        if (!this.selecting && event.button === 0) {
            this.startSelection();
        }

        if (event.button === 2) {
            this.game.gameAction = 1; // DEFAULT action
        }
    }

    public handleMouseUp(event: MouseEvent): void {
        this.updateMousePosition(event);

        if (event.button === 0) {
            this.endSelection();
        }
    }

    public handleMouseWheel(event: WheelEvent): void {
        if (event.ctrlKey) {
            event.preventDefault();
            // Reserved for zoom functionality
        }
    }

    private updateMousePosition(event: MouseEvent): void {
        const bounds = this.game.canvasBoundingRect;
        const screenRatioX = this.game.gameScreenWidth / bounds.width;
        const screenRatioY = this.game.gameScreenHeight / bounds.height;

        this.mouseX = event.clientX * screenRatioX;
        this.mouseY = event.clientY * screenRatioY;
        this.gameMouseX = this.mouseX + this.game.scrollX;
        this.gameMouseY = this.mouseY + this.game.scrollY;
    }

    private updateScrollVector(): void {
        this.scrollVector.x = 0;
        this.scrollVector.y = 0;
        const scrollSpeed = 4;

        if (this.mouseX > this.game.scrollEdgeX) {
            this.scrollVector.x = scrollSpeed;
        }
        if (this.mouseY > this.game.scrollEdgeY) {
            this.scrollVector.y = scrollSpeed;
        }
        if (this.mouseX < 32) {
            this.scrollVector.x = -scrollSpeed;
        }
        if (this.mouseY < 32) {
            this.scrollVector.y = -scrollSpeed;
        }
    }

    private startSelection(): void {
        this.selecting = true;
        this.game.setCursor("cur-target");
        this.selectionStart = new Point(this.gameMouseX, this.gameMouseY);
    }

    private endSelection(): void {
        this.selectionEnd = new Point(this.gameMouseX, this.gameMouseY);
        this.selecting = false;
        this.game.setCursor("cur-pointer");
        this.game.gameAction = 2; // RELEASE_SELECTION action
    }

    public update(): void {
        if (this.keysPressed['ArrowUp'] || this.keysPressed['w']) {
            this.scrollVector.y = -4;
        }
        if (this.keysPressed['ArrowDown'] || this.keysPressed['s']) {
            this.scrollVector.y = 4;
        }
        if (this.keysPressed['ArrowLeft'] || this.keysPressed['a']) {
            this.scrollVector.x = -4;
        }
        if (this.keysPressed['ArrowRight'] || this.keysPressed['d']) {
            this.scrollVector.x = 4;
        }
    }
}
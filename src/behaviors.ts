import { TEntity } from "./types";
import { Game } from "./game";

export class Behaviors {

    public game: Game;

    constructor(game: Game) {
        this.game = game;
    }

    public process(entity: TEntity): void {
        switch (entity.type) {
            case 1:
                this.alien(entity);
                break;

            default:
                break;
        }
    }

    private alien(entity: TEntity): void {
        // test by just incrementing forward in animations
        // 249 is the number of frames in the sprite sheet
        entity.frameIndex = (entity.frameIndex + 1) % 249;
        // TODO : Add real behaviors!
    }


}


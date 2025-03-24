import { EntityType, TEntity } from "./types";
import { Game } from "./game";

export class Behaviors {

    game: Game;

    constructor(game: Game) {
        this.game = game;
    }

    public preview(entity: TEntity): void {
        const animation = this.game.animations[this.game.editorManager.currentAnimIndex];
        entity.frameIndex = animation.frames[this.game.editorManager.previewAnimationFrame];
    }

    process(entity: TEntity): void {
        switch (entity.type) {
            case EntityType.ALIEN:
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


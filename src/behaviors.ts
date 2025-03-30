import { EntityType, TEntity } from "./types";
import { Game } from "./game";

export class Behaviors {

    game: Game;

    constructor(game: Game) {
        this.game = game;
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

    public preview(entity: TEntity): void {
        // if size is 256 this is an animation preview so set its frame index accordingly

        if (entity.size > 128) {
            const animation = this.game.animations[this.game.editorManager.currentAnimIndex];
            if (this.game.editorManager.isAnimationPreviewPlaying) {
                this.game.editorManager.previewAnimationFrame = (this.game.editorManager.previewAnimationFrame + 1) % animation.frames.length;
            }
            entity.frameIndex = animation.frames[this.game.editorManager.previewAnimationFrame];
        } else {

            // Regular game mode for this entity
            this.alien(entity);
        }
    }

    private alien(entity: TEntity): void {

        // TODO : Add real behaviors 
        // for now, test by just incrementing forward in animations.
        // (249 is the number of frames in the sprite sheet)
        entity.frameIndex = (entity.frameIndex + 1) % 249;

    }
}


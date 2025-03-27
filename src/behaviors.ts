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

    private alien(entity: TEntity): void {

        // if size is 256 this is an animation preview so set its frame index accordingly
        // otherwise, for now, test by just incrementing forward in animations
        // 249 is the number of frames in the sprite sheet

        if (entity.size === 256 && this.game.editorManager.isAnimationPreviewPlaying) {
            const animation = this.game.animations[this.game.editorManager.currentAnimIndex];
            this.game.editorManager.previewAnimationFrame = (this.game.editorManager.previewAnimationFrame + 1) % animation.frames.length;
            entity.frameIndex = animation.frames[this.game.editorManager.previewAnimationFrame];
        } else {

            // Regular game mode for this entity
            entity.frameIndex = (entity.frameIndex + 1) % 249;
            // TODO : Add real behaviors if not in preview mode

        }
    }
}


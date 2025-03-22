import { CONFIG } from './config';
import { Game } from './game';

export class AudioManager {

    private game: Game;
    private soundVolume: number = 1.0;
    private musicVolume: number = 1.0;

    constructor(game: Game) {
        this.game = game;
        // todo
    }

    setMusicVolume(volume: number): void {
        this.musicVolume = volume;
        console.log("setMusicVolume: " + this.musicVolume);
        // this.music.setVolume(volume);
    }

    setSoundVolume(volume: number): void {
        this.soundVolume = volume;
        console.log("setSoundVolume: " + this.soundVolume);
        // this.sound.setVolume(volume);
    }


}


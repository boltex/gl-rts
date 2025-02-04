import { Game } from './game';

export { };

declare global {
  interface Window {
    game: Game;
  }
}

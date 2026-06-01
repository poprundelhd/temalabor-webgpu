import { FpsGame } from './game/FpsGame';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
new FpsGame(canvas).start().catch(err => console.error('[main] Indítási hiba:', err));

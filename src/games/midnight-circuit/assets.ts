import { prepareImages, type ImageBundle } from '../../engine/browser/images.ts';
import { validateCircuitArt } from './asset-art.ts';
import { attackPhase, stageOf } from './game.ts';
import { createPresentation, type CircuitArtwork } from './presentation.ts';
import fighters from './art/signal-rain/fighters.svg';
import skyline from './art/signal-rain/skyline.svg';
import backstreets from './art/signal-rain/backstreets.svg';
import station from './art/signal-rain/station.svg';
import pavement from './art/signal-rain/pavement.svg';
import repair from './art/signal-rain/repair.svg';

function createArtwork(images: ImageBundle): CircuitArtwork {
  return {
    scenery(ctx, view, run, time, reducedMotion) {
      const { width, height, ground, x: camera } = view;
      ctx.fillStyle = '#203d43'; ctx.fillRect(0, 0, width, height);
      const tile = (name: string, y: number, h: number, parallax: number) => {
        const offset = camera * parallax;
        for (let i = Math.floor(offset / 960); i * 960 - offset < width; i++) ctx.drawImage(images[name]!, i * 960 - offset, y, 960, h);
      };
      tile('skyline', ground - 360, 320, .18);
      tile(stageOf(run).environment === 'station' ? 'station' : 'backstreets', ground - 270, 270, .78);
      tile('pavement', ground, Math.max(240, height - ground), 1);
      if (run.finale > 0 || run.status === 'victory') {
        ctx.fillStyle = '#9ae6ab24'; ctx.fillRect(0, 0, width, ground);
      }
      if (!reducedMotion && stageOf(run).environment !== 'station') {
        ctx.strokeStyle = '#dbe2bc33'; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 72; i++) {
          const x = ((i * 137.3 - time * 75) % width + width) % width, y = (i * 83.7 + time * 400) % height;
          ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 16);
        }
        ctx.stroke();
      }
    },
    body(ctx, actor, time, pose, reflection) {
      const row = actor.kind === 'player' ? 0 : actor.kind === 'striker' ? 1 : actor.kind === 'bruiser' ? 2 : 3;
      const size = row === 3 ? 1.48 : row === 2 ? 1.2 : 1;
      ctx.save(); ctx.scale(actor.facing * size, size);
      if (!reflection && actor.immune > 0 && Math.floor(time * 16) % 2 === 0) ctx.globalAlpha *= .55;
      if (actor.health <= 0) { ctx.rotate(-Math.PI * .37); ctx.scale(1, .6); }
      ctx.translate(actor.stun > 0 ? -10 : pose.lean, pose.bob - actor.elevation / size);
      const part = (column: number, x: number, y: number) => ctx.drawImage(images.fighters!, column * 64, row * 64, 64, 64, x, y, 64, 64);
      const bone = (column: number, from: readonly number[], to: readonly number[]) => {
        const dx = to[0]! - from[0]!, dy = to[1]! - from[1]!;
        ctx.save(); ctx.translate(from[0]!, from[1]!); ctx.rotate(Math.atan2(dy, dx) - Math.PI / 2);
        ctx.scale(1, Math.hypot(dx, dy) / 40); part(column, -32, -8); ctx.restore();
      };
      const leg = (hip: readonly number[], knee: readonly number[], foot: readonly number[]) => {
        bone(4, hip, knee); bone(5, knee, foot); part(6, foot[0]! - 32, foot[1]! - 54);
      };
      const arm = (shoulder: readonly number[], elbow: readonly number[], hand: readonly number[]) => {
        bone(2, shoulder, elbow); bone(3, elbow, hand); part(7, hand[0]! - 32, hand[1]! - 32);
      };
      leg([-8, -43], pose.backKnee, pose.backFoot);
      arm([-13, -76], pose.rearElbow, pose.rearHand);
      part(1, -32, -91);
      leg([8, -43], pose.frontKnee, pose.frontFoot);
      part(0, -32, -140);
      arm([14, -77], pose.elbow, pose.hand);
      if (actor.flash > 0 && !reflection) {
        ctx.fillStyle = '#fff2cb88'; ctx.beginPath(); ctx.ellipse(0, -66, 23, 43, 0, 0, Math.PI * 2); ctx.fill();
      }
      if (actor.attack && attackPhase(actor.attack) === 'active') {
        ctx.strokeStyle = row === 0 ? '#ffefb9' : '#ff9370'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(27, -53, 51, 37, -.2, -.9, 1); ctx.stroke();
      }
      if (row === 3 && actor.attack && attackPhase(actor.attack) === 'recovery') {
        ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#b8ffda'; ctx.fillText('OPEN', 0, -143);
      }
      ctx.restore();
    },
    pickup(ctx, pickup, ground, time) {
      ctx.drawImage(images.repair!, pickup.x - 21, ground + pickup.lane - 38 + Math.sin(time * 3) * 2, 42, 42);
    },
  };
}
export async function createAssets(surface: HTMLElement, signal: AbortSignal) {
  const prepared = await prepareImages({ fighters, skyline, backstreets, station, pavement, repair }, signal, validateCircuitArt);
  try {
    if (signal.aborted) throw new Error('Preparation cancelled');
    const renderer = createPresentation(surface, createArtwork(prepared.images));
    return { ...renderer, dispose() { try { renderer.dispose(); } finally { prepared.dispose(); } } };
  } catch (error) { prepared.dispose(); throw error; }
}

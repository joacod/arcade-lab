import type { ImageBundle } from '../../engine/browser/images.ts';
import type { FighterId } from './content.ts';
import { foundryParts, type FoundryPart } from './asset-art.ts';

type Point = [number, number];
interface FoundryPose {
  hip: Point; shoulder: Point; head: Point;
  kneeBack: Point; footBack: Point; kneeFront: Point; footFront: Point;
  elbowBack: Point; handBack: Point; elbowFront: Point; handFront: Point;
}

/** Uses the same observed joints as Normal. Artwork never supplies physical geometry. */
export function drawFoundryFighter(ctx: CanvasRenderingContext2D, art: ImageBundle, kind: FighterId, p: FoundryPose, flutter: number) {
  const nera = kind === 'nera';
  function part(role: FoundryPart, x: number, y: number, w: number, h: number) {
    ctx.drawImage(art[kind]!, foundryParts[role] * 128, 0, 128, 160, x, y, w, h);
  }
  function segment(role: FoundryPart, a: Point, b: Point, width: number) {
    ctx.save(); ctx.translate(...a); ctx.rotate(Math.atan2(b[1] - a[1], b[0] - a[0]) - Math.PI / 2);
    part(role, -width / 2, -5, width, Math.hypot(b[0] - a[0], b[1] - a[1]) + 10); ctx.restore();
  }
  function leg(knee: Point, foot: Point, rear: boolean) {
    ctx.save(); if (rear) ctx.globalAlpha *= .82;
    segment('thigh', p.hip, knee, nera ? 25 : 31);
    segment('shin', knee, foot, nera ? 24 : 32);
    ctx.save(); ctx.translate(...foot);
    // Keep feet planted while standing and align an extended kick to its shin.
    if (foot[1] < -15) ctx.rotate(Math.atan2(foot[1] - knee[1], foot[0] - knee[0]) - Math.PI / 2);
    part('boot', -13, -21, nera ? 32 : 39, 28); ctx.restore(); ctx.restore();
  }
  function arm(elbow: Point, hand: Point, rear: boolean) {
    ctx.save(); if (rear) ctx.globalAlpha *= .82;
    segment('arm', [p.shoulder[0] + (rear ? -10 : 12), p.shoulder[1] + 5], elbow, nera ? 22 : 31);
    segment('gauntlet', elbow, hand, nera ? 25 : 39); ctx.restore();
  }
  ctx.save(); ctx.translate(p.shoulder[0] - 23, p.shoulder[1] - 9); ctx.rotate(flutter);
  part('mantle', nera ? -42 : -32, 0, nera ? 83 : 98, Math.min(nera ? 116 : 112, -p.shoulder[1] + 11)); ctx.restore();
  leg(p.kneeBack, p.footBack, true); arm(p.elbowBack, p.handBack, true);
  leg(p.kneeFront, p.footFront, false);
  part('torso', p.shoulder[0] - (nera ? 29 : 38), p.shoulder[1] - 12, nera ? 61 : 76, p.hip[1] - p.shoulder[1] + 30);
  part('head', p.head[0] - 24, p.head[1] - 29, nera ? 45 : 49, 58);
  arm(p.elbowFront, p.handFront, false);
}

export function drawFoundryEffect(ctx: CanvasRenderingContext2D, art: ImageBundle, cell: number, x: number, y: number, width: number, height = width) {
  ctx.drawImage(art.effects!, cell * 128, 0, 128, 128, x - width / 2, y - height / 2, width, height);
}

import { writeFileSync } from 'node:fs';
import { duelClips, samplePose } from '../../animation.ts';
import { foundryCell, foundryClips, foundryFrame } from '../../asset-art.ts';

// Whole-cel illustration source. No part images or transforms of the retired cutout atlas.
const n = v => Number(v.toFixed(2));
const xy = p => p.map(n).join(' ');
const path = (d, fill, stroke = '#111c2a', width = 1.3) => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"/>`;
const line = (d, color, width = 1) => path(d, 'none', color, width);
const polygon = (points, fill, stroke, width) => path(`M${points.map(xy).join('L')}Z`, fill, stroke, width);
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const ellipse = (p, rx, ry, fill, stroke = 'none') => `<ellipse cx="${n(p[0])}" cy="${n(p[1])}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}"/>`;
function segment(a, b, wa, wb, fill) {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]), normal = [-(b[1] - a[1]) / d, (b[0] - a[0]) / d];
  const edge = (p, w) => add(p, normal.map(v => v * w));
  return path(`M${xy(edge(a, wa))}Q${xy(edge(mix(a, b, .45), wa * 1.05))} ${xy(edge(b, wb))}Q${xy(add(b, [(b[0] - a[0]) / d * 2, (b[1] - a[1]) / d * 2]))} ${xy(edge(b, -wb))}Q${xy(edge(mix(a, b, .45), -wa * .9))} ${xy(edge(a, -wa))}Z`, fill);
}

export function drawCel(kind, clip, frame) {
  const p = samplePose(kind, { clip, frame }), nera = kind === 'nera';
  const skin = nera ? '#d7ae92' : '#bd8d70', skinLight = nera ? '#f5ceb0' : '#e5b490';
  const metal = nera ? '#d9e2d0' : '#a58e77', trim = nera ? '#9cf3df' : '#ffb36c';
  const dark = nera ? '#253e4e' : '#292c39', armor = `url(#${kind}-armor)`, ivory = `url(#${kind}-cloth)`;
  const spine = [p.hip[0] - p.shoulder[0], p.hip[1] - p.shoulder[1]], length = Math.hypot(...spine), across = [spine[1] / length, -spine[0] / length];
  const side = (point, w) => add(point, across.map(v => v * w));
  const chestWidth = (nera ? 18 : 26) * (1 - Math.abs(p.twist) * .17), waist = nera ? 13 : 19;
  const shoulderBack = side(p.shoulder, -chestWidth), shoulderFront = side(p.shoulder, chestWidth);
  const hipBack = side(p.hip, -waist), hipFront = side(p.hip, waist);
  let art = '';
  // Each cel owns its cloth silhouette. Anticipation folds inward; contact streams behind the body.
  const hem = Math.min(-3, p.hip[1] + (nera ? 39 : 29)), trail = p.cloth * 18;
  art += path(`M${xy(shoulderBack)}Q${n(p.shoulder[0] - 37 - trail)} ${n(p.shoulder[1] + 20)} ${n(p.hip[0] - 38 - trail)} ${n(hem - 5)}L${n(p.hip[0] - 23)} ${n(hem)}L${n(p.hip[0] - 10)} ${n(hem - 12)}L${n(p.hip[0] + 13)} ${n(hem - 2)}L${xy(shoulderFront)}Z`, ivory);
  art += path(`M${xy(shoulderBack)}Q${n(p.shoulder[0] - 28 - trail)} ${n(p.shoulder[1] + 27)} ${n(p.hip[0] - 34 - trail)} ${n(hem - 6)}L${n(p.hip[0] - 24 - trail * .3)} ${n(hem - 13)}L${xy(p.hip)}Z`, nera ? '#32747c' : '#292d3b', 'none');
  art += line(`M${xy(add(shoulderBack, [-2, 4]))}Q${n(p.shoulder[0] - 32 - trail)} ${n(p.shoulder[1] + 28)} ${n(p.hip[0] - 33 - trail)} ${n(hem - 6)}`, '#b4a783', 1.2);

  function foot(knee, ankle, rear) {
    const angle = ankle[1] < -12 ? Math.max(-.7, Math.min(.8, Math.atan2(ankle[1] - knee[1], ankle[0] - knee[0]))) : 0;
    return `<g transform="translate(${xy(ankle)}) rotate(${n(angle * 180 / Math.PI)})">`
      + path('M-8-12Q-1-16 6-10L8-5 16-2 17 2H-9Z', rear ? dark : armor)
      + line('M-7-1H14', metal, 1.8) + line('M-3-10L3-6', trim, 1) + '</g>';
  }
  function leg(start, knee, ankle, rear) {
    const width = nera ? 9 : 12, shade = rear ? dark : armor;
    let s = segment(start, knee, width + 1, width * .8, rear ? dark : nera ? '#345b65' : '#4b4752');
    s += ellipse(knee, width * .8, width * .8, shade);
    s += segment(knee, ankle, width * .8, width * .45, shade);
    s += line(`M${xy(add(mix(knee, ankle, .17), [1, 0]))}L${xy(add(mix(knee, ankle, .45), [3, 0]))}L${xy(mix(knee, ankle, .87))}`, rear ? '#6a8787' : metal, nera ? 2 : 3);
    s += line(`M${xy(add(knee, [-4, -1]))}l8-2`, trim, 1.5);
    return s + foot(knee, ankle, rear);
  }
  function arm(start, elbow, hand, rear) {
    let s = segment(start, elbow, nera ? 7 : 10, nera ? 5.6 : 8, rear ? '#708b86' : skin);
    s += ellipse(elbow, nera ? 5.7 : 8, nera ? 5.7 : 8, rear ? '#708b86' : skin);
    s += segment(elbow, hand, nera ? 5.5 : 8, nera ? 4 : 6, rear ? dark : skin);
    s += segment(mix(elbow, hand, nera ? .43 : .18), hand, nera ? 6.6 : 10, nera ? 5.5 : 8.5, rear ? '#315461' : armor);
    // Full fist/palm and individual seam drawings change with the action, rather than stretching a part.
    const punch = ['light', 'heavy', 'special'].includes(clip) && frame >= 3 && frame <= 4;
    const angle = punch ? Math.atan2(hand[1] - elbow[1], hand[0] - elbow[0]) : -.6;
    s += `<g transform="translate(${xy(hand)}) rotate(${n(angle * 180 / Math.PI)})">`;
    s += path(nera && clip === 'special' ? 'M-4-6L4-9 12-6 14-3 10-1 6-3 8 2 5 5-3 4Z' : 'M-4-6L7-7 12-3 12 3 7 6-3 5Z', nera ? skinLight : '#a89b8d');
    s += line('M2-4L7-4M3-1H9M3 2H8', rear ? '#53666a' : '#5c655f', .7) + '</g>';
    s += line(`M${xy(mix(elbow, hand, .5))}L${xy(mix(elbow, hand, .85))}`, rear ? '#5c9396' : trim, 1.5);
    return s;
  }
  art += leg(p.legBack, p.kneeBack, p.footBack, true) + arm(p.armBack, p.elbowBack, p.handBack, true);
  art += leg(p.legFront, p.kneeFront, p.footFront, false);
  // Spine-oriented chest and curved waist maintain volume during twists, recoil and falling.
  art += path(`M${xy(shoulderBack)}Q${xy(side(mix(p.shoulder, p.hip, .55), -chestWidth * .8))} ${xy(hipBack)}L${xy(hipFront)}Q${xy(side(mix(p.shoulder, p.hip, .5), chestWidth * .9))} ${xy(shoulderFront)}Q${xy(add(p.shoulder, [0, -6]))} ${xy(shoulderBack)}Z`, ivory);
  art += polygon([side(p.shoulder, -6), side(p.shoulder, chestWidth - 3), side(p.hip, waist - 3), side(p.hip, -5)], armor);
  art += line(`M${xy(add(shoulderBack, [4, 3]))}L${xy(side(p.hip, 3))}`, metal, nera ? 3 : 4);
  const core = mix(p.shoulder, p.hip, .37);
  art += polygon([add(core, [0, -7]), add(core, [6, 0]), add(core, [0, 10]), add(core, [-6, 1])], trim, '#dfdfb6', .8);
  art += line(`M${xy(side(p.hip, -waist - 1))}L${xy(side(p.hip, waist + 2))}`, '#192734', 8);
  art += line(`M${xy(side(p.hip, -waist))}L${xy(side(p.hip, waist))}`, metal, 2);
  art += polygon([add(p.hip, [0, -3]), add(p.hip, [7, -3]), add(p.hip, [7, 4]), add(p.hip, [0, 4])], '#d4b682');
  if (!nera) {
    art += polygon([add(shoulderBack, [-4, -4]), add(p.shoulder, [-2, -8]), add(p.shoulder, [5, 5]), add(shoulderBack, [-5, 10])], armor, metal, 1.3);
    art += line(`M${xy(add(shoulderBack, [2, -1]))}L${xy(add(p.shoulder, [-3, -4]))}`, trim, 1);
  }
  art += line(`M${xy(p.shoulder)}L${xy(add(p.head, [-1, 7]))}`, skin, 11);
  art += `<g transform="translate(${xy(p.head)}) rotate(${n(p.headTilt * 180 / Math.PI)})">`;
  art += path('M-9-11Q-2-16 7-10L10-3 14 2 10 4 9 12Q1 17-8 9L-12 1Z', skin);
  art += path('M1-8Q7-8 8-3L10 0 7 4 8 9 1 12-3 7-2-4Z', skinLight, 'none');
  art += ellipse([-8, 2], 3, 4, skinLight);
  art += path(nera ? 'M-12 6Q-20-4-11-15L-1-20Q9-20 12-9L3-9-5-4-8 4Z' : 'M-12 5L-14-10-6-19 5-17 13-9 10-3 3-8-6-4Z', '#152734');
  if (nera) {
    art += path(`M-12-3Q${n(-26 - p.cloth * 7)} 10 ${n(-22 - p.cloth * 9)} 27L-17 31Q-19 11-9 3Z`, '#214551');
    art += path('M-12-11L-16-20-11-27-11-18 1-17 12-10 1-12Z', '#cdd8c0');
    art += line('M-10-11L8-9', trim, 1.8);
  } else {
    art += path('M-13-8L-16-19-6-15 1-22 6-14 14-19 12-6 3-10-6-7Z', armor, metal, 1);
    art += path('M-5 10L2 12 9 8 8 14 1 17-5 14Z', '#3b3035', 'none');
  }
  art += line('M4-1L9 0', '#27323a', 1.7) + line('M5 0H8', trim, .8) + line('M6 8L10 7', '#795d53', .8);
  art += '</g>';
  art += path(`M${xy(add(p.shoulder, [-11, -5]))}Q${xy(add(p.shoulder, [2, 2]))} ${xy(add(p.shoulder, [14, -6]))}L${xy(add(p.shoulder, [12, 5]))}Q${xy(add(p.shoulder, [0, 12]))} ${xy(add(p.shoulder, [-12, 3]))}Z`, nera ? '#3e7c81' : '#51424c');
  art += line(`M${xy(add(p.shoulder, [-8, 0]))}Q${xy(add(p.shoulder, [2, 7]))} ${xy(add(p.shoulder, [12, -1]))}`, trim, 1);
  art += arm(p.armFront, p.elbowFront, p.handFront, false);
  if (nera && ['heavy', 'air', 'sweep'].includes(clip) && frame >= 3 && frame <= 5) art += line(`M${xy(add(p.hip, [-17, 8]))}Q${n(p.hip[0] - 36)} ${n(hem - 16)} ${n(p.hip[0] - 32 - trail)} ${n(hem - 6)}`, '#f5eccf', 2);
  return art;
}

export function generateFighters() {
  for (const kind of ['nera', 'kael']) {
    let body = `<defs><linearGradient id="${kind}-armor" x2=".8" y2="1"><stop stop-color="${kind === 'nera' ? '#78b6ad' : '#8e7b70'}"/><stop offset=".5" stop-color="${kind === 'nera' ? '#2e6573' : '#48434e'}"/><stop offset="1" stop-color="#1d3041"/></linearGradient><linearGradient id="${kind}-cloth" x2="1" y2=".6"><stop stop-color="${kind === 'nera' ? '#f6ecd0' : '#82716a'}"/><stop offset=".65" stop-color="${kind === 'nera' ? '#c0c4ae' : '#4a414c'}"/><stop offset="1" stop-color="${kind === 'nera' ? '#6f9f99' : '#282e3e'}"/></linearGradient></defs>`;
    for (const clip of foundryClips) for (let frame = 0; frame < duelClips[clip]; frame++) {
      const [x,y] = foundryFrame({clip,frame});
      body += `<g id="${clip}-${frame}" transform="translate(${x + foundryCell.pivotX} ${y + foundryCell.pivotY})">${drawCel(kind, clip, frame)}</g>`;
    }
    writeFileSync(new URL(`${kind}.svg`, import.meta.url), `<svg xmlns="http://www.w3.org/2000/svg" width="2560" height="2240" viewBox="0 0 2560 2240">${body}</svg>\n`);
  }
}

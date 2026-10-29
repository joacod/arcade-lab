import * as T from 'three';
import { createGait, fighterPose, type Point } from '../animation.ts';
import { attackPhase, type Actor } from '../game.ts';
import type { CircuitArt } from './art.ts';

/** Sculpted parts share the game's observed gait and combat poses, never their own rules. */
export function createFighters(art: CircuitArt, people: T.Group) {
  const { mesh, block: b, rounded: r, material: m }=art;
  const jacket=art.profile([[-17,79],[-13,84],[10,84],[18,76],[14,47],[-13,47],[-18,61]],21);
  const vest=art.profile([[-19,79],[-10,85],[12,85],[20,76],[15,47],[-16,47]],24);
  const hair=art.profile([[-13,100],[-16,113],[-9,123],[-3,118],[4,123],[14,115],[13,108],[4,111],[-1,105]],20,.8);
  const jaw=art.profile([[-10,105],[-8,91],[1,87],[10,91],[13,100],[9,112],[-4,113]],16,1);
  const boot=art.profile([[-7,11],[5,11],[8,5],[16,4],[18,0],[-9,0],[-9,5]],13,1);
  const coatTails=art.profile([[-15,52],[14,52],[21,32],[4,34],[-4,31],[-19,34]],19,.7);
  const tailGeometry=art.profile([[-10,85],[-26,87],[-52,78],[-44,73],[-24,80]],3,.4);
  const markerGeometry=art.own(new T.RingGeometry(.91,1,48));
  const arcGeometry=art.own(new T.TorusGeometry(38,1.1,5,28,Math.PI*.7));
  function make(a: Actor) {
    const root=new T.Group(), body=new T.Group();root.add(body);people.add(root);
    const player=a.kind==='player', boss=a.kind==='warden', bruiser=a.kind==='bruiser';
    const coat=player?'#75a99a':boss?'#b5b9aa':bruiser?'#a68a4d':'#a95541';
    const under=player?'#1d4244':boss?'#293e43':'#283638';
    const accent=player?'#b6e7d7':'#f4935e';
    const cloth=m(coat).clone();art.materials.add(cloth);
    mesh(body,boss||bruiser?vest:jacket,cloth,0,0,0,1,1,1);
    mesh(body,coatTails,m(under),0,0,-1,1,1,1);
    r(body,0,42,0,27,15,20,under);
    // Layered lapels, seams and a diagonal messenger strap give Rook an asymmetric silhouette.
    if(player) {
      const lapel=b(body,-7,72,13,5,23,3,'#c9c7a5');lapel.rotation.z=.25;
      const lapel2=b(body,6,73,13,5,21,3,'#a8c4af');lapel2.rotation.z=-.3;
      const strap=b(body,3,64,15,4,36,2,'#283d3d');strap.rotation.z=-.5;
      r(body,-10,55,14,9,9,4,'#4d7569');
      b(body,1,69,13,1.3,18,2,'#263d3c');
    } else {
      r(body,0,69,14,boss?30:26,26,6,boss?'#d9d2b1':bruiser?'#5b5c47':'#633d36',true);
      b(body,0,71,18,2,18,2,under);
      for(const x of [-8,8]) b(body,x,63,18,8,2,1,boss?'#758783':coat);
      if(bruiser) for(const x of [-11,0,11]) b(body,x,49,13,7,9,6,'#555943');
    }
    b(body,0,44,1,30,4,23,'#373c33');r(body,3,44,14,7,6,3,'#b4aa7f',true);
    mesh(body,art.cylinder,m(player?'#b69070':'#53676b'),0,87,0,6,13,6);
    const head=new T.Group();body.add(head);
    mesh(head,jaw,m(player?'#b98b6c':'#56686b'),0,0,1,1,1,1);
    if(player) {
      // Face planes and small features survive at the actual fighting scale.
      r(head,6,100,10,13,15,5,'#d9b58a');
      r(head,13,100,10,5,6,6,'#c99c73');
      b(head,8,104,13,6,2,1,'#1b3436');
      b(head,10,103,14,1.7,1.5,1,'#e2d6ab');
      const brow=b(head,8,107,13,8,1.4,1,'#24302d');brow.rotation.z=-.1;
      b(head,8,94,13,5,1,1,'#724c3c');
      mesh(head,hair,m('#1d2a29'),0,0,0,1,1,1);
      b(head,0,110,12,24,3,2,'#e1d6b3');
      mesh(head,art.sphere,m('#a97f62'),-10,100,9,3,5,3);
    } else {
      r(head,0,106,0,boss?31:27,26,25,boss?'#b8bfb0':bruiser?'#8e8c69':'#6e7061',true);
      r(head,3,102,13,25,10,5,'#142a30');
      b(head,5,104,16,22,2,2,accent,true);
      r(head,4,92,12,18,6,7,'#384c4c',true);
      for(const x of [-4,1,6]) b(head,x,92,16,1,4,1,'#a6a78c');
      if(boss) {
        r(head,-16,106,0,7,34,26,'#647c78',true);
        b(head,-16,125,0,5,11,8,accent,true);
        b(head,10,119,2,8,6,19,'#e1d6b3');
      }
    }
    const shoulderColor=player?'#d3cbb1':boss?'#c4c7b5':bruiser?'#b39a60':'#bc6a4b';
    for(const z of [-8,9]) {
      r(body,z<0?-15:15,77,z,boss?27:bruiser?22:14,boss?18:12,boss?28:20,shoulderColor);
      if(!player)b(body,z<0?-15:15,80,z+11,bruiser?15:10,2,2,accent);
    }
    if(boss) {
      mesh(body,art.cylinder,m('#3d4b43',false,true),0,66,20,10,5,10).rotation.x=Math.PI/2;
      mesh(body,art.sphere,m('#ffc17a',true),0,66,24,6,6,3);
      for(const x of [-23,23]) b(body,x,70,-3,7,35,21,'#5a716d',false,true);
    }
    const scarf=new T.Group();body.add(scarf);scarf.visible=player;
    r(scarf,0,85,1,29,7,27,'#c66043');
    const tail=mesh(scarf,tailGeometry,m('#ae5139'),0,0,-9,1,1,1);
    const limbs=Array.from({length:8},(_,i)=>mesh(body,art.cylinder,
      i<4?m(i%2?'#263b3c':'#344e4d'):i%2?m(player?'#c6b89b':under):cloth,
      0,0,0,i<4?6.4:player?5.8:6.7,1,i<4?6.5:6));
    const boots=[0,1].map(()=>mesh(body,boot,m('#1b3032'),0,0,0,1,1,1));
    const knees=[0,1].map(()=>r(body,0,0,0,10,10,7,player?'#4c6660':shoulderColor,true));
    const gloves=[0,1].map(()=>r(body,0,0,0,13,12,13,player?'#d9ceb2':'#4d5b54'));
    const cuffs=[0,1].map(()=>r(body,0,0,0,10,5,11,player?'#536e62':coat));
    const shadow=mesh(root,art.plane,art.shadowMaterial.clone(),0,1,0,76,42,1);art.materials.add(shadow.material);shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;shadow.receiveShadow=false;
    const marker=mesh(root,markerGeometry,new T.MeshBasicMaterial({color:'#b7d6b7',transparent:true,opacity:.45,depthWrite:false}),0,1.4,0,25,14,1);
    art.materials.add(marker.material);marker.rotation.x=-Math.PI/2;marker.visible=player;marker.castShadow=false;
    const barHeight=bruiser?203:171;
    const barBack=b(root,0,barHeight,0,38,3,2,'#182d30');
    const bar=b(root,0,barHeight,1.5,36,2,1,'#f7ae73',true);
    const trail=mesh(body,arcGeometry,m(accent,true),30,63,18,1,1,1);
    trail.rotation.z=-.75;
    return {root,body,head,cloth,limbs,boots,knees,gloves,cuffs,tail,shadow,marker,bar,barBack,trail};
  }
  const rigs=new Map<number,ReturnType<typeof make>>(),gait=createGait();
  const up=new T.Vector3(0,1,0),direction=new T.Vector3();
  function segment(item:T.Mesh,from:Point,to:Point,z:number) {
    item.position.set((from[0]+to[0])/2,-(from[1]+to[1])/2,z);
    direction.set(to[0]-from[0],from[1]-to[1],0);item.scale.y=direction.length();item.quaternion.setFromUnitVectors(up,direction.normalize());
  }
  function remove(rig:ReturnType<typeof make>) {rig.root.removeFromParent();rig.cloth.dispose();art.materials.delete(rig.cloth);rig.shadow.material.dispose();art.materials.delete(rig.shadow.material);(rig.marker.material as T.Material).dispose();art.materials.delete(rig.marker.material as T.Material);}
  return {
    gait,
    pose(a:Actor,time:number,reduced:boolean) {
      let rig=rigs.get(a.id);if(!rig){rig=make(a);rigs.set(a.id,rig);}
      const p=fighterPose(a,gait.get(a.id)),s=a.kind==='warden'?1.48:a.kind==='bruiser'?1.2:1;
      rig.root.position.set(a.x,0,a.lane/.6);rig.root.visible=a.health>0||a.death>0;
      rig.body.scale.set(a.facing*s,s/.8,s);rig.body.position.set(p.lean*a.facing,(a.elevation-p.bob)/.8,0);
      rig.body.rotation.z=a.health<=0?a.facing*1.15:a.stun>0?a.facing*.09:0;
      rig.body.visible=reduced||!(a.immune>0&&Math.floor(time*14)%2===0);
      rig.marker.material.opacity=a.immune>0?.8:.45;
      rig.head.rotation.z=a.stun>0?.1:0;
      rig.cloth.emissive.set(a.flash>0&&!reduced?'#c9ba91':'#000000');rig.cloth.emissiveIntensity=a.flash>0&&!reduced?1.3:0;
      const limbs:[Point,Point,number][]=[ [[-8,-43],p.backKnee,-7],[p.backKnee,p.backFoot,-7],[[8,-43],p.frontKnee,8],[p.frontKnee,p.frontFoot,8],
        [[-13,-76],p.rearElbow,-10],[p.rearElbow,p.rearHand,-10],[[14,-77],p.elbow,13],[p.elbow,p.hand,13] ];
      limbs.forEach(([from,to,z],i)=>segment(rig!.limbs[i]!,from,to,z));
      [p.backFoot,p.frontFoot].forEach((f,i)=>rig!.boots[i]!.position.set(f[0],-f[1]-3,i?8:-7));
      [p.rearHand,p.hand].forEach((f,i)=>{rig!.gloves[i]!.position.set(f[0],-f[1],i?13:-10);rig!.cuffs[i]!.position.set(f[0]-2,-f[1]-5,i?13:-10);});
      [p.backKnee,p.frontKnee].forEach((f,i)=>rig!.knees[i]!.position.set(f[0],-f[1],i?12:-4));
      rig.trail.visible=!reduced&&!!a.attack&&attackPhase(a.attack)==='active';
      rig.tail.rotation.z=reduced?0:Math.sin(gait.get(a.id).phase)*.09;
      rig.shadow.scale.set(76*s*(1+a.elevation/250),42*s,1);rig.shadow.material.opacity=Math.max(.2,.85-a.elevation/180);
      rig.bar.visible=rig.barBack.visible=a.kind!=='player'&&a.kind!=='warden'&&a.health>0&&a.health<a.maxHealth;
      rig.bar.scale.x=36*a.health/a.maxHealth;rig.bar.position.x=-18+18*a.health/a.maxHealth;
    },
    prune(ids:Set<number>){for(const[id,rig]of rigs)if(!ids.has(id)){remove(rig);rigs.delete(id);}},
    reset(){for(const rig of rigs.values())remove(rig);rigs.clear();gait.reset();},
  };
}

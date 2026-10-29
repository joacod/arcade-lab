import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createArt } from './art.ts';

/** Architecture is authored behind lane zero, independently of the combat floor. */
export function createScenery(parent: T.Group, width: number, station: boolean) {
  const art = createArt(), root = new T.Group();
  const { block: b, rounded: r, mesh, material: m, cylinder, sign } = art;
  parent.add(root);
  try {
  const indicators: T.MeshStandardMaterial[] = [];
  const ink = '#10242b', steel = '#33454b', trim = '#536567', cream='#c5bf9e';
  const orange = '#f3a464', mint = '#85c9bb';
  // Set back the skyline so it reads as a silhouette above the low street fronts.
  for (let i=-3;i<width/180+5;i++) {
    const x=i*180, h=290+Math.abs(Math.sin(i*4.7))*220;
    b(root,x,h/2-240,-390,154,h,95,'#142b36');
    b(root,x+42,h-228,-390,38,25,70,'#142b36');
    for (let j=0;j<6;j++) for (let k=0;k<3;k++) {
      if ((i*7+j*3+k)%6) continue;
      b(root,x-52+k*39,-70+j*29,-340,12,3,1,'#6a8586');
    }
  }
  // Elevated train viaduct, with riveted steel, braces and a subdued warm service strip.
  b(root,width/2,222,-210,width+2400,24,150,'#12242a');
  b(root,width/2,237,-132,width+2400,9,8,steel);
  b(root,width/2,211,-132,width+2400,7,8,'#526260');
  b(root,width/2,213,-126,width+2400,1.5,1,'#9d7b54');
  for (let x=-700;x<width+1000;x+=190) {
    b(root,x,224,-124,4,19,3,'#6b726b');
    const brace=b(root,x+50,181,-205,9,90,12,'#263c41'); brace.rotation.z=-.7;
    if (x%380===-320) b(root,x,90,-225,26,180,60,steel);
  }
  // A parked metro car breaks the repeated roofline without animating physical scenery.
  for (let x=420;x<width+500;x+=1460) {
    r(root,x,251,-232,630,60,100,'#2c4247',true);
    b(root,x,234,-178,606,8,2,'#725c45');
    for (let j=0;j<9;j++) {
      r(root,x-262+j*65,258,-179,43,28,2,'#14262c');
      b(root,x-261+j*65,264,-177,34,2,1,'#8c987b');
    }
  }
  // Raised pavement and curb keep the action road broad and visually quiet.
  b(root,width/2,-2,-65,width+2400,12,140,'#354748');
  b(root,width/2,3,7,width+2400,9,13,'#70817a');
  b(root,width/2,1,16,width+2400,2,3,'#1e363a');
  for (let x=-480;x<width+960;x+=480) {
    const index=Math.round(x/480), variant=((index%3)+3)%3, face='#243a3f';
    const h=204+(variant===1?31:0);
    b(root,x+230,h/2,-100,470,h,90,variant===1?'#2a3a3d':face);
    b(root,x+230,h+5,-100,484,11,100,'#435654');
    b(root,x+230,h+12,-100,463,3,86,'#172d33');
    b(root,x+230,h+16,-142,470,9,5,'#3e514f');
    for(let k=0;k<3;k++) {
      r(root,x+90+k*124,h+20,-102,51,18,42,'#304748',true);
      for(let j=0;j<5;j++)b(root,x+72+k*124+j*8,h+30,-103,2,1,34,'#172c31');
    }
    // Weathered masonry courses and staggered joints are broad and low contrast.
    for (let y=18;y<h;y+=19) {
      b(root,x+231,y,-54,464,.7,1,'#3b4d4b');
      for (let j=0;j<6;j++) b(root,x+16+j*80+(y%38?25:0),y+9,-54,.8,17,1,'#344744');
    }
    b(root,x+9,h/2,-42,15,h,18,'#52625b');
    b(root,x+470,h/2,-42,10,h,18,'#172c31');
    // Upper apartments: deep recesses, off-center shutters, vents and copper drains.
    for (let j=0;j<5;j++) {
      const wx=x+58+j*86;
      b(root,wx,174,-50,49,49,9,ink);
      b(root,wx,173,-44,40,39,2,j%3===variant?'#657467':'#1a3339');
      b(root,wx,174,-42,2,42,2,'#324b50');
      b(root,wx,150,-37,57,5,12,trim);
      if(j%3===variant) b(root,wx,189,-40,35,1.5,1,'#bdac7b');
    }
    b(root,x+447,107,-31,5,209,6,'#6c6251',false,true);
    b(root,x+445,8,-27,12,5,10,'#6c6251',false,true);
    r(root,x+411,207,-37,48,27,28,'#58625b',true);
    mesh(root,cylinder,m('#263a3b'),x+411,207,-20,16,3,16).rotation.x=Math.PI/2;
    for(let k=0;k<4;k++) b(root,x+400+k*7,207,-18,1,24,1,'#67736a');
    if (station) {
      if(index===5) {
        sign(root,'MAIN CIRCUIT','GRID CONTROL   /   WARDEN ACCESS ONLY',x+231,133,-28,410,43,orange);
        r(root,x+231,64,-23,411,94,26,'#263e41',true);
        const core=m('#d49c61',true);indicators.push(core);
        mesh(root,art.own(new T.TorusGeometry(31,2.5,8,48)),core,x+231,65,-6,1,1,1);
        mesh(root,cylinder,m('#12292f',false,true),x+231,65,-7,24,8,24).rotation.x=Math.PI/2;
        sign(root,'09','GRID CONTROL',x+231,66,0,33,24,cream);
        for(const side of[-1,1]) {
          for(let j=0;j<3;j++) {
            b(root,x+231+side*112,46+j*18,-7,104,3,2,'#516d69');
            b(root,x+231+side*143,46+j*18,-5,35,2,1,orange,true);
          }
          r(root,x+231+side*186,65,-3,13,72,10,'#657a70',true);
          for(let j=0;j<4;j++)b(root,x+231+side*186,42+j*15,3,5,5,1,orange,true);
        }
      } else {
      sign(root,'CENTRAL GRID',`SECTOR ${String(6+variant).padStart(2,'0')}   /   AUTHORIZED PERSONNEL`,x+231,133,-28,410,43,orange);
      b(root,x+232,66,-45,411,87,9,'#12272d');
      for (let j=0;j<3;j++) {
        const tx=x+93+j*135;
        r(root,tx,48,-23,81,81,49,'#536565',true);
        for(let k=0;k<7;k++) b(root,tx,20+k*9,5,94,3,56,'#78827a',false,true);
        mesh(root,cylinder,m('#a4b7ab'),tx,103,-20,7,36,7);
        for(let k=0;k<5;k++) mesh(root,cylinder,m('#b0b4a0'),tx,92+k*6,-20,14,3,14);
        b(root,tx,121,-20,25,3,7,'#795838',false,true);
        b(root,tx,51,36,28,30,2,'#223a3d');
        sign(root,'ϟ','',tx,52,38,20,25,orange);
        const indicator=m(j===1?'#da7946':'#639c8b',true);
        indicators.push(indicator); mesh(root,art.sphere,indicator,tx+30,81,5,3,3,2);
      }
      }
      b(root,x+232,15,40,434,3,7,trim);
      for(let j=0;j<19;j++) {
        const stripe=b(root,x+32+j*22,8,40,10,11,2,j%2?'#bba16c':'#20393a'); stripe.rotation.z=-.35;
      }
      b(root,x+233,222,-35,415,6,6,'#85684b',false,true);
    } else if (variant===0) {
      // Lantern-lit noodle shop. The warm interior is detailed but lower contrast than fighters.
      sign(root,'LAST TRAIN','NOODLES   /   OPEN UNTIL THE LIGHTS GO OUT',x+193,123,-23,330,47,orange);
      b(root,x+195,63,-43,315,80,7,ink);
      b(root,x+195,63,-38,301,72,2,'#5e5340');
      for(let j=0;j<5;j++) {
        b(root,x+49+j*72,65,-25,4,76,8,'#182f31');
        b(root,x+69+j*62,38,-34,38,5,3,'#a28d66');
        b(root,x+70+j*62,50,-35,3,20,3,'#9d7551');
      }
      b(root,x+195,29,-20,327,13,12,'#64523b');
      const awning=b(root,x+193,104,-2,344,9,65,'#385b55'); awning.rotation.x=-.15;
      for(let j=0;j<10;j++) b(root,x+37+j*35,102,29,14,13,2,j%2?'#536b5d':'#b1aa82');
      for(const tx of [x+46,x+341]) {
        b(root,tx,74,8,1,47,1,'#b8a17d');
        mesh(root,art.sphere,m('#c88c50',true),tx,64,8,10,15,10);
        b(root,tx,75,8,17,3,17,'#554737'); b(root,tx,51,8,15,3,15,'#554737');
      }
      sign(root,'夜','食',x+398,98,-26,40,105,orange);
    } else if (variant===1) {
      sign(root,'NO SIGNAL','RADIO   •   REPAIRS   •   PARTS',x+211,125,-23,354,45,mint);
      b(root,x+204,62,-29,332,87,13,'#1a3034');
      for(let k=0;k<16;k++) b(root,x+204,24+k*5,-20,324,1.2,3,k%3?'#3b5050':'#59665e');
      sign(root,'09','OFF AIR',x+404,78,-18,38,65,'#b6b398');
      b(root,x+224,78,-17,112,1,1,'#53615a');
      const slash=b(root,x+224,80,-16,1.3,38,1,'#53615a');slash.rotation.z=-.55;
      sign(root,'REPAIR / REPEAT','KEEP THE CITY TALKING',x+205,66,-17,133,36,'#928d70','#293c3b');
    } else {
      sign(root,'BLUE HOUR','24 HOUR LAUNDRY   /   EST. 1986',x+211,125,-23,354,45,mint);
      b(root,x+211,64,-37,350,79,5,'#2c4a4e');
      for(let j=0;j<4;j++) {
        const tx=x+78+j*80;
        r(root,tx,48,-21,62,57,22,'#9baba1',true);
        mesh(root,cylinder,m('#263e43',false,true),tx,47,-6,20,4,20).rotation.x=Math.PI/2;
        mesh(root,cylinder,m('#527578',false,true),tx,47,-3,14,4,14).rotation.x=Math.PI/2;
        b(root,tx+18,70,-7,10,3,2,'#b0cbbc',true);
        b(root,tx-22,65,6,3,74,3,'#1a3034');
      }
      b(root,x+211,19,-9,364,7,35,'#687b72');
    }
    // Bollards, gutter, drain grilles and a modest stencil unify both environments.
    b(root,x+455,19,-8,7,32,7,'#a1946d'); b(root,x+455,30,-8,8,5,8,'#273d3f');
    b(root,x+85,4,21,61,1,15,'#10272c');
    for(let j=0;j<9;j++) b(root,x+60+j*6,4.7,21,2,1,14,'#5b7373');
    sign(root,station?'DANGER':'EAST  →',station?'LIVE CURRENT':'NIGHT DISTRICT',x+29,74,-28,31,44,'#a9ac94');
  }
  // Overhead wiring with a natural sag, no independent time owner.
  const wireMaterial=new T.LineBasicMaterial({color:'#101f24'});art.materials.add(wireMaterial);
  for (let x=-400;x<width+1000;x+=600) {
    const curve=new T.QuadraticBezierCurve3(new T.Vector3(x,244,-15),new T.Vector3(x+300,180,-10),new T.Vector3(x+600,244,-15));
    root.add(new T.Line(art.own(new T.BufferGeometry().setFromPoints(curve.getPoints(24))),wireMaterial));
  }
  // Lamps sit on the rear pavement. Their warm pools never obscure warning footprints.
  for (let x=210;x<width+700;x+=780) {
    b(root,x,125,-8,5,245,6,'#59645b',false,true);
    b(root,x-28,245,-8,60,4,9,'#59645b',false,true);
    b(root,x-51,240,0,37,3,17,'#f8d6a1',true);
  }
  // Batch static opaque geometry, retaining the wire lines and individual sign textures.
  root.updateMatrixWorld(true);
  const batches=new Map<T.Material,T.BufferGeometry[]>();
  const remove:T.Object3D[]=[];
  root.traverse(object=>{
    if(!(object instanceof T.Mesh))return;
    const mat=object.material as T.Material;
    const list=batches.get(mat)??[];batches.set(mat,list);
    list.push(object.geometry.clone().applyMatrix4(object.matrixWorld));remove.push(object);
  });
  for(const object of remove) object.removeFromParent();
  for(const [mat,parts] of batches) {
    const merged=art.own(mergeGeometries(parts));for(const part of parts)part.dispose();
    const object=new T.Mesh(merged,mat);object.castShadow=true;object.receiveShadow=true;root.add(object);
  }
  return {
    online(value:boolean) { for(const mat of indicators) {mat.emissive.set(value?'#85ffd4':'#da7946');mat.emissiveIntensity=value?3:1.2;} },
    dispose() {root.removeFromParent();art.dispose();},
  };
  } catch(error) {root.removeFromParent();art.dispose();throw error;}
}

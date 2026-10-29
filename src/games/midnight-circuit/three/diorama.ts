import * as T from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { disposeAll } from '../../../engine/disposal.ts';
import { attackPhase, attackWarning, stageOf, type Run, type BrawlerEvent } from '../game.ts';
import { circuitView } from '../presentation.ts';
import type { CircuitRenderer } from '../graphics.ts';
import { createArt } from './art.ts';
import { createScenery } from './scenery.ts';
import { createFighters } from './fighters.ts';

/** Afterglow: one orthographic scene and one bounded finish, driven by the session frame. */
export function createDiorama(surface: HTMLElement, onFailure: () => void): CircuitRenderer {
  const renderer=new T.WebGLRenderer({antialias:true,alpha:false});
  const canvas=renderer.domElement;canvas.className='circuit-canvas';canvas.dataset.renderer='three';
  const cleanups:(()=>void)[]=[];
  let disposed=false;
  function lost(event:Event){event.preventDefault();if(!disposed)onFailure();}
  function dispose(){
    if(disposed)return;disposed=true;canvas.removeEventListener('webglcontextlost',lost);
    disposeAll(...cleanups.reverse(),()=>renderer.dispose(),()=>renderer.forceContextLoss(),()=>canvas.remove());
  }
  try {
    renderer.debug.onShaderError=()=>{throw new Error('Afterglow shader compilation failed');};
    renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
    const scene=new T.Scene();scene.background=new T.Color('#172f3b');scene.fog=new T.Fog('#172f3b',1150,2400);
    const camera=new T.OrthographicCamera(-480,480,320,-240,1,4000);
    const world=new T.Group(),people=new T.Group(),effects=new T.Group(),cues=new T.Group();scene.add(world,people,effects,cues);
    const art=createArt();cleanups.push(()=>art.dispose());
    const {mesh,block,material}=art;
    const fighters=createFighters(art,people);cleanups.push(()=>fighters.reset());
    let scenery:ReturnType<typeof createScenery>|undefined;cleanups.push(()=>scenery?.dispose());
    scene.add(new T.HemisphereLight('#b7d5df','#253f3b',1.6));
    const key=new T.DirectionalLight('#f4d8ac',2.4);key.position.set(-300,650,500);key.castShadow=true;
    key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-780;key.shadow.camera.right=780;
    key.shadow.camera.top=500;key.shadow.camera.bottom=-500;key.shadow.camera.far=1900;key.shadow.normalBias=.6;key.shadow.bias=-.00015;
    scene.add(key,key.target);cleanups.push(()=>key.dispose());
    const rim=new T.DirectionalLight('#77b8ce',2.8);rim.position.set(200,300,-500);scene.add(rim);
    const warm=new T.PointLight('#f2a665',9500,620,1.7);scene.add(warm);
    // A low-resolution reflected scene, softened and broken up by world-space wet patches.
    const reflectionTarget=new T.WebGLRenderTarget(768,384,{type:T.HalfFloatType,depthBuffer:true});
    cleanups.push(()=>reflectionTarget.dispose());
    const reflectionCamera=new T.OrthographicCamera();
    const reflectionClip=new T.Plane(new T.Vector3(0,1,0),3);
    const reflectionMaterial=new T.ShaderMaterial({uniforms:{tDiffuse:{value:reflectionTarget.texture}},
        vertexShader:`varying vec4 vUv; varying vec3 vWorld;
          void main(){vWorld=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);vUv=gl_Position;}`,
        fragmentShader:`uniform sampler2D tDiffuse; varying vec4 vUv; varying vec3 vWorld;
          float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
          void main(){
            vec2 uv=vUv.xy/vUv.w*.5+.5;uv.x=1.0-uv.x;
            float ripple=sin(vWorld.z*.33+sin(vWorld.x*.11))*0.0025;
            vec3 reflected=texture2D(tDiffuse,uv+vec2(ripple,0.0)).rgb*.4;
            reflected+=texture2D(tDiffuse,uv+vec2(.004, .003)).rgb*.15;
            reflected+=texture2D(tDiffuse,uv-vec2(.004, .003)).rgb*.15;
            reflected+=texture2D(tDiffuse,uv+vec2(.006,0.0)).rgb*.15;
            reflected+=texture2D(tDiffuse,uv-vec2(.006,0.0)).rgb*.15;
            float wetPatch=.5+.5*sin(vWorld.x*.017+sin(vWorld.z*.023)*2.0);
            float wet=.16+wetPatch*.25;
            float grit=hash(floor(vWorld.xz*1.4))*.009;
            vec3 road=vec3(.022,.042,.046)+grit;
            gl_FragColor=vec4(mix(road,reflected,wet),1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
    });art.materials.add(reflectionMaterial);
    const reflector=mesh(scene,art.plane,reflectionMaterial,1650,-3,900,10000,2600,1);
    reflector.rotation.x=-Math.PI/2;reflector.castShadow=false;
    // A transparent road skin receives moving shadows over the reflected wet surface.
    const road=new T.MeshStandardMaterial({color:'#263c3b',roughness:.68,transparent:true,opacity:.17,depthWrite:false});art.materials.add(road);
    const roadSkin=mesh(scene,art.plane,road,1650,-2.8,900,10000,2600,1);roadSkin.rotation.x=-Math.PI/2;roadSkin.castShadow=false;
    const markings=new T.Group();scene.add(markings);
    for(let x=-800;x<4400;x+=220){
      block(markings,x,-1.9,352,94,.5,3,'#6f7c69');
      block(markings,x+70,-1.9,23,31,.5,1,'#566c66');
    }
    const ring=art.own(new T.RingGeometry(.955,1,64).rotateX(-Math.PI/2));
    const disc=art.own(new T.CircleGeometry(1,48).rotateX(-Math.PI/2));
    const warningFill=new T.MeshBasicMaterial({color:'#ef713d',transparent:true,opacity:.09,depthWrite:false});art.materials.add(warningFill);
    const warningLine=new T.MeshBasicMaterial({color:'#faab71',transparent:true,opacity:.9,depthWrite:false});art.materials.add(warningLine);
    const gateMaterial=new T.MeshBasicMaterial({color:'#e5ac78',transparent:true,opacity:.45,depthWrite:false});art.materials.add(gateMaterial);
    const pickupMaterial=material('#b5f5c5',true);
    const rainGeometry=art.own(new T.BufferGeometry()),rainData=new Float32Array(110*6);
    rainGeometry.setAttribute('position',new T.BufferAttribute(rainData,3));
    const rainMaterial=new T.LineBasicMaterial({color:'#c0dad6',transparent:true,opacity:.16});art.materials.add(rainMaterial);
    const rain=new T.LineSegments(rainGeometry,rainMaterial);rain.frustumCulled=false;scene.add(rain);
    const composer=new EffectComposer(renderer);cleanups.push(()=>composer.dispose());
    composer.addPass(new RenderPass(scene,camera));
    const bloom=new UnrealBloomPass(new T.Vector2(1,1),.36,.5,1.15);composer.addPass(bloom);cleanups.push(()=>bloom.dispose());
    const finish=new ShaderPass({uniforms:{tDiffuse:{value:null}},
      vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader:`uniform sampler2D tDiffuse;varying vec2 vUv;
        void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;float edge=smoothstep(.3,.8,length((vUv-.5)*vec2(1.0,.85)));gl_FragColor=vec4(c*(1.0-edge*.22),1.0);}`,
    });composer.addPass(finish);cleanups.push(()=>finish.dispose());
    const output=new OutputPass();composer.addPass(output);cleanups.push(()=>output.dispose());
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    let stage=-1,camX:number|undefined,lastTime=0,lastFrame='',lastDrawnRun:Run|undefined;
    const bursts:{object:T.Mesh;x:number;lane:number;height:number;vx:number;vy:number;life:number}[]=[];
    const impacts:{object:T.Mesh;life:number;max:number;strength:number}[]=[];
    function clearEffects(){for(const b of bursts)b.object.removeFromParent();for(const r of impacts){r.object.removeFromParent();(r.object.material as T.Material).dispose();}bursts.length=0;impacts.length=0;}
    cleanups.push(clearEffects);
    function warnings(run:Run){
      cues.clear();
      const encounter=stageOf(run).encounters[run.encounter];
      if(run.gated&&encounter)for(const x of[encounter.left,encounter.right]){
        mesh(cues,art.box,gateMaterial,x,1,150,2,1,300);
        for(let i=0;i<7;i++)mesh(cues,art.box,gateMaterial,x,2,25+i*46,10,1,2);
      }
      for(const a of run.enemies){
        const area=attackWarning(a);if(!area||!a.attack)continue;
        const z=area.lane/.6,depth=area.depth/.6;
        if(area.shape==='ellipse'){
          mesh(cues,ring,warningLine,area.x,2,z,area.width/2,1,depth/2);
          mesh(cues,disc,warningFill,area.x,1.6,z,area.width/2,1,depth/2);
        }else{
          mesh(cues,art.box,warningFill,area.x,1.5,z,area.width,1,depth);
          for(const edge of[-1,1]){
            mesh(cues,art.box,warningLine,area.x,2,z+edge*depth/2,area.width,1,2);
            mesh(cues,art.box,warningLine,area.x+edge*area.width/2,2,z,2,1,depth);
          }
        }
        if(attackPhase(a.attack)==='startup'){
          block(cues,a.x,a.kind==='warden'?248:176,z,3,11,3,'#ffd2a0',true);
          block(cues,a.x,a.kind==='warden'?239:167,z,3,3,3,'#ffd2a0',true);
        }
      }
      for(const p of run.pickups)if(!p.collected){
        const z=p.lane/.6;
        mesh(cues,ring,pickupMaterial,p.x,2,z,21,1,16);
        art.rounded(cues,p.x,13,z,26,20,18,'#396658');
        mesh(cues,art.box,pickupMaterial,p.x,14,z+10,4,12,2);
        mesh(cues,art.box,pickupMaterial,p.x,14,z+10,12,4,2);
      }
    }
    canvas.addEventListener('webglcontextlost',lost);surface.append(canvas);
    return {
      reset(){fighters.reset();clearEffects();camX=undefined;lastTime=0;lastFrame='';},
      consume(events:readonly BrawlerEvent[]){
        lastFrame='';
        if(reduced.matches)return;
        for(const e of events){
          if(!['hit','damage','ko','pickup','victory'].includes(e.type))continue;
          const color=e.type==='damage'?'#f78b53':e.type==='pickup'?'#b9ffd8':'#ffdc9e';
          for(let i=0;i<(e.type==='ko'?22:12)&&bursts.length<112;i++){
            const angle=i*2.399;
            const object=mesh(effects,art.box,material(color,true),e.x,70,e.lane/.6,1.5,5,1.5);object.rotation.z=angle;
            bursts.push({object,x:e.x,lane:e.lane,height:60,vx:Math.cos(angle)*(70+i*9),vy:Math.sin(angle)*130+80,life:.23+i%4*.07});
          }
          if(impacts.length<12){
            const mat=new T.MeshBasicMaterial({color,transparent:true,opacity:.7,depthWrite:false});
            const object=mesh(effects,ring,mat,e.x,3,e.lane/.6,8,1,5);object.castShadow=false;
            impacts.push({object,life:.28,max:.28,strength:e.strength});
          }
        }
      },
      draw(run,size,screen){
        if(disposed)return;
        const frameKey=`${screen}/${run.elapsed}/${run.stageIndex}/${size.width}/${size.height}/${size.ratio}/${reduced.matches}`;
        // Menus and results freeze the run. Keep the finished frame without spending GPU time.
        if(screen!=='playing'&&run===lastDrawnRun&&frameKey===lastFrame)return;
        const dt=screen==='playing'?Math.max(0,Math.min(.05,run.elapsed-lastTime)):0;lastTime=run.elapsed;
        if(stage!==run.stageIndex){scenery?.dispose();camX=undefined;stage=run.stageIndex;scenery=createScenery(world,stageOf(run).width,stageOf(run).environment==='station');}
        const ratio=Math.min(size.ratio,1.5,Math.sqrt(1800000/Math.max(1,size.width*size.height)));
        if(canvas.width!==Math.round(size.width*ratio)||canvas.height!==Math.round(size.height*ratio)){
          renderer.setPixelRatio(ratio);renderer.setSize(size.width,size.height,false);composer.setPixelRatio(ratio);composer.setSize(size.width,size.height);camX=undefined;
        }
        const view=circuitView(size.width,size.height,run);
        camX=camX===undefined?view.x:camX+(view.x-camX)*(reduced.matches?1:1-Math.exp(-7*dt));
        const center=camX+view.width/2;
        camera.left=-view.width/2;camera.right=view.width/2;camera.top=view.ground;camera.bottom=view.ground-view.height;
        camera.position.set(center,600,800);camera.lookAt(center,0,0);camera.updateProjectionMatrix();
        key.position.set(center-320,650,500);key.target.position.set(center,0,0);warm.position.set(center-250,120,-20);
        const online=run.finale>0||run.status==='victory';scenery!.online(online);
        key.color.set(online?'#fff0c9':'#f4d8ac');rim.color.set(online?'#8bdbc0':'#77b8ce');
        fighters.gait.observe(run);
        for(const a of[run.player,...run.enemies])fighters.pose(a,run.elapsed,reduced.matches);
        fighters.prune(new Set([run.player.id,...run.enemies.map(a=>a.id)]));warnings(run);
        if(reduced.matches)clearEffects();
        for(let i=bursts.length-1;i>=0;i--){
          const b=bursts[i]!;b.life-=dt;b.x+=b.vx*dt;b.height+=b.vy*dt;b.vy-=480*dt;
          b.object.position.set(b.x,Math.max(2,b.height/.8),b.lane/.6);b.object.scale.set(.8,Math.max(.1,b.life*16),.8);
          if(b.life<=0){b.object.removeFromParent();bursts.splice(i,1);}
        }
        for(let i=impacts.length-1;i>=0;i--){
          const r=impacts[i]!;r.life-=dt;const radius=8+(1-r.life/r.max)*(28+r.strength*9);
          r.object.scale.set(radius,1,radius*.7);(r.object.material as T.MeshBasicMaterial).opacity=Math.max(0,r.life/r.max*.65);
          if(r.life<=0){(r.object.material as T.Material).dispose();r.object.removeFromParent();impacts.splice(i,1);}
        }
        rain.visible=!reduced.matches&&stage===0;
        if(rain.visible){for(let i=0;i<110;i++){
          const x=camX+((i*137-run.elapsed*65)%view.width+view.width)%view.width,y=410-((i*73+run.elapsed*430)%470),z=(i*37)%510;
          rainData.set([x,y,z,x-3,y-15,z],i*6);
        }rainGeometry.attributes.position!.needsUpdate=true;}
        // The reflected camera uses the same asymmetric orthographic projection as combat.
        // Hide floor overlays and clip underground backdrop geometry from this auxiliary view.
        reflectionCamera.copy(camera);reflectionCamera.position.y=-camera.position.y-6;
        reflectionCamera.up.set(0,-1,0);reflectionCamera.lookAt(center,-6,0);reflectionCamera.updateMatrixWorld();
        const previousTarget=renderer.getRenderTarget();
        reflector.visible=roadSkin.visible=markings.visible=cues.visible=rain.visible=false;
        renderer.clippingPlanes=[reflectionClip];renderer.shadowMap.autoUpdate=false;
        try{renderer.setRenderTarget(reflectionTarget);renderer.render(scene,reflectionCamera);}
        finally{
          renderer.setRenderTarget(previousTarget);renderer.clippingPlanes=[];renderer.shadowMap.autoUpdate=true;
          reflector.visible=roadSkin.visible=markings.visible=cues.visible=true;rain.visible=!reduced.matches&&stage===0;
        }
        composer.render();lastFrame=frameKey;lastDrawnRun=run;
      },dispose,
    };
  }catch(error){dispose();throw error;}
}

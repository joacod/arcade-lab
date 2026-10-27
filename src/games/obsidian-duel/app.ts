import type { GameSession } from '../../engine/session.ts';
import { createHost } from '../../engine/browser/host.ts';
import { createClock, FIXED_STEP } from '../../engine/clock.ts';
import { bindPageLifetime, bindSessionFocus } from '../../engine/browser/session.ts';
import { createMatch, pauseMatch, stepMatch, takeEvents } from './game.ts';
import type { FighterId } from './content.ts';
import { bindInput } from './input.ts';
import { createUI, type Intent, type Screen } from './ui.ts';
import { createPresentation } from './presentation.ts';
import { createSound } from './sound.ts';
import './style.css';
export function mountDuel(container: HTMLElement, onExit: () => void): GameSession {
  let disposed=false, selected: FighterId='nera', match=createMatch(), screen: Screen='title';
  const clock=createClock();
  let ui: ReturnType<typeof createUI>;
  let input: ReturnType<typeof bindInput>|undefined, presentation: ReturnType<typeof createPresentation>|undefined, sound: ReturnType<typeof createSound>|undefined;
  const host=createHost(container,{className:'duel-app',label:'Obsidian Duel',
    surfaceLabel:'Obsidian Duel playfield. A D move, W jump, S crouch, J light, K heavy, L special, Shift guard. Escape pauses.',
    onDisplayChange:suspend,onFullscreenChange:()=>ui.fullscreen(host.fullscreenAvailable,host.fullscreen)});
  function dispose(){if(disposed)return;disposed=true;input?.clear();presentation?.dispose();sound?.dispose();host.dispose();}
  function transition(next: Screen, focus=true){
    input?.clear();clock.reset();screen=next;
    if(next==='paused'||next==='title')sound?.pause();
    ui.show(next,focus);ui.update(match);
  }
  function suspend(){
    if(disposed)return;input?.clear();clock.reset();sound?.pause();
    if(screen==='playing'){pauseMatch(match,true);transition('paused',false);}
  }
  function act(intent: Intent){
    if(disposed)return;
    if(intent==='quit'){onExit();return;}
    if(intent==='pause'){suspend();return;}
    if(intent==='fullscreen'){void host.toggleFullscreen().then(message=>{if(!disposed)ui.displayStatus(message);});return;}
    if(document.hidden||!document.hasFocus())return;
    if(intent==='start'&&screen==='title'||intent==='restart'&&screen!=='playing'){
      sound?.reset();sound?.activate();match=createMatch(selected);presentation?.reset();transition('playing');
    }else if(intent==='resume'&&screen==='paused'){
      sound?.activate();pauseMatch(match,false);transition('playing');
    }
  }
  try{
    sound=createSound(message=>{if(!disposed)ui.soundStatus(message);});
    ui=createUI(host.root,host.surface,host.signal,act,id=>{if(screen==='title'){selected=id;match=createMatch(id);presentation?.reset();ui.update(match);}},value=>sound?.setMuted(value));
    presentation=createPresentation(host.surface);
    input=bindInput(host.surface,ui.controls,()=>screen==='playing'&&match.phase==='fight',host.signal);
    host.root.addEventListener('keydown',event=>{if(!event.repeat&&['Escape','KeyP'].includes(event.code)&&screen==='playing'){event.preventDefault();suspend();}},{signal:host.signal});
    bindSessionFocus(host.root,{signal:host.signal,clearInput:()=>input?.clear(),suspend,
      shouldSuspend:()=>screen==='playing'&&document.activeElement!==host.surface&&!Object.values(ui.controls).includes(document.activeElement as HTMLButtonElement)});
    bindPageLifetime({signal:host.signal,suspend,resetTiming:()=>clock.reset(),dispose});
    ui.show('title');ui.update(match);ui.fullscreen(host.fullscreenAvailable,host.fullscreen);
    host.start(now=>{
      if(screen==='playing'){
        const steps=clock.advance(now);
        for(let i=0;i<steps&&match.status==='active';i++){
          const phase=match.phase;stepMatch(match,input!.read(),FIXED_STEP);
          const events=takeEvents(match);presentation!.consume(events);sound!.consume(events);
          if(match.phase!==phase){input!.clear();clock.reset();break;}
        }
        if(match.status==='victory'||match.status==='defeat')transition(match.status);
      }
      presentation!.draw(match,host,screen,now/1000);ui.update(match);
    });
    return{dispose};
  }catch(error){dispose();throw error;}
}

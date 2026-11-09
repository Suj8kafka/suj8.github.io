import test from 'node:test';
import assert from 'node:assert/strict';
import { createParallax } from '../assets/js/parallax.js';

function preview({ light = false, loader = false, missing = false } = {}) {
  const calls = [], triggers = [], quickCalls = [];
  function target() {
    const events = new Map(), classes = new Set(), styles = new Map();
    return {
      style: { setProperty: (key,value) => styles.set(key,value), removeProperty: key => styles.delete(key), getPropertyValue: key => styles.get(key)||'' },
      classList: {add: (...values) => values.forEach(value=>classes.add(value)),remove: (...values)=>values.forEach(value=>classes.delete(value)),contains:value=>classes.has(value),toggle(value,on){on?classes.add(value):classes.delete(value);}},
      addEventListener(name,callback){if(!events.has(name))events.set(name,new Set());events.get(name).add(callback);},
      removeEventListener(name,callback){events.get(name)?.delete(callback);},
      dispatch(name,event={}){events.get(name)?.forEach(callback=>callback(event));},
      hasListener:name=>!!events.get(name)?.size,
      clientHeight:245,
      getBoundingClientRect:()=>({top:0,left:0,width:400,height:740})
    };
  }
  const root=target(),hero=target(),art=target(),portrait=target(),noteOne=target(),noteTwo=target();
  const scenery=[target(),target(),target()],image=target(),anchor=target(),illustration=target();
  image.closest=()=>anchor;illustration.parentElement=target();
  const elements={'.hero':hero,'.hero-art':art,'.portrait-frame':portrait,'.note-one':noteOne,'.note-two':noteTwo};
  const document=Object.assign(target(),{documentElement:root,hidden:false,
    querySelector:selector=>elements[selector]||null,
    querySelectorAll:selector=>selector==='.hero-landscape-layer'?scenery:selector==='.section-illustration'?[illustration]:[image]});
  const window=target();if(loader)root.classList.add('loader-running');
  const gsap={
    context(callback){callback();return{revert(){triggers.forEach(trigger=>{trigger.killed=true;});}};},
    fromTo(element,from,to){
      const trigger={enabled:true,isActive:true,disable(revert){this.enabled=false;this.revert=revert;},enable(){this.enabled=true;},update(){this.updated=true;}};
      triggers.push(trigger);calls.push({element,from,to,trigger});return{scrollTrigger:trigger};
    },
    quickTo(state,property,options){const move=value=>{state[property]=value;options.onUpdate();};move.tween={pause(){this.paused=true;}};quickCalls.push(move);return move;}
  };
  const controller=createParallax({document,window,gsap:missing?null:gsap,ScrollTrigger:missing?null:{},light});
  return{controller,document,window,root,hero,art,portrait,noteOne,noteTwo,scenery,image,illustration,calls,triggers,quickCalls};
}

test('GSAP depth uses bounded cached ScrollTrigger ranges and preserves the original portrait canvas',()=>{
 const page=preview();
 const art=page.calls.find(call=>call.element===page.art);
 assert.equal(art.to['--parallax-y'],'32px');assert.equal(art.to.scrollTrigger.start,'top top');
 assert.ok(parseFloat(art.to.scrollTrigger.end().slice(2))>200);
 assert.equal(page.calls.some(call=>call.element===page.portrait),false,'Do not translate or scale the portrait inside its frame');
 const image=page.calls.find(call=>call.element===page.image);
 assert.equal(image.from['--parallax-y'](),'-14px');assert.equal(image.to['--parallax-y'](),'14px');
 assert.equal(image.to.scrollTrigger.end,'bottom top');
 assert.equal(page.window.hasListener('scroll'),false,'ScrollTrigger owns scroll updates; no second animation loop');
 const depths=page.scenery.map(element=>parseFloat(page.calls.find(call=>call.element===element).to['--parallax-y']));
 assert.ok(depths[0]>0&&depths[1]>depths[0]&&depths[2]>depths[1]);
});

test('anchor navigation freezes owned depth triggers without resetting transforms and resumes on arrival',()=>{
 const page=preview();page.art.style.setProperty('--parallax-y','17px');
 page.root.classList.add('is-anchor-scrolling');page.document.dispatch('scroll-navigation:start');
 assert.ok(page.triggers.every(trigger=>!trigger.enabled&&trigger.revert===false));
 assert.equal(page.art.style.getPropertyValue('--parallax-y'),'17px');
 assert.ok(page.quickCalls.every(move=>move.tween.paused));
 page.root.classList.remove('is-anchor-scrolling');page.document.dispatch('scroll-navigation:end');
 assert.ok(page.triggers.every(trigger=>trigger.enabled&&trigger.updated));
});

test('loader and page visibility pause depth triggers until the page becomes usable',()=>{
 const page=preview({loader:true});assert.ok(page.triggers.every(trigger=>!trigger.enabled));
 page.root.classList.remove('loader-running');page.document.dispatch('loader:done');
 assert.ok(page.triggers.every(trigger=>trigger.enabled));
 page.document.hidden=true;page.document.dispatch('visibilitychange');assert.ok(page.triggers.every(trigger=>!trigger.enabled));
 page.document.hidden=false;page.document.dispatch('visibilitychange');assert.ok(page.triggers.every(trigger=>trigger.enabled));
});

test('lighter motion shortens travel and allocates no pointer tweens',()=>{
 const full=preview(),light=preview({light:true});
 const distance=page=>parseFloat(page.calls.find(call=>call.element===page.art).to['--parallax-y']);
 assert.ok(distance(light)<distance(full));assert.equal(light.quickCalls.length,0);
 light.portrait.dispatch('pointermove',{pointerType:'mouse',clientX:400,clientY:0});
 assert.equal(light.portrait.style.getPropertyValue('--portrait-tilt-y'),'');
 assert.equal(light.portrait.classList.contains('parallax-depth'),false);
});

test('reused pointer tweens clamp mouse input, ignore touch and pause during navigation',()=>{
 const page=preview();assert.equal(page.quickCalls.length,4);
 page.hero.dispatch('pointermove',{pointerType:'mouse',clientX:100000,clientY:-100000});
 assert.equal(page.scenery[2].style.getPropertyValue('--scene-x'),'-9px');
 page.portrait.dispatch('pointermove',{pointerType:'mouse',clientX:100000,clientY:-100000});
 assert.equal(page.portrait.style.getPropertyValue('--portrait-tilt-x'),'2.5deg');
 assert.equal(page.portrait.style.getPropertyValue('--portrait-tilt-y'),'3deg');
 page.portrait.dispatch('pointerleave');assert.equal(page.portrait.style.getPropertyValue('--portrait-tilt-x'),'0deg');
 page.portrait.dispatch('pointermove',{pointerType:'touch',clientX:100000,clientY:-100000});
 assert.equal(page.portrait.style.getPropertyValue('--portrait-tilt-x'),'0deg');
 page.root.classList.add('is-anchor-scrolling');page.document.dispatch('scroll-navigation:start');
 page.portrait.dispatch('pointermove',{pointerType:'mouse',clientX:100000,clientY:-100000});
 assert.equal(page.portrait.style.getPropertyValue('--portrait-tilt-x'),'0deg');
});

test('destroy releases owned triggers, pointer listeners and transient styles; missing GSAP remains static',()=>{
 const page=preview();page.controller.destroy();page.controller.destroy();
 assert.ok(page.triggers.every(trigger=>trigger.killed));
 assert.equal(page.image.style.getPropertyValue('--parallax-scale'),'');
 assert.equal(page.art.classList.contains('parallax-depth'),false);
 assert.equal(page.hero.hasListener('pointermove'),false);
 assert.equal(page.document.hasListener('scroll-navigation:start'),false);
 const missing=preview({missing:true});assert.equal(missing.calls.length,0);assert.equal(missing.art.classList.contains('parallax-depth'),false);
});

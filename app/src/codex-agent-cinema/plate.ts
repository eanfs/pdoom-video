import type * as THREE from 'three';
import type {Frame} from '../engine/scene';
import AgentPlate from '../codex-agent/plate';

// Cinematic look variant of 14-01: identical content and timing, but the
// pdoom music-video post chain is switched on (bloom + halation, chromatic
// aberration, film grain, vignette). Render with --samples auto --shutter 0.2
// to also get adaptive motion blur like the reference music video.
export default class CinemaPlate extends AgentPlate{
 override render(f:Frame,out:THREE.WebGLRenderTarget){
  const post=super.render(f,out) as ReturnType<AgentPlate['render']>;
  return {...post,hud:0,bloom:0.3,halation:0.2,ca:1.6,grain:0.06,vignette:0.32,exposure:1.02};
 }
}

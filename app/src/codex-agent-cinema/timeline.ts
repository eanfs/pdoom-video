import {SCENES} from '../codex-agent/cues';
import type {TimelineEntry} from '../engine/engine';
export function makeTimeline():TimelineEntry[]{return SCENES.map(s=>({...s,caption:undefined,params:s,load:()=>import('./plate')}));}

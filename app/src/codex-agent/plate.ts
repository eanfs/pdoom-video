import type * as THREE from 'three';
import {Scene,type Frame} from '../engine/scene';
import {Layer2D,clearRT} from '../engine/gl';
import {C,ZH,MONO,text,box,line,arrow,dot,reveal,terminal,chain4,header,captionBlock,sceneWipe} from '../explain-kit';

type Cue={id:string;start:number;end:number;title:string;caption:string[];lt:number[]};

// Light paper palette, shared via explain-kit; not a brand token set.
export default class AgentPlate extends Scene{
 layer=new Layer2D();
 override render(f:Frame,out:THREE.WebGLRenderTarget){
  const c=this.layer.ctx,p=this.ctx.params as Cue,t=f.lt,total=p.end-p.start;
  const beat=(i:number)=>p.lt[i]??2+i*5;
  this.layer.clear(C.bg);clearRT(this.ctx.renderer,out);
  header(c,'AI ENGINEERING / 从零开始','14 — 01');
  if(p.id==='intro'){
   text(c,'第 14 章 · 智能体工程',100,244,40,C.green);
   text(c,'Agent 循环',94,417,120,C.text);
   text(c,'观察 → 决策 → 行动',102,505,55,C.muted);
   reveal(c,t,beat(0),()=>{line(c,100,582,1820,582);});
   reveal(c,t,beat(2)+1.2,()=>{text(c,'第 01 节',100,790,28,C.muted);text(c,'PDOOM ENGINE / 9 SCENES / SILENT',1260,790,24,C.muted,MONO);});
  }else{
   text(c,p.title,100,215,64);text(c,Math.round(p.start)+' s',1820,215,28,C.muted,MONO,'right');
   if(p.id==='loop'){
    chain4(c,t,Math.floor(t/2.2)%4);
    reveal(c,t,beat(0)+.6,()=>{text(c,'上下文 = 目标 + 工具说明 + 历史结果',120,700,36);});
    reveal(c,t,beat(2),()=>{text(c,'每次回流都改变下一轮决策——循环由此闭合',120,780,36,C.green);});
   }
   if(p.id==='react'){
    reveal(c,t,beat(0),()=>{terminal(c,100,290,1720,470,'react_trace.md');
     const rows:[string,string,string][]=[
      ['Thought:',C.muted,'我需要先算税额，才能报总价。'],
      ['Action:',C.green,'calculator { "expr": "120 * 0.15" }'],
      ['Observation:',C.blue,'18.0'],
      ['Thought:',C.muted,'税额已知，现在加上商品价。'],
      ['Action:',C.green,'calculator { "expr": "120 + 18" }'],
      ['Observation:',C.blue,'138.0']];
     rows.forEach((r,i)=>{text(c,r[0],150,400+i*62,31,r[1],MONO);text(c,r[2],380,400+i*62,31,C.text);});});
    reveal(c,t,beat(2),()=>{text(c,'三段式让每一步都可检查、可重放',100,820,34,C.muted);});
   }
   if(p.id==='native'){
    reveal(c,t,beat(0),()=>{box(c,100,300,830,470);text(c,'早期：显式 ReAct',150,380,32,C.muted);
     ['Thought 写进上下文','Action 显式成文本','Observation 再拼回去'].forEach((s,i)=>text(c,'· '+s,150,470+i*85,33));});
    reveal(c,t,beat(1),()=>{box(c,1010,300,810,470,true);text(c,'2026：原生推理',1060,380,32,C.green);
     ['思考在模型内部展开','工具调用是结构化输出','回流与停止判断不变'].forEach((s,i)=>text(c,'· '+s,1060,470+i*85,33,C.green));});
    reveal(c,t,beat(2),()=>{arrow(c,945,535,1005,535,C.green);text(c,'格式变了，循环没变',100,830,36,C.text);});
   }
   if(p.id==='five'){
    const items:[string,string][]=[['模型','决策大脑'],['工具','能力扩展'],['记忆','状态保存'],['宿主','执行与把关'],['停止条件','防无限循环']];
    items.forEach(([a,b],i)=>reveal(c,t,beat(0)+i*.5,()=>{
     box(c,120+i*350,360,310,190,i===4);text(c,a,275+i*350,450,44,i===4?C.green:C.text,ZH,'center');text(c,b,275+i*350,510,25,C.muted,ZH,'center');}));
    reveal(c,t,beat(2),()=>{text(c,'五者缺一不可',120,680,40);});
   }
   if(p.id==='tools'){
    reveal(c,t,beat(0),()=>{terminal(c,100,290,1000,300,'tool_request.json');
     const rows=['{','  "action": "calculator",','  "args": {','    "expr": "120 * 0.15"','  }','}'];
     rows.forEach((s,i)=>text(c,s,140,405+i*54,31,i===1||i===3?C.green:C.text,MONO));});
    reveal(c,t,beat(0)+1,()=>{box(c,1180,290,640,300);text(c,'执行前检查',1230,355,30,C.muted);
     ['名称存在','参数合法','操作获准'].forEach((v,i)=>{box(c,1210,395+i*85,580,72,i<2);text(c,'✓  '+v,1240,443+i*85,32,C.green);});});
    reveal(c,t,beat(2),()=>{box(c,100,630,820,190,true);text(c,'执行结果',150,700,30,C.green);text(c,'18.0',150,790,72,C.green,MONO);text(c,'来自程序运行，不是模型幻觉',1050,720,36,C.text);});
   }
   if(p.id==='everywhere'){
    reveal(c,t,beat(0),()=>{box(c,1240,380,480,200,true);text(c,'同一个循环',1480,470,42,C.green,ZH,'center');text(c,'观察·决策·执行·回流',1480,535,26,C.muted,ZH,'center');});
    const apps:[string,string[]][]=[['编码 Agent',['读写文件','跑测试','改代码']],['检索 Agent',['搜索','读网页','引用来源']],['行程 Agent',['查航班','算预算','下单前确认']]];
    apps.forEach(([title,items],i)=>reveal(c,t,beat(0)+.6+i*.5,()=>{
     const y=220+i*220;box(c,130,y,540,180);text(c,title,180,y+66,34);
     items.forEach((s,j)=>text(c,'· '+s,180,y+110+j*40,26,C.muted));
     arrow(c,680,y+90,760,440,C.muted);}));
    reveal(c,t,beat(2),()=>{text(c,'换的只是工具集与停止条件',760,770,34,C.text);});
   }
   if(p.id==='pitfalls'){
    const pits:[string,string][]=[['把工具失败当成任务失败','该重试、换工具或换路径，而不是直接放弃'],
     ['没有轮数上限','模型原地打转，烧完预算才停'],
     ['上下文塞满原始网页','挤掉目标与关键结果，决策质量下降']];
    pits.forEach(([a,b],i)=>reveal(c,t,beat(0)+i*.6,()=>{
     const y=290+i*180;box(c,120,y,1680,150);c.strokeStyle=C.red;c.lineWidth=2;c.beginPath();c.roundRect(120,y,1680,150,22);c.stroke();
     text(c,'✗  '+a,170,y+64,36,C.red);text(c,b,170,y+120,28,C.muted);}));
    reveal(c,t,beat(2),()=>{text(c,'坑大多在宿主与工具层，不在模型',120,850,34,C.text);});
   }
   if(p.id==='recap'){
    chain4(c,t,Math.floor(t/2)%4);
    reveal(c,t,beat(0),()=>{text(c,'会行动，也必须会停下：finish(138.0) 或 max_turns',120,700,40);});
    reveal(c,t,beat(1),()=>{text(c,'课程实测：两次工具调用，总价 138',120,770,36,C.green);});
    reveal(c,t,beat(2),()=>{text(c,'回到原课：运行 main.py，检查工具轨迹与停止条件',120,840,34,C.muted);});
   }
  }
  captionBlock(c,p.caption,p.lt,t,total,'教学控制流示意 · 无配音 · 数字来自课程代码实跑');
  sceneWipe(c,t,Math.max(0,Math.round(p.start)));
  this.ctx.comp.draw(this.ctx.renderer,this.layer.upload(),out);
  return {hud:0,bloom:0,halation:0,ca:0,grain:0,vignette:0,exposure:1,fade:0};
 }
 override dispose(){this.layer.texture.dispose();}
}

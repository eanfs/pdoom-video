import type * as THREE from 'three';
import {Scene,type Frame} from '../engine/scene';
import {Layer2D,clearRT} from '../engine/gl';
import {C,ZH,MONO,clamp,text,box,line,arrow,reveal,table,strip,header,sceneWipe} from '../explain-kit';

type Cue={id:string;start:number;end:number;title:string;caption:string[];lt:number[]};

// Real 6-token attention maps from the 07-03 course run (evidence/course-run.txt):
// "the cat sat on the mat", d_model=8, 2 heads, d_head=4. Head 0 peaks at sat
// (0.389), head 1 peaks at the (0.339) — two different relation patterns.
const TOK=['the','cat','sat','on','the','mat'];
const HEAD0=[[.147,.214,.262,.154,.121,.102],[.113,.230,.217,.156,.219,.065],[.125,.158,.092,.132,.352,.142],[.103,.245,.346,.154,.103,.048],[.132,.238,.389,.112,.053,.077],[.177,.177,.228,.161,.111,.146]];
const HEAD1=[[.180,.161,.136,.217,.167,.139],[.141,.167,.109,.210,.257,.116],[.186,.171,.141,.166,.116,.219],[.140,.179,.143,.297,.119,.121],[.153,.095,.153,.222,.339,.039],[.144,.171,.209,.157,.157,.163]];

// Weight block: panel base + colour wash whose alpha encodes the attention weight.
function heat(c:CanvasRenderingContext2D,x:number,y:number,cells:number[][],cell:number,col:string){
  const n=cells.length;
  for(let r=0;r<n;r++)for(let q=0;q<n;q++){
    const v=clamp(cells[r][q]);
    c.fillStyle=C.panel;c.fillRect(x+q*cell,y+r*cell,cell-4,cell-4);
    c.globalAlpha=.10+.90*v;c.fillStyle=col;c.fillRect(x+q*cell,y+r*cell,cell-4,cell-4);c.globalAlpha=1;
  }
  c.strokeStyle=C.edge;c.lineWidth=2;c.strokeRect(x,y,n*cell-4,n*cell-4);
}
function heatTokens(c:CanvasRenderingContext2D,x:number,y:number,cell:number,col:string){
  TOK.forEach((s,i)=>{text(c,s,x+i*cell+cell/2-2,y-12,16,col,ZH,'center');text(c,s,x-14,y+i*cell+cell/2+6,16,col,ZH,'right');});
}
// Solid colour bar for cache / parameter comparison.
function bar(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,col:string,alpha=1){
  c.globalAlpha=alpha;c.fillStyle=col;c.beginPath();c.roundRect(x,y,w,h,10);c.fill();c.globalAlpha=1;
}
// Three narration lines fit between the content rule and the note row (the shared
// captionBlock stacks them at 54 px into the note/time line, so keep it local).
function captions(c:CanvasRenderingContext2D,lines:string[],times:number[],t:number,total:number,note:string){
  line(c,100,900,1820,900);
  lines.forEach((s,i)=>{if(t>=times[i])text(c,s,100,946+i*42,30,C.text);});
  line(c,100,1044,1820,1044);line(c,100,1044,100+1720*clamp(t/total),1044,C.green);
  text(c,note,100,1074,21,C.muted);
  text(c,`${Math.floor(t).toString().padStart(2,'0')} / ${Math.round(total)} s`,1820,1074,22,C.muted,MONO,'right');
}

export default class MultiHeadPlate extends Scene{
 layer=new Layer2D();
 override render(f:Frame,out:THREE.WebGLRenderTarget){
  const c=this.layer.ctx,p=this.ctx.params as Cue,t=f.lt,total=p.end-p.start;
  const beat=(i:number)=>p.lt[i]??2+i*5;
  this.layer.clear(C.bg);clearRT(this.ctx.renderer,out);
  header(c,'AI ENGINEERING / 从零开始','07 — 03');
  if(p.id==='s01'){
   // Hook: one head produces one relation pattern; many heads run in parallel.
   text(c,'第 07 章 · Transformer 深入',100,244,40,C.green);
   text(c,'多头注意力',94,400,96,C.text);
   text(c,'一个头看一种关系，多个头看多种关系',102,492,52,C.muted);
   reveal(c,t,beat(0),()=>{line(c,100,570,1820,570);});
   reveal(c,t,beat(0)+.3,()=>{
    text(c,'单个头：只有一个注意力矩阵',140,632,30,C.red);
    heat(c,140,652,[[.2,.3,.4,.1],[.25,.25,.25,.25],[.3,.2,.4,.1],[.22,.26,.3,.22]],44,C.red);});
   reveal(c,t,beat(1),()=>{
    text(c,'多种关系挤进同一个 softmax —— 一半信号被抹平',720,640,34,C.red);
    ['主谓一致','指代','长程语篇','句法分块'].forEach((s,i)=>{box(c,720+i*278,672,262,72);text(c,s,851+i*278,718,28,C.text,ZH,'center');});});
   reveal(c,t,beat(2),()=>{text(c,'2017：并行多个头，各自投影，再拼接',720,830,36,C.green);});
  }else{
   text(c,p.title,100,215,64);text(c,Math.round(p.start)+' s',1820,215,28,C.muted,MONO,'right');
   if(p.id==='s02'){
    // reshape (N,d_model) -> (N,n_heads,d_head), then transpose -> (n_heads,N,d_head)
    reveal(c,t,beat(0),()=>{
     text(c,'输入',140,282,26,C.muted);
     box(c,140,300,340,90);text(c,'X (N, d_model)',310,358,34,C.text,MONO,'center');
     arrow(c,490,345,610,345);
     text(c,'投影后',650,282,26,C.muted);
     box(c,630,300,420,90);text(c,'Q / K / V 同形状',840,358,34,C.text,ZH,'center');});
    reveal(c,t,beat(1),()=>{
     box(c,140,450,720,90,true);text(c,'reshape → (N, n_heads, d_head)',500,508,34,C.text,MONO,'center');
     arrow(c,870,495,960,495);
     box(c,980,450,840,90);text(c,'transpose → (n_heads, N, d_head)',1400,508,34,C.text,MONO,'center');
     text(c,'每步只改形状，不复制数据',140,600,30,C.muted);});
    reveal(c,t,beat(2),()=>{
     text(c,'d_head = d_model / n_heads',140,700,42,C.purple);
     box(c,140,740,880,90);text(c,'实跑：N=6, d_model=8, n_heads=2, d_head=4',580,798,32,C.blue,MONO,'center');
     text(c,'没有循环：一次 reshape + 一次 transpose',1080,798,32,C.green);});
   }
   if(p.id==='s03'){
    // Two heads on the same tokens, each its own attention matrix.
    reveal(c,t,beat(0),()=>{text(c,'每个头拿到自己那一片 Q、K、V —— 头与头之间互不通信',140,286,30,C.muted);});
    reveal(c,t,beat(0)+.4,()=>{
     text(c,'头 0 · 最关注 sat（0.389）',180,320,30,C.blue);
     heat(c,180,368,HEAD0,48,C.blue);heatTokens(c,180,368,48,C.blue);});
    reveal(c,t,beat(1),()=>{
     text(c,'头 1 · 最关注 the（0.339）',1060,320,30,C.purple);
     heat(c,1060,368,HEAD1,48,C.purple);heatTokens(c,1060,368,48,C.purple);
     text(c,'✕ 互不通信',780,500,34,C.red,ZH,'center');});
    reveal(c,t,beat(2),()=>{
     text(c,'每个头输出 (N, d_head) —— 在自己的子空间里形成一种关系模式',140,700,34,C.green);
     text(c,'6 个 token · d_model=8 · 2 个头 · d_head=4',140,770,30,C.muted,MONO);});
   }
   if(p.id==='s04'){
    // One batched matmul over all heads, scaled by sqrt(d_head).
    reveal(c,t,beat(0),()=>{
     box(c,140,300,940,90);text(c,'Qh @ Khᵀ  →  (heads, N, d_head) × (heads, d_head, N)',610,358,32,C.text,MONO,'center');
     arrow(c,610,410,610,460);
     box(c,140,470,940,90,true);text(c,'→ (heads, N, N)：每个头一个 N×N 矩阵',610,528,34,C.green,ZH,'center');});
    reveal(c,t,beat(1),()=>{
     box(c,1140,300,680,90);text(c,'缩放：÷ √d_head',1480,358,36,C.purple,MONO,'center');
     text(c,'attention = softmax(QhKhᵀ/√d_head) Vh',1140,470,28,C.purple,MONO);
     text(c,'防止点积过大，让 softmax 过早饱和',1140,530,30,C.purple);});
    reveal(c,t,beat(2),()=>{
     text(c,'加头几乎不增加串行深度',140,680,42,C.green);
     text(c,'GPU 最喜欢这种整齐的批量形状',140,760,32,C.muted);});
   }
   if(p.id==='s05'){
    // concat -> W_o is the only place heads exchange information.
    reveal(c,t,beat(0),()=>{
     box(c,140,320,300,90);text(c,'头 0 (N, 4)',290,375,30,C.blue,ZH,'center');
     box(c,140,440,300,90);text(c,'头 1 (N, 4)',290,495,30,C.purple,ZH,'center');
     arrow(c,450,365,580,405);arrow(c,450,485,580,445);
     box(c,590,370,340,90);text(c,'concat (N, 8)',760,425,32,C.text,ZH,'center');
     arrow(c,940,415,1040,415);
     box(c,1050,370,330,90,true);text(c,'× W_o (8×8)',1215,425,32,C.green,MONO,'center');
     arrow(c,1390,415,1490,415);
     box(c,1500,370,320,90);text(c,'输出 (N, 8)',1660,425,30,C.text,ZH,'center');});
    reveal(c,t,beat(1),()=>{
     text(c,'头之间唯一的交流发生在 W_o',140,610,42,C.red);
     text(c,'没有 W_o，多头只是并行的多条路',140,680,34,C.text);});
    reveal(c,t,beat(2),()=>{text(c,'输出回到统一的表示空间，供下一层使用',140,790,36,C.green);});
   }
   if(p.id==='s06'){
    // Same parameter budget, split into heads.
    reveal(c,t,beat(0),()=>{
     text(c,'单头：8 维一整块',160,310,34,C.blue);
     bar(c,160,340,900,72,C.blue);
     text(c,'d_model = 8',610,386,30,'#ffffff',MONO,'center');});
    reveal(c,t,beat(1),()=>{
     text(c,'两个头：4 维 + 4 维',160,470,34,C.green);
     bar(c,160,500,435,72,C.green);text(c,'d_head = 4',377,546,28,'#ffffff',MONO,'center');
     bar(c,625,500,435,72,C.purple);text(c,'d_head = 4',842,546,28,'#ffffff',MONO,'center');});
    reveal(c,t,beat(2),()=>{
     text(c,'总参数量相同：d_head · n_heads = d_model',160,660,40,C.text);
     text(c,'「头是免费的」：加头不加参数，只加并行',160,740,36,C.green);
     text(c,'每个头可以专精，不必和别人抢表示预算',160,800,30,C.muted);});
   }
   if(p.id==='s07'){
    // Head roles found by probing.
    reveal(c,t,beat(0),()=>{
     text(c,'探针研究发现的头分工',140,300,42,C.blue);
     box(c,140,365,260,90);text(c,'位置头',270,423,32,C.text,ZH,'center');
     box(c,430,365,380,90);text(c,'看前一个 token',620,423,32,C.text,ZH,'center');
     box(c,840,365,260,90);text(c,'复制头',970,423,32,C.text,ZH,'center');});
    reveal(c,t,beat(1),()=>{
     box(c,140,510,320,90);text(c,'命名实体头',300,568,32,C.text,ZH,'center');
     box(c,490,510,260,90,true);text(c,'归纳头',620,568,32,C.green,ZH,'center');
     text(c,'归纳头：检测之前出现过什么，再复制它后面跟随的内容',140,680,30,C.text);
     text(c,'被认为是上下文学习的底层电路',140,740,30,C.red);});
    reveal(c,t,beat(2),()=>{text(c,'这些分工不是设计出来的，而是训练中自发出现的',140,830,36,C.green);});
   }
   if(p.id==='s08'){
    // KV cache: MHA 64 groups vs GQA 8 groups.
    reveal(c,t,beat(0),()=>{text(c,'推理时每个 token 的 K、V 都要缓存 —— 头越多，缓存越大',140,290,32,C.muted);});
    reveal(c,t,beat(0)+.4,()=>{
     text(c,'MHA：64 个 Q 头配 64 组 KV',140,390,36,C.red);
     bar(c,140,420,1560,64,C.red);
     text(c,'KV 缓存 = 64 组',720,462,28,'#ffffff',MONO,'center');});
    reveal(c,t,beat(1),()=>{
     text(c,'GQA：64 个 Q 头只配 8 组 KV',140,570,36,C.green);
     bar(c,140,600,195,64,C.green);
     bar(c,345,600,1355,64,C.edge,.9);
     text(c,'8 组',237,642,26,'#ffffff',MONO,'center');
     text(c,'省下 7/8',365,642,28,C.muted,MONO);});
    reveal(c,t,beat(2),()=>{
     text(c,'质量几乎不掉 —— 2026 年的默认选择',140,800,32,C.text);
     box(c,940,730,460,110,true);text(c,'KV 缓存缩小 8 倍',1170,798,38,C.green,ZH,'center');});
   }
   if(p.id==='s09'){
    // MQA / GQA / MLA lineage.
    reveal(c,t,beat(0),()=>{
     box(c,140,320,520,190);text(c,'MQA',400,400,44,C.red,ZH,'center');text(c,'1 组 KV',400,460,30,C.muted,MONO,'center');
     text(c,'缓存最小，质量有损失',140,570,30,C.text);});
    reveal(c,t,beat(1),()=>{
     box(c,700,320,520,190,true);text(c,'GQA',960,400,44,C.green,ZH,'center');text(c,'n_heads / 8 组 KV',960,460,30,C.muted,MONO,'center');
     text(c,'质量与显存的平衡点',700,570,30,C.green);
     text(c,'Llama 2/3 · Qwen · Mistral',700,620,28,C.muted,MONO);});
    reveal(c,t,beat(2),()=>{
     box(c,1260,320,520,190);text(c,'MLA',1520,400,44,C.purple,ZH,'center');text(c,'K、V 压进低秩潜空间',1520,460,30,C.muted,ZH,'center');
     text(c,'用更多计算换更省显存',1260,570,30,C.text);
     text(c,'DeepSeek-V2 / V3',1260,620,28,C.muted,MONO);
     text(c,'变体谱系的取舍：缓存 ↔ 质量 ↔ 计算',140,760,40,C.text);});
   }
   if(p.id==='s10'){
    // Measured numbers from the course run.
    reveal(c,t,beat(0),()=>{
     text(c,'实跑：d_model = 8 · 4 个 Q 头 · 2 个 KV 头',140,300,36,C.blue);
     text(c,'输出形状 (6, 8) —— 与 MHA 完全一致',140,360,30,C.text);});
    reveal(c,t,beat(1),()=>{
     text(c,'KV 缓存元素',140,470,34,C.muted);
     text(c,'MHA：96',140,560,58,C.red);
     text(c,'GQA：48',620,560,58,C.green);
     bar(c,140,600,800,52,C.red);text(c,'96',960,638,28,C.red,MONO);
     bar(c,140,670,400,52,C.green);text(c,'48',560,708,28,C.green,MONO);});
    reveal(c,t,beat(2),()=>{
     text(c,'正好 2 倍 = n_heads / n_kv_heads',140,800,40,C.purple);
     text(c,'真实模型里，这就是显存账单上的数字',1080,800,30,C.text);});
   }
   if(p.id==='s11'){
    // Empirical d_head table.
    reveal(c,t,beat(0),()=>{
     text(c,'d_head 几乎总是 64 或 128',140,300,42,C.purple);
     text(c,'它是「一个头能看见多少」的度量',140,360,30,C.muted);});
    reveal(c,t,beat(1),()=>{table(c,140,430,['模型','d_model','头数','d_head'],
     [['小 ~125M','768','12','64'],['基础 ~350M','1024','16','64'],['大 ~1B','2048','16','128'],['前沿 ~70B','8192','64','128']],
     [360,320,300,320],66,true);});
    reveal(c,t,beat(2),()=>{
     text(c,'低于 32：要和缩放因子较劲',140,800,32,C.red);
     text(c,'高于 256：失去小专家的好处',900,800,32,C.red);});
   }
   if(p.id==='s12'){
    reveal(c,t,beat(0),()=>{strip(c,120,330,1680,['拆分','并行注意','拼接','W_o']);});
    reveal(c,t,beat(1),()=>{
     text(c,'一种关系 → 多种关系',120,600,46,C.green);
     text(c,'参数不变；显存交给 GQA / MLA 去压',120,690,36,C.text);});
    reveal(c,t,beat(2),()=>{text(c,'下一课：位置编码 —— 没有它，注意力对顺序一无所知',120,800,36,C.red);});
   }
  }
  captions(c,p.caption,p.lt,t,total,'教学示意 · 配音：豆包 TTS · 数字来自课程代码实跑');
  sceneWipe(c,t,Math.max(0,Math.round(p.start)));
  this.ctx.comp.draw(this.ctx.renderer,this.layer.upload(),out);
  // Cinematic post chain (the codex-agent-cinema look): soft bloom + halation,
  // chromatic aberration, fine grain, gentle vignette and a touch of exposure.
  return {hud:0,bloom:0.3,halation:0.2,ca:1.6,grain:0.06,vignette:0.32,exposure:1.02,fade:0};
 }
 override dispose(){this.layer.texture.dispose();}
}

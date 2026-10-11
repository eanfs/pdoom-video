import type * as THREE from 'three';
import {Scene,type Frame} from '../engine/scene';
import {Layer2D,clearRT} from '../engine/gl';
import {C,ZH,MONO,clamp,text,box,line,arrow,dot,reveal,terminal,codeBlock,table,plot,strip,header,captionBlock} from '../explain-kit';

type Cue={id:string;start:number;end:number;title:string;caption:string[];lt:number[]};

export default class TransformerPlate extends Scene{
 layer=new Layer2D();
 override render(f:Frame,out:THREE.WebGLRenderTarget){
  const c=this.layer.ctx,p=this.ctx.params as Cue,t=f.lt,total=p.end-p.start;
  const beat=(i:number)=>p.lt[i]??2+i*5;
  this.layer.clear(C.bg);clearRT(this.ctx.renderer,out);
  header(c,'AI ENGINEERING / 从零开始','07 — 01');
  if(p.id==='intro'){
   text(c,'第 07 章 · Transformer 深入',100,244,40,C.green);
   text(c,'为什么需要 Transformer',94,417,96,C.text);
   text(c,'一次看全部，还是一次看一个',102,505,55,C.muted);
   reveal(c,t,beat(0),()=>{line(c,100,582,1820,582);});
   reveal(c,t,beat(2)+1.2,()=>{text(c,'PDOOM ENGINE / 12 SCENES / SILENT',102,790,24,C.muted,MONO);text(c,'第 01 节',1660,790,28,C.muted);});
  }else{
   text(c,p.title,100,215,64);text(c,Math.round(p.start)+' s',1820,215,28,C.muted,MONO,'right');
   if(p.id==='rnn'){
    reveal(c,t,beat(0),()=>{
     const n=6,x0=140,y=430;
     for(let i=0;i<n;i++){const x=x0+i*290;
      box(c,x,y,200,150,i===n-1);text(c,'h'+(i===0?'0':''),0,0,0);text(c,i===0?'h0':'h'+i,x+100,y+88,40,C.text,MONO,'center');
      text(c,'x'+(i+1),x+100,y+230,26,C.muted,MONO,'center');arrow(c,x+100,y+200,x+100,y+165);
      if(i<n-1)arrow(c,x+205,y+75,x+275,y+75,C.red);}});
    reveal(c,t,beat(1),()=>{text(c,'每一步都要等上一步——时间轴上强制串行',140,780,36,C.text);
     text(c,'h5 = f(h4, x5)：没有 h4 就没有 h5',140,840,30,C.muted,MONO);});
   }
   if(p.id==='depth'){
    reveal(c,t,beat(0),()=>{text(c,'RNN：串行深度 = N',140,320,34,C.red);
     for(let i=0;i<14;i++){dot(c,170+i*90,430,7,i<Math.floor((t-beat(0))*4)?C.red:C.edge);if(i<13)line(c,177+i*90,430,253+i*90,430,C.edge);}
     text(c,'h0 → h1 → … → hN',170,510,26,C.muted,MONO);});
    reveal(c,t,beat(1),()=>{text(c,'注意力：深度 = log N（甚至 1）',1060,320,34,C.green);
     const cx=1450,cy=450;dot(c,cx,cy,12,C.green);
     for(let i=0;i<10;i++){const a=i/10*Math.PI*2,x=cx+Math.cos(a)*230,y=cy+Math.sin(a)*160;
      dot(c,x,y,7,C.green);line(c,cx,cy,x,y,C.wash.length?C.edge:C.edge);}});
    reveal(c,t,beat(2),()=>{text(c,'同一个数学结果，不同的依赖图',1060,780,34,C.muted);});
   }
   if(p.id==='measure'){
    reveal(c,t,beat(0),()=>{table(c,140,300,['N','rnn depth','attn depth','speedup'],
     [['64','64','6','11x'],['512','512','9','57x'],['4096','4096','12','341x'],['32768','32768','15','2185x'],['262144','262144','18','14564x']],
     [300,320,320,280],66,true);});
    reveal(c,t,beat(2),()=>{text(c,'实测 main.py · 串行深度对比——差距随 N 爆炸',140,800,34,C.muted);});
   }
   if(p.id==='ops'){
    reveal(c,t,beat(0),()=>{text(c,'运算量：都是 N 次加法',160,320,36,C.text);
     const w=520;box(c,160,380,w,80);box(c,900,380,w,80);text(c,'RNN：N 次',420,432,32,C.text,ZH,'center');text(c,'注意力：N 次',1160,432,32,C.text,ZH,'center');
     text(c,'相同',845,432,28,C.muted,ZH,'center');});
    reveal(c,t,beat(1),()=>{text(c,'依赖深度：天壤之别',160,560,36,C.text);
     const bh=(v:number,max:number,y0:number)=>Math.max(6,v/max*220);
     box(c,200,760-bh(1,1,0),120,bh(1,1,0),false);text(c,'1',260,796,26,C.muted,MONO,'center');
     box(c,420,760-bh(.45,1,0),120,bh(.45,1,0));text(c,'log N',480,796,26,C.muted,MONO,'center');
     text(c,'注意力',340,830,28,C.green,ZH,'center');
     box(c,1060,760-bh(.2,1,0),120,bh(.2,1,0));text(c,'N（线性增长）',1120,796,26,C.muted,MONO,'center');
     text(c,'RNN',1120,830,28,C.red,ZH,'center');line(c,160,760,1820,760,C.muted);});
   }
   if(p.id==='wallclock'){
    reveal(c,t,beat(0),()=>{table(c,140,300,['N','rnn (ms)','attn (ms)','ratio'],
     [['1000','0.01','0.00','5.9x'],['10000','0.13','0.02','6.8x'],['100000','1.02','0.16','6.4x'],['1000000','10.50','1.63','6.4x']],
     [340,320,320,260],66,true);});
    reveal(c,t,beat(2),()=>{box(c,140,740,900,110);text(c,'前缀和校验：0 处不一致',190,810,34,C.green,MONO);});
   }
   if(p.id==='bottleneck'){
    reveal(c,t,beat(0),()=>{['x1','x2','x3','x4','x5','…'].forEach((s,i)=>{box(c,130,300+i*88,150,70);text(c,s,205,346+i*88,30,C.text,MONO,'center');});});
    reveal(c,t,beat(0)+.8,()=>{for(let i=0;i<6;i++)arrow(c,290,335+i*88,640,470,C.muted);
     line(c,560,300,680,420,C.green);line(c,560,790,680,530,C.green);
     box(c,690,400,320,160,true);text(c,'固定宽度向量',850,470,34,C.green,ZH,'center');text(c,'h',850,530,26,C.muted,MONO,'center');});
    reveal(c,t,beat(1),()=>{arrow(c,1020,480,1130,480,C.green);box(c,1140,400,320,160);text(c,'解码器',1300,470,34,C.text,ZH,'center');text(c,'只看得到 h',1300,530,26,C.muted,ZH,'center');});
    reveal(c,t,beat(2),()=>{text(c,'5 个 token 与 500 个 token，瓶颈一样大',140,830,34,C.text);});
   }
   if(p.id==='longrange'){
    reveal(c,t,beat(0),()=>{text(c,'「去年夏天，在飞往京都的飞机上读的那本书是……」',140,320,38,C.text);
     const y=480;for(let i=0;i<40;i++){c.globalAlpha=1-i/44;dot(c,180+i*40,y,6,C.green);}c.globalAlpha=1;
     dot(c,180,y,10,C.green);dot(c,1740,y,10,C.red);text(c,'50 token 前',180,560,26,C.green,MONO);text(c,'现在',1740,560,26,C.red,MONO,'right');
     text(c,'信号每传一步就衰减一点',900,620,30,C.muted,ZH,'center');});
    reveal(c,t,beat(1),()=>{box(c,140,680,800,120);text(c,'门控（LSTM / GRU）：缓解，从未消除',190,755,32);});
    reveal(c,t,beat(2),()=>{box(c,1000,680,780,120,true);text(c,'注意力：任意两位置直连一步',1050,755,32,C.green);arrow(c,950,740,990,740,C.green);});
   }
   if(p.id==='attention'){
    reveal(c,t,beat(0),()=>{text(c,'output_i = Σ_j a_ij · v_j',140,320,40,C.text,MONO);});
    reveal(c,t,beat(0)+.8,()=>{
     const n=11,x0=560,y0=300,cell=44;const lit=Math.min(n*n,Math.floor((t-beat(0)-.4)*220));
     for(let i=0;i<n;i++)for(let j=0;j<n;j++){const k=i*n+j;const on=k<lit;
      c.fillStyle=on?C.wash:C.panel;c.fillRect(x0+j*cell,y0+i*cell,cell-4,cell-4);
      if(on){c.fillStyle=C.green;c.fillRect(x0+j*cell+cell/2-4,y0+i*cell+cell/2-4,8,8);}}
     c.strokeStyle=C.edge;c.lineWidth=2;c.strokeRect(x0,y0,n*cell-4,n*cell-4);
     text(c,'N × N 注意力矩阵：一次批量 matmul 填满',560,830,34,C.text);});
    reveal(c,t,beat(2),()=>{text(c,'没有哪一步依赖另一步',140,660,32,C.muted);});
   }
   if(p.id==='cost'){
    const g=plot(700,320,1000,440,[0,10],[0,10]);
    reveal(c,t,beat(0),()=>{g.frame(c);text(c,'相对代价',760,290,26,C.muted);
     g.seg(c,0,0,10,5,C.blue,5);g.seg(c,0,0,10,10,C.red,5);
     text(c,'O(N) 循环',1220,520,30,C.blue);text(c,'O(N²) 注意力',1420,420,30,C.red);});
    reveal(c,t,beat(1),()=>{box(c,140,320,480,120);text(c,'2K 上下文：没问题',190,390,32);});
    reveal(c,t,beat(1)+.5,()=>{box(c,140,470,480,120);text(c,'128K：分块 / 滑窗 / Flash',190,540,32);});
    reveal(c,t,beat(2),()=>{text(c,'拿时间换显存，再靠并行赚回时间',140,700,34,C.text);
     text(c,'这是一组权衡，不是免费午餐',140,760,30,C.muted);});
   }
   if(p.id==='code'){
    reveal(c,t,beat(0),()=>{codeBlock(c,100,290,880,[
     'def rnn_style(xs):','    h = 0.0','    for x in xs:','        h = 0.9 * h + x','    return h'],32,58);});
    reveal(c,t,beat(1),()=>{codeBlock(c,1030,290,790,[
     'def attention_style(xs):','    # each x is independent','    return sum(xs) / len(xs)'],32,58);
     terminal(c,1030,560,790,190,'equivalence check');
     text(c,'mismatches: 0',1080,660,30,C.green,MONO);text(c,'serial 120.0 == parallel 120.0',1080,710,28,C.muted,MONO);});
    reveal(c,t,beat(2),()=>{text(c,'同样的数学，不同的依赖图',100,830,34,C.muted);});
   }
   if(p.id==='recap'){
    reveal(c,t,beat(0),()=>{strip(c,120,330,1680,['串行链 N','广播矩阵','深度 1']);});
    reveal(c,t,beat(1),()=>{text(c,'代价 O(N²) 显存，换来全面的并行。',120,580,42);});
    reveal(c,t,beat(2),()=>{['循环','注意力','O(N²)','Mamba'].forEach((s,i)=>{box(c,120+i*440,660,380,110,i>=3);text(c,s,310+i*440,728,36,i>=3?C.green:C.text,ZH,'center');});
     text(c,'循环没死——它成了混合模型的组件',120,850,32,C.muted);});
   }
  }
  captionBlock(c,p.caption,p.lt,t,total,'教学示意 · 无配音 · 数字来自课程代码实跑');
  this.ctx.comp.draw(this.ctx.renderer,this.layer.upload(),out);
  return {hud:0,bloom:0,halation:0,ca:0,grain:0,vignette:0,exposure:1,fade:0};
 }
 override dispose(){this.layer.texture.dispose();}
}

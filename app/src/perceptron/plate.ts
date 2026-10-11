import type * as THREE from 'three';
import {Scene,type Frame} from '../engine/scene';
import {Layer2D,clearRT} from '../engine/gl';
import {C,ZH,MONO,text,box,line,arrow,dot,reveal,terminal,codeBlock,table,plot,strip,header,captionBlock} from '../explain-kit';

type Cue={id:string;start:number;end:number;title:string;caption:string[];lt:number[]};
const log10=(v:number)=>Math.log(v)/Math.LN10;

export default class PerceptronPlate extends Scene{
 layer=new Layer2D();
 override render(f:Frame,out:THREE.WebGLRenderTarget){
  const c=this.layer.ctx,p=this.ctx.params as Cue,t=f.lt,total=p.end-p.start;
  const beat=(i:number)=>p.lt[i]??2+i*5;
  this.layer.clear(C.bg);clearRT(this.ctx.renderer,out);
  header(c,'AI ENGINEERING / 从零开始','03 — 01');
  if(p.id==='intro'){
   text(c,'第 03 章 · 深度学习核心',100,244,40,C.green);
   text(c,'感知机',94,417,120,C.text);
   text(c,'权重 · 偏置 · 一次决策',102,505,55,C.muted);
   reveal(c,t,beat(0),()=>{line(c,100,582,1820,582);});
   reveal(c,t,beat(2)+1.2,()=>{text(c,'PDOOM ENGINE / 12 SCENES / SILENT',102,790,24,C.muted,MONO);text(c,'第 01 节',1660,790,28,C.muted);});
  }else{
   text(c,p.title,100,215,64);text(c,Math.round(p.start)+' s',1820,215,28,C.muted,MONO,'right');
   if(p.id==='neuron'){
    const ins:[string,number][]=[['x1',320],['x2',450],['x3',580]];
    ins.forEach(([s,y],i)=>reveal(c,t,beat(0)+i*.4,()=>{box(c,150,y,170,92);text(c,s,205,y+60,40,C.text,MONO,'center');
     text(c,'w'+(i+1),430,y+28,26,C.green,MONO);arrow(c,326,y+46,690,500);}));
    reveal(c,t,beat(0)+1.4,()=>{box(c,700,420,320,160);text(c,'Σ wᵢ·xᵢ + b',860,505,38,C.text,ZH,'center');text(c,'加权求和',860,560,24,C.muted,ZH,'center');});
    reveal(c,t,beat(1),()=>{arrow(c,1030,500,1140,500);box(c,1150,420,300,160,true);text(c,'step(z)',1300,498,42,C.green,MONO,'center');text(c,'激活函数',1300,556,24,C.muted,ZH,'center');});
    reveal(c,t,beat(2),()=>{arrow(c,1460,500,1570,500);box(c,1580,420,180,160);text(c,'0 / 1',1670,505,44,C.text,MONO,'center');text(c,'一次决策',1670,560,22,C.muted,ZH,'center');});
   }
   if(p.id==='weighted'){
    reveal(c,t,beat(0),()=>{box(c,100,300,760,300);text(c,'AND 门 · 实测第 4 轮收敛',140,372,30,C.muted);
     text(c,'z = 0.2·x1 + 0.1·x2 − 0.2',140,478,46,C.text,MONO);text(c,'w = [0.2, 0.1]   b = −0.2',140,560,30,C.green,MONO);});
    reveal(c,t,beat(1),()=>{table(c,940,320,['x1','x2','z = w·x+b','step(z)'],
     [['0','0','−0.2','0'],['0','1','−0.1','0'],['1','0','−0.0','0'],['1','1','+0.1','1']],[150,150,320,220],62);});
    reveal(c,t,beat(2),()=>{text(c,'权重缩放贡献，偏置平移门槛',940,780,34,C.muted);});
   }
   if(p.id==='step'){
    const g=plot(420,300,1080,480,[-3,3],[-0.3,1.3]);
    reveal(c,t,beat(0),()=>{g.frame(c);text(c,'step(z)',1240,260,30,C.muted,MONO);});
    reveal(c,t,beat(0)+.8,()=>{g.seg(c,-3,0,0,0,C.blue,6);g.seg(c,0,1,3,1,C.green,6);dot(c,g.px(0),g.py(0),8,C.blue);dot(c,g.px(0),g.py(1),8,C.green);
     text(c,'0',g.px(0)-14,g.py(0)+34,26,C.muted,MONO);text(c,'1',g.px(0)-14,g.py(1)-18,26,C.muted,MONO);});
    reveal(c,t,beat(1),()=>{text(c,'z ≥ 0 → 1，否则 → 0：没有中间状态',420,850,36,C.text);});
    reveal(c,t,beat(2),()=>{text(c,'不可导——为可导激活函数埋下伏笔',420,898,32,C.muted);});
   }
   if(p.id==='boundary'){
    const g=plot(160,300,760,480,[-0.2,1.2],[-0.2,1.2]);
    reveal(c,t,beat(0),()=>{g.frame(c);g.seg(c,0.5,1,1,0,C.green,5);});
    reveal(c,t,beat(0)+.7,()=>{g.pt(c,0,0,C.blue,'0');g.pt(c,0,1,C.blue,'0');g.pt(c,1,0,C.blue,'0');g.pt(c,1,1,C.green,'1');});
    reveal(c,t,beat(1),()=>{text(c,'0.2·x1 + 0.1·x2 − 0.2 = 0',1060,380,38,C.text,MONO);text(c,'线的一侧全 0，另一侧全 1',1060,450,34,C.muted);});
    reveal(c,t,beat(2),()=>{box(c,1020,540,760,180);text(c,'训练 = 挪这条线',1080,625,44);text(c,'直到两类被正确分开',1080,688,30,C.muted);});
   }
   if(p.id==='rule'){
    reveal(c,t,beat(0),()=>{codeBlock(c,100,300,1030,[
     'For each (x, y_true):','    y_pred = predict(x)','    error  = y_true - y_pred','    w_i   += lr * error * x_i','    bias  += lr * error'],32,58);});
    reveal(c,t,beat(1),()=>{box(c,1190,300,630,150);text(c,'error = 0',1240,372,32,C.muted,MONO);text(c,'预测正确，什么都不动',1240,424,30);});
    reveal(c,t,beat(1)+.6,()=>{box(c,1190,470,630,150,true);text(c,'error = +1',1240,542,32,C.green,MONO);text(c,'该输出 1 却输出 0 → 增大',1240,594,30);});
    reveal(c,t,beat(1)+1.2,()=>{box(c,1190,640,630,150);text(c,'error = −1',1240,712,32,C.red,MONO);text(c,'该输出 0 却输出 1 → 减小',1240,764,30);});
   }
   if(p.id==='or'){
    reveal(c,t,beat(0),()=>{terminal(c,100,300,1720,460,'perceptron.py — OR');
     const rows=['=== OR Gate ===','Converged at epoch 4','  Weights: [0.1, 0.1]  Bias: -0.1','  [0, 0] -> 0 (expected 0) OK','  [0, 1] -> 1 (expected 1) OK','  [1, 0] -> 1 (expected 1) OK','  [1, 1] -> 1 (expected 1) OK'];
     rows.forEach((s,i)=>text(c,s,150,423+i*57,33,i===1||i===2?C.green:C.text,MONO));});
    reveal(c,t,beat(2),()=>{text(c,'AND 4 轮收敛 · NOT 3 轮收敛——线性可分，几轮就够',100,830,34,C.muted);});
   }
   if(p.id==='xor'){
    const g=plot(140,300,640,440,[-0.2,1.2],[-0.2,1.2]);
    reveal(c,t,beat(0),()=>{g.frame(c);g.pt(c,0,0,C.blue);g.pt(c,1,1,C.blue);g.pt(c,0,1,C.green);g.pt(c,1,0,C.green);
     g.seg(c,-0.1,0.75,0.75,-0.1,C.muted,3);g.seg(c,0.3,1.1,1.1,0.3,C.muted,3);text(c,'两条候选线都失败',180,810,28,C.red);});
    reveal(c,t,beat(1),()=>{terminal(c,860,300,960,440,'single perceptron · XOR');
     text(c,'Did not converge after 1000 epochs',910,430,30,C.red,MONO);
     text(c,'[0, 0] -> 1  WRONG',910,500,30,C.red,MONO);text(c,'[1, 0] -> 0  WRONG',910,560,30,C.red,MONO);
     text(c,'[0, 1] -> 1  OK',910,630,30,C.muted,MONO);text(c,'[1, 1] -> 0  OK',910,690,30,C.muted,MONO);});
    reveal(c,t,beat(2),()=>{text(c,'线性不可分：单层网络的根本限制（Minsky & Papert, 1969）',100,880,34,C.text);});
   }
   if(p.id==='hidden'){
    reveal(c,t,beat(0),()=>{box(c,120,330,150,90);text(c,'x1',195,388,38,C.text,MONO,'center');box(c,120,590,150,90);text(c,'x2',195,648,38,C.text,MONO,'center');});
    reveal(c,t,beat(0)+.6,()=>{box(c,560,270,340,130);text(c,'OR',730,338,46,C.text,MONO,'center');text(c,'w=[1,1] b=−0.5',730,382,22,C.muted,MONO,'center');
     box(c,560,530,340,130);text(c,'NAND',730,598,46,C.text,MONO,'center');text(c,'w=[−1,−1] b=1.5',730,642,22,C.muted,MONO,'center');
     arrow(c,275,375,550,330);arrow(c,275,635,550,600);arrow(c,275,375,550,600);arrow(c,275,635,550,330);});
    reveal(c,t,beat(1),()=>{box(c,1130,400,340,130,true);text(c,'AND',1300,468,46,C.green,MONO,'center');text(c,'w=[1,1] b=−1.5',1300,512,22,C.muted,MONO,'center');
     arrow(c,905,335,1120,440);arrow(c,905,595,1120,490);});
    reveal(c,t,beat(1)+.6,()=>{arrow(c,1480,465,1590,465);box(c,1600,400,170,130);text(c,'XOR',1685,478,44,C.text,MONO,'center');});
    reveal(c,t,beat(2),()=>{text(c,'XOR = (x1 OR x2) AND NOT (x1 AND x2) — 实测四种输入全对',100,830,36,C.text);});
   }
   if(p.id==='sigmoid'){
    const g=plot(150,320,860,420,[0,8000],[-4,0.4]);
    reveal(c,t,beat(0),()=>{g.frame(c);text(c,'总误差（log 刻度）',180,290,26,C.muted);});
    reveal(c,t,beat(0)+.6,()=>{
     const pts:[number,number][]=[[0,1.2164],[2000,0.0017],[4000,0.0007],[6000,0.0005],[8000,0.0003]];
     pts.slice(1).forEach((q,i)=>{const a=pts[i];c.strokeStyle=C.green;c.lineWidth=5;c.beginPath();
      c.moveTo(g.px(a[0]),g.py(log10(a[1])));c.lineTo(g.px(q[0]),g.py(log10(q[1])));c.stroke();});
     pts.forEach(q=>dot(c,g.px(q[0]),g.py(log10(q[1])),8,C.green));
     text(c,'1.2164',g.px(0)-16,g.py(log10(1.2164))-20,26,C.green,MONO);
     text(c,'0.0003',g.px(8000)-120,g.py(log10(0.0003))-20,26,C.green,MONO);});
    reveal(c,t,beat(1),()=>{table(c,1100,340,['输入','输出','判定'],[['0, 0','0.0074','0'],['0, 1','0.9923','1'],['1, 0','0.9923','1'],['1, 1','0.0094','0']],[220,300,200],62,true);});
    reveal(c,t,beat(2),()=>{text(c,'sigmoid 平滑可导，误差得以反向传播',1100,760,32,C.muted);});
   }
   if(p.id==='code'){
    reveal(c,t,beat(0),()=>{codeBlock(c,100,290,1720,[
     'class Perceptron:','    def __init__(self, n_inputs, learning_rate=0.1):','        self.weights = [0.0] * n_inputs','        self.bias = 0.0','        self.lr = learning_rate','    def predict(self, inputs):','        total = sum(w * x for w, x in zip(self.weights, inputs)) + self.bias','        return 1 if total >= 0 else 0','    def train(self, training_data, epochs=100):','        for inputs, target in training_data:','            error = target - self.predict(inputs)','            self.weights = [w + self.lr * error * x for w, x in zip(self.weights, inputs)]','            self.bias += self.lr * error'],30,50);});
   }
   if(p.id==='recap'){
    reveal(c,t,beat(0),()=>{strip(c,120,330,1680,['输入','加权求和','激活','决策']);});
    reveal(c,t,beat(1),()=>{text(c,'单个感知机只能画直线；叠起来，才能画出任意形状。',120,600,42);});
    reveal(c,t,beat(2),()=>{['权重','偏置','线性可分','多层感知机'].forEach((s,i)=>{box(c,120+i*440,680,380,110,i===3);text(c,s,310+i*440,748,36,i===3?C.green:C.text,ZH,'center');});});
   }
  }
  captionBlock(c,p.caption,p.lt,t,total,'教学示意 · 无配音 · 数字来自课程代码实跑');
  this.ctx.comp.draw(this.ctx.renderer,this.layer.upload(),out);
  return {hud:0,bloom:0,halation:0,ca:0,grain:0,vignette:0,exposure:1,fade:0};
 }
 override dispose(){this.layer.texture.dispose();}
}

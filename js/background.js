(function(){
var c=document.getElementById("bg"),x=c.getContext("2d"),W,H,dpr,tris,edges,base,raf;
var reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
function R(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function field(mx,my,t){
 var a=H*(.56+.09*Math.sin(mx*.0032+t*.35)+.05*Math.sin(mx*.009-t*.5)+(mx/W-.5)*.22);
 var b=H*(.16+.08*Math.sin(mx*.004-t*.27));
 var d1=my-a,d2=my-b,s1=H*.12,s2=H*.07;
 var i=Math.exp(-d1*d1/(2*s1*s1))+.5*Math.exp(-d2*d2/(2*s2*s2));
 return Math.min(1,i)*(.85+.15*Math.sin(mx*.012-t*1.1));
}
function build(){
 dpr=Math.min(window.devicePixelRatio||1,2);W=innerWidth;H=innerHeight;
 c.width=W*dpr;c.height=H*dpr;x.setTransform(dpr,0,0,dpr,0,0);
 var r=R(7),S=W<600?58:74,cols=Math.ceil(W/S)+2,rows=Math.ceil(H/S)+2,p=[],i,j;
 for(j=0;j<=rows;j++){p[j]=[];for(i=0;i<=cols;i++)p[j][i]=[(i-1)*S+(r()-.5)*S*.85,(j-1)*S+(r()-.5)*S*.85]}
 tris=[];edges=[];
 function E(a,b){edges.push({a:a,b:b,mx:(a[0]+b[0])/2,my:(a[1]+b[1])/2,ph:r()*6.28})}
 function T(a,b,d){tris.push({p:[a,b,d],cx:(a[0]+b[0]+d[0])/3,cy:(a[1]+b[1]+d[1])/3,sh:12+r()*20})}
 for(j=0;j<rows;j++)for(i=0;i<cols;i++){
  var A=p[j][i],B=p[j][i+1],C=p[j+1][i+1],D=p[j+1][i];
  E(A,B);E(A,D);
  if(r()<.5){E(A,C);T(A,B,C);T(A,C,D)}else{E(B,D);T(A,B,D);T(B,C,D)}
 }
 base=document.createElement("canvas");base.width=W*dpr;base.height=H*dpr;
 var g=base.getContext("2d");g.setTransform(dpr,0,0,dpr,0,0);
 g.fillStyle="#06070a";g.fillRect(0,0,W,H);
 tris.forEach(function(t){
  var l=t.sh+(t.cy/H)*-6;
  g.fillStyle="rgb("+(l|0)+","+((l+2)|0)+","+((l+7)|0)+")";
  g.beginPath();g.moveTo(t.p[0][0],t.p[0][1]);g.lineTo(t.p[1][0],t.p[1][1]);g.lineTo(t.p[2][0],t.p[2][1]);g.closePath();g.fill();
 });
 g.lineJoin="round";g.strokeStyle="rgba(0,0,0,.85)";g.lineWidth=2.2;g.beginPath();
 edges.forEach(function(e){g.moveTo(e.a[0],e.a[1]);g.lineTo(e.b[0],e.b[1])});g.stroke();
 g.strokeStyle="rgba(255,255,255,.035)";g.lineWidth=.8;g.beginPath();
 edges.forEach(function(e){g.moveTo(e.a[0]+.8,e.a[1]+.8);g.lineTo(e.b[0]+.8,e.b[1]+.8)});g.stroke();
 var v=g.createRadialGradient(W/2,H/2,Math.min(W,H)*.2,W/2,H/2,Math.max(W,H)*.75);
 v.addColorStop(0,"rgba(0,0,0,0)");v.addColorStop(1,"rgba(0,0,0,.6)");g.fillStyle=v;g.fillRect(0,0,W,H);
}
function frame(ts){
 var t=reduce?2:ts/1000,k,B=6,eb=[],tb=[];
 for(k=0;k<=B;k++){eb[k]=[];tb[k]=[]}
 x.globalCompositeOperation="source-over";x.drawImage(base,0,0,W,H);
 tris.forEach(function(q){var i=field(q.cx,q.cy,t);var n=Math.floor(i*B);if(n>0)tb[n].push(q)});
 edges.forEach(function(e){var i=field(e.mx,e.my,t)*(.72+.28*Math.sin(t*1.5+e.ph));var n=Math.floor(i*B);if(n>0)eb[n].push(e)});
 x.globalCompositeOperation="lighter";
 for(k=1;k<=B;k++){
  var a=k/B;
  if(tb[k].length){x.fillStyle="rgba(255,196,0,"+(a*.07)+")";x.beginPath();
   tb[k].forEach(function(q){x.moveTo(q.p[0][0],q.p[0][1]);x.lineTo(q.p[1][0],q.p[1][1]);x.lineTo(q.p[2][0],q.p[2][1]);x.closePath()});x.fill()}
  if(eb[k].length){
   x.beginPath();eb[k].forEach(function(e){x.moveTo(e.a[0],e.a[1]);x.lineTo(e.b[0],e.b[1])});
   x.lineCap="round";
   x.strokeStyle="rgba(255,160,0,"+(a*.13)+")";x.lineWidth=9;x.stroke();
   x.strokeStyle="rgba(255,205,20,"+(a*.35)+")";x.lineWidth=3.5;x.stroke();
   x.strokeStyle="rgba(255,244,110,"+a+")";x.lineWidth=1.3;x.stroke();
  }
 }
 if(!reduce)raf=requestAnimationFrame(frame);
}
var rt;
function start(){cancelAnimationFrame(raf);build();raf=requestAnimationFrame(frame)}
addEventListener("resize",function(){clearTimeout(rt);rt=setTimeout(start,200)});
document.addEventListener("visibilitychange",function(){if(document.hidden)cancelAnimationFrame(raf);else if(!reduce)raf=requestAnimationFrame(frame)});
start();
})();

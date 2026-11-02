(function(){
var MAXA=360,MAXS=1024,sec=document.getElementById("dip"),tiles=document.getElementById("tiles"),stats=document.getElementById("stats"),
bs=document.getElementById("bright"),cs=document.getElementById("contrast"),use=document.getElementById("useAdj"),pal=document.getElementById("palette");
var img=null,A=null,aw=0,ah=0,adjC=null,eqStat=null;
function fit(w,h,m){var k=Math.min(1,m/Math.max(w,h));return[Math.round(w*k),Math.round(h*k)]}
function cv(w,h){var c=document.createElement("canvas");c.width=w;c.height=h;return c}
function toGray(d){var n=d.length/4,g=new Uint8ClampedArray(n);for(var i=0;i<n;i++)g[i]=.299*d[4*i]+.587*d[4*i+1]+.114*d[4*i+2];return g}
function putGray(c,g){var x=c.getContext("2d"),id=x.createImageData(c.width,c.height);for(var i=0;i<g.length;i++){id.data[4*i]=id.data[4*i+1]=id.data[4*i+2]=g[i];id.data[4*i+3]=255}x.putImageData(id,0,0)}
function hist(g){var h=new Array(256).fill(0);for(var i=0;i<g.length;i++)h[g[i]]++;return h}
function equalize(g){var h=hist(g),cdf=[],s=0,i,n=g.length;for(i=0;i<256;i++){s+=h[i];cdf[i]=s}var m=cdf.find(function(v){return v>0}),o=new Uint8ClampedArray(n);for(i=0;i<n;i++)o[i]=Math.round((cdf[g[i]]-m)/(n-m||1)*255);return o}
function conv(src,k,div){var w=src.width,h=src.height,o=new ImageData(w,h),d=src.data,od=o.data;
 for(var y=0;y<h;y++)for(var x=0;x<w;x++){for(var c=0;c<3;c++){var s=0;for(var j=-1;j<=1;j++)for(var i=-1;i<=1;i++){var xx=Math.min(w-1,Math.max(0,x+i)),yy=Math.min(h-1,Math.max(0,y+j));s+=d[4*(yy*w+xx)+c]*k[(j+1)*3+i+1]}od[4*(y*w+x)+c]=s/div}od[4*(y*w+x)+3]=255}
 return o}
function sobel(g,w,h){function p(x,y){return g[Math.min(h-1,Math.max(0,y))*w+Math.min(w-1,Math.max(0,x))]}
 var m=new Float32Array(w*h),mx=0,o=new Uint8ClampedArray(w*h),y,x,i;
 for(y=0;y<h;y++)for(x=0;x<w;x++){var gx=-p(x-1,y-1)-2*p(x-1,y)-p(x-1,y+1)+p(x+1,y-1)+2*p(x+1,y)+p(x+1,y+1),gy=-p(x-1,y-1)-2*p(x,y-1)-p(x+1,y-1)+p(x-1,y+1)+2*p(x,y+1)+p(x+1,y+1),v=Math.sqrt(gx*gx+gy*gy);m[y*w+x]=v;if(v>mx)mx=v}
 for(i=0;i<o.length;i++)o[i]=m[i]/(mx||1)*255*1.7;return o}
function otsu(g){var h=hist(g),n=g.length,sum=0,i;for(i=0;i<256;i++)sum+=i*h[i];var sb=0,wb=0,best=0,t=0;for(i=0;i<256;i++){wb+=h[i];if(!wb)continue;var wf=n-wb;if(!wf)break;sb+=i*h[i];var mb=sb/wb,mf=(sum-sb)/wf,v=wb*wf*(mb-mf)*(mb-mf);if(v>best){best=v;t=i}}return t}
function kmeans(d,k){var pts=[],i;for(i=0;i<d.length;i+=16)pts.push([d[i],d[i+1],d[i+2]]);
 var cen=[];for(i=0;i<k;i++)cen.push(pts[Math.floor(i*pts.length/k)].slice());var cnt=[];
 for(var it=0;it<10;it++){var sm=cen.map(function(){return[0,0,0,0]});
  pts.forEach(function(p){var b=0,bd=1e12;cen.forEach(function(c,j){var dd=(p[0]-c[0])*(p[0]-c[0])+(p[1]-c[1])*(p[1]-c[1])+(p[2]-c[2])*(p[2]-c[2]);if(dd<bd){bd=dd;b=j}});var q=sm[b];q[0]+=p[0];q[1]+=p[1];q[2]+=p[2];q[3]++});
  cen=cen.map(function(c,j){var q=sm[j];return q[3]?[q[0]/q[3],q[1]/q[3],q[2]/q[3]]:c});cnt=sm.map(function(q){return q[3]})}
 return cen.map(function(c,j){return{c:c.map(Math.round),n:cnt[j]/pts.length}}).sort(function(a,b){return b.n-a.n})}
function adjusted(){var o=new ImageData(new Uint8ClampedArray(A.data),aw,ah),d=o.data,b=+bs.value,c=+cs.value/100;for(var i=0;i<d.length;i+=4)for(var j=0;j<3;j++)d[i+j]=(d[i+j]-128)*c+128+b;return o}
function tile(t,n){var d=document.createElement("div");d.className="tile";var c=cv(aw,ah);var h=document.createElement("h4");h.textContent=t;var p=document.createElement("p");p.textContent=n;d.append(c,h,p);tiles.appendChild(d);return c}
function drawHist(c,series){var x=c.getContext("2d"),W=c.width,H=c.height;x.clearRect(0,0,W,H);x.globalCompositeOperation="lighter";
 series.forEach(function(s){var mx=Math.max.apply(null,s.h.slice(1,255))||1;x.fillStyle=s.col;x.beginPath();x.moveTo(0,H);for(var i=0;i<256;i++)x.lineTo(i/255*W,H-Math.min(1,s.h[i]/mx)*H*.95);x.lineTo(W,H);x.fill()});x.globalCompositeOperation="source-over"}
function chip(t){var e=document.createElement("span");e.textContent=t;stats.appendChild(e)}

function render(){
 tiles.innerHTML="";stats.innerHTML="";
 var g=toGray(A.data),n=g.length,i,mean=0,vr=0;
 for(i=0;i<n;i++)mean+=g[i];mean/=n;for(i=0;i<n;i++)vr+=(g[i]-mean)*(g[i]-mean);var sd=Math.sqrt(vr/n);
 var eq=equalize(g),T=otsu(g),sb=sobel(g,aw,ah);
 var c1=tile("Original (resized)","Normalized to a fixed maximum size");c1.getContext("2d").putImageData(A,0,0);
 var c2=tile("Grayscale","Y = 0.299R + 0.587G + 0.114B");putGray(c2,g);
 var c3=tile("Histogram equalized","Spreads intensities using the CDF");putGray(c3,eq);
 adjC=tile("Brightness / contrast","g(x) = c·(f(x) − 128) + 128 + b");adjC.getContext("2d").putImageData(adjusted(),0,0);
 var c5=tile("Edges (Sobel)","Gradient magnitude from Gx and Gy kernels");putGray(c5,sb);
 var c6=tile("Gaussian blur","3×3 kernel [1 2 1; 2 4 2; 1 2 1] ÷ 16");c6.getContext("2d").putImageData(conv(A,[1,2,1,2,4,2,1,2,1],16),0,0);
 var c7=tile("Sharpen","Kernel [0 −1 0; −1 5 −1; 0 −1 0]");c7.getContext("2d").putImageData(conv(A,[0,-1,0,-1,5,-1,0,-1,0],1),0,0);
 var c8=tile("Threshold (Otsu)","Automatic binary segmentation at T = "+T);var th=new Uint8ClampedArray(n);for(i=0;i<n;i++)th[i]=g[i]>T?255:0;putGray(c8,th);
 var nw=img.naturalWidth,nh=img.naturalHeight,sz=fit(nw,nh,MAXS);
 chip("Original "+nw+"×"+nh);chip("Sent for caption "+sz[0]+"×"+sz[1]);
 chip("Mean brightness "+mean.toFixed(0)+"/255");chip("Contrast (std dev) "+sd.toFixed(0));chip("Otsu threshold "+T);
 chip(mean<85?"Dark image":mean>170?"Bright image":"Well exposed");
 var R=new Array(256).fill(0),G=R.slice(),B=R.slice(),d=A.data;for(i=0;i<d.length;i+=4){R[d[i]]++;G[d[i+1]]++;B[d[i+2]]++}
 drawHist(document.getElementById("hRGB"),[{h:R,col:"rgba(255,70,70,.65)"},{h:G,col:"rgba(70,230,110,.55)"},{h:B,col:"rgba(80,130,255,.65)"}]);
 drawHist(document.getElementById("hGray"),[{h:hist(g),col:"rgba(255,255,255,.55)"},{h:hist(eq),col:"rgba(255,214,10,.5)"}]);
 pal.innerHTML="";kmeans(d,5).forEach(function(k){var e=document.createElement("div"),lum=.299*k.c[0]+.587*k.c[1]+.114*k.c[2];e.className="sw";e.style.background="rgb("+k.c.join(",")+")";e.style.color=lum>140?"#111":"#fff";e.textContent="#"+k.c.map(function(v){return("0"+v.toString(16)).slice(-2)}).join("").toUpperCase()+" · "+Math.round(k.n*100)+"%";pal.appendChild(e)});
}
function load(f){
 var im=new Image();im.onload=function(){img=im;var sz=fit(im.naturalWidth,im.naturalHeight,MAXA);aw=sz[0];ah=sz[1];
  var c=cv(aw,ah),x=c.getContext("2d");x.drawImage(im,0,0,aw,ah);A=x.getImageData(0,0,aw,ah);sec.hidden=false;render()};
 im.src=URL.createObjectURL(f)}
function onAdj(){document.getElementById("bv").textContent=bs.value;document.getElementById("cv").textContent=(cs.value/100).toFixed(1);if(A&&adjC)adjC.getContext("2d").putImageData(adjusted(),0,0)}
bs.oninput=cs.oninput=onAdj;
window.DIP={load:load,clear:function(){sec.hidden=true;img=null;A=null;bs.value=0;cs.value=100;onAdj()},
 blob:function(){if(!img)return Promise.resolve(null);var sz=fit(img.naturalWidth,img.naturalHeight,MAXS),c=cv(sz[0],sz[1]),x=c.getContext("2d");x.drawImage(img,0,0,sz[0],sz[1]);
  if(use.checked){var id=x.getImageData(0,0,sz[0],sz[1]),d=id.data,b=+bs.value,k=+cs.value/100;for(var i=0;i<d.length;i+=4)for(var j=0;j<3;j++)d[i+j]=(d[i+j]-128)*k+128+b;x.putImageData(id,0,0)}
  return new Promise(function(r){c.toBlob(function(b){r(b)},"image/jpeg",.9)})}};
})();

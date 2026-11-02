/* Standalone adapter: lets the page run outside Claude.
   Captions are requested from the local server (server.js) at /api/caption.
   Inside Claude, window.claude already exists and this file does nothing. */
(function(){
if(window.claude)return;
function toBase64(blob){return new Promise(function(res,rej){var r=new FileReader();r.onload=function(){res(String(r.result).split(",")[1])};r.onerror=rej;r.readAsDataURL(blob)})}
async function sample(prompt,opts){
  opts=opts||{};
  var img=opts.images,body={prompt:prompt};
  if(img){body.image=await toBase64(img);body.mediaType=img.type||"image/jpeg"}
  var resp;
  try{resp=await fetch("/api/caption",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),signal:opts.signal})}
  catch(e){var x=new Error("network");x.code=e.name==="AbortError"?"cancelled":"network";throw x}
  var data=await resp.json().catch(function(){return{}});
  if(!resp.ok){var er=new Error(data.error||"error");er.code=resp.status===429?"rate_limited":"error";throw er}
  if(opts.onText)opts.onText({text:data.text});
  return{text:data.text};
}
function save(o){
  var blob=o.data instanceof Blob?o.data:new Blob([o.data]),a=document.createElement("a");
  a.href=URL.createObjectURL(blob);a.download=o.filename;document.body.appendChild(a);a.click();a.remove();
  return Promise.resolve();
}
window.claude={use:function(name){
  if(name==="sample")return Promise.resolve(sample);
  if(name==="downloads")return Promise.resolve({save:save});
  return Promise.resolve(null);
}};
})();

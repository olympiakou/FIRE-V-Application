"use strict";
const $=id=>document.getElementById(id);
let map,cfg,meta={},tiles={},active=[],outlines={},lookup=null,studyBounds=null;
const st={theme:"ndvi",date:"20260727",fireDisplay:"classes",opacity:0.8,
          fireClasses:new Set(["4","5","6","7"]),landcover:new Set(),burn:true,settlements:true};
function error(msg){$("error").hidden=false;$("error").textContent=String(msg);console.error(msg)}
function appendText(parent,tag,text,cls=""){const el=document.createElement(tag);el.textContent=text;if(cls)el.className=cls;parent.append(el);return el}
function swatch(c){const e=document.createElement("span");e.className="swatch";e.style.background=c;return e}
function activeIds(){if(st.theme==="none")return [];if(st.theme==="fire"){if(st.fireDisplay==="none")return [];return st.fireDisplay==="index"?["dnbr"]:[...st.fireClasses].map(id=>"fireclass_"+id)}return [st.theme+"_"+st.date]}
function syncMap(){active.forEach(id=>{if(tiles[id])map.removeLayer(tiles[id])});active=activeIds();
 active.forEach(id=>{if(tiles[id]){tiles[id].setOpacity(st.opacity);tiles[id].addTo(map)}else error("Missing layer "+id)});
 $("fire-settings").hidden=st.theme!=="fire";
 $("fire-classes").hidden=st.theme!=="fire"||st.fireDisplay!=="classes";
 $("timeline").hidden=st.theme==="fire"||st.theme==="none";
 for(const [code,layer] of Object.entries(outlines.landcover||{})){
   if(st.landcover.has(code))layer.addTo(map);else map.removeLayer(layer);
 }
 if(outlines.burn){if(st.burn)outlines.burn.addTo(map);else map.removeLayer(outlines.burn)}
 for(const layer of Object.values(outlines.landcover||{})){if(map.hasLayer(layer))layer.bringToFront()}
 if(outlines.burn&&st.burn)outlines.burn.bringToFront();
 if(outlines.settlements){if(st.settlements)outlines.settlements.addTo(map);else map.removeLayer(outlines.settlements);if(st.settlements)outlines.settlements.bringToFront();}
 document.querySelectorAll(".date-point,.date-label").forEach(el=>el.classList.toggle("active",el.dataset.date===st.date));
 const date=cfg.dates.find(d=>d.id===st.date);
 $("selected-date").textContent=date.label+(date.postfire?" · Post-fire":"");
 $("map-info").hidden=true;drawLegend();
}
function drawLegend(){const box=$("legend");box.replaceChildren();
 let title=st.theme==="ndvi"?"Vegetation · NDVI":st.theme==="ndmi"?"Moisture · NDMI":st.theme==="none"?"Base map":"Fire impact · dNBR";
 appendText(box,"h3",title);
 if(st.theme==="none"){appendText(box,"p","Select a land-cover category or boundary to explore the map.");return;}
 if(st.theme==="fire"&&st.fireDisplay==="none"){appendText(box,"p","No fire-impact layer is displayed. Land cover and boundaries remain available.");return;}
 if(st.theme!=="fire"){
   appendText(box,"p",st.theme==="ndvi"?"Higher values indicate greater relative greenness.":"Lower values can indicate less vegetation moisture.");
   const stops=cfg.legends[st.theme];const bar=appendText(box,"div","","gradient");
   bar.style.background="linear-gradient(to right,"+stops.map(s=>s.color).join(",")+")";
   const labels=appendText(box,"div","","gradient-values");
   appendText(labels,"span",String(stops[0].value));appendText(labels,"span",String(stops[stops.length-1].value));
   appendText(box,"div",cfg.dates.find(d=>d.id===st.date).label,"legend-note");
 }else if(st.fireDisplay==="classes"){
   appendText(box,"p","Choose one or more classes. Click a coloured location to view its mapped area.");
   cfg.severityClasses.filter(c=>st.fireClasses.has(c.id)).forEach(c=>{
     const row=appendText(box,"div","","legend-row");row.append(swatch(c.color));
     appendText(row,"span",c.name);appendText(row,"span","dNBR "+c.range,"range");
   });
   if(!st.fireClasses.size)appendText(box,"p","No fire-impact class selected.");
 }else{
   appendText(box,"p","Continuous spectral change between 27 Jul and 04 Aug 2026.");
   const stops=cfg.legends.dnbr;const bar=appendText(box,"div","","gradient");
   bar.style.background="linear-gradient(to right,"+stops.map(s=>s.color).join(",")+")";
   const lab=appendText(box,"div","","gradient-values");
   appendText(lab,"span",String(stops[0].value));appendText(lab,"span",String(stops[stops.length-1].value));
 }
}
function drawTimeline(){const host=$("timeline-track");
 // Visual spacing deliberately gives nearby labels room; fire symbol remains adjacent to 27 Jul.
 const positions={"20260605":3,"20260707":41,"20260727":69,"fire":78,"20260804":95};
 cfg.dates.forEach(d=>{
   const p=positions[d.id],mark=document.createElement("button");mark.type="button";mark.className="date-point";
   mark.style.left=p+"%";mark.dataset.date=d.id;mark.title=d.label+(d.postfire?" (post-fire)":"");
   mark.innerHTML='<span class="dot" aria-hidden="true"></span>';
   mark.addEventListener("click",()=>{st.date=d.id;syncMap()});host.append(mark);
   const label=document.createElement("button");label.type="button";label.className="date-label";
   label.style.left=p+"%";label.dataset.date=d.id;label.textContent=d.label.slice(0,6);
   label.addEventListener("click",()=>{st.date=d.id;syncMap()});host.append(label);
 });
 const fire=appendText(host,"div","🔥","fire-event");fire.style.left=positions.fire+"%";
 fire.setAttribute("aria-label","Fire event 29 Jul 2026");fire.title="Fire event · 29 July 2026";
 const fLabel=appendText(host,"span","29 Jul","fire-label");fLabel.style.left=positions.fire+"%";
}
function fireControl(){const holder=$("fire-classes");cfg.severityClasses.forEach(c=>{
 const label=document.createElement("label");const input=document.createElement("input");
 input.type="checkbox";input.checked=true;input.addEventListener("change",()=>{
   if(input.checked)st.fireClasses.add(c.id);else st.fireClasses.delete(c.id);syncMap()});
 label.append(input,swatch(c.color));appendText(label,"span",c.name);appendText(label,"span","dNBR "+c.range,"range");holder.append(label);
});}
function landcoverControl(){const holder=$("landcover-controls");cfg.landcover.forEach(cat=>{
 const label=document.createElement("label");const input=document.createElement("input");input.type="checkbox";
 input.addEventListener("change",()=>{if(input.checked)st.landcover.add(cat.id);else st.landcover.delete(cat.id);syncMap()});
 const patternSwatch=swatch(cat.color);patternSwatch.style.background="repeating-linear-gradient(135deg, transparent 0px, transparent 3px, "+cat.color+" 3px, "+cat.color+" 4px, transparent 4px, transparent 7px)";label.append(input,patternSwatch);appendText(label,"span",cat.name,"land-name");
 appendText(label,"span",cat.affectedKm2.toFixed(2)+" km²","land-area");holder.append(label);
});}
async function loadOutlines(){const resp=await fetch("data/landcover.geojson",{cache:"no-store"});
 if(!resp.ok)throw Error("Cannot load landcover.geojson");const data=await resp.json();
 outlines.landcover={};
 // A single SVG renderer and SVG patterns give the CORINE outlines a light,
 // transparent diagonal hatch. No raster values or GeoJSON coordinates change.
 const renderer=L.svg({padding:0.5});renderer.addTo(map);
 const svg=renderer._container;
 const ns="http://www.w3.org/2000/svg";
 const defs=document.createElementNS(ns,"defs");svg.insertBefore(defs,svg.firstChild);
 for(const cat of cfg.landcover){
   const pattern=document.createElementNS(ns,"pattern");
   const pid="firev-hatch-"+cat.id;
   for(const [key,value] of Object.entries({id:pid,patternUnits:"userSpaceOnUse",width:"9",height:"9",patternTransform:"rotate(45)"}))pattern.setAttribute(key,value);
   const line=document.createElementNS(ns,"line");
   for(const [key,value] of Object.entries({x1:"0",y1:"0",x2:"0",y2:"9",stroke:cat.color,"stroke-width":"1.2","stroke-opacity":"0.65"}))line.setAttribute(key,value);
   pattern.appendChild(line);defs.appendChild(pattern);
   const subset={type:"FeatureCollection",features:data.features.filter(f=>String(f.properties.code)===cat.id)};
   outlines.landcover[cat.id]=L.geoJSON(subset,{
     renderer,style:{color:cat.color,weight:1.7,fill:true,fillOpacity:1,opacity:.95},interactive:false,
     onEachFeature:(feature,layer)=>layer.on("add",()=>{
       if(layer._path)layer._path.setAttribute("fill","url(#"+pid+")");
     })
   });
 }
 const r=await fetch("data/burned_boundary.geojson",{cache:"no-store"});
 if(!r.ok)throw Error("Cannot load burned boundary");
 outlines.burn=L.geoJSON(await r.json(),{style:{color:"#9F252B",weight:1.5,fill:false,opacity:1},interactive:false});
}
async function loadSettlements(){
 const response=await fetch("data/settlements.geojson",{cache:"no-store"});
 if(!response.ok)throw Error("Cannot load settlements.geojson. Run Script 08b first.");
 const geojson=await response.json();
 outlines.settlements=L.geoJSON(geojson,{
   pointToLayer:(feature,latlng)=>L.circleMarker(latlng,{radius:3.5,color:"#ffffff",weight:1,fillColor:"#344a42",fillOpacity:1}),
   onEachFeature:(feature,layer)=>{
     const name=String(feature.properties?.name||"");
     layer.bindTooltip(name,{permanent:true,direction:"right",offset:[6,0],className:"settlement-label",opacity:1});
     layer.bindPopup("<b>"+escapeHtml(name)+"</b>");
   }
 });
}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
async function loadClickGrid(){const data=cfg.clickRaster;const img=new Image();img.src=data.url;
 await img.decode();const canvas=document.createElement("canvas");canvas.width=data.width;canvas.height=data.height;
 const ctx=canvas.getContext("2d",{willReadFrequently:true});ctx.drawImage(img,0,0);
 lookup={data:ctx.getImageData(0,0,data.width,data.height).data,meta:data};
}
function showFireClick(e){if(st.theme!=="fire"||st.fireDisplay!=="classes"||!lookup)return;
 const p=L.CRS.EPSG3857.project(e.latlng),b=lookup.meta.boundsMercator;
 const x=Math.floor((p.x-b[0])/(b[2]-b[0])*lookup.meta.width);
 const y=Math.floor((b[3]-p.y)/(b[3]-b[1])*lookup.meta.height);
 if(x<0||y<0||x>=lookup.meta.width||y>=lookup.meta.height){$("map-info").hidden=true;return}
 const i=(y*lookup.meta.width+x)*4;
 const c=lookup.data[i+3]?String(lookup.data[i]):null;
 const item=cfg.severityClasses.find(v=>v.id===c);
 if(!item||!st.fireClasses.has(item.id)){$("map-info").hidden=true;return}
 const host=$("map-info");host.replaceChildren();
 const close=document.createElement("button");close.textContent="×";close.title="Close";close.onclick=()=>{host.hidden=true};host.append(close);
 appendText(host,"strong",item.name+" impact");
 appendText(host,"div",item.areaKm2.toFixed(2)+" km²","area");
 appendText(host,"div","Total mapped area in this class");
 appendText(host,"div","dNBR "+item.range,"legend-note");
 host.hidden=false;
}
async function start(){if(typeof L==="undefined")throw Error("Leaflet is unavailable. Check Internet connection.");
 const response=await fetch("data/layers.json",{cache:"no-store"});if(!response.ok)throw Error("Missing layers.json; run Script 08 v3 first");
 cfg=await response.json();cfg.layers.forEach(layer=>meta[layer.id]=layer);
 map=L.map("map",{minZoom:9,maxZoom:17,zoomControl:false});L.control.zoom({position:"topright"}).addTo(map);
 L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
 studyBounds=L.latLngBounds([]);cfg.layers.filter(x=>x.id.startsWith("ndvi_")).forEach(item=>studyBounds.extend(item.bounds));
 cfg.layers.forEach(item=>{tiles[item.id]=L.tileLayer(item.url,{bounds:item.bounds,minZoom:item.minZoom,maxNativeZoom:item.maxZoom,maxZoom:17,opacity:st.opacity})});
 map.fitBounds(studyBounds.pad(.03));$("fit-view").onclick=()=>map.fitBounds(studyBounds.pad(.03));
 fireControl();landcoverControl();drawTimeline();await loadOutlines();await loadSettlements();
 try{await loadClickGrid()}catch(err){console.warn("Click lookup unavailable:",err);error("Click-to-inspect is unavailable; other maps still work.")}
 document.querySelectorAll('input[name="theme"]').forEach(el=>el.addEventListener("change",()=>{st.theme=el.value;syncMap()}));
 document.querySelectorAll('input[name="fire-display"]').forEach(el=>el.addEventListener("change",()=>{st.fireDisplay=el.value;syncMap()}));
 $("burn-outline").onchange=e=>{st.burn=e.target.checked;syncMap()};
 $("settlements-toggle").onchange=e=>{st.settlements=e.target.checked;syncMap()};
 $("opacity").oninput=e=>{st.opacity=Number(e.target.value)/100;$("opacity-number").textContent=e.target.value+"%";active.forEach(id=>tiles[id]?.setOpacity(st.opacity))};
 $("about-toggle").onclick=()=>$("about-panel").hidden=false;
 $("close-about").onclick=()=>$("about-panel").hidden=true;
 $("about-panel").addEventListener("click",e=>{if(e.target===$("about-panel"))$("about-panel").hidden=true});
 map.on("click",showFireClick);syncMap();
}
start().catch(error);

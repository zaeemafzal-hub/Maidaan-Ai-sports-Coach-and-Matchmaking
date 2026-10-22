// Static map page shared by the browser iframe and Expo Go WebView.
// Venue data arrives from the parent app; this page never receives auth/contact data.
export function openMapPage() {
  const tileUrl =
    process.env.OSM_TILE_URL ||
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  if (!tileUrl.startsWith("https://"))
    throw new Error("OSM_TILE_URL must use HTTPS.");
  const tile = JSON.stringify(tileUrl).replace(/</g, "\\u003c");
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><meta name="referrer" content="strict-origin-when-cross-origin">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="anonymous">
<style>.theme-light body,.theme-light #map{background:#f7f8f5}.theme-light #status{background:#fff;color:#17251d}.theme-light .leaflet-tile-pane{filter:none}.theme-light .leaflet-control-attribution{background:#fff!important;color:#526057}.theme-light .leaflet-control-attribution a{color:#a83c12}.theme-light .leaflet-bar a{background:#fff;color:#17251d}.theme-light .leaflet-bar a:hover{background:#ecefe8}</style>
<style>html,body,#map{height:100%;width:100%;margin:0;background:#141518;font:13px system-ui}#status{position:absolute;z-index:1000;top:8px;left:45px;right:8px;background:#141518;color:#fff;padding:8px;border-radius:8px}.leaflet-tile-pane{filter:invert(100%) hue-rotate(180deg) brightness(.85) contrast(.9)}.leaflet-control-attribution{font-size:10px;background:#202126!important;color:#ddd}.leaflet-control-attribution a{color:#ffac83}.leaflet-bar a{background:#202126;color:#fff}.leaflet-bar a:hover{background:#35363b}</style></head><body><div id="map" aria-label="OpenStreetMap venues"></div><div id="status">Loading OpenStreetMap…</div>
<script>
function send(data){data.source='maidaan-open-map';if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(data));else if(window.parent!==window)window.parent.postMessage(data,'*');}
function fail(message){document.getElementById('status').textContent=message;send({kind:'error',message:message});}
</script>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin="anonymous" onerror="fail('Unable to load the map library. Check your connection or choose Google Maps.')"></script>
<script>
if(window.L){
  var map=L.map('map',{fadeAnimation:false}).setView([31.5204,74.3587],12),layers=L.layerGroup().addTo(map),canPick=false;
  var tiles=L.tileLayer(${tile},{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>'}).addTo(map);
  var loadedTiles=0,failedTiles=0;
  var tileTimeout=setTimeout(function(){if(!loadedTiles)fail('OpenStreetMap tiles did not load.');},20000);
  tiles.on('loading',function(){loadedTiles=0;failedTiles=0;});
  tiles.on('tileload',function(){loadedTiles++;clearTimeout(tileTimeout);});
  tiles.on('tileerror',function(){failedTiles++;});
  tiles.on('load',function(){if(!loadedTiles&&failedTiles){fail('OpenStreetMap is unavailable.');return;}document.getElementById('status').style.display='none';});
  tiles.on('tileerror',function(){document.getElementById('status').textContent='Some map tiles could not load. Check your connection.';document.getElementById('status').style.display='block';});
  window.maidaanMapUpdate=function(data){
    if(!data||!Array.isArray(data.points))return;
    document.documentElement.classList.toggle('theme-light',data.theme==='light');
    layers.clearLayers();canPick=!!data.canPick;
    var points=data.points.filter(function(p){return Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)&&Math.abs(p.latitude)<=90&&Math.abs(p.longitude)<=180;});
    points.forEach(function(point){
      var title=document.createElement('span');title.textContent=String(point.title||'Venue');
      var marker=L.circleMarker([point.latitude,point.longitude],{radius:10,color:'#fff',weight:2,fillColor:'#E85D26',fillOpacity:1,bubblingMouseEvents:false}).addTo(layers).bindTooltip(title);
      marker.on('click',function(){send({kind:'select',id:point.id});});
    });
    if(points.length>1)map.fitBounds(points.map(function(p){return [p.latitude,p.longitude];}),{padding:[35,35],maxZoom:15,animate:false});
    else if(points.length)map.setView([points[0].latitude,points[0].longitude],14,{animate:false});
    else if(data.center)map.setView([data.center.latitude,data.center.longitude],12,{animate:false});
  };
  map.on('click',function(event){if(canPick)send({kind:'pick',latitude:event.latlng.lat,longitude:event.latlng.lng});});
  window.addEventListener('message',function(event){if(event.source===window.parent&&event.data&&event.data.kind==='maidaan-map-update')window.maidaanMapUpdate(event.data);});
  send({kind:'ready'});
}
</script></body></html>`;
}

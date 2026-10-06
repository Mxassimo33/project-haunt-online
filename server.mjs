import http from 'node:http';
import {randomBytes} from 'node:crypto';
import {stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createGunzip} from 'node:zlib';
import {resolve,extname} from 'node:path';
import {WebSocketServer,WebSocket} from 'ws';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('./public/',import.meta.url));
export function createHauntServer(){
 const rooms=new Map(),peers=new Set();
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.url==='/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true}));return;}
  try{const url=new URL(req.url,'http://local');let pathname=decodeURIComponent(url.pathname);if(pathname==='/')pathname='/index.html';const path=resolve(root,'.'+pathname);if(!path.startsWith(root)){res.writeHead(403);res.end();return;}
   let packed=false;try{packed=(await stat(path+'.gz')).isFile();}catch{}if(!packed&&!(await stat(path)).isFile())throw Error();const types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.wasm':'application/wasm','.data':'application/octet-stream','.json':'application/json','.png':'image/png','.css':'text/css'};
   const compressed=packed&&/\bgzip\b/.test(req.headers['accept-encoding']||'');res.setHeader('Vary','Accept-Encoding');if(compressed)res.setHeader('Content-Encoding','gzip');
   const metadata=await stat(packed?path+'.gz':path);res.setHeader('Last-Modified',metadata.mtime.toUTCString());if(compressed||!packed)res.setHeader('Content-Length',metadata.size);
   res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-cache'});const stream=createReadStream(packed?path+'.gz':path);stream.on('error',()=>res.destroy());if(packed&&!compressed)stream.pipe(createGunzip()).on('error',()=>res.destroy()).pipe(res);else stream.pipe(res);
  }catch{res.writeHead(404);res.end('File non disponibile');}
 });
 const wss=new WebSocketServer({server,path:'/socket',maxPayload:131072,perMessageDeflate:false});
 const send=(ws,msg)=>{if(ws&&ws.readyState===WebSocket.OPEN){if(ws.bufferedAmount>2_000_000){ws.close(1008,'Connessione troppo lenta');return;}ws.send(JSON.stringify(msg));}};
 function remove(ws){if(!peers.delete(ws))return;let r=ws.room;if(!r)return;ws.room=null;r.peers.delete(ws.peerId);if(ws.peerId===0){rooms.delete(r.code);for(const peer of r.peers.values()){peer.room=null;send(peer,{type:'error',error:'Chi ospitava la partita è uscito.'});peer.close(1000,'Host uscito');}}else send(r.peers.get(0),{type:'left',id:ws.peerId});}
 wss.on('connection',ws=>{if(peers.size>=64){ws.close(1013,'Server pieno');return;}peers.add(ws);ws.alive=true;ws.tokens=240;ws.lastBudget=Date.now();ws.on('pong',()=>ws.alive=true);
  ws.on('message',raw=>{const now=Date.now(),budget=ws.peerId===0&&ws.room?120*ws.room.max:120;ws.tokens=Math.min(budget*2,ws.tokens+(now-ws.lastBudget)*budget/1000);ws.lastBudget=now;if(--ws.tokens<0){ws.close(1008,'Troppi messaggi');return;}
   let m;try{m=JSON.parse(raw.toString());}catch{ws.close(1008,'Messaggio non valido');return;}
   if(!m||typeof m!=='object'||Array.isArray(m)){ws.close(1008,'Messaggio non valido');return;}
   if(m.type==='ping'){send(ws,{type:'pong'});return;}
   if(m.type==='create'&&!ws.room){if(rooms.size>=24){send(ws,{type:'error',error:'Server pieno'});return;}let code;do{code=randomBytes(4).toString('hex').slice(0,6).toUpperCase();}while(rooms.has(code));const room={code,max:m.teams?4:m.max===2?2:4,teams:m.teams===true,peers:new Map(),nextId:1};rooms.set(code,room);ws.room=room;ws.peerId=0;room.peers.set(0,ws);send(ws,{type:'created',code,max:room.max,teams:room.teams});return;}
   if(m.type==='join'&&!ws.room){const room=rooms.get(String(m.code||'').trim().toUpperCase());if(!room||room.peers.size>=room.max){send(ws,{type:'error',error:room?'Stanza piena':'Codice non trovato'});return;}ws.peerId=room.nextId++;ws.room=room;room.peers.set(ws.peerId,ws);send(room.peers.get(0),{type:'peer',id:ws.peerId});send(ws,{type:'joined',code:room.code,max:room.max,teams:room.teams});return;}
   if(m.type==='data'&&ws.room&&typeof m.data==='string'&&m.data.length<=100000&&/^[A-Za-z0-9+/]*={0,2}$/.test(m.data)){
    const to=ws.peerId===0?Number(m.id):0;const target=ws.room.peers.get(to);if(target&&target!==ws)send(target,{type:'data',id:ws.peerId,data:m.data});return;}
   if(m.type==='kick'&&ws.room&&ws.peerId===0){const peer=ws.room.peers.get(Number(m.id));if(peer&&peer!==ws)peer.close(1000,'Connessione chiusa');return;}
  });ws.on('close',()=>remove(ws));ws.on('error',()=>remove(ws));
 });
 const timer=setInterval(()=>{for(const ws of peers){if(!ws.alive){ws.terminate();remove(ws);continue;}ws.alive=false;ws.ping();}},25000);timer.unref();
 return {server,rooms,close:async()=>{clearInterval(timer);for(const ws of peers)ws.terminate();await new Promise(r=>wss.close(r));await new Promise(r=>server.close(r));}};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const app=createHauntServer();app.server.listen(Number(process.env.PORT)||8787,'0.0.0.0',()=>console.log('Project Haunt server pronto'));process.on('SIGTERM',async()=>{await app.close();process.exit(0);});}

/* ================================================================
   BOARD MORPH EVENTS
================================================================ */
function triggerBoardMorph() {
  morphLayerCollapse();
}

function morphLayerCollapse() {
  if (collapsedLayer!==null) return;
  const z = Math.floor(Math.random()*LAYERS);
  // Displace pieces on that layer to nearest valid layer
  [...pieces].forEach(p => {
    if (p.userData.z!==z) return;
    const nz = z>0 ? z-1 : 1;
    if (!occ(p.userData.x,p.userData.y,nz)) {
      const from={x:p.userData.x,y:p.userData.y,z};
      delete boardMap[key(from.x,from.y,z)];
      p.userData.z=nz; boardMap[key(from.x,from.y,nz)]=p;
      animateSlide(p,from,{x:from.x,y:from.y,z:nz},0.04);
      const orbHere=activeOrbs.find(o=>o.x===from.x&&o.y===from.y&&o.z===nz);
      if(orbHere){const rem=removeOrbAt(from.x,from.y,nz);if(rem)setTimeout(()=>applyOrbEffect(p,rem.type,from.x,from.y,nz),300);}
    }
  });
  layers[z].visible = false;
  collapsedLayer = { z, turnsLeft: 3+Math.floor(Math.random()*4) };
  arcadeAnnounce('⚡ LAYER '+(z+1)+' COLLAPSED!', 0xff6600);
  updateArcadeBar();
}
function tickCollapsedLayer() {
  if (!collapsedLayer) return;
  if (--collapsedLayer.turnsLeft <= 0) {
    layers[collapsedLayer.z].visible = true;
    arcadeAnnounce('LAYER '+(collapsedLayer.z+1)+' RESTORED', 0x666666);
    collapsedLayer = null;
  }
}

function morphBoardSplit() {
  if (boardSplit) return;
  const pos = 2 + Math.floor(Math.random()*4);
  const meshes = [];
  for (let z=0;z<LAYERS;z++) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(8*SPACING, 0.08),
      new THREE.MeshBasicMaterial({color:0xff0066, transparent:true, opacity:0.5})
    );
    m.rotation.x = -Math.PI/2;
    m.position.set(0, layers[z].position.y+0.02, -half+pos*SPACING);
    pivot.add(m); meshes.push(m);
  }
  boardSplit = { pos, turnsLeft:4+Math.floor(Math.random()*4), meshes };
  arcadeAnnounce('⚡ BOARD SPLIT at rank '+(pos+1)+'!', 0xff0066);
  updateArcadeBar();
}
function tickBoardSplit() {
  if (!boardSplit) return;
  if (--boardSplit.turnsLeft <= 0) {
    boardSplit.meshes.forEach(m=>pivot.remove(m));
    boardSplit = null;
    arcadeAnnounce('Board reconnected', 0x444444);
  }
}

function morphLayerRotation() {
  const z = Math.floor(Math.random()*LAYERS);
  arcadeAnnounce('🔄 LAYER '+(z+1)+' ROTATING 90°!', 0x00ffff);
  const onLayer = pieces.filter(p=>p.userData.z===z);
  // Remove from boardMap first
  onLayer.forEach(p=>delete boardMap[key(p.userData.x,p.userData.y,z)]);
  // 90° clockwise: (x,y) → (7-y, x)
  onLayer.forEach(p=>{
    const nx=7-p.userData.y, ny=p.userData.x;
    if (!boardMap[key(nx,ny,z)]) {
      p.userData.x=nx; p.userData.y=ny;
      p.position.set(-half+(nx+0.5)*SPACING, 0, -half+(ny+0.5)*SPACING);
    }
    boardMap[key(p.userData.x,p.userData.y,z)]=p;
  });
  update();
}

/* ================================================================
   GRAVITY TESSERACT EVENT
================================================================ */
function evGravityTesseract(ox, oy, oz) {
  const DIRS=[
    {dx:1,dy:0,dz:0,lab:'+X →'},{dx:-1,dy:0,dz:0,lab:'-X ←'},
    {dx:0,dy:1,dz:0,lab:'+Y ↗'},{dx:0,dy:-1,dz:0,lab:'-Y ↙'},
    {dx:0,dy:0,dz:1,lab:'+Z ↑'},{dx:0,dy:0,dz:-1,lab:'-Z ↓'}
  ];
  const d=DIRS[Math.floor(Math.random()*DIRS.length)];
  const affected=pieces.filter(p=>Math.max(
    Math.abs(p.userData.x-ox),Math.abs(p.userData.y-oy),Math.abs(p.userData.z-oz)
  )<=1);
  affected.sort((a,b)=>{
    if(d.dx>0) return b.userData.x-a.userData.x;
    if(d.dx<0) return a.userData.x-b.userData.x;
    if(d.dy>0) return b.userData.y-a.userData.y;
    if(d.dy<0) return a.userData.y-b.userData.y;
    if(d.dz>0) return b.userData.z-a.userData.z;
    return a.userData.z-b.userData.z;
  });
  affected.forEach(p=>{
    const from={x:p.userData.x,y:p.userData.y,z:p.userData.z};
    delete boardMap[key(from.x,from.y,from.z)];
    let nx=from.x,ny=from.y,nz=from.z;
    while(true){
      const cx=nx+d.dx,cy=ny+d.dy,cz=nz+d.dz;
      if(cx<0||cx>7||cy<0||cy>7||cz<0||cz>=LAYERS)break;
      if(isHole(cx,cy,cz))break;
      if(boardMap[key(cx,cy,cz)])break;
      nx=cx;ny=cy;nz=cz;
    }
    p.userData.x=nx;p.userData.y=ny;p.userData.z=nz;
    boardMap[key(nx,ny,nz)]=p;
    if(nx!==from.x||ny!==from.y||nz!==from.z) {
      animateSlide(p,from,{x:nx,y:ny,z:nz},0.05);
      const orbHere=activeOrbs.find(o=>o.x===nx&&o.y===ny&&o.z===nz);
      if(orbHere){const rem=removeOrbAt(nx,ny,nz);if(rem)setTimeout(()=>applyOrbEffect(p,rem.type,nx,ny,nz),300);}
    }
  });
  arcadeAnnounce('🌌 Gravity Tesseract — '+d.lab, 0x7B2FBE);
  update();
}

function evGravityTesseractRandom() {
  const validOrigins=[];
  for(let x=0;x<8;x++) for(let y=0;y<8;y++) for(let z=0;z<LAYERS;z++)
    if(!isHole(x,y,z)) validOrigins.push({x,y,z});
  if(!validOrigins.length) return;
  const o=validOrigins[Math.floor(Math.random()*validOrigins.length)];
  evGravityTesseract(o.x,o.y,o.z);
}

/* ================================================================
   RANDOM GLOBAL EVENTS
================================================================ */
function triggerRandomEvent() {
  const pool = ['meteor','gravity_tesseract','orb_rain'];
  if (arcadeSettings.laserMode !== 'off') pool.push('laser_warned');
  const ev = pool[Math.floor(Math.random()*pool.length)];
  if (ev==='meteor')             evMeteorStrike();
  if (ev==='gravity_tesseract')  evGravityTesseractRandom();
  if (ev==='laser_warned')       evLaserWarned();
  if (ev==='orb_rain')           evOrbRain();
}

function evMeteorStrike() {
  const n = 2+Math.floor(Math.random()*3);
  for (let i=0;i<n;i++) {
    const sq=randomEmptySquare(); if(!sq) continue;
    const mesh=new THREE.Mesh(
      new THREE.SphereGeometry(0.28,7,7),
      new THREE.MeshBasicMaterial({color:0xff3300,transparent:true,opacity:0.75})
    );
    mesh.position.set(-half+(sq.x+0.5)*SPACING, layers[sq.z].position.y+0.3, -half+(sq.y+0.5)*SPACING);
    pivot.add(mesh);
    meteors.push({...sq, mesh, turnsLeft:3+Math.floor(Math.random()*3)});
  }
  arcadeAnnounce('☄ METEOR STRIKE! '+n+' squares blocked!', 0xff3300);
  updateArcadeBar();
}
function tickMeteors() {
  for (let i=meteors.length-1;i>=0;i--) {
    if (--meteors[i].turnsLeft<=0) { pivot.remove(meteors[i].mesh); meteors.splice(i,1); }
  }
}

function evTeleportStorm() {
  if (pieces.length<4) return;
  const shuffled=[...pieces].sort(()=>Math.random()-0.5);
  const n=2+Math.floor(Math.random()*2);
  for (let i=0;i<n*2;i+=2) {
    const a=shuffled[i],b=shuffled[i+1]; if(!a||!b) break;
    delete boardMap[key(a.userData.x,a.userData.y,a.userData.z)];
    delete boardMap[key(b.userData.x,b.userData.y,b.userData.z)];
    const ax=a.userData.x,ay=a.userData.y,az=a.userData.z;
    a.userData.x=b.userData.x;a.userData.y=b.userData.y;a.userData.z=b.userData.z;
    b.userData.x=ax;b.userData.y=ay;b.userData.z=az;
    boardMap[key(a.userData.x,a.userData.y,a.userData.z)]=a;
    boardMap[key(b.userData.x,b.userData.y,b.userData.z)]=b;
    animateFade(a,{x:ax,y:ay,z:az},{x:a.userData.x,y:a.userData.y,z:a.userData.z});
    animateFade(b,{x:b.userData.x,y:b.userData.y,z:b.userData.z},{x:ax,y:ay,z:az});
  }
  arcadeAnnounce('🌀 TELEPORT STORM!', 0xff00ff);
  update();
}

function evOrbRain() {
  const n=3+Math.floor(Math.random()*3);
  for (let i=0;i<n;i++) setTimeout(()=>spawnOrb(),i*350);
  arcadeAnnounce('🌧 ORB RAIN! '+n+' orbs incoming!', 0xffaa00);
}

/* ================================================================
   LASER SYSTEM
================================================================ */

// Protected squares: king & queen starting positions (x,y) — immune on ALL layers
// Board coords: a=x7..h=x0, rank1=y0..rank8=y7
// King e-file x=3, Queen d-file x=4; back ranks y=0 (white), y=7 (black)
const _laserProtected = new Set(['3_0','4_0','3_7','4_7']); // "x_y" keys

function _isLaserProtected(x, y, z) {
  if (_laserProtected.has(x+'_'+y)) return true;
  // Also protect any square currently occupied by a king
  const p = occ(x, y, z);
  if (p && p.userData.type === 'king') return true;
  return false;
}

// Builds a laser shot: one of three full-board types
// Column: 1×1×LAYERS — vertical column through all layers at one position
// Row:    8×1×1      — full rank or file on one layer
// Wall:   8×1×LAYERS — full rank or file across ALL layers (splits board)
function _laserBuildShot() {
  const S=SPACING;
  // Determine geometry type from laserMode setting
  let roll;
  const mode = arcadeSettings.laserMode;
  if (mode === 'column')    roll = 0;
  else if (mode === 'row')  roll = 0.5;
  else if (mode === 'wall') roll = 0.8;
  else                      roll = Math.random(); // 'all' — random
  let targets=[], beam;

  if (roll < 0.33) {
    // Column
    const x=Math.floor(Math.random()*8), y=Math.floor(Math.random()*8);
    for(let z=0;z<LAYERS;z++) if(!isHole(x,y,z)&&!_isLaserProtected(x,y,z)) targets.push({x,y,z});
    const wy0=layers[0].position.y, wyN=layers[LAYERS-1].position.y;
    beam={bx:S, by:Math.abs(wyN-wy0)+S, bz:S,
          cx:-half+(x+0.5)*S, cy:(wy0+wyN)*0.5, cz:-half+(y+0.5)*S};
  } else if (roll < 0.67) {
    // Row — always on the active layer so it's always visible
    const axis=Math.random()<0.5?'X':'Y';
    const idx=Math.floor(Math.random()*8);
    const z=activeZ;
    for(let i=0;i<8;i++){
      const tx=axis==='X'?i:idx, ty=axis==='X'?idx:i;
      if(!isHole(tx,ty,z)&&!_isLaserProtected(tx,ty,z)) targets.push({x:tx,y:ty,z});
    }
    const cy=layers[Math.min(z,layers.length-1)].position.y+S*0.5;
    beam=axis==='X' ? {bx:8*S,by:S,bz:S, cx:0,cy, cz:-half+(idx+0.5)*S}
                    : {bx:S,by:S,bz:8*S, cx:-half+(idx+0.5)*S,cy, cz:0};
  } else {
    // Wall — splits the entire board
    const axis=Math.random()<0.5?'X':'Y';
    const idx=Math.floor(Math.random()*8);
    for(let i=0;i<8;i++) for(let z=0;z<LAYERS;z++){
      const tx=axis==='X'?i:idx, ty=axis==='X'?idx:i;
      if(!isHole(tx,ty,z)&&!_isLaserProtected(tx,ty,z)) targets.push({x:tx,y:ty,z});
    }
    const wy0=layers[0].position.y, wyN=layers[LAYERS-1].position.y;
    const by=Math.abs(wyN-wy0)+S, cy=(wy0+wyN)*0.5;
    beam=axis==='X' ? {bx:8*S,by,bz:S, cx:0,cy, cz:-half+(idx+0.5)*S}
                    : {bx:S,by,bz:8*S, cx:-half+(idx+0.5)*S,cy, cz:0};
  }

  return targets.length ? {targets,beam} : null;
}

function createHoleAt(x, y, z) {
  const k=key(x,y,z); if(holeSquares.has(k)) return;
  holeSquares.add(k);
  // Hide the tile plane — use userData match for robustness
  const planes=layerPlanes[z];
  if(planes) for(let i=0;i<planes.length;i++){
    const p=planes[i];
    if(p.userData.x===x && p.userData.y===y){ p.userData.isHole=true; p.visible=false; break; }
  }
  rebuildLayerGrid(z);
  // Void mesh — zeroes framebuffer to reveal CSS background
  // Parented to layer group so it moves with layer (compaction/collapse)
  const voidMesh = new THREE.Mesh(_holeVoidGeo, _holeVoidMat);
  voidMesh.rotation.x = -Math.PI/2;
  voidMesh.position.set(-half+(x+0.5)*SPACING, 0.01, -half+(y+0.5)*SPACING);
  voidMesh.renderOrder = 999;
  layers[z].add(voidMesh);
  holeMarkers.set(k, voidMesh);
}

function healHoleAt(x, y, z) {
  const k=key(x,y,z); if(!holeSquares.has(k)) return;
  holeSquares.delete(k);
  // Restore tile plane
  const planes=layerPlanes[z];
  if(planes) for(let i=0;i<planes.length;i++){
    const p=planes[i];
    if(p.userData.x===x && p.userData.y===y){ p.userData.isHole=false; break; }
  }
  const marker=holeMarkers.get(k);
  if(marker && marker.parent) marker.parent.remove(marker);
  holeMarkers.delete(k);
  rebuildLayerGrid(z);
}

function clearAllHoles() {
  const affectedZ=new Set([...holeSquares].map(k=>parseInt(k.split('_')[2])));
  [...holeSquares].forEach(k=>{
    const [x,y,z]=k.split('_').map(Number);
    // Restore tile plane
    const planes=layerPlanes[z];
    if(planes) for(let i=0;i<planes.length;i++){
      const p=planes[i];
      if(p.userData.x===x && p.userData.y===y){ p.userData.isHole=false; break; }
    }
    const marker=holeMarkers.get(k);
    if(marker && marker.parent) marker.parent.remove(marker);
  });
  holeSquares.clear(); holeMarkers.clear();
  affectedZ.forEach(z=>rebuildLayerGrid(z));
}

function fireLaser(targets, beam) {
  if(!targets.length){ arcadeAnnounce('💥 Laser fired — missed everything',0xff3300); return; }

  // Safety net: never destroy kings, never hole their squares
  targets = targets.filter(sq => {
    const p = occ(sq.x, sq.y, sq.z);
    return !(p && p.userData.type === 'king');
  });
  if(!targets.length){ arcadeAnnounce('💥 Laser fired — kings immune!',0xff9900); return; }

  const toDestroy=[],toDisplace=[];
  targets.forEach(sq=>{
    const p=occ(sq.x,sq.y,sq.z); if(!p) return;
    if(p.userData.type==='knight') toDisplace.push({piece:p,sq});
    else toDestroy.push({piece:p,sq});
  });

  toDisplace.forEach(({piece,sq})=>{
    const dirs6=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
    for(const[dx,dy,dz] of dirs6){
      const nx=sq.x+dx,ny=sq.y+dy,nz=sq.z+dz;
      if(nx<0||nx>7||ny<0||ny>7||nz<0||nz>=LAYERS) continue;
      if(isHole(nx,ny,nz)||occ(nx,ny,nz)) continue;
      delete boardMap[key(sq.x,sq.y,sq.z)];
      piece.userData.x=nx;piece.userData.y=ny;piece.userData.z=nz;
      boardMap[key(nx,ny,nz)]=piece;
      animateSlide(piece,{x:sq.x,y:sq.y,z:sq.z},{x:nx,y:ny,z:nz},0.1); return;
    }
    toDestroy.push({piece,sq});
  });

  targets.forEach(sq=>createHoleAt(sq.x,sq.y,sq.z));
  // Safety: force-hide any tile planes at hole positions (belt + suspenders)
  targets.forEach(sq=>{
    const planes = layerPlanes[sq.z];
    if(planes) for(let i=0;i<planes.length;i++){
      const p=planes[i];
      if(p.userData.x===sq.x && p.userData.y===sq.y) p.visible=false;
    }
  });
  toDestroy.forEach(({piece})=>{
    delete boardMap[key(piece.userData.x,piece.userData.y,piece.userData.z)];
    if(piece.parent) piece.parent.remove(piece);
    const i=pieces.indexOf(piece); if(i!==-1) pieces.splice(i,1);
  });

  // Beam flash — two-layer glow: bright core + soft outer bloom
  if(beam){
    const coreGeo = new THREE.BoxGeometry(beam.bx*0.6, beam.by, beam.bz*0.6);
    const coreMat = new THREE.MeshBasicMaterial({
      color:0xff2200, transparent:true, opacity:0.95,
      blending:THREE.AdditiveBlending, depthWrite:false
    });
    const outerGeo = new THREE.BoxGeometry(beam.bx*1.2, beam.by*1.05, beam.bz*1.2);
    const outerMat = new THREE.MeshBasicMaterial({
      color:0xff4400, transparent:true, opacity:0.4,
      blending:THREE.AdditiveBlending, depthWrite:false
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    coreMesh.position.set(beam.cx, beam.cy, beam.cz);
    outerMesh.position.set(beam.cx, beam.cy, beam.cz);
    pivot.add(coreMesh); pivot.add(outerMesh);
    const t0=performance.now();
    (function fade(now){
      const tt=Math.min((now-t0)/1800,1);
      const ease = 1 - tt*tt; // quadratic ease-out
      coreMat.opacity = 0.95 * ease;
      outerMat.opacity = 0.4 * ease;
      if(tt<1) requestAnimationFrame(fade);
      else { pivot.remove(coreMesh); pivot.remove(outerMesh); coreMat.dispose(); outerMat.dispose(); }
    })(performance.now());
  }

  const wGone=!pieces.find(p=>p.userData.type==='king'&&p.userData.color==='white');
  const bGone=!pieces.find(p=>p.userData.type==='king'&&p.userData.color==='black');
  arcadeAnnounce('💥 Laser fired — '+targets.length+' square(s) destroyed',0xff3300);
  update(); updateArcadeBar();
  if(wGone||bGone) setTimeout(()=>{
    if(wGone&&bGone) endGame('Draw — both kings destroyed by laser!');
    else if(wGone)   endGame('Black wins — White king destroyed by laser!');
    else             endGame('White wins — Black king destroyed by laser!');
  },1000);
}

function evLaserWarned() {
  if(laserWarning) return;
  if(arcadeSettings.laserMode==='off') return;
  const shot=_laserBuildShot(); if(!shot) return;
  const {targets,beam}=shot;
  const warningMeshes=targets.map(sq=>{
    const group = new THREE.Group();
    // Pulsing red plane (slightly raised)
    const m=new THREE.Mesh(
      new THREE.PlaneGeometry(SPACING*0.9,SPACING*0.9),
      new THREE.MeshBasicMaterial({color:0xff3300,transparent:true,opacity:0.5,side:THREE.DoubleSide,depthTest:true})
    );
    m.rotation.x=-Math.PI/2;
    m.position.set(-half+(sq.x+0.5)*SPACING, 0.03, -half+(sq.y+0.5)*SPACING);
    group.add(m);
    // Crosshair lines for targeting clarity
    const crossMat = new THREE.LineBasicMaterial({color:0xff6600,transparent:true,opacity:0.7});
    const S2=SPACING*0.4, cx=-half+(sq.x+0.5)*SPACING, cz=-half+(sq.y+0.5)*SPACING;
    const crossPts = [
      new THREE.Vector3(cx-S2,0.04,cz), new THREE.Vector3(cx+S2,0.04,cz),
      new THREE.Vector3(cx,0.04,cz-S2), new THREE.Vector3(cx,0.04,cz+S2)
    ];
    const crossGeo = new THREE.BufferGeometry().setFromPoints(crossPts);
    group.add(new THREE.LineSegments(crossGeo, crossMat));
    layers[sq.z].add(group);
    group._warningPlane = m; // reference for pulse animation
    return group;
  });
  laserWarning={targets,beam,turnsLeft:4,warningMeshes};
  arcadeAnnounce('⚠ Laser charging — fires in 2 turns',0xff6600);
  updateArcadeBar();
}

function tickLaserWarning() {
  if(!laserWarning) return;
  laserWarning.turnsLeft--;
  if(laserWarning.turnsLeft===2) arcadeAnnounce('⚠ Laser fires next turn',0xff4400);
  if(laserWarning.turnsLeft<=0){
    laserWarning.warningMeshes.forEach(m=>{ if(m.parent) m.parent.remove(m); });
    const {targets,beam}=laserWarning;
    laserWarning=null;
    fireLaser(targets,beam);
  }
}

function evLaserInstant() {
  if(arcadeSettings.laserMode==='off') return;
  const shot=_laserBuildShot(); if(!shot) return;
  setTimeout(()=>fireLaser(shot.targets,shot.beam),300);
}

/* ================================================================
   REGENERATION & COMPACTION
================================================================ */
function tickRegen() {
  if(!arcadeActive||arcadeSettings.regenInterval==='off') return;
  const intervals={slow:16,medium:8,fast:4};
  const interval=intervals[arcadeSettings.regenInterval]||16;
  if(arcadeTurnCount===0||arcadeTurnCount%interval!==0) return;
  const chance=parseInt(arcadeSettings.regenChance)/100;
  let healed=0;
  [...holeSquares].forEach(k=>{
    if(Math.random()<chance){
      const[x,y,z]=k.split('_').map(Number);
      if(!occ(x,y,z)){ healHoleAt(x,y,z); healed++; }
    }
  });
  if(healed>0){ arcadeAnnounce('Board healing…',0x00aa44); update(); updateArcadeBar(); }
}

function tickCompact() {
  if(!arcadeActive||!arcadeSettings.compaction) return;
  if(!holeSquares.size) return;
  const interval=parseInt(arcadeSettings.compactInterval)||12;
  if(arcadeTurnCount===0||arcadeTurnCount%interval!==0) return;
  compactBoard();
}

function compactBoard() {
  if(!holeSquares.size) return;
  let bestAxis=null,bestSlice=-1,bestCount=0;
  for(let x=0;x<8;x++){
    let c=0; for(let y=0;y<8;y++) for(let z=0;z<LAYERS;z++) if(isHole(x,y,z)) c++;
    if(c>bestCount){ bestCount=c;bestAxis='X';bestSlice=x; }
  }
  for(let y=0;y<8;y++){
    let c=0; for(let x=0;x<8;x++) for(let z=0;z<LAYERS;z++) if(isHole(x,y,z)) c++;
    if(c>bestCount){ bestCount=c;bestAxis='Y';bestSlice=y; }
  }
  for(let z=0;z<LAYERS;z++){
    let c=0; for(let x=0;x<8;x++) for(let y=0;y<8;y++) if(isHole(x,y,z)) c++;
    if(c>bestCount){ bestCount=c;bestAxis='Z';bestSlice=z; }
  }
  if(!bestAxis||bestCount===0) return;
  const dimNow=bestAxis==='X'?boardW:bestAxis==='Y'?boardH:boardD;
  if(dimNow<=4) return;
  const toPurge=pieces.filter(p=>{
    if(bestAxis==='X') return p.userData.x===bestSlice&&!isHole(p.userData.x,p.userData.y,p.userData.z);
    if(bestAxis==='Y') return p.userData.y===bestSlice&&!isHole(p.userData.x,p.userData.y,p.userData.z);
    return p.userData.z===bestSlice&&!isHole(p.userData.x,p.userData.y,p.userData.z);
  });
  toPurge.forEach(p=>{
    delete boardMap[key(p.userData.x,p.userData.y,p.userData.z)];
    if(p.parent) p.parent.remove(p);
    pieces.splice(pieces.indexOf(p),1);
  });
  // For X/Y axes, b iterates the z dimension — cap at LAYERS
  const bMax = (bestAxis==='Z') ? 8 : LAYERS;
  for(let a=0;a<8;a++) for(let b=0;b<bMax;b++){
    let x=bestSlice,y=a,z=b;
    if(bestAxis==='Y'){x=a;y=bestSlice;z=b;}
    if(bestAxis==='Z'){x=a;y=b;z=bestSlice;}
    if(!isHole(x,y,z)) createHoleAt(x,y,z);
  }
  if(bestAxis==='X') boardW--;
  else if(bestAxis==='Y') boardH--;
  else boardD--;
  if(bestAxis==='Z'){
    const tweenDur=500; const t0=performance.now();
    const above=layers.slice(bestSlice+1);
    const startYs=above.map(l=>l.position.y);
    (function anim(now){
      const tt=Math.min((now-t0)/tweenDur,1);
      const ease=tt<0.5?2*tt*tt:-1+(4-2*tt)*tt;
      above.forEach((l,i)=>{ l.position.y=startYs[i]-ease*LAYER_SPACING; });
      if(tt<1) requestAnimationFrame(anim);
    })(performance.now());
  }
  arcadeAnnounce('Board compacted — now '+boardW+'×'+boardH+'×'+boardD,0xff8800);
  const wGone=!pieces.find(p=>p.userData.type==='king'&&p.userData.color==='white');
  const bGone=!pieces.find(p=>p.userData.type==='king'&&p.userData.color==='black');
  update(); updateArcadeBar();
  if(wGone||bGone) setTimeout(()=>{
    if(wGone&&bGone) endGame('Draw — both kings removed by compaction!');
    else if(wGone)   endGame('Black wins — White king removed by compaction!');
    else             endGame('White wins — Black king removed by compaction!');
  },800);
}


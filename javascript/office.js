// ═══════════════════════════════════════════════════════════════
// BROWSER LAB — DUNDER MIFFLIN LIVE AGENT MAP
// 21 agents · polled from api.agentx0-palisade.uk
// Vanilla canvas, no build step.
// ═══════════════════════════════════════════════════════════════
(function () {
  const canvas = document.getElementById('officeCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const W = 900, H = 440, WALL = 6;
  const API = 'https://api.agentx0-palisade.uk/api/public/portfolio/roster';
  const POLL_MS = 10000;

  // Motion feel — the whole floor is sized for "follow-along" pace, not arcade.
  const SPEED = 0.55;               // px per frame (~33 px/s at 60 fps)
  const STAGGER_TICKS = 180;        // min 3 s between any two walk starts
  const MAX_CONCURRENT_WALKING = 2; // allow limited concurrent movement while keeping targets pinned
  const PAIR_DEBOUNCE_MS = 15000;   // drop any A↔B reverse within 15 s
  const AGENT_SCALE = 1.2;          // slightly larger sprites without changing sim logic
  const CHAIR_SCALE = 1.2;          // match chair size to the larger agents
  const POST_VISIT_COOLDOWN_TICKS = 120; // ~2 seconds at 60fps
  const SNACK_PICKUP_TICKS = 60;
  const HAND_WASH_TICKS = 54;
  const DESK_SNACK_TICKS = 1200;
  const COMPLETION_BUBBLE_TICKS = 90;

  // ─── TEST HARNESS (disable/delete this block when tuning is done) ───────
  const TEST_HARNESS = {
    enabled: false,
    injectFakeHandoffs: false,
    fakeHandoffMs: 4200,
    fakeQueueLimit: 5,
    showPathOverlay: false,
    showPathLegend: false,
    fastAmbientMs: 60 * 1000,
  };
  const SNACK_BREAK_MS = TEST_HARNESS.enabled ? TEST_HARNESS.fastAmbientMs : 30 * 60 * 1000;
  const BATHROOM_BREAK_MS = TEST_HARNESS.enabled ? TEST_HARNESS.fastAmbientMs : 15 * 60 * 1000;

  // Visitor chairs in Michael's office (visitor side of desk).
  // If more than 3 agents come at once, the 4th waits in a standing spot.
  const MICHAEL_CHAIRS = [
    { x: 120, y: 128 },
    { x: 150, y: 128 },
    { x: 180, y: 128 },
  ];
  const MICHAEL_STANDING = { x: 200, y: 128 };
  const chairsOccupied = [null, null, null];
  const BREAKROOM_VISITOR_SEATS = [
    { x: 780, y: 48, room:'breakroom', face:'S' },
    { x: 810, y: 48, room:'breakroom', face:'S' },
    { x: 830, y: 48, room:'breakroom', face:'S' },
    { x: 780, y: 112, room:'breakroom', face:'N' },
    { x: 810, y: 112, room:'breakroom', face:'N' },
    { x: 830, y: 112, room:'breakroom', face:'N' },
  ];
  const BREAKROOM_STANDING_SPOTS = [
    { x: 764, y: 86, room:'breakroom', face:'E' },
    { x: 846, y: 86, room:'breakroom', face:'W' },
  ];
  const breakroomSeatsOccupied = new Map();
  const ANNEX_VISITOR_SEATS = [
    { x: 725, y: 190, room:'annex', face:'S' },
    { x: 760, y: 190, room:'annex', face:'S' },
    { x: 795, y: 190, room:'annex', face:'S' },
    { x: 725, y: 232, room:'annex', face:'N' },
    { x: 760, y: 232, room:'annex', face:'N' },
    { x: 795, y: 232, room:'annex', face:'N' },
  ];
  const ANNEX_STANDING_SPOTS = [
    { x: 844, y: 215, room:null, face:'W' },
  ];
  const annexSeatsOccupied = new Map();
  const KITCHEN_VISITOR_SEATS = [
    { x:625, y:198, room:'kitchen', face:'S' },
    { x:648, y:220, room:'kitchen', face:'W' },
    { x:625, y:244, room:'kitchen', face:'N' },
    { x:600, y:220, room:'kitchen', face:'E' },
  ];
  const kitchenSeatsOccupied = new Map();
  const LOBBY_COUCH_SEATS = [
    { x:18, y:112, room:'lobby', face:'E' },
    { x:18, y:136, room:'lobby', face:'E' },
  ];
  const LOBBY_STANDING_SPOTS = [
    { x:36, y:124, room:'lobby', face:'W' },
  ];
  const lobbySeatsOccupied = new Map();

  // ─── PALETTE ──────────────────────────────────────────────────
  const P = {
    wallBeige:'#EDE0D4', wallHL:'#F5EFE5', wallSH:'#C4B8A8',
    lino1:'#BAB0A0', lino2:'#B2A898', lino3:'#AAA090', linoHL:'#C2B8A8', linoSpeck:'#9E9488',
    tile1:'#CCC4B8', tile2:'#C4BCB0', tile3:'#D0C8BC', tileGrout:'#A89888', tileHL:'#D8D0C4',
    deskWood:'#A38B6A', deskSurface:'#B09878', deskEdge:'#8A7358',
    confTable:'#6B4E2A', confSurface:'#7D5C35',
    receptionDesk:'#8B7348', receptionTop:'#9E8660',
    doorWood:'#7A6A58', doorDark:'#5A4A38', doorKnob:'#C0A050',
  };

  const ROOMS = {
    lobby:     { x:6,   y:6,   w:54,  h:148 },
    michael:   { x:66,  y:6,   w:160, h:148 },
    conference:{ x:232, y:6,   w:176, h:148 },
    stairs:    { x:414, y:6,   w:250, h:172 },
    hallway:   { x:670, y:6,   w:50,  h:148 }, // annex corridor connecting stairs+breakroom
    breakroom: { x:720, y:6,   w:174, h:148 }, // shrunk to leave hallway
    kitchen:   { x:414, y:184, w:250, h:108 },
    annex:     { x:670, y:160, w:224, h:274 },
    darryl:    { x:268, y:298, w:140, h:136 },
    mens:      { x:414, y:298, w:122, h:136 },
    womens:    { x:542, y:298, w:122, h:136 },
  };

  // ─── FLOORS / WALLS helpers (ported from dunder-mifflin.jsx) ──
  function hash(x,y){let h=(x*374761393+y*668265263)|0;h=(h^(h>>13))*1274126177;return((h^(h>>16))>>>0)/4294967296;}
  function fillSolidCarpet(c,x,y,w,h,r,g,b){
    c.fillStyle=`rgb(${r},${g},${b})`;c.fillRect(x,y,w,h);
    for(let py=0;py<h;py++)for(let px=0;px<w;px++){const v=hash(x+px,y+py);
      if(v<0.15){c.fillStyle=`rgba(0,0,0,${0.01+v*0.04})`;c.fillRect(x+px,y+py,1,1);}
      else if(v>0.85){c.fillStyle=`rgba(255,255,255,${0.01+(1-v)*0.04})`;c.fillRect(x+px,y+py,1,1);}}
    for(let ty=y;ty<y+h;ty+=8)for(let tx=x;tx<x+w;tx+=8){const v=hash(tx*3+111,ty*3+222);
      if(v<0.2){c.fillStyle='rgba(0,0,0,0.02)';c.fillRect(tx,ty,8,8);}
      else if(v>0.8){c.fillStyle='rgba(255,255,255,0.02)';c.fillRect(tx,ty,8,8);}}
  }
  function fillColoredTile(c,x,y,w,h,r,g,b,sz=20){
    for(let ty=y;ty<y+h;ty+=sz)for(let tx=x;tx<x+w;tx+=sz){
      const tw=Math.min(sz,x+w-tx),th=Math.min(sz,y+h-ty);
      const v=hash(tx+50,ty+50),off=Math.floor(v*6)-3;
      c.fillStyle=`rgb(${r+off},${g+off},${b+off})`;c.fillRect(tx,ty,tw,th);
      if(v>0.75){c.fillStyle='rgba(255,255,255,0.06)';c.fillRect(tx+2,ty+2,tw-4,th-4);}}
    for(let ty=y;ty<=y+h;ty+=sz){c.fillStyle='rgba(0,0,0,0.08)';c.fillRect(x,ty,w,1);}
    for(let tx=x;tx<=x+w;tx+=sz){c.fillStyle='rgba(0,0,0,0.08)';c.fillRect(tx,y,1,h);}
  }
  function fillTile(c,x,y,w,h,sz=24){
    const colors=[P.tile1,P.tile2,P.tile3];
    for(let ty=y;ty<y+h;ty+=sz)for(let tx=x;tx<x+w;tx+=sz){
      const tw=Math.min(sz,x+w-tx),th=Math.min(sz,y+h-ty);
      const r=hash(tx,ty);
      c.fillStyle=colors[Math.floor(r*colors.length)];c.fillRect(tx,ty,tw,th);
      if(r>0.7){c.fillStyle=P.tileHL;c.globalAlpha=0.15;c.fillRect(tx+2,ty+2,tw-4,th-4);c.globalAlpha=1;}}
    for(let ty=y;ty<=y+h;ty+=sz){c.fillStyle=P.tileGrout;c.fillRect(x,ty,w,1);}
    for(let tx=x;tx<=x+w;tx+=sz){c.fillStyle=P.tileGrout;c.fillRect(tx,y,1,h);}
  }
  function fillLinoleum(c,x,y,w,h){
    c.fillStyle=P.lino1;c.fillRect(x,y,w,h);
    for(let py=0;py<h;py++)for(let px=0;px<w;px++){
      const r=hash(x+px,y+py);
      if(r<0.04){c.fillStyle=P.linoSpeck;c.fillRect(x+px,y+py,1,1);}
      else if(r<0.07){c.fillStyle=P.linoHL;c.fillRect(x+px,y+py,1,1);}
      else if(r<0.09){c.fillStyle=P.lino3;c.fillRect(x+px,y+py,1,1);}}
  }
  function wallH(c,x,y,w){c.fillStyle=P.wallBeige;c.fillRect(x,y,w,WALL);c.fillStyle=P.wallHL;c.fillRect(x,y,w,1.5);c.fillStyle=P.wallSH;c.fillRect(x,y+WALL-1.5,w,1.5);}
  function wallV(c,x,y,h){c.fillStyle=P.wallBeige;c.fillRect(x,y,WALL,h);c.fillStyle=P.wallHL;c.fillRect(x,y,1.5,h);c.fillStyle=P.wallSH;c.fillRect(x+WALL-1.5,y,1.5,h);}
  function doorH(c,x,y,w){c.fillStyle=P.doorDark;c.fillRect(x,y,w,WALL);c.fillStyle=P.doorWood;c.fillRect(x+1,y+1,w-2,WALL-2);c.fillStyle=P.doorKnob;c.fillRect(x+w-6,y+2,2,2);}
  function winH(c,x,y,w){c.fillStyle='rgba(150,190,220,0.5)';c.fillRect(x,y,w,WALL);c.fillStyle='rgba(180,210,240,0.3)';c.fillRect(x+1,y+1,w-2,WALL-2);c.fillStyle='rgba(255,255,255,0.15)';c.fillRect(x+2,y+1,Math.floor(w/3),2);}
  function winV(c,x,y,h){c.fillStyle='rgba(150,190,220,0.5)';c.fillRect(x,y,WALL,h);c.fillStyle='rgba(180,210,240,0.3)';c.fillRect(x+1,y+1,WALL-2,h-2);c.fillStyle='rgba(255,255,255,0.15)';c.fillRect(x+1,y+2,2,Math.floor(h/3));}

  function desk(c,x,y,w,h){c.fillStyle=P.deskEdge;c.fillRect(x,y+h-2,w,2);c.fillStyle=P.deskWood;c.fillRect(x,y,w,h-2);c.fillStyle=P.deskSurface;c.fillRect(x+2,y+2,w-4,h-6);}
  function label(c,text,x,y){c.fillStyle='rgba(255,255,255,0.22)';c.font='9px monospace';c.textAlign='center';c.fillText(text,x,y);c.textAlign='left';}

  // ─── FURNITURE HELPERS ──────────────────────────────────────────

  // Open doorway — floor-colored gap in a wall, with a subtle jamb
  function openDoorH(c, x, y, w) {
    // carve out the wall section visually
    c.fillStyle = 'rgba(0,0,0,0.15)';
    c.fillRect(x, y, w, WALL);
    c.fillStyle = P.doorWood;
    c.fillRect(x, y, 2, WALL);
    c.fillRect(x+w-2, y, 2, WALL);
  }
  function openDoorV(c, x, y, h) {
    c.fillStyle = 'rgba(0,0,0,0.15)';
    c.fillRect(x, y, WALL, h);
    c.fillStyle = P.doorWood;
    c.fillRect(x, y, WALL, 2);
    c.fillRect(x, y+h-2, WALL, 2);
  }
  // Actual hinged bathroom doors
  function bathDoor(c, x, y, w, leftSwing) {
    c.fillStyle = P.doorDark;
    c.fillRect(x, y, w, WALL);
    c.fillStyle = P.doorWood;
    c.fillRect(x+1, y+1, w-2, WALL-2);
    c.fillStyle = P.doorKnob;
    c.fillRect(x + (leftSwing ? w-4 : 2), y+2, 2, 2);
  }

  // Office swivel chair — small back + seat, hint of wheel base
  function officeChair(c, x, y, face) {
    c.save();
    c.translate(Math.round(x), Math.round(y));
    c.scale(CHAIR_SCALE, CHAIR_SCALE);
    // shadow
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(-5, 4, 10, 1);
    // seat
    c.fillStyle = '#2A2A2E';
    c.fillRect(-5, -1, 10, 5);
    c.fillStyle = '#3A3A40';
    c.fillRect(-4, 0, 8, 3);
    // back (depends on facing)
    c.fillStyle = '#1E1E22';
    if (face === 'N')      c.fillRect(-4, 3, 8, 2);   // back below seat (char faces north, looks at desk north)
    else if (face === 'S') c.fillRect(-4, -3, 8, 2);  // back above seat
    else if (face === 'E') c.fillRect(-6, -1, 2, 5);
    else                   c.fillRect(4, -1, 2, 5);
    // wheel hint
    c.fillStyle = 'rgba(0,0,0,0.4)';
    c.fillRect(-1, 4, 2, 1);
    c.restore();
  }

  // Padded visitor chair — matches Michael's-office style, reused for
  // kitchen / annex / conference / breakroom extras. Backrest sits on the
  // side OPPOSITE the seat's facing direction (so it looks like the chair
  // is pointing at whatever it faces).
  function woodChair(c, x, y, face) {
    c.save();
    c.translate(Math.round(x), Math.round(y));
    c.scale(CHAIR_SCALE, CHAIR_SCALE);
    // ground shadow
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(-6, 3, 12, 1);
    // backrest — opposite side of facing
    c.fillStyle = '#5A4A38';
    if (face === 'N')      c.fillRect(-6, 3, 12, 3);   // back at south
    else if (face === 'S') c.fillRect(-6, -6, 12, 3);  // back at north
    else if (face === 'E') c.fillRect(-7, -3, 3, 9);   // back at west
    else                   c.fillRect(4, -3, 3, 9);    // back at east
    // seat cushion
    c.fillStyle = '#7A6A58';
    c.fillRect(-5, -3, 10, 7);
    // subtle cushion highlight
    c.fillStyle = 'rgba(255,255,255,0.08)';
    c.fillRect(-4, -2, 8, 1);
    c.restore();
  }

  function visitorChair(c, x, y) {
    c.save();
    c.translate(Math.round(x), Math.round(y));
    c.scale(CHAIR_SCALE, CHAIR_SCALE);
    c.fillStyle = '#5A4A38';
    c.fillRect(-6, -8, 12, 3);
    c.fillStyle = '#7A6A58';
    c.fillRect(-6, -5, 12, 7);
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(-6, 2, 12, 1);
    c.fillStyle = 'rgba(255,255,255,0.08)';
    c.fillRect(-5, -4, 10, 1);
    c.restore();
  }

  // Couch (lobby / breakroom / women's room). Vertical or horizontal.
  function couch(c, x, y, len, vertical, color) {
    const body = color || '#7A5A8A'; // plum-ish (lobby)
    const edge = '#5A3E68';
    if (vertical) {
      c.fillStyle = edge;
      c.fillRect(x, y, 12, len);
      c.fillStyle = body;
      c.fillRect(x+1, y+1, 10, len-2);
      // top/bottom arms
      c.fillStyle = edge;
      c.fillRect(x+1, y+1, 10, 4);
      c.fillRect(x+1, y+len-5, 10, 4);
      // backrest against the wall, seat on the room side
      c.fillStyle = edge;
      c.fillRect(x+1, y+5, 3, len-10);
      c.fillStyle = body;
      c.fillRect(x+4, y+6, 6, len-12);
      // seat cushions and front edge highlight
      c.fillStyle = 'rgba(255,255,255,0.12)';
      for (let cy = y+9; cy < y+len-8; cy += 12) {
        c.fillRect(x+5, cy, 4, 2);
      }
      c.fillStyle = 'rgba(255,255,255,0.08)';
      c.fillRect(x+9, y+7, 1, len-14);
    } else {
      c.fillStyle = edge;
      c.fillRect(x, y, len, 12);
      c.fillStyle = body;
      c.fillRect(x+2, y+1, len-4, 10);
      c.fillStyle = 'rgba(255,255,255,0.08)';
      for (let cx = x+4; cx < x+len-4; cx += 14) {
        c.fillRect(cx, y+2, 2, 8);
      }
    }
  }

  // Potted plant (indoor tropical, 2 sizes)
  function plant(c, x, y, big) {
    const w = big ? 12 : 8;
    const h = big ? 14 : 10;
    // pot
    c.fillStyle = '#6A3A1E';
    c.fillRect(x-w/2, y, w, 4);
    c.fillStyle = '#8A4A2A';
    c.fillRect(x-w/2+1, y+1, w-2, 2);
    // foliage
    c.fillStyle = '#2A5A2A';
    c.fillRect(x-w/2+1, y-h+4, w-2, h-4);
    c.fillStyle = '#3A7A3A';
    c.fillRect(x-w/2+2, y-h+5, 2, 2);
    c.fillRect(x-2, y-h+6, 2, 2);
    c.fillRect(x+w/2-3, y-h+5, 2, 2);
    c.fillStyle = '#4A8A4A';
    c.fillRect(x-1, y-h+4, 2, 2);
  }

  // Kitchen counter segment (top-down)
  function counter(c, x, y, w, h) {
    c.fillStyle = '#B8B0A0';  // counter edge
    c.fillRect(x, y, w, h);
    c.fillStyle = '#CCC4B4';  // counter top
    c.fillRect(x+1, y+1, w-2, h-2);
    c.fillStyle = 'rgba(255,255,255,0.1)';
    c.fillRect(x+2, y+2, w-4, 1);
  }
  function fridge(c, x, y) {
    c.fillStyle = '#E8E4DC';
    c.fillRect(x, y, 18, 28);
    c.fillStyle = '#F5F2EC';
    c.fillRect(x+1, y+1, 16, 26);
    c.fillStyle = '#BBB5A8';
    c.fillRect(x+1, y+12, 16, 1); // door split
    // handles
    c.fillStyle = '#8A8A8E';
    c.fillRect(x+14, y+5, 2, 4);
    c.fillRect(x+14, y+17, 2, 4);
  }
  function sink(c, x, y) {
    c.fillStyle = '#8A8A90';
    c.fillRect(x, y, 18, 12);
    c.fillStyle = '#5A5A60';
    c.fillRect(x+2, y+2, 14, 8);
    // faucet
    c.fillStyle = '#C0C0C8';
    c.fillRect(x+8, y-3, 2, 5);
    c.fillRect(x+7, y, 4, 1);
  }
  function microwave(c, x, y) {
    c.fillStyle = '#1A1A1A';
    c.fillRect(x, y, 18, 10);
    c.fillStyle = '#3A3A3D';
    c.fillRect(x+1, y+1, 13, 8); // window
    c.fillStyle = '#5A5A60';
    c.fillRect(x+15, y+1, 2, 8); // control panel
    c.fillStyle = '#FFB040'; // orange glow
    c.fillRect(x+2, y+2, 2, 2);
  }
  function coffeeMaker(c, x, y) {
    c.fillStyle = '#2A2A2A';
    c.fillRect(x, y, 10, 12);
    c.fillStyle = '#5A2A1E';
    c.fillRect(x+2, y+5, 6, 5); // carafe of coffee
    c.fillStyle = '#FFB040';
    c.fillRect(x+1, y+1, 2, 1); // power LED
  }
  function vendingMachine(c, x, y) {
    c.fillStyle = '#8A1A1A';
    c.fillRect(x, y, 20, 28);
    c.fillStyle = '#B02A2A';
    c.fillRect(x+1, y+1, 18, 26);
    c.fillStyle = '#3A3A3D';
    c.fillRect(x+2, y+3, 16, 14); // window
    // items
    c.fillStyle = '#F0D040'; c.fillRect(x+3, y+5, 3, 3);
    c.fillStyle = '#40D0A0'; c.fillRect(x+7, y+5, 3, 3);
    c.fillStyle = '#D0408A'; c.fillRect(x+11, y+5, 3, 3);
    c.fillStyle = '#4A90E8'; c.fillRect(x+3, y+10, 3, 3);
    c.fillStyle = '#F0A040'; c.fillRect(x+7, y+10, 3, 3);
    // coin slot
    c.fillStyle = '#1A1A1A';
    c.fillRect(x+14, y+19, 3, 2);
  }

  // Toilet (top-down)
  function toilet(c, x, y, face='S') {
    c.fillStyle = '#F5F5F5';
    c.fillRect(x-4, y, 8, 10);   // bowl
    if (face === 'N') c.fillRect(x-3, y+10, 6, 4);  // tank below bowl
    else c.fillRect(x-3, y-4, 6, 4);                // tank above bowl
    c.fillStyle = '#D0D0D0';
    c.fillRect(x-3, y+2, 6, 6);  // bowl interior
    c.fillStyle = '#A0A0A0';
    if (face === 'N') c.fillRect(x+2, y+11, 1, 2);
    else c.fillRect(x+2, y-3, 1, 2);  // flush lever
  }
  // Wall-mounted sink (bathroom)
  function bathSink(c, x, y, face='S') {
    if (face === 'E') {
      c.fillStyle = '#E8E8E8';
      c.fillRect(x, y-5, 5, 10);
      c.fillStyle = '#B8B8B8';
      c.fillRect(x+1, y-4, 3, 8);
      c.fillStyle = '#C0C0C8';
      c.fillRect(x-2, y, 2, 1);  // faucet
      return;
    }
    if (face === 'W') {
      c.fillStyle = '#E8E8E8';
      c.fillRect(x-5, y-5, 5, 10);
      c.fillStyle = '#B8B8B8';
      c.fillRect(x-4, y-4, 3, 8);
      c.fillStyle = '#C0C0C8';
      c.fillRect(x, y, 2, 1);  // faucet
      return;
    }
    c.fillStyle = '#E8E8E8';
    c.fillRect(x-5, y, 10, 5);
    c.fillStyle = '#B8B8B8';
    c.fillRect(x-4, y+1, 8, 3);
    c.fillStyle = '#C0C0C8';
    c.fillRect(x, y-2, 1, 2);  // faucet
  }
  function urinal(c, x, y) {
    c.fillStyle = '#EAEAEA';
    c.fillRect(x-3, y, 6, 6);
    c.fillStyle = '#C8C8D0';
    c.fillRect(x-2, y+1, 4, 4);
  }
  // Roses in a vase (women's bathroom decor)
  function roseVase(c, x, y) {
    c.fillStyle = '#8A5A3A'; // vase
    c.fillRect(x-2, y, 4, 5);
    c.fillStyle = '#D8A4B8'; // roses
    c.fillRect(x-3, y-4, 6, 4);
    c.fillStyle = '#F0C0D0';
    c.fillRect(x-1, y-4, 2, 2);
    c.fillStyle = '#2A5A2A';
    c.fillRect(x-2, y-1, 1, 1);
    c.fillRect(x+1, y-1, 1, 1);
  }

  // Red stairs (top-down, with handrail)
  function redStairs(c, x, y, w, h) {
    // base riser color
    c.fillStyle = '#8A1A1A';
    c.fillRect(x, y, w, h);
    // steps — horizontal bands alternating red + darker red
    for (let i = 0; i < 10; i++) {
      const sy = y + (h * i / 10);
      c.fillStyle = (i % 2 === 0) ? '#A02A2A' : '#6A1010';
      c.fillRect(x+2, sy, w-4, h/10);
      c.fillStyle = 'rgba(255,255,255,0.08)';
      c.fillRect(x+2, sy, w-4, 1);
    }
    // handrail
    c.fillStyle = '#3A2818';
    c.fillRect(x+w-4, y, 2, h);
  }

  // Generic filing cabinet
  function filing(c, x, y) {
    c.fillStyle = '#6A5A48';
    c.fillRect(x, y, 14, 20);
    c.fillStyle = '#8A7A68';
    c.fillRect(x+1, y+1, 12, 18);
    c.fillStyle = '#5A4A38';
    c.fillRect(x+1, y+6, 12, 1);
    c.fillRect(x+1, y+12, 12, 1);
    c.fillStyle = '#C0A050';
    c.fillRect(x+6, y+3, 2, 1);
    c.fillRect(x+6, y+9, 2, 1);
    c.fillRect(x+6, y+15, 2, 1);
  }
  // Whiteboard / cork board
  function whiteboard(c, x, y, w, h) {
    c.fillStyle = '#3A3A3D';
    c.fillRect(x, y, w, h);
    c.fillStyle = '#F5F5F0';
    c.fillRect(x+1, y+1, w-2, h-2);
    // scribbles
    c.fillStyle = '#4A90E8';
    c.fillRect(x+3, y+2, 4, 1);
    c.fillStyle = '#D03A3A';
    c.fillRect(x+3, y+4, 3, 1);
    c.fillRect(x+w-6, y+3, 2, 1);
  }
  // Round table (kitchen or conference accent)
  function roundTable(c, x, y, r) {
    c.fillStyle = '#4A3020';
    c.beginPath(); c.arc(x, y, r, 0, Math.PI*2); c.fill();
    c.fillStyle = '#6B4E2A';
    c.beginPath(); c.arc(x, y, r-1, 0, Math.PI*2); c.fill();
    c.fillStyle = '#7D5C35';
    c.beginPath(); c.arc(x, y, r-3, 0, Math.PI*2); c.fill();
  }

  // Desk props — tiny detail on each desk so characters are recognizable
  const PROPS = {
    user_mug:      (c,x,y) => { c.fillStyle='#FFFFFF'; c.fillRect(x-2,y-2,5,4); c.fillStyle='#1A1A1A'; c.fillRect(x-1,y-1,3,2); }, // WORLD'S BEST BOSS mug
    phone:         (c,x,y) => { c.fillStyle='#1A1A1A'; c.fillRect(x-3,y-1,7,3); c.fillStyle='#3A3A3D'; c.fillRect(x-2,y,5,1); c.fillStyle='#2A2A2E'; c.fillRect(x-4,y-2,2,2); },
    bobblehead:    (c,x,y) => { c.fillStyle='#C9A227'; c.fillRect(x-2,y-3,4,2); c.fillStyle='#E8C4A0'; c.fillRect(x-1,y-4,3,2); }, // Dwight bobblehead
    sketchbook:    (c,x,y) => { c.fillStyle='#F5EDD8'; c.fillRect(x-3,y-1,6,3); c.fillStyle='#2A2A2E'; c.fillRect(x-2,y,4,1); },
    clipboard:     (c,x,y) => { c.fillStyle='#8A6A3A'; c.fillRect(x-2,y-3,5,5); c.fillStyle='#F5F5F0'; c.fillRect(x-1,y-2,3,3); c.fillStyle='#C0A050'; c.fillRect(x-1,y-3,2,1); },
    banjo:         (c,x,y) => { c.fillStyle='#6A3A1E'; c.fillRect(x-1,y-3,3,4); c.fillStyle='#F5EDD8'; c.fillRect(x,y-1,1,1); },
    crossword:     (c,x,y) => { c.fillStyle='#F5F5F0'; c.fillRect(x-3,y-2,6,4); c.fillStyle='#1A1A1A'; for(let i=0;i<3;i++)for(let j=0;j<2;j++)if((i+j)%2)c.fillRect(x-3+i*2,y-2+j*2,2,2);},
    yarn:          (c,x,y) => { c.fillStyle='#A84A6A'; c.fillRect(x-2,y-2,4,4); c.fillStyle='#E86A8A'; c.fillRect(x-1,y-1,2,2); },
    cat:           (c,x,y) => { c.fillStyle='#4A3020'; c.fillRect(x-2,y-2,4,3); c.fillRect(x-2,y-3,1,1); c.fillRect(x+1,y-3,1,1); c.fillStyle='#A84A6A'; c.fillRect(x-1,y-1,1,1); },
    chili:         (c,x,y) => { c.fillStyle='#2A8A2A'; c.fillRect(x-3,y-2,6,4); c.fillStyle='#B03A2A'; c.fillRect(x-2,y-1,4,2); },
    calc:          (c,x,y) => { c.fillStyle='#1A1A1A'; c.fillRect(x-2,y-3,4,5); c.fillStyle='#5AC090'; c.fillRect(x-1,y-2,2,1); c.fillStyle='#3A3A3D'; for(let i=0;i<2;i++)c.fillRect(x-1+i,y,1,1); },
    sprouts:       (c,x,y) => { c.fillStyle='#F5F0E0'; c.fillRect(x-2,y-2,4,4); c.fillStyle='#6AA04A'; c.fillRect(x-1,y-3,2,2); },
    solocup:       (c,x,y) => { c.fillStyle='#D02A2A'; c.fillRect(x-2,y-3,4,4); c.fillStyle='#F0F0F0'; c.fillRect(x-2,y-3,4,1); },
    flipphone:     (c,x,y) => { c.fillStyle='#D03A8A'; c.fillRect(x-2,y-3,4,5); c.fillStyle='#1A1A1A'; c.fillRect(x-1,y-2,2,2); },
    folder:        (c,x,y) => { c.fillStyle='#C9A050'; c.fillRect(x-3,y-2,6,4); c.fillStyle='#8A7040'; c.fillRect(x-3,y-2,6,1); },
    forkliftkey:   (c,x,y) => { c.fillStyle='#C0A050'; c.fillRect(x-2,y-2,4,2); c.fillRect(x-1,y,1,3); },
    headset:       (c,x,y) => { c.fillStyle='#1A1A1A'; c.fillRect(x-3,y-2,6,1); c.fillRect(x-3,y-2,1,3); c.fillRect(x+2,y-2,1,3); },
    dvdcase:       (c,x,y) => { c.fillStyle='#1A1A1A'; c.fillRect(x-3,y-3,6,5); c.fillStyle='#D02A2A'; c.fillRect(x-2,y-2,4,3); },
    wineglass:     (c,x,y) => { c.fillStyle='#E8E8EC'; c.fillRect(x-1,y-3,3,4); c.fillStyle='#6A1A2A'; c.fillRect(x,y-2,1,2); },
    hotpinkphone:  (c,x,y) => { c.fillStyle='#E83A8A'; c.fillRect(x-2,y-3,4,5); c.fillStyle='#1A1A1A'; c.fillRect(x-1,y-2,2,2); },
    book:          (c,x,y) => { c.fillStyle='#2A4A8A'; c.fillRect(x-3,y-2,6,4); c.fillStyle='#F5F0E0'; c.fillRect(x-2,y-1,4,2); },
    report:        (c,x,y) => { c.fillStyle='#F5F5F0'; c.fillRect(x-3,y-2,6,4); c.fillStyle='#1A1A1A'; for(let i=0;i<3;i++)c.fillRect(x-2,y-1+i*1,4,0.5); },
  };


  // Desk definitions: position + chair + which way they sit + prop
  // Chair positions are arranged so each character sits at the correct side
  // of their desk, matching show orientation and no two chairs overlap.
  const DESKS = [
    // Bullpen cluster 1 (Jim top-horizontal, Erin left-vertical, Dwight right-vertical)
    { name:'Jim',      dx:125, dy:188, dw:68, dh:24, chair:{x:159,y:181,face:'S'}, prop:{key:'headset', x:140, y:196}, labelX:159, labelY:184 },
    { name:'Erin',     dx:125, dy:218, dw:30, dh:54, chair:{x:119,y:245,face:'E'}, prop:{key:'headset', x:140, y:245}, labelX:140, labelY:214 },
    { name:'Dwight',   dx:161, dy:218, dw:30, dh:54, chair:{x:197,y:245,face:'W'}, prop:{key:'bobblehead', x:176, y:225}, labelX:176, labelY:214 },
    // Bullpen cluster 2 (Andy top, Phyllis left, Stanley right)
    { name:'Andy',     dx:245, dy:188, dw:68, dh:24, chair:{x:279,y:181,face:'S'}, prop:{key:'banjo', x:260, y:196}, labelX:279, labelY:184 },
    { name:'Phyllis',  dx:245, dy:218, dw:30, dh:54, chair:{x:239,y:245,face:'E'}, prop:{key:'yarn', x:260, y:245}, labelX:260, labelY:214 },
    { name:'Stanley',  dx:281, dy:218, dw:30, dh:54, chair:{x:317,y:245,face:'W'}, prop:{key:'crossword', x:296, y:225}, labelX:296, labelY:214 },
    // Lower bullpen — Meredith faces Creed (east), Creed faces Meredith (west)
    { name:'Meredith', dx:155, dy:358, dw:30, dh:54, chair:{x:148,y:385,face:'E'}, prop:{key:'solocup', x:170, y:385}, labelX:170, labelY:354 },
    { name:'Creed',    dx:191, dy:358, dw:30, dh:54, chair:{x:227,y:385,face:'W'}, prop:{key:'sprouts', x:206, y:385}, labelX:206, labelY:354 },
    // Accounting triangle — Angela/Kevin face each other, Oscar looks west
    { name:'Angela',   dx:12,  dy:325, dw:54, dh:24, chair:{x:39,y:318,face:'S'},  prop:{key:'cat', x:56, y:333}, labelX:39, labelY:341 },
    { name:'Kevin',    dx:12,  dy:355, dw:54, dh:24, chair:{x:39,y:386,face:'N'},  prop:{key:'chili', x:30, y:363}, labelX:39, labelY:371 },
    { name:'Oscar',    dx:72,  dy:325, dw:30, dh:54, chair:{x:108,y:352,face:'W'}, prop:{key:'calc', x:87, y:352}, labelX:87, labelY:320 },
    // Darryl's office
    { name:'Darryl',   dx:310, dy:345, dw:65, dh:30, chair:{x:342,y:382,face:'N'}, prop:{key:'forkliftkey', x:328, y:353}, labelX:342, labelY:340 },
    // Annex (Toby top, Ryan looks up at Toby, Kelly looks south, Holly bottom)
    { name:'Toby',     dx:862, dy:215, dw:24, dh:52, chair:{x:855,y:241,face:'E'}, prop:{key:'folder', x:872, y:235}, labelX:874, labelY:210 },
    { name:'Ryan',     dx:830, dy:270, dw:56, dh:24, chair:{x:858,y:303,face:'N'}, prop:{key:'flipphone', x:852, y:278}, labelX:812, labelY:284 },
    { name:'Kelly',    dx:830, dy:338, dw:56, dh:24, chair:{x:858,y:332,face:'S'}, prop:{key:'hotpinkphone', x:852, y:346}, labelX:812, labelY:352 },
    { name:'Holly',    dx:862, dy:365, dw:24, dh:52, chair:{x:855,y:391,face:'E'}, prop:{key:'clipboard', x:872, y:383}, labelX:844, labelY:391 },
  ];

  const STATIC_NAV_BLOCKS = [
    { x:8,   y:198, w:50,  h:40, pad:4 },  // Pam reception L desk footprint
    { x:110, y:65,  w:80,  h:34, pad:6 },  // Michael desk
    { x:272, y:48,  w:96,  h:52, pad:8 },  // Conference table
    { x:262, y:292, w:44,  h:30, pad:2 },  // Darryl office top-left wall corner
    { x:416, y:190, w:176, h:14, pad:6 },  // Kitchen counter run
    { x:607, y:202, w:36,  h:36, pad:9 },  // Kitchen round table
    { x:770, y:60,  w:70,  h:40, pad:8 },  // Breakroom table
    { x:710, y:196, w:100, h:30, pad:8 },  // Annex table
  ];

  const STATIC_NAV_CHAIRS = [
    ...MICHAEL_CHAIRS,
    { x:290, y:42 }, { x:320, y:42 }, { x:350, y:42 },
    { x:290, y:108 }, { x:320, y:108 }, { x:350, y:108 },
    { x:264, y:75 }, { x:376, y:75 },
    { x:274, y:144 }, { x:296, y:144 }, { x:318, y:144 }, { x:392, y:144 },
    { x:625, y:198 }, { x:648, y:220 }, { x:625, y:244 }, { x:600, y:220 },
    { x:780, y:48 }, { x:810, y:48 }, { x:830, y:48 },
    { x:780, y:112 }, { x:810, y:112 }, { x:830, y:112 },
    { x:725, y:190 }, { x:760, y:190 }, { x:795, y:190 },
    { x:725, y:232 }, { x:760, y:232 }, { x:795, y:232 },
  ];

  const NAV_BLOCKS = [
    ...STATIC_NAV_BLOCKS,
    ...DESKS.map(d => ({ x:d.dx, y:d.dy, w:d.dw, h:d.dh, pad:6 })),
    ...DESKS.filter(d => d.chair).map(d => ({ x:d.chair.x - 7, y:d.chair.y - 7, w:14, h:14, pad:2 })),
    ...STATIC_NAV_CHAIRS.map(ch => ({ x:ch.x - 7, y:ch.y - 7, w:14, h:14, pad:2 })),
  ];

  // ─── RENDER STATIC BACKGROUND ─────────────────────────────────
  function renderBackground(c) {
    const R = ROOMS;

    // ─── FLOORS ────────────────────────────────────────────────
    fillSolidCarpet(c, WALL, WALL, W-WALL*2, H-WALL*2, 172,172,170);
    fillTile(c, R.lobby.x, R.lobby.y, R.lobby.w, 68, 20);
    fillSolidCarpet(c, R.lobby.x, 80, R.lobby.w, 74, 172,172,170);
    fillSolidCarpet(c, R.michael.x, R.michael.y, R.michael.w, R.michael.h, 82,86,96);
    fillSolidCarpet(c, R.conference.x, R.conference.y, R.conference.w, R.conference.h, 168,165,170);
    fillTile(c, R.stairs.x, R.stairs.y, R.stairs.w, R.stairs.h, 28);
    // Hallway between stairs and breakroom, carpet shared with annex
    fillSolidCarpet(c, R.hallway.x, R.hallway.y, R.hallway.w, R.hallway.h, 170,170,168);
    fillLinoleum(c, R.breakroom.x, R.breakroom.y, R.breakroom.w, R.breakroom.h);
    fillLinoleum(c, R.kitchen.x, R.kitchen.y, R.kitchen.w, R.kitchen.h);
    fillSolidCarpet(c, R.annex.x, R.annex.y, R.annex.w, R.annex.h, 170,170,168);
    fillSolidCarpet(c, R.darryl.x, R.darryl.y, R.darryl.w, R.darryl.h, 84,88,98);
    fillColoredTile(c, R.mens.x, R.mens.y, R.mens.w, R.mens.h, 185,200,215, 18);
    fillColoredTile(c, R.womens.x, R.womens.y, R.womens.w, R.womens.h, 235,208,205, 18);

    // ─── OUTER WALLS ───────────────────────────────────────────
    wallH(c,0,0,W); wallH(c,0,H-WALL,W); wallV(c,0,0,H); wallV(c,W-WALL,0,H);

    // ─── VERTICAL INTERNAL WALLS ───────────────────────────────
    wallV(c, 60,  0, 160);
    wallV(c, 226, 0, 160);
    wallV(c, 408, 0, H);
    wallV(c, 664, 0, H);
    wallV(c, 720, 0, 160);               // hallway / breakroom divider (top only)
    wallV(c, 536, 298, 136+WALL);
    wallV(c, 262, 292, H-292);

    // ─── HORIZONTAL INTERNAL WALLS ─────────────────────────────
    wallH(c, 60,  154, 354);
    wallH(c, 408, 178, 256);             // stairs south
    wallH(c, 720, 154, 174);             // breakroom south (shrunk to new width)
    wallH(c, 262, 292, 408);

    // ─── WINDOWS ───────────────────────────────────────────────
    winH(c,126,0,40);
    winV(c,60,80,28); winV(c,60,118,28);
    winH(c,260,0,38); winH(c,335,0,38);
    winV(c,408,216,30); winV(c,664,216,30);
    winH(c,452,292,38); winH(c,580,292,38);
    winH(c,780,0,40);                    // breakroom north window
    winH(c,676,0,16); winH(c,700,0,16);  // 2 windows over the annex hallway / chair area

    // ─── DOORS ─────────────────────────────────────────────────
    // Always-open doorways (floor-colored gaps in wall)
    openDoorH(c, 186, 154, 28);          // michael south
    openDoorH(c, 242, 154, 28);          // conference south
    openDoorV(c, 664, 60,  22);          // stairs east → hallway (stairs door)
    openDoorV(c, 720, 90,  24);          // breakroom west → hallway
    openDoorV(c, 408, 266, 24);          // bullpen → kitchen
    openDoorV(c, 664, 266, 24);          // kitchen east → annex
    openDoorH(c, 306, 292, 22);          // darryl north
    // Actual hinged bathroom doors (always drawn shut-looking, the sim just opens them)
    bathDoor(c, 462, 292, 20, false);    // mens
    bathDoor(c, 590, 292, 20, true);     // womens

    // ─── LOBBY ─────────────────────────────────────────────────
    // Couch flush against the left wall, moved down from the entrance
    couch(c, 8, 95, 56, true, '#D4B48A');
    // Little couch armchair tucked under Michael's office south-west corner,
    // with a side table to its right (also a possible hangout spot for roamers)
    c.fillStyle = '#A88A68';  // armchair backrest
    c.fillRect(58, 162, 18, 4);
    c.fillStyle = '#D4B48A';  // seat cushion (matches couch)
    c.fillRect(58, 166, 18, 10);
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(58, 176, 18, 1);
    c.fillStyle = 'rgba(255,255,255,0.1)';
    c.fillRect(60, 168, 14, 1);
    // Small round side table next to the armchair
    roundTable(c, 84, 170, 6);
    // Plants separated: one at each side of the top lobby
    plant(c, 14, 24, true);
    plant(c, 50, 24, false);
    // Welcome mat
    c.fillStyle = '#4A3020';
    c.fillRect(14, 48, 40, 10);
    c.fillStyle = '#8A6A3A';
    c.fillRect(16, 50, 36, 6);
    // "Fake" top entrance door (always open — it's the elevators out there)
    c.fillStyle = 'rgba(10,10,14,0.35)';
    c.fillRect(20, 0, 26, WALL);
    c.fillStyle = P.doorWood;
    c.fillRect(20, 0, 2, WALL);
    c.fillRect(44, 0, 2, WALL);
    // Above-door EXIT arrow (subtle)
    c.fillStyle = 'rgba(42,138,42,0.6)';
    c.fillRect(29, 8, 8, 3);

    // ─── PAM'S RECEPTION (L-shaped corner desk) ────────────────
    // The main counter wraps from her sitting spot out toward lobby
    // Horizontal segment along the lobby-facing side
    c.fillStyle = P.receptionDesk;
    c.fillRect(8,  198, 50, 10);
    c.fillStyle = P.receptionTop;
    c.fillRect(9,  199, 48, 7);
    // Vertical segment extending south (L shape)
    c.fillStyle = P.receptionDesk;
    c.fillRect(48, 198, 10, 40);
    c.fillStyle = P.receptionTop;
    c.fillRect(49, 199, 8, 38);
    // Decorative edge highlight
    c.fillStyle = 'rgba(255,255,255,0.1)';
    c.fillRect(9, 199, 48, 1);
    c.fillRect(49, 200, 1, 37);
    // Pam's sketchbook prop
    PROPS.sketchbook(c, 25, 203);
    PROPS.phone(c, 48, 204);
    label(c,'Pam',15,220);
    // Pam's swivel chair (behind the horizontal segment of the L desk)
    officeChair(c, 32, 215, 'S');

    // ─── MICHAEL'S OFFICE ──────────────────────────────────────
    desk(c,110,65,80,34); label(c,'You',150,86);
    PROPS.user_mug(c, 175, 76);
    PROPS.report(c, 125, 78);
    // Michael's own chair (behind desk)
    officeChair(c, 150, 58, 'S');
    // Visitor couch chairs on the visitor side of the desk
    for (const ch of MICHAEL_CHAIRS) {
      visitorChair(c, ch.x, ch.y);
    }
    // Filing cabinet + whiteboard in the office
    filing(c, 210, 20);
    whiteboard(c, 70, 14, 38, 16);
    plant(c, 80, 140, false);

    // ─── CONFERENCE ROOM ───────────────────────────────────────
    // Shrunk the table so we can fit chairs around it
    c.fillStyle=P.confTable; c.fillRect(272,48,96,52);
    c.fillStyle=P.confSurface; c.fillRect(275,51,90,46);
    label(c,'Conf. Table',320,78);
    // Chairs around the table
    for (const x of [290, 320, 350]) woodChair(c, x, 42, 'S'); // north side
    for (const x of [290, 320, 350]) woodChair(c, x, 108, 'N'); // south side
    woodChair(c, 264, 75, 'E'); // west end
    woodChair(c, 376, 75, 'W'); // east end
    // Row of chairs along bottom wall
    for (const x of [274, 296, 318, 392]) woodChair(c, x, 144, 'N');
    // Whiteboard on east wall
    whiteboard(c, 395, 50, 10, 30);
    plant(c, 244, 18, false);

    // ─── STAIRS ROOM (with red steps) ──────────────────────────
    redStairs(c, 430, 30, 30, 130);
    redStairs(c, 480, 30, 30, 130);
    // Handrails between them
    c.fillStyle = '#3A2818';
    c.fillRect(460, 30, 2, 130);
    c.fillRect(510, 30, 2, 130);
    // "EXIT" sign
    c.fillStyle = '#2A8A2A';
    c.fillRect(540, 30, 22, 10);
    c.fillStyle = '#F5F5F0';
    c.font = 'bold 7px monospace';
    c.textAlign = 'center';
    c.fillText('EXIT', 551, 38);
    c.textAlign = 'left';
    // DUNDER MIFFLIN standing sign — metal feet + panel, next to exit
    // metal feet
    c.fillStyle = '#6A6A72';
    c.fillRect(543, 128, 2, 8);
    c.fillRect(561, 128, 2, 8);
    c.fillStyle = '#3A3A40';
    c.fillRect(542, 135, 4, 2);
    c.fillRect(560, 135, 4, 2);
    // sign post + panel
    c.fillStyle = '#4A4A50';
    c.fillRect(551, 96, 2, 34);
    c.fillStyle = '#2C6EAE';    // DM blue
    c.fillRect(534, 96, 38, 22);
    c.fillStyle = '#1A4E80';
    c.fillRect(534, 96, 38, 1);
    c.fillRect(534, 117, 38, 1);
    c.fillStyle = '#F5F5F0';
    c.font = 'bold 6px monospace';
    c.textAlign = 'center';
    c.fillText('DUNDER', 553, 106);
    c.fillText('MIFFLIN', 553, 114);
    c.textAlign = 'left';
    // frame edges
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(534, 118, 38, 1);

    // ─── KITCHEN ───────────────────────────────────────────────
    // Counter along the shortened top-left section (fridge + sink + appliances)
    counter(c, 416, 190, 176, 14);
    fridge(c, 420, 188);
    sink(c, 470, 192);
    coffeeMaker(c, 500, 192);
    microwave(c, 520, 194);
    counter(c, 544, 190, 48, 14);  // free counter space
    // Round kitchen table moved UP into the top-right area (where vending was)
    roundTable(c, 625, 220, 18);
    woodChair(c, 625, 198, 'S');
    woodChair(c, 648, 220, 'W');
    woodChair(c, 625, 244, 'N');
    woodChair(c, 600, 220, 'E');

    // ─── BREAKROOM ─────────────────────────────────────────────
    // Table in middle
    c.fillStyle = '#6B4E2A';
    c.fillRect(770, 60, 70, 40);
    c.fillStyle = '#7D5C35';
    c.fillRect(773, 63, 64, 34);
    // Chairs
    woodChair(c, 780, 48, 'S');
    woodChair(c, 810, 48, 'S');
    woodChair(c, 830, 48, 'S');
    woodChair(c, 780, 112, 'N');
    woodChair(c, 810, 112, 'N');
    woodChair(c, 830, 112, 'N');
    // Counter area with vending machine
    counter(c, 728, 20, 40, 12);
    vendingMachine(c, 868, 20);
    plant(c, 870, 140, false);

    // ─── ANNEX ─────────────────────────────────────────────────
    // Big annex meeting table near top, with gap from breakroom wall
    c.fillStyle = '#6B4E2A';
    c.fillRect(710, 196, 100, 30);
    c.fillStyle = '#7D5C35';
    c.fillRect(713, 199, 94, 24);
    // Chairs around annex table
    woodChair(c, 725, 190, 'S');
    woodChair(c, 760, 190, 'S');
    woodChair(c, 795, 190, 'S');
    woodChair(c, 725, 232, 'N');
    woodChair(c, 760, 232, 'N');
    woodChair(c, 795, 232, 'N');
    // Hallway decoration — moved to the very top so it doesn't block the path
    plant(c, 695, 24, false);

    // ─── DARRYL'S OFFICE ───────────────────────────────────────
    // Big wall calendar (his clipboard schedule style)
    whiteboard(c, 272, 306, 32, 20);
    // Filing
    filing(c, 380, 350);
    plant(c, 395, 420, false);

    // ─── MEN'S BATHROOM ────────────────────────────────────────
    // Bottom stalls — equal width, open to the room
    c.fillStyle = P.wallBeige;
    c.fillRect(408, 406, 22, 28);
    c.fillRect(516, 406, 20, 28);
    c.fillStyle = P.wallBeige;
    c.fillRect(408, 404, 22, 2);
    c.fillRect(516, 404, 20, 2);
    c.fillStyle = '#F1EEE6';
    c.fillRect(430, 404, 2, 30);
    c.fillRect(458, 404, 2, 30);
    c.fillRect(486, 404, 2, 30);
    c.fillRect(514, 404, 2, 30);
    c.fillStyle = P.wallBeige;
    c.fillRect(408, 404, WALL, 30);
    c.fillStyle = P.wallHL;
    c.fillRect(408, 404, 1.5, 30);
    c.fillStyle = P.wallSH;
    c.fillRect(408 + WALL - 1.5, 404, 1.5, 30);
    c.fillStyle = 'rgba(0,0,0,0.12)';
    c.fillRect(408, 405, 22, 1);
    c.fillRect(516, 405, 20, 1);
    c.fillRect(431, 404, 1, 30);
    c.fillRect(459, 404, 1, 30);
    c.fillRect(487, 404, 1, 30);
    c.fillRect(515, 404, 1, 30);
    toilet(c, 444, 418, 'N');
    toilet(c, 472, 418, 'N');
    toilet(c, 500, 418, 'N');
    // Sinks along west wall
    bathSink(c, 420, 334, 'E');
    bathSink(c, 420, 356, 'E');
    bathSink(c, 420, 378, 'E');
    // Urinals along east wall
    urinal(c, 528, 325);
    urinal(c, 528, 345);
    urinal(c, 528, 365);
    // Plants beside the entrance
    plant(c, 446, 304, false);
    plant(c, 498, 304, false);

    // ─── WOMEN'S BATHROOM ──────────────────────────────────────
    // Bottom stalls — mirrored from men's room, open to the room
    c.fillStyle = P.wallBeige;
    c.fillRect(536, 406, 22, 28);
    c.fillRect(644, 406, 20, 28);
    c.fillStyle = P.wallBeige;
    c.fillRect(536, 404, 22, 2);
    c.fillRect(644, 404, 20, 2);
    c.fillStyle = '#F1EEE6';
    c.fillRect(558, 404, 2, 30);
    c.fillRect(586, 404, 2, 30);
    c.fillRect(614, 404, 2, 30);
    c.fillRect(642, 404, 2, 30);
    c.fillStyle = P.wallBeige;
    c.fillRect(664, 404, WALL, 30);
    c.fillStyle = P.wallHL;
    c.fillRect(664, 404, 1.5, 30);
    c.fillStyle = P.wallSH;
    c.fillRect(664 + WALL - 1.5, 404, 1.5, 30);
    c.fillStyle = 'rgba(0,0,0,0.12)';
    c.fillRect(536, 405, 22, 1);
    c.fillRect(644, 405, 20, 1);
    c.fillRect(559, 404, 1, 30);
    c.fillRect(587, 404, 1, 30);
    c.fillRect(615, 404, 1, 30);
    c.fillRect(643, 404, 1, 30);
    toilet(c, 572, 418, 'N');
    toilet(c, 600, 418, 'N');
    toilet(c, 628, 418, 'N');
    // Sinks along east wall
    bathSink(c, 648, 334, 'W');
    bathSink(c, 648, 356, 'W');
    bathSink(c, 648, 378, 'W');
    // Small couch tucked along the west wall
    couch(c, 546, 344, 44, true, '#A86A88');
    // Magazine table / kommode
    // c.fillStyle = '#6B4E2A';
    // c.fillRect(600, 384, 16, 12);
    // c.fillStyle = '#7D5C35';
    // c.fillRect(602, 386, 12, 8);
    // c.fillStyle = '#F5F0E0';
    // c.fillRect(603, 388, 4, 3);
    // c.fillRect(609, 388, 4, 3);
    // Roses beside the entrance, still inside the room
    roseVase(c, 574, 304);
    roseVase(c, 626, 304);
    // Decorative plant
    plant(c, 550, 398, false);

    // ─── DESKS + OFFICE CHAIRS + PROPS ─────────────────────────
    for (const d of DESKS) {
      desk(c, d.dx, d.dy, d.dw, d.dh);
      if (d.chair) officeChair(c, d.chair.x, d.chair.y, d.chair.face || 'S');
      if (d.prop && PROPS[d.prop.key]) PROPS[d.prop.key](c, d.prop.x, d.prop.y);
      if (d.labelX != null) label(c, d.name, d.labelX, d.labelY);
    }

    // ─── ROOM LABELS ───────────────────────────────────────────
    c.fillStyle='rgba(255,255,255,0.12)'; c.font='10px monospace'; c.textAlign='center';
    c.fillText('Lobby', R.lobby.x+R.lobby.w/2, 45);
    c.fillText("Michael's Office", R.michael.x+R.michael.w/2, R.michael.y+25);
    c.fillText('Conference Room', R.conference.x+R.conference.w/2, R.conference.y+25);
    c.fillText('Stairs', R.stairs.x+R.stairs.w/2, 20);
    c.fillText('Breakroom', R.breakroom.x+R.breakroom.w/2, R.breakroom.y+R.breakroom.h/2);
    c.fillText('Kitchen', R.kitchen.x+R.kitchen.w/2, 225);
    c.fillText('Annex', R.annex.x+R.annex.w/2, R.annex.y+25);
    c.fillText("Darryl's Office", R.darryl.x+R.darryl.w/2, R.darryl.y+25);
    c.fillText("Men's", R.mens.x+R.mens.w/2, R.mens.y+R.mens.h/2-6);
    c.fillText("Women's", R.womens.x+R.womens.w/2, R.womens.y+R.womens.h/2-6);
    c.fillStyle='rgba(255,255,255,0.08)'; c.font='12px monospace';
    c.fillText('Bullpen', 220, 310);
    c.textAlign='left';
  }

  // offscreen bg canvas so we don't re-render every frame
  const bg = document.createElement('canvas');
  bg.width = W; bg.height = H;
  const bgctx = bg.getContext('2d');
  bgctx.imageSmoothingEnabled = false;
  bgctx.fillStyle = '#1a1a2e'; bgctx.fillRect(0,0,W,H);
  renderBackground(bgctx);

  // ─── 21 CHARACTERS (palettes from description-chars.txt) ──────
  // Each char: { skin, hair, top, pants, tie, shoes, hairStyle, glasses, mustache, build, role }
  // role: 'orch' | 'dev' | 'da'
  const CHARS = {
    michael:      { skin:'#F4CEA4', hair:'#3D2817', top:'#3A3A3D', inner:'#FFFFFF', tie:'#2A3A6A', pants:'#3A3A3D', shoes:'#1A1A1A', hairStyle:'side', build:'normal' },
    davidwallace: { skin:'#F0D4B0', hair:'#6A6A6A', top:'#1E2A4A', inner:'#FFFFFF', tie:'#8B1818', pants:'#1E2A4A', shoes:'#1A1A1A', hairStyle:'side', build:'normal' },
    jim:      { skin:'#EBCBA5', hair:'#4A3020', top:'#A8C5E8', inner:null,      tie:'#1E2A4A', pants:'#3A3A3D', shoes:'#1A1A1A', hairStyle:'shag', build:'tall' },
    pam:      { skin:'#F0D4B0', hair:'#B8864A', top:'#E8B5C0', inner:'#FFFFFF', pants:'#6A6A6E', shoes:'#C9A27E', hairStyle:'wavy', build:'short', skirt:true },
    dwight:   { skin:'#E8C4A0', hair:'#6B4A2A', top:'#C9A227', inner:'#F5F5F0', tie:'#5C3A1E', pants:'#4A3020', shoes:'#3A2818', hairStyle:'bowl', glasses:'#A88B3A', build:'normal' },
    angela:   { skin:'#F5D8B0', hair:'#D4B87A', top:'#9A9A9D', inner:'#E8DCC0', pants:'#6A6A6E', shoes:'#1A1A1A', hairStyle:'pony', build:'tiny', skirt:true },
    andy:     { skin:'#F0D4B0', hair:'#8B6F3A', top:'#1E3A5C', inner:'#F5C4C4', tie:'#B31B1B', pants:'#C9A27E', shoes:'#4A2E1A', hairStyle:'preppy', build:'normal' },
    erin:     { skin:'#F5D8B0', hair:'#A85A2A', top:'#C9A227', inner:'#4A8A8A', pants:'#A86A7A', shoes:'#5A3A1E', hairStyle:'bangs', build:'normal', skirt:true },
    stanley:  { skin:'#6B4A2A', hair:'#2A2018', top:'#4A3020', inner:'#F5F5F0', tie:'#6B2020', pants:'#4A3020', shoes:'#1A1A1A', hairStyle:'bald', glasses:'#A88B3A', mustache:'#4A4A4A', build:'heavy' },
    phyllis:  { skin:'#F0D4B0', hair:'#B8764A', top:'#8A6BA5', inner:'#FFFFFF', pants:'#1E2A4A', shoes:'#1A1A1A', hairStyle:'perm', glasses:'#A88B3A', build:'heavy' },
    kevin:    { skin:'#F0C4A0', hair:'#4A3020', top:'#A8C5E8', inner:null,     tie:'#6B2020', pants:'#3A3A3D', shoes:'#1A1A1A', hairStyle:'balding', build:'heavy' },
    oscar:    { skin:'#C9965A', hair:'#1E1410', top:'#D4C4E8', inner:null,     tie:'#6B2020', pants:'#3A3A3D', shoes:'#1A1A1A', hairStyle:'side', glasses:'#1A1A1A', build:'normal' },
    creed:    { skin:'#D4B89A', hair:'#9A9A9A', top:'#6A5A4A', inner:'#E8DCC0', tie:'#8A6A3A', pants:'#8A8A8E', shoes:'#4A2E1A', hairStyle:'long',  build:'normal' },
    meredith: { skin:'#F0D4B0', hair:'#C94A1E', top:'#A85A6A', inner:null,     pants:'#5A6A7A', shoes:'#5A3A1E', hairStyle:'frizz', build:'normal' },
    kelly:    { skin:'#B8864A', hair:'#1A1410', top:'#E83A8A', inner:null,     pants:'#1E2A4A', shoes:'#1A1A1A', hairStyle:'longstraight', build:'tiny', skirt:false },
    ryan:     { skin:'#D4A574', hair:'#2A1E14', top:'#4A6A8A', inner:null,     pants:'#B89A6A', shoes:'#4A2E1A', hairStyle:'messy', build:'normal' },
    toby:     { skin:'#EBCBA5', hair:'#6B4A2A', top:'#8A6A4A', inner:'#D4B89A', tie:'#6B4A2A', pants:'#6A5A3A', shoes:'#4A2E1A', hairStyle:'thin', build:'normal' },
    holly:    { skin:'#F5D8B0', hair:'#C9A05A', top:'#4A7A8A', inner:'#F5EDD8', pants:'#3A3A3D', shoes:'#6A4A2A', hairStyle:'wavy', build:'normal', skirt:false },
    darryl:   { skin:'#5A3A1E', hair:'#1A1410', top:'#6A6A6E', inner:null,     pants:'#6A6A6E', shoes:'#4A2E1A', hairStyle:'buzz', facialhair:'#1A1410', build:'broad' },
    gabe:     { skin:'#F0D4B0', hair:'#2A1E14', top:'#1A1A1A', inner:'#FFFFFF', tie:'#1A1A1A', pants:'#1A1A1A', shoes:'#1A1A1A', hairStyle:'side', build:'vtall' },
    jan:      { skin:'#F5D8B0', hair:'#D4B87A', top:'#1A1A1A', inner:'#1A1A1A', pants:'#1A1A1A', shoes:'#1A1A1A', hairStyle:'bob', build:'normal', skirt:true },
    roy:      { skin:'#D4A574', hair:'#4A3020', top:'#4A6A8A', inner:null,     pants:'#2A3A4A', shoes:'#4A2E1A', hairStyle:'cap',    facialhair:'#4A3020', build:'broad' },
  };

  // Office-show display names for each character key (shown in hover tooltip).
  const CHAR_NAMES = {
    michael:'Michael Scott', davidwallace:'David Wallace', jim:'Jim Halpert',
    pam:'Pam Beesly', dwight:'Dwight Schrute', angela:'Angela Martin',
    andy:'Andy Bernard', erin:'Erin Hannon', stanley:'Stanley Hudson',
    phyllis:'Phyllis Vance', kevin:'Kevin Malone', oscar:'Oscar Martinez',
    creed:'Creed Bratton', meredith:'Meredith Palmer', kelly:'Kelly Kapoor',
    ryan:'Ryan Howard', toby:'Toby Flenderson', holly:'Holly Flax',
    darryl:'Darryl Philbin', gabe:'Gabe Lewis', jan:'Jan Levinson',
    roy:'Roy Anderson',
  };

  function roleAccent(role) {
    if (role === 'user') return '#F5D060';
    if (role === 'orch') return '#E8B84C';
    if (role === 'da') return '#C97777';
    return '#6EA5E8';
  }

  // ─── SPRITE RENDERER ──────────────────────────────────────────
  // Each sprite ~ 10w × 18h, foot point at (x,y)
  function px(c, x, y, w, h, col){ c.fillStyle=col; c.fillRect(x|0, y|0, w, h); }
  const SPRITE_FRAME_W = 34;
  const SPRITE_FRAME_H = 38;
  const SPRITE_ANCHOR_X = 17;
  const SPRITE_ANCHOR_Y = 31;
  const spriteFrame = document.createElement('canvas');
  spriteFrame.width = SPRITE_FRAME_W;
  spriteFrame.height = SPRITE_FRAME_H;
  const spriteFrameCtx = spriteFrame.getContext('2d');
  spriteFrameCtx.imageSmoothingEnabled = false;

  function drawHair(c, cx, headTop, ch) {
    const h = ch.hair;
    switch (ch.hairStyle) {
      case 'side':
        px(c, cx-3, headTop, 7, 2, h);
        px(c, cx-4, headTop+1, 1, 3, h);
        px(c, cx+3, headTop+1, 1, 2, h);
        px(c, cx-2, headTop+2, 1, 1, h); // side part
        break;
      case 'shag':
        px(c, cx-4, headTop, 8, 3, h);
        px(c, cx-4, headTop+3, 1, 2, h);
        px(c, cx+3, headTop+3, 1, 2, h);
        px(c, cx-2, headTop+3, 4, 1, h); // forehead flop
        break;
      case 'wavy':
        px(c, cx-4, headTop, 8, 2, h);
        px(c, cx-5, headTop+1, 1, 4, h);
        px(c, cx+4, headTop+1, 1, 4, h);
        px(c, cx-4, headTop+5, 2, 1, h);
        px(c, cx+3, headTop+5, 2, 1, h);
        break;
      case 'bowl':
        px(c, cx-4, headTop, 8, 2, h);
        px(c, cx-4, headTop+2, 1, 3, h);
        px(c, cx+3, headTop+2, 1, 3, h);
        px(c, cx-3, headTop+2, 6, 1, h); // bangs
        break;
      case 'pony':
        px(c, cx-3, headTop, 7, 2, h);
        px(c, cx-3, headTop+2, 1, 2, h);
        px(c, cx+3, headTop+2, 1, 1, h);
        px(c, cx+4, headTop+2, 1, 4, h); // ponytail hanging back
        break;
      case 'preppy':
        px(c, cx-3, headTop, 7, 2, h);
        px(c, cx-3, headTop-1, 7, 1, h); // volume top
        px(c, cx-4, headTop+1, 1, 2, h);
        px(c, cx+3, headTop+1, 1, 2, h);
        break;
      case 'bangs':
        px(c, cx-4, headTop, 8, 2, h);
        px(c, cx-4, headTop+1, 8, 1, h); // bangs across forehead
        px(c, cx-5, headTop+2, 1, 5, h); // long left
        px(c, cx+4, headTop+2, 1, 5, h); // long right
        break;
      case 'bald':
        px(c, cx-4, headTop+2, 1, 2, h); // sides only
        px(c, cx+3, headTop+2, 1, 2, h);
        break;
      case 'balding':
        px(c, cx-3, headTop+1, 7, 1, h);
        px(c, cx-4, headTop+2, 1, 2, h);
        px(c, cx+3, headTop+2, 1, 2, h);
        break;
      case 'perm':
        px(c, cx-4, headTop, 8, 3, h);
        px(c, cx-5, headTop+1, 1, 3, h);
        px(c, cx+4, headTop+1, 1, 3, h);
        // curls
        px(c, cx-4, headTop+3, 1, 1, h);
        px(c, cx+3, headTop+3, 1, 1, h);
        break;
      case 'long':
        px(c, cx-4, headTop, 8, 2, h);
        px(c, cx-5, headTop+1, 1, 7, h);
        px(c, cx+4, headTop+1, 1, 7, h);
        px(c, cx-2, headTop+1, 1, 1, h); // center part
        break;
      case 'frizz':
        px(c, cx-5, headTop-1, 10, 3, h);
        px(c, cx-5, headTop+1, 1, 5, h);
        px(c, cx+4, headTop+1, 1, 5, h);
        // frizz stragglers
        px(c, cx-6, headTop, 1, 1, h);
        px(c, cx+5, headTop+1, 1, 1, h);
        break;
      case 'longstraight':
        px(c, cx-4, headTop, 8, 2, h);
        px(c, cx-4, headTop+1, 1, 8, h);
        px(c, cx+3, headTop+1, 1, 8, h);
        break;
      case 'messy':
        px(c, cx-3, headTop, 7, 2, h);
        px(c, cx-4, headTop+1, 1, 2, h);
        px(c, cx+3, headTop+1, 1, 2, h);
        px(c, cx-2, headTop-1, 1, 1, h); // tuft
        px(c, cx+1, headTop-1, 1, 1, h);
        break;
      case 'thin':
        px(c, cx-3, headTop+1, 7, 1, h);
        px(c, cx-4, headTop+2, 1, 2, h);
        px(c, cx+3, headTop+2, 1, 2, h);
        break;
      case 'buzz':
        px(c, cx-3, headTop+1, 7, 1, h);
        px(c, cx-3, headTop+2, 7, 1, 'rgba(0,0,0,0.3)');
        break;
      case 'bob':
        px(c, cx-4, headTop, 8, 2, h);
        px(c, cx-4, headTop+1, 1, 5, h);
        px(c, cx+3, headTop+1, 1, 5, h);
        break;
      case 'swept':
        px(c, cx-4, headTop, 8, 2, h);
        px(c, cx-5, headTop+1, 1, 4, h);
        px(c, cx+4, headTop+1, 1, 4, h);
        px(c, cx+4, headTop+5, 1, 1, h); // collar
        break;
      case 'cap':
        // backwards baseball cap — solid cap top + back tab
        px(c, cx-4, headTop-1, 8, 3, h);
        px(c, cx-4, headTop+2, 1, 1, h);
        px(c, cx+3, headTop+2, 1, 1, h);
        // cap logo accent
        px(c, cx-1, headTop, 2, 1, '#FFFFFF');
        break;
      default:
        px(c, cx-3, headTop, 7, 2, h);
        px(c, cx-4, headTop+1, 1, 3, h);
        px(c, cx+3, headTop+1, 1, 3, h);
    }
  }

  function drawSprite(c, x, y, ch, mode, tick, highlight, face, standUp) {
    // mode: 'walking' | 'sitting' | 'standing'
    // face: 'N' | 'S' | 'E' | 'W'  (only affects idle facing)
    // standUp: 0..1 progress of stand-up transition (0=fully sat, 1=fully stood)
    const walking = mode === 'walking';
    const sitting = mode === 'sitting';
    const transStand = (standUp != null && standUp > 0 && standUp < 1);
    const anchorX = Math.round(x);
    const anchorY = Math.round(y);
    const cx = SPRITE_ANCHOR_X;
    const cy = SPRITE_ANCHOR_Y;
    const s = spriteFrameCtx;

    s.clearRect(0, 0, SPRITE_FRAME_W, SPRITE_FRAME_H);

    const build = ch.build || 'normal';
    const legLen = build==='tiny'?5 : build==='heavy'?6 : build==='tall'?7 : build==='vtall'?8 : 6;
    const torsoLen = build==='tiny'?5 : build==='heavy'?7 : build==='tall'?7 : build==='vtall'?8 : 6;
    const headSz = 5;
    const torsoW = build==='heavy'?10 : build==='broad'?9 : build==='tiny'?7 : 8;

    // bobbing while walking
    const bob = walking ? (Math.sin(tick*0.35)>0 ? -1 : 0) : 0;
    const cy2 = cy + bob;

    // Sitting shrinks total height — legs fold under (hidden by desk/chair).
    // During stand-up transition, sprite smoothly rises from seated to full.
    const visLegLen = sitting ? 0 : (transStand ? Math.round(legLen * standUp) : legLen);
    const seatOffset = sitting ? 3 : (transStand ? Math.round(3 * (1 - standUp)) : 0);

    // shadow
    s.fillStyle = 'rgba(0,0,0,0.35)';
    s.fillRect(cx-4, cy, 8, 1);

    const shoeTop = cy2 - 1 + seatOffset;
    const legTop = shoeTop - visLegLen;
    const torsoTop = legTop - torsoLen;
    const headTop = torsoTop - headSz - 1;

    // legs — only drawn when not sitting (sitting hides legs under desk)
    if (!sitting) {
      const legSplit = walking ? (Math.sin(tick*0.35) > 0 ? 1 : -1) : 0;
      if (visLegLen > 0) {
        px(s, cx-3, legTop, 3, visLegLen-1, ch.pants);
        px(s, cx,   legTop, 3, visLegLen-1, ch.pants);
      }
      // shoes
      px(s, cx-3, shoeTop, 3, 1, ch.shoes || '#1A1A1A');
      px(s, cx,   shoeTop, 3, 1, ch.shoes || '#1A1A1A');
      if (walking) {
        px(s, cx-3, legTop + (legSplit>0?0:1), 3, 1, ch.pants);
      }
    } else {
      // seated: tiny hint of pants peeking under the torso (thighs folded)
      px(s, cx-3, shoeTop-1, 6, 2, ch.pants);
    }

    // skirt (hides legs top third)
    if (ch.skirt && !sitting) {
      px(s, cx-4, legTop, 8, 3, ch.pants);
    } else if (ch.skirt && sitting) {
      px(s, cx-4, shoeTop-2, 8, 3, ch.pants);
    }

    // torso (jacket)
    const halfW = torsoW/2;
    px(s, cx-halfW|0, torsoTop, torsoW, torsoLen, ch.top);
    if (ch.inner) {
      px(s, cx-1, torsoTop, 2, 2, ch.inner);
    }
    if (ch.tie) {
      px(s, cx, torsoTop+1, 1, torsoLen-2, ch.tie);
    }

    // neck
    px(s, cx-1, torsoTop-1, 2, 1, ch.skin);

    // head
    px(s, cx-3, headTop, 6, headSz, ch.skin);

    // eyes — offset slightly in the direction the character is facing (idle only)
    s.fillStyle = '#1A1410';
    const eyeFace = walking ? 'S' : (face || 'S');
    const eyeDx = eyeFace === 'W' ? -1 : eyeFace === 'E' ? 1 : 0;
    const eyeDy = eyeFace === 'N' ? -1 : 0;
    if (eyeFace === 'N') {
      // looking up — thinner slit eyes at top of head
      s.fillRect(cx-2, headTop+1, 1, 1);
      s.fillRect(cx+1, headTop+1, 1, 1);
    } else {
      s.fillRect(cx-2+eyeDx, headTop+2+eyeDy, 1, 1);
      s.fillRect(cx+1+eyeDx, headTop+2+eyeDy, 1, 1);
    }

    // glasses
    if (ch.glasses) {
      s.fillStyle = ch.glasses;
      s.fillRect(cx-3, headTop+1, 2, 1);
      s.fillRect(cx+1, headTop+1, 3, 1);
      s.fillRect(cx-3, headTop+2, 1, 2);
      s.fillRect(cx+3, headTop+2, 1, 2);
      s.fillRect(cx, headTop+2, 1, 1);
    }

    // mustache
    if (ch.mustache) {
      px(s, cx-2, headTop+3, 5, 1, ch.mustache);
    }
    // goatee/beard
    if (ch.facialhair) {
      px(s, cx-1, headTop+4, 3, 1, ch.facialhair);
    }

    // hair (draw last so it overlays forehead)
    drawHair(s, cx, headTop, ch);

    if (highlight) {
      c.save();
      c.globalAlpha = 0.12;
      c.fillStyle = highlight;
      c.beginPath();
      c.ellipse(anchorX, Math.round(anchorY - 10 * AGENT_SCALE), Math.round(9 * AGENT_SCALE), Math.round(12 * AGENT_SCALE), 0, 0, Math.PI*2);
      c.fill();
      c.strokeStyle = highlight;
      c.lineWidth = 1;
      c.globalAlpha = 0.75;
      c.beginPath();
      c.ellipse(anchorX, Math.round(anchorY - 10 * AGENT_SCALE), Math.round(8 * AGENT_SCALE), Math.round(11 * AGENT_SCALE), 0, 0, Math.PI*2);
      c.stroke();
      c.globalAlpha = 0.55;
      c.beginPath();
      c.ellipse(anchorX, anchorY + 1, Math.round(7 * AGENT_SCALE), Math.max(2, Math.round(2.5 * AGENT_SCALE)), 0, 0, Math.PI*2);
      c.stroke();
      c.globalAlpha = 1;
      c.restore();
    }

    const drawX = Math.round(anchorX - SPRITE_ANCHOR_X * AGENT_SCALE);
    const drawY = Math.round(anchorY - SPRITE_ANCHOR_Y * AGENT_SCALE);
    const drawW = Math.round(SPRITE_FRAME_W * AGENT_SCALE);
    const drawH = Math.round(SPRITE_FRAME_H * AGENT_SCALE);
    c.drawImage(spriteFrame, 0, 0, SPRITE_FRAME_W, SPRITE_FRAME_H, drawX, drawY, drawW, drawH);

    // head top bounds for hit-testing
    return {
      top: Math.floor(drawY + (headTop - 2) * AGENT_SCALE),
      bottom: Math.ceil(drawY + (cy + 2) * AGENT_SCALE),
      left: Math.floor(drawX + (cx - 7) * AGENT_SCALE),
      right: Math.ceil(drawX + (cx + 7) * AGENT_SCALE),
    };
  }

  // ─── AGENT → CHAR + HOME DESK MAPPING ─────────────────────────
  // API gives us id, zone, x, y. We map ids to characters + pixel homes.
  // Every agent has a default desk (home). "room" names which walled room their
  // home is in (used for waypoint pathing). "face" = which way they sit at the
  // desk so the sprite feels oriented.
  // Every agent's x/y is their CHAIR position (so idle = they're sitting).
  const AGENT_HOME = {
    'main':     { char:'jim',          role:'orch', x:159, y:181, room:null,         face:'S' },
    'agent-0':  { char:'dwight',       role:'orch', x:197, y:245, room:null,         face:'W' },
    'agent-0da':{ char:'pam',          role:'da',   x:32,  y:215, room:null,         face:'S' },
    'agent-1':  { char:'davidwallace', role:'dev',  x:290, y:42,  room:'conference', face:'S' },
    'agent-1da':{ char:'angela',       role:'da',   x:39,  y:318, room:null,         face:'S' },
    'agent-2':  { char:'andy',         role:'dev',  x:279, y:181, room:null,         face:'S' },
    'agent-2da':{ char:'erin',         role:'da',   x:119, y:245, room:null,         face:'E' },
    'agent-3':  { char:'stanley',      role:'dev',  x:317, y:245, room:null,         face:'W' },
    'agent-3da':{ char:'phyllis',      role:'da',   x:239, y:245, room:null,         face:'E' },
    'agent-4':  { char:'kevin',        role:'dev',  x:39,  y:386, room:null,         face:'N' },
    'agent-4da':{ char:'oscar',        role:'da',   x:108, y:352, room:null,         face:'W' },
    'agent-5':  { char:'creed',        role:'dev',  x:227, y:385, room:null,         face:'W' },
    'agent-5da':{ char:'meredith',     role:'da',   x:148, y:385, room:null,         face:'E' },
    'agent-6':  { char:'kelly',        role:'dev',  x:858, y:332, room:null,         face:'S' },
    'agent-6da':{ char:'ryan',         role:'da',   x:858, y:303, room:null,         face:'N' },
    'agent-7':  { char:'toby',         role:'dev',  x:855, y:241, room:null,         face:'E' },
    'agent-7da':{ char:'holly',        role:'da',   x:855, y:391, room:null,         face:'E' },
    'agent-8':  { char:'darryl',       role:'dev',  x:342, y:382, room:'darryl',     face:'N' },
    'agent-8da':{ char:'gabe',         role:'da',   x:760, y:232, room:'annex',      face:'N' },
    'agent-9':  { char:'jan',          role:'orch', x:320, y:42,  room:'conference', face:'S' },
    'agent-9da':{ char:'roy',          role:'da',   x:780, y:48,  room:'breakroom',  face:'S' },
    // The human operator
    'user':     { char:'michael',      role:'user', x:150, y:58,  room:'michael',    face:'S' },
  };

  // Possible "desks" (public seats) roamers can claim. Every spot is a real
  // chair in the scene; roam logic guarantees no two agents share one.
  const ROAM_SPOTS = {
    roy: [
      { x:780, y:48,  room:'breakroom',  face:'S', label:'breakroom table' },
      { x:810, y:48,  room:'breakroom',  face:'S', label:'breakroom table' },
      { x:18,  y:112, room:'lobby',      face:'E', label:'lobby couch' },
      { x:18,  y:136, room:'lobby',      face:'E', label:'lobby couch' },
      { x:625, y:198, room:'kitchen',    face:'S', label:'kitchen table' },
      { x:600, y:220, room:'kitchen',    face:'E', label:'kitchen table' },
    ],
    davidwallace: [
      { x:290, y:60,  room:'conference', face:'S', label:'conference head' },
      { x:320, y:42,  room:'conference', face:'S', label:'conference north seat' },
      { x:350, y:42,  room:'conference', face:'S', label:'conference north seat' },
      { x:320, y:108, room:'conference', face:'N', label:'conference south seat' },
      { x:780, y:48,  room:'breakroom',  face:'S', label:'breakroom table' },
      { x:18,  y:112, room:'lobby',      face:'E', label:'lobby couch' },
      { x:18,  y:136, room:'lobby',      face:'E', label:'lobby couch' },
      { x:625, y:198, room:'kitchen',    face:'S', label:'kitchen table' },
    ],
    gabe: [
      { x:760, y:232, room:'annex',      face:'N', label:'annex table' },
      { x:725, y:232, room:'annex',      face:'N', label:'annex table' },
      { x:795, y:190, room:'annex',      face:'S', label:'annex table' },
      { x:18,  y:112, room:'lobby',      face:'E', label:'lobby couch' },
      { x:18,  y:136, room:'lobby',      face:'E', label:'lobby couch' },
      { x:350, y:42,  room:'conference', face:'S', label:'conference room' },
      { x:376, y:75,  room:'conference', face:'W', label:'conference east seat' },
      { x:200, y:140, room:'michael',    face:'N', label:'near Michael\'s office' },
    ],
  };

  // Points agents route THROUGH when entering/leaving a walled room. Keeps
  // them walking through real doors instead of ghosting through walls.
  const DOOR_POINTS = {
    michael:    { inside:{x:200, y:150}, outside:{x:200, y:172} },
    conference: { inside:{x:256, y:150}, outside:{x:256, y:172} },
    // Stairs door is on the east wall into the hallway (y≈60-82)
    stairs:     { inside:{x:658, y:72},  outside:{x:690, y:72}  },
    // Kitchen east door now at y=266-290 → both sides of that opening
    kitchen:    { inside:{x:658, y:278}, outside:{x:690, y:278} },
    // Kitchen west door at the bullpen opening
    kitchen_westdoor: { inside:{x:426, y:278}, outside:{x:395, y:278} },
    // Breakroom west door into the hallway at y=90-114
    breakroom:  { inside:{x:728, y:102}, outside:{x:710, y:102} },
    darryl:     { inside:{x:317, y:310}, outside:{x:317, y:288} },
    mens:       { inside:{x:472, y:310}, outside:{x:472, y:288} },
    womens:     { inside:{x:600, y:310}, outside:{x:600, y:288} },
  };

  function pt(x, y) { return { x, y }; }

  const BULLPEN_EDIT_WALK_NODES = {
    // Start blank and add bullpen-local lane nodes here one by one.
    bullpen_kitchen_stub: { x:364, y:278, links:['kitchen_west', 'bullpen_darryl_top', 'bullpen_stanley_junction'] },
    bullpen_darryl_top:  { x:364, y:284, links:['bullpen_kitchen_stub', 'bullpen_darryl_junction'] },
    bullpen_darryl_junction:{ x:317, y:284, links:['bullpen_darryl_top', 'bullpen_stanley_talk_junction', 'darryl_out'] },
    bullpen_mid_junction:{ x:216, y:284, links:['bullpen_phyllis_talk_junction', 'bullpen_dwight_talk_junction', 'bullpen_mid_vertical_seat_junction', 'bullpen_mid_lower'] },
    bullpen_angela_top:  { x:39,  y:284, links:['bullpen_pam_erin_bottom'] },
    bullpen_erin_talk_junction:{ x:140, y:284, links:['bullpen_meredith_connector_top', 'bullpen_oscar_talk_top', 'bullpen_erin_talk'] },
    bullpen_oscar_talk_top:{ x:87, y:284, links:['bullpen_erin_talk_junction', 'bullpen_oscar_talk', 'bullpen_pam_erin_bottom'] },
    bullpen_stanley_talk_junction:{ x:296, y:284, links:['bullpen_darryl_junction', 'bullpen_phyllis_talk_junction', 'bullpen_stanley_talk'] },
    bullpen_phyllis_talk_junction:{ x:260, y:284, links:['bullpen_stanley_talk_junction', 'bullpen_mid_junction', 'bullpen_phyllis_talk'] },
    bullpen_dwight_talk_junction:{ x:176, y:284, links:['bullpen_mid_junction', 'bullpen_meredith_connector_top', 'bullpen_dwight_talk'] },
    bullpen_stanley_junction:{ x:364, y:245, links:['bullpen_kitchen_stub', 'bullpen_upper_right'] },
    bullpen_mid_vertical_top:{ x:216, y:170, links:['bullpen_mid_vertical_seat_junction', 'bullpen_michael_door_junction', 'bullpen_conference_door_junction'] },
    bullpen_mid_vertical_seat_junction:{ x:216, y:245, links:['bullpen_mid_vertical_top', 'bullpen_mid_junction'] },
    bullpen_mid_lower:   { x:216, y:320, links:['bullpen_mid_junction', 'bullpen_creed_junction', 'bullpen_creed_seat_junction'] },
    bullpen_creed_seat_junction:{ x:227, y:320, links:['bullpen_mid_lower'] },
    bullpen_creed_junction:{ x:209, y:320, links:['bullpen_mid_lower', 'bullpen_meredith_junction', 'bullpen_creed_talk'] },
    bullpen_meredith_junction:{ x:166, y:320, links:['bullpen_creed_junction', 'bullpen_meredith_talk', 'bullpen_oscar_lower', 'bullpen_meredith_connector_top'] },
    bullpen_oscar_lower: { x:126, y:320, links:['bullpen_meredith_junction', 'bullpen_oscar_vertical_mid', 'bullpen_oscar_talk'] },
    bullpen_oscar_vertical_mid:{ x:126, y:352, links:['bullpen_oscar_lower', 'bullpen_oscar_vertical_bottom'] },
    bullpen_oscar_vertical_bottom:{ x:126, y:386, links:['bullpen_oscar_vertical_mid', 'bullpen_meredith_seat_junction', 'bullpen_kevin_seat_junction', 'bullpen_kevin_talk'] },
    bullpen_oscar_talk:{ x:87, y:320, links:['bullpen_oscar_lower', 'bullpen_oscar_talk_top'] },
    bullpen_meredith_seat_junction:{ x:148, y:386, links:['bullpen_oscar_vertical_bottom'] },
    bullpen_kevin_seat_junction:{ x:39, y:386, links:['bullpen_oscar_vertical_bottom'] },
    bullpen_kevin_talk:{ x:68, y:386, links:['bullpen_oscar_vertical_bottom'] },
    bullpen_stanley_talk:{ x:296, y:275, links:['bullpen_stanley_talk_junction'] },
    bullpen_phyllis_talk:{ x:260, y:275, links:['bullpen_phyllis_talk_junction'] },
    bullpen_dwight_talk:{ x:176, y:275, links:['bullpen_dwight_talk_junction'] },
    bullpen_erin_talk:{ x:140, y:275, links:['bullpen_erin_talk_junction'] },
    bullpen_meredith_connector_top:{ x:166, y:284, links:['bullpen_dwight_talk_junction', 'bullpen_erin_talk_junction', 'bullpen_meredith_junction'] },
    bullpen_meredith_talk:{ x:166, y:352, links:['bullpen_meredith_junction'] },
    bullpen_creed_talk:  { x:209, y:352, links:['bullpen_creed_junction'] },
    bullpen_upper_right: { x:364, y:170, links:['bullpen_stanley_junction', 'bullpen_andy_talk_junction'] },
    bullpen_andy_talk_junction:{ x:298, y:170, links:['bullpen_andy_seat_junction', 'bullpen_upper_right', 'bullpen_andy_talk'] },
    bullpen_andy_seat_junction:{ x:279, y:170, links:['bullpen_conference_door_junction', 'bullpen_andy_talk_junction'] },
    bullpen_andy_talk:{ x:298, y:181, links:['bullpen_andy_talk_junction'] },
    bullpen_upper_left:  { x:104, y:170, links:['bullpen_jim_talk_junction', 'bullpen_pam_top_branch_junction'] },
    bullpen_jim_talk_junction:{ x:140, y:170, links:['bullpen_upper_left', 'bullpen_jim_seat_junction', 'bullpen_jim_talk'] },
    bullpen_jim_seat_junction:{ x:159, y:170, links:['bullpen_jim_talk_junction', 'bullpen_michael_door_junction'] },
    bullpen_michael_door_junction:{ x:200, y:170, links:['bullpen_jim_seat_junction', 'bullpen_mid_vertical_top', 'michael_out'] },
    bullpen_conference_door_junction:{ x:256, y:170, links:['bullpen_mid_vertical_top', 'bullpen_andy_seat_junction', 'conference_out'] },
    bullpen_jim_talk:{ x:140, y:181, links:['bullpen_jim_talk_junction'] },
    bullpen_pam_top_branch_junction:{ x:94, y:188, links:['bullpen_upper_left', 'bullpen_pam_talk_junction', 'bullpen_pam_top_branch'] },
    bullpen_pam_top_branch:{ x:36, y:188, links:['bullpen_pam_top_branch_junction', 'bullpen_lobby_couch_bottom_junction'] },
    bullpen_lobby_couch_bottom_junction:{ x:36, y:136, links:['bullpen_pam_top_branch', 'bullpen_lobby_couch_top_junction'] },
    bullpen_lobby_couch_top_junction:{ x:36, y:112, links:['bullpen_lobby_couch_bottom_junction', 'bullpen_pam_top_branch_cap'] },
    bullpen_pam_top_branch_cap:{ x:36, y:86, links:['bullpen_lobby_couch_top_junction'] },
    bullpen_pam_talk_junction:{ x:88, y:214, links:['bullpen_pam_top_branch_junction', 'bullpen_pam_erin_junction', 'bullpen_pam_talk'] },
    bullpen_pam_talk:{ x:64, y:214, links:['bullpen_pam_talk_junction'] },
    bullpen_pam_erin_junction:{ x:82, y:232, links:['bullpen_pam_talk_junction', 'bullpen_pam_erin_mid'] },
    bullpen_pam_erin_mid:{ x:82, y:245, links:['bullpen_pam_erin_junction', 'bullpen_pam_erin_bottom'] },
    bullpen_pam_erin_bottom:{ x:82, y:284, links:['bullpen_pam_erin_mid', 'bullpen_angela_top', 'bullpen_oscar_talk_top'] },
  };

  const BULLPEN_EDIT_ACCESS_PATHS = {
    // Start blank and add bullpen seat/desk access paths here one by one.
    '317,245': { node:'bullpen_stanley_junction', points:[pt(317,245), pt(364,245)] },
    '18,112':  { node:'bullpen_lobby_couch_top_junction', points:[pt(18,112), pt(36,112)] },
    '18,136':  { node:'bullpen_lobby_couch_bottom_junction', points:[pt(18,136), pt(36,136)] },
    '32,215':  { node:'bullpen_pam_erin_mid', points:[pt(32,215), pt(32,245), pt(82,245)] },
    '36,188':  { node:'bullpen_pam_top_branch', points:[pt(36,188)] },
    '64,214':  { node:'bullpen_pam_talk', points:[pt(64,214)] },
    '140,181': { node:'bullpen_jim_talk', points:[pt(140,181)] },
    '159,181': { node:'bullpen_jim_seat_junction', points:[pt(159,181), pt(159,170)] },
    '298,181': { node:'bullpen_andy_talk', points:[pt(298,181)] },
    '279,181': { node:'bullpen_andy_seat_junction', points:[pt(279,181), pt(279,170)] },
    '119,245': { node:'bullpen_pam_erin_mid', points:[pt(119,245), pt(82,245)] },
    '197,245': { node:'bullpen_mid_vertical_seat_junction', points:[pt(197,245), pt(216,245)] },
    '239,245': { node:'bullpen_mid_vertical_seat_junction', points:[pt(239,245), pt(216,245)] },
    '176,275': { node:'bullpen_dwight_talk', points:[pt(176,275)] },
    '260,275': { node:'bullpen_phyllis_talk', points:[pt(260,275)] },
    '296,275': { node:'bullpen_stanley_talk', points:[pt(296,275)] },
    '39,318':  { node:'bullpen_angela_top', points:[pt(39,318), pt(39,284)] },
    '39,284':  { node:'bullpen_angela_top', points:[pt(39,284)] },
    '140,275': { node:'bullpen_erin_talk', points:[pt(140,275)] },
    '166,352': { node:'bullpen_meredith_talk', points:[pt(166,352)] },
    '209,352': { node:'bullpen_creed_talk', points:[pt(209,352)] },
    '87,320':  { node:'bullpen_oscar_talk', points:[pt(87,320)] },
    '148,385': { node:'bullpen_meredith_seat_junction', points:[pt(148,385)] },
    '108,352': { node:'bullpen_oscar_vertical_mid', points:[pt(108,352), pt(126,352)] },
    '39,386':  { node:'bullpen_kevin_seat_junction', points:[pt(39,386)] },
    '68,386':  { node:'bullpen_kevin_talk', points:[pt(68,386)] },
    '227,385': { node:'bullpen_creed_seat_junction', points:[pt(227,385), pt(227,320)] },
  };

  const BULLPEN_EDIT_VISIT_SPOTS = {
    // Start blank and add bullpen talk/report spots here one by one.
    '32,215':  { x:36, y:188, room:null },
    '159,181': { x:140, y:181, room:null },
    '279,181': { x:298, y:181, room:null },
    '197,245': { x:176, y:275, room:null },
    '239,245': { x:260, y:275, room:null },
    '317,245': { x:296, y:275, room:null },
    '39,318':  { x:39, y:284, room:null },
    '119,245': { x:140, y:275, room:null },
    '108,352': { x:87, y:320, room:null },
    '148,385': { x:166, y:352, room:null },
    '227,385': { x:209, y:352, room:null },
    '39,386':  { x:68, y:386, room:null },
  };

  const BREAKROOM_EDIT_WALK_NODES = {
    // Start blank and add breakroom-local lane nodes here one by one.
    // Example:
    // break_table_south: { x:805, y:128, links:['break_in'] },
    break_stub_1: { x:748, y:102, links:['break_in', 'break_stub_top', 'break_stub_bottom', 'break_left_mid'] },
    break_left_mid: { x:748, y:86, links:['break_stub_1', 'break_stub_top', 'break_talk_left'] },
    break_talk_left: { x:764, y:86, links:['break_left_mid'] },
    break_stub_top: { x:748, y:24, links:['break_stub_1', 'break_left_mid', 'break_top_col_780'] },
    break_top_col_780: { x:780, y:24, links:['break_stub_top', 'break_top_col_810', 'break_top_seat_780'] },
    break_top_seat_780: { x:780, y:48, links:['break_top_col_780'] },
    break_top_col_810: { x:810, y:24, links:['break_top_col_780', 'break_top_col_830', 'break_top_seat_810'] },
    break_top_seat_810: { x:810, y:48, links:['break_top_col_810'] },
    break_top_col_830: { x:830, y:24, links:['break_top_col_810', 'break_top_east', 'break_top_seat_830'] },
    break_top_seat_830: { x:830, y:48, links:['break_top_col_830'] },
    break_top_east: { x:858, y:24, links:['break_top_col_830', 'break_vendor_mid'] },
    break_vendor_mid: { x:858, y:56, links:['break_top_east', 'break_right_mid', 'break_vendor_spot'] },
    break_vendor_spot: { x:878, y:56, links:['break_vendor_mid'] },
    break_right_mid: { x:858, y:86, links:['break_vendor_mid', 'break_bottom_east', 'break_talk_right'] },
    break_talk_right: { x:846, y:86, links:['break_right_mid'] },
    break_stub_bottom: { x:748, y:136, links:['break_stub_1', 'break_bottom_col_780'] },
    break_bottom_col_780: { x:780, y:136, links:['break_stub_bottom', 'break_bottom_col_810', 'break_bottom_seat_780'] },
    break_bottom_seat_780: { x:780, y:112, links:['break_bottom_col_780'] },
    break_bottom_col_810: { x:810, y:136, links:['break_bottom_col_780', 'break_bottom_col_830', 'break_bottom_seat_810'] },
    break_bottom_seat_810: { x:810, y:112, links:['break_bottom_col_810'] },
    break_bottom_col_830: { x:830, y:136, links:['break_bottom_col_810', 'break_bottom_east', 'break_bottom_seat_830'] },
    break_bottom_seat_830: { x:830, y:112, links:['break_bottom_col_830'] },
    break_bottom_east: { x:848, y:136, links:['break_bottom_col_830', 'break_right_mid'] },
  };

  const BREAKROOM_EDIT_ACCESS_PATHS = {
    // Start blank and add exact chair / vending access paths here.
    // Example:
    // '780,48': { node:'break_table_south', points:[pt(780,48), pt(780,128), pt(805,128)] },
    '764,86':  { node:'break_talk_left', points:[pt(764,86)] },
    '780,48':  { node:'break_top_seat_780', points:[pt(780,48)] },
    '810,48':  { node:'break_top_seat_810', points:[pt(810,48)] },
    '830,48':  { node:'break_top_seat_830', points:[pt(830,48)] },
    '780,112': { node:'break_bottom_seat_780', points:[pt(780,112)] },
    '810,112': { node:'break_bottom_seat_810', points:[pt(810,112)] },
    '830,112': { node:'break_bottom_seat_830', points:[pt(830,112)] },
    '846,86':  { node:'break_talk_right', points:[pt(846,86)] },
    '878,56':  { node:'break_vendor_spot', points:[pt(878,56)] },
  };

  const BREAKROOM_EDIT_VISIT_SPOTS = {
    // Start blank and add "stand here to talk" spots for breakroom seats here.
    // Example:
    // '780,48': { x:780, y:128, room:'breakroom' },
    '780,48':  { x:764, y:86, room:'breakroom' },
    '810,48':  { x:846, y:86, room:'breakroom' },
    '830,48':  { x:846, y:86, room:'breakroom' },
    '780,112': { x:764, y:86, room:'breakroom' },
    '810,112': { x:846, y:86, room:'breakroom' },
    '830,112': { x:846, y:86, room:'breakroom' },
  };

  const ANNEX_EDIT_WALK_NODES = {
    // Start blank and add annex-local lane nodes here one by one.
    annex_top_725:     { x:725, y:170, links:['corridor_annex', 'annex_top_760', 'annex_top_seat_725'] },
    annex_top_760:     { x:760, y:170, links:['annex_top_725', 'annex_top_795', 'annex_top_seat_760'] },
    annex_top_795:     { x:795, y:170, links:['annex_top_760', 'annex_top_west', 'annex_top_seat_795'] },
    annex_top_west:    { x:828, y:170, links:['annex_top_795', 'annex_toby_junction'] },
    annex_toby_junction:{ x:828, y:215, links:['annex_top_west', 'annex_bottom_west', 'annex_toby_talk'] },
    annex_top_seat_725:{ x:725, y:190, links:['annex_top_725'] },
    annex_top_seat_760:{ x:760, y:190, links:['annex_top_760'] },
    annex_top_seat_795:{ x:795, y:190, links:['annex_top_795'] },
    annex_bottom_west: { x:828, y:232, links:['annex_toby_junction', 'annex_toby_join'] },
    annex_toby_talk:   { x:844, y:215, links:['annex_toby_junction'] },
    annex_toby_join:   { x:822, y:241, links:['annex_bottom_west', 'annex_bottom_east'] },
    annex_bottom_east: { x:802, y:272, links:['annex_toby_join', 'annex_bottom_795', 'annex_south_ryan'] },
    annex_bottom_795:  { x:795, y:272, links:['annex_bottom_east', 'annex_bottom_760', 'annex_bottom_seat_795'] },
    annex_bottom_760:  { x:760, y:272, links:['annex_bottom_795', 'annex_bottom_725', 'annex_bottom_seat_760'] },
    annex_bottom_725:  { x:725, y:272, links:['annex_bottom_760', 'annex_bottom_trunk', 'annex_bottom_seat_725'] },
    annex_bottom_trunk:{ x:690, y:272, links:['corridor_annex', 'annex_bottom_725', 'kitchen_out'] },
    annex_bottom_seat_725:{ x:725, y:232, links:['annex_bottom_725'] },
    annex_bottom_seat_760:{ x:760, y:232, links:['annex_bottom_760'] },
    annex_bottom_seat_795:{ x:795, y:232, links:['annex_bottom_795'] },
    annex_south_ryan:  { x:802, y:282, links:['annex_bottom_east', 'annex_ryan_access', 'annex_ryan_talk'] },
    annex_ryan_talk:   { x:816, y:282, links:['annex_south_ryan'] },
    annex_ryan_access: { x:802, y:303, links:['annex_south_ryan', 'annex_kelly_access'] },
    annex_kelly_access:{ x:802, y:332, links:['annex_ryan_access', 'annex_south_kelly'] },
    annex_south_kelly: { x:802, y:350, links:['annex_kelly_access', 'annex_south_drop', 'annex_kelly_talk'] },
    annex_kelly_talk:  { x:816, y:350, links:['annex_south_kelly'] },
    annex_south_drop:  { x:802, y:391, links:['annex_south_kelly', 'annex_holly_talk'] },
    annex_holly_talk:  { x:826, y:391, links:['annex_south_drop'] },
  };

  const ANNEX_EDIT_ACCESS_PATHS = {
    // Keep only chair markers for now; add actual annex access paths back here.
    '844,215': { node:'annex_toby_talk', points:[pt(844,215)] },
    '855,241': { node:'annex_toby_join', points:[pt(855,241), pt(822,241)] },
    '858,303': { node:'annex_ryan_access', points:[pt(858,303), pt(802,303)] },
    '858,332': { node:'annex_kelly_access', points:[pt(858,332), pt(802,332)] },
    '816,282': { node:'annex_ryan_talk', points:[pt(816,282)] },
    '816,350': { node:'annex_kelly_talk', points:[pt(816,350)] },
    '826,391': { node:'annex_holly_talk', points:[pt(826,391)] },
    '725,190': { node:'annex_top_seat_725', points:[pt(725,190)] },
    '760,190': { node:'annex_top_seat_760', points:[pt(760,190)] },
    '795,190': { node:'annex_top_seat_795', points:[pt(795,190)] },
    '725,232': { node:'annex_bottom_seat_725', points:[pt(725,232)] },
    '760,232': { node:'annex_bottom_seat_760', points:[pt(760,232)] },
    '795,232': { node:'annex_bottom_seat_795', points:[pt(795,232)] },
  };

  const ANNEX_EDIT_VISIT_SPOTS = {
    // Start blank and add annex talk/report spots here one by one.
    '855,241': { x:844, y:215, room:null },
    '858,303': { x:816, y:282, room:null },
    '858,332': { x:816, y:350, room:null },
    '855,391': { x:826, y:391, room:null },
  };

  const KITCHEN_EDIT_WALK_NODES = {
    // Start blank and add kitchen-local lane nodes here one by one.
    kitchen_left_in:   { x:426, y:278, links:['kitchen_west', 'kitchen_left_mid'] },
    kitchen_left_mid:  { x:449, y:278, links:['kitchen_left_in', 'kitchen_up_1', 'kitchen_mens_top'] },
    kitchen_up_1:      { x:449, y:224, links:['kitchen_left_mid', 'kitchen_table_west'] },
    kitchen_table_west:{ x:574, y:224, links:['kitchen_up_1', 'kitchen_table_drop'] },
    kitchen_table_drop:{ x:574, y:278, links:['kitchen_table_west', 'kitchen_mens_top', 'kitchen_womens_top'] },
    kitchen_mens_top:  { x:472, y:278, links:['kitchen_left_mid', 'kitchen_table_drop', 'mens_out'] },
    kitchen_womens_top:{ x:600, y:278, links:['kitchen_table_drop', 'kitchen_bottom_access', 'womens_out'] },
    kitchen_bottom_access:{ x:625, y:278, links:['kitchen_womens_top', 'kitchen_right_access'] },
    kitchen_right_access:{ x:648, y:278, links:['kitchen_bottom_access', 'kitchen_in'] },
  };

  const KITCHEN_EDIT_ACCESS_PATHS = {
    // Keep only the actual kitchen chair markers for now.
    '625,198': { node:'kitchen_table_west', points:[pt(625,198), pt(574,224)] },
    '648,220': { node:'kitchen_right_access', points:[pt(648,220), pt(648,278)] },
    '625,244': { node:'kitchen_bottom_access', points:[pt(625,244), pt(625,278)] },
    '600,220': { node:'kitchen_table_west', points:[pt(600,220), pt(574,220), pt(574,224)] },
  };

  const KITCHEN_EDIT_VISIT_SPOTS = {
    // Start blank and add kitchen talk/report spots here one by one.
  };

  // Fixed walk graph derived from the annotated yellow-path image so movement
  // stays on the intended lanes instead of cutting room-to-room directly.
  const WALK_GRAPH = {
    michael_in:         { x:200, y:150, links:['michael_out'] },
    michael_out:        { x:200, y:172, links:['michael_in', 'bullpen_michael_door_junction'] },

    conference_in:      { x:256, y:150, links:['conference_out'] },
    conference_out:     { x:256, y:172, links:['conference_in', 'bullpen_conference_door_junction'] },
    ...BULLPEN_EDIT_WALK_NODES,

    darryl_in:          { x:317, y:310, links:['darryl_out'] },
    darryl_out:         { x:317, y:288, links:['darryl_in', 'bullpen_darryl_junction'] },
    mens_in:            { x:472, y:310, links:['mens_out', 'mens_sink_top'] },
    mens_sink_top:      { x:472, y:334, links:['mens_in', 'mens_sink_mid'] },
    mens_sink_mid:      { x:472, y:356, links:['mens_sink_top', 'mens_sink_bot'] },
    mens_sink_bot:      { x:472, y:378, links:['mens_sink_mid', 'mens_lane'] },
    mens_lane:          { x:472, y:390, links:['mens_sink_bot', 'mens_stalls_left', 'mens_stalls_right'] },
    mens_stalls_left:   { x:444, y:390, links:['mens_lane'] },
    mens_stalls_right:  { x:500, y:390, links:['mens_lane'] },
    mens_out:           { x:472, y:288, links:['mens_in', 'kitchen_mens_top'] },
    womens_in:          { x:600, y:310, links:['womens_out', 'womens_sink_top'] },
    womens_sink_top:    { x:600, y:334, links:['womens_in', 'womens_sink_mid'] },
    womens_sink_mid:    { x:600, y:356, links:['womens_sink_top', 'womens_sink_bot'] },
    womens_sink_bot:    { x:600, y:378, links:['womens_sink_mid', 'womens_lane'] },
    womens_lane:        { x:600, y:390, links:['womens_sink_bot', 'womens_stalls_left', 'womens_stalls_right'] },
    womens_stalls_left: { x:572, y:390, links:['womens_lane'] },
    womens_stalls_right:{ x:628, y:390, links:['womens_lane'] },
    womens_out:         { x:600, y:288, links:['womens_in', 'kitchen_womens_top'] },

    kitchen_west:       { x:395, y:278, links:['kitchen_left_in'] },
    kitchen_in:         { x:658, y:278, links:['kitchen_womens_top', 'kitchen_out'] },
    kitchen_out:        { x:690, y:278, links:['kitchen_in', 'annex_bottom_trunk'] },

    corridor_annex:     { x:690, y:170, links:['corridor_break', 'annex_top_725', 'annex_bottom_trunk'] },
    corridor_break:     { x:690, y:102, links:['corridor_annex', 'break_out', 'stairs_out'] },
    break_out:          { x:710, y:102, links:['corridor_break', 'break_in'] },
    break_in:           { x:728, y:102, links:['break_out', 'break_stub_1'] },
    ...BREAKROOM_EDIT_WALK_NODES,
    stairs_out:         { x:690, y:72,  links:['corridor_break', 'stairs_in'] },
    stairs_in:          { x:658, y:72,  links:['stairs_out'] },

    ...KITCHEN_EDIT_WALK_NODES,
    ...ANNEX_EDIT_WALK_NODES,
  };
  for (const node of Object.values(WALK_GRAPH)) {
    node.links = [...new Set((node.links || []).filter(next => !!WALK_GRAPH[next]))];
  }
  for (const [nodeId, node] of Object.entries(WALK_GRAPH)) {
    for (const next of node.links) {
      if (!WALK_GRAPH[next].links.includes(nodeId)) WALK_GRAPH[next].links.push(nodeId);
    }
  }

  const ROOM_ENTRY_NODE = {
    michael: 'michael_in',
    conference: 'conference_in',
    kitchen: 'kitchen_in',
    breakroom: 'break_in',
    annex: 'corridor_annex',
    darryl: 'darryl_in',
    mens: 'mens_in',
    womens: 'womens_in',
    stairs: 'stairs_in',
  };

  const OPEN_FLOOR_NODES = [
    'darryl_out', 'mens_out', 'womens_out',
    'kitchen_west', 'kitchen_in', 'kitchen_out',
    ...Object.keys(BULLPEN_EDIT_WALK_NODES),
    ...Object.keys(BREAKROOM_EDIT_WALK_NODES),
    ...Object.keys(KITCHEN_EDIT_WALK_NODES),
    ...Object.keys(ANNEX_EDIT_WALK_NODES),
  ];
  const ACCESS_PATHS = {
    '120,128':  { node:'michael_in',     points:[pt(120,128), pt(200,128), pt(200,150)] },
    '150,58':   { node:'michael_in',     points:[pt(150,58), pt(150,74), pt(200,74), pt(200,150)] },
    '150,128':  { node:'michael_in',     points:[pt(150,128), pt(200,128), pt(200,150)] },
    '180,128':  { node:'michael_in',     points:[pt(180,128), pt(200,128), pt(200,150)] },
    '200,128':  { node:'michael_in',     points:[pt(200,128), pt(200,150)] },
    '200,140':  { node:'michael_in',     points:[pt(200,140), pt(200,150)] },

    '264,75':   { node:'conference_in',  points:[pt(264,75), pt(264,108), pt(256,108), pt(256,150)] },
    '290,42':   { node:'conference_in',  points:[pt(290,42), pt(264,42), pt(264,108), pt(256,108), pt(256,150)] },
    '290,60':   { node:'conference_in',  points:[pt(290,60), pt(264,60), pt(264,108), pt(256,108), pt(256,150)] },
    '290,144':  { node:'conference_in',  points:[pt(290,144), pt(256,144), pt(256,150)] },
    '320,42':   { node:'conference_in',  points:[pt(320,42), pt(264,42), pt(264,108), pt(256,108), pt(256,150)] },
    '320,108':  { node:'conference_in',  points:[pt(320,108), pt(320,144), pt(256,144), pt(256,150)] },
    '320,144':  { node:'conference_in',  points:[pt(320,144), pt(256,144), pt(256,150)] },
    '350,42':   { node:'conference_in',  points:[pt(350,42), pt(376,42), pt(376,108), pt(256,108), pt(256,150)] },
    '350,144':  { node:'conference_in',  points:[pt(350,144), pt(256,144), pt(256,150)] },
    '376,75':   { node:'conference_in',  points:[pt(376,75), pt(376,108), pt(256,108), pt(256,150)] },

    '342,382':  { node:'darryl_in',     points:[pt(342,382), pt(302,382), pt(302,338), pt(317,338), pt(317,310)] },
    '342,338':  { node:'darryl_in',     points:[pt(342,338), pt(317,338), pt(317,310)] },
    '427,334':  { node:'mens_sink_top', points:[pt(427,334), pt(472,334)] },
    '427,356':  { node:'mens_sink_mid', points:[pt(427,356), pt(472,356)] },
    '427,378':  { node:'mens_sink_bot', points:[pt(427,378), pt(472,378)] },
    '444,418':  { node:'mens_stalls_left', points:[pt(444,418), pt(444,390)] },
    '472,418':  { node:'mens_lane',     points:[pt(472,418), pt(472,390)] },
    '500,418':  { node:'mens_stalls_right', points:[pt(500,418), pt(500,390)] },
    '556,356':  { node:'womens_sink_mid', points:[pt(556,356), pt(600,356)] },
    '556,378':  { node:'womens_sink_bot', points:[pt(556,378), pt(600,378)] },
    '642,334':  { node:'womens_sink_top', points:[pt(642,334), pt(600,334)] },
    '642,356':  { node:'womens_sink_mid', points:[pt(642,356), pt(600,356)] },
    '642,378':  { node:'womens_sink_bot', points:[pt(642,378), pt(600,378)] },
    '572,418':  { node:'womens_stalls_left', points:[pt(572,418), pt(572,390)] },
    '600,418':  { node:'womens_lane',   points:[pt(600,418), pt(600,390)] },
    '628,418':  { node:'womens_stalls_right', points:[pt(628,418), pt(628,390)] },
    ...BULLPEN_EDIT_ACCESS_PATHS,
    ...BREAKROOM_EDIT_ACCESS_PATHS,
    ...KITCHEN_EDIT_ACCESS_PATHS,
    ...ANNEX_EDIT_ACCESS_PATHS,
  };

  const VISIT_SPOTS = {
    '342,382':  { x:342, y:338, room:'darryl' },
    '290,42':   { x:290, y:144, room:'conference' },
    '320,42':   { x:320, y:144, room:'conference' },
    '320,108':  { x:320, y:144, room:'conference' },
    '350,42':   { x:350, y:144, room:'conference' },
    '376,75':   { x:350, y:144, room:'conference' },
    '264,75':   { x:290, y:144, room:'conference' },
    ...BULLPEN_EDIT_VISIT_SPOTS,
    ...BREAKROOM_EDIT_VISIT_SPOTS,
    ...KITCHEN_EDIT_VISIT_SPOTS,
    ...ANNEX_EDIT_VISIT_SPOTS,
  };

  function pointKey(pos) {
    return `${Math.round(pos.x)},${Math.round(pos.y)}`;
  }

  function nodePoint(nodeId) {
    const n = WALK_GRAPH[nodeId];
    return pt(n.x, n.y);
  }

  function pathDistance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function nearestOpenFloorNode(pos) {
    let best = OPEN_FLOOR_NODES[0];
    let bestDist = Infinity;
    for (const nodeId of OPEN_FLOOR_NODES) {
      const d = pathDistance(pos, WALK_GRAPH[nodeId]);
      if (d < bestDist) { best = nodeId; bestDist = d; }
    }
    return best;
  }

  function getAnchor(pos, room) {
    const exact = ACCESS_PATHS[pointKey(pos)];
    if (exact) {
      if (exact.node && exact.points && exact.points.length === 1) {
        const anchorNode = nodePoint(exact.node);
        const p = exact.points[0];
        if (Math.abs(p.x - anchorNode.x) > 0.5 || Math.abs(p.y - anchorNode.y) > 0.5) {
          return {
            node: exact.node,
            points: [pt(p.x, p.y), anchorNode],
          };
        }
      }
      return exact;
    }
    const node = (room && ROOM_ENTRY_NODE[room]) || nearestOpenFloorNode(pos);
    return {
      node,
      points: [pt(pos.x, pos.y), nodePoint(node)],
    };
  }

  function getVisitSpot(target) {
    const key = pointKey(target.home);
    if (VISIT_SPOTS[key]) return VISIT_SPOTS[key];
    const gap = 38;
    const face = target.homeFace || 'S';
    if (face === 'N') return { x: target.home.x, y: target.home.y - gap, room: target.homeRoom };
    if (face === 'S') return { x: target.home.x, y: target.home.y + gap, room: target.homeRoom };
    if (face === 'E') return { x: target.home.x + gap, y: target.home.y, room: target.homeRoom };
    return { x: target.home.x - gap, y: target.home.y, room: target.homeRoom };
  }

  function shortestGraphPath(startNode, endNode) {
    if (startNode === endNode) return [startNode];
    const dist = new Map([[startNode, 0]]);
    const prev = new Map();
    const open = new Set([startNode]);

    while (open.size) {
      let current = null;
      let best = Infinity;
      for (const nodeId of open) {
        const d = dist.get(nodeId);
        if (d < best) { best = d; current = nodeId; }
      }
      open.delete(current);
      if (current === endNode) break;

      for (const next of WALK_GRAPH[current].links) {
        const cand = best + pathDistance(WALK_GRAPH[current], WALK_GRAPH[next]);
        if (cand < (dist.get(next) ?? Infinity)) {
          dist.set(next, cand);
          prev.set(next, current);
          open.add(next);
        }
      }
    }

    if (!dist.has(endNode)) return [];
    const route = [];
    let cur = endNode;
    while (cur) {
      route.push(cur);
      cur = prev.get(cur);
    }
    return route.reverse();
  }

  function dedupePoints(points) {
    const out = [];
    for (const p of points) {
      if (!out.length || Math.abs(out[out.length - 1].x - p.x) > 0.5 || Math.abs(out[out.length - 1].y - p.y) > 0.5) {
        out.push(pt(p.x, p.y));
      }
    }
    return out;
  }

  function pointInsideBlock(p, block) {
    const pad = block.pad || 0;
    return p.x > block.x - pad && p.x < block.x + block.w + pad &&
      p.y > block.y - pad && p.y < block.y + block.h + pad;
  }

  function segmentIntersectsBlock(a, b, block) {
    if (pointInsideBlock(a, block) || pointInsideBlock(b, block)) return false;

    const pad = block.pad || 0;
    const left = block.x - pad;
    const right = block.x + block.w + pad;
    const top = block.y - pad;
    const bottom = block.y + block.h + pad;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    let t0 = 0;
    let t1 = 1;

    function clip(p, q) {
      if (Math.abs(p) < 0.0001) return q > 0;
      const r = q / p;
      if (p < 0) {
        if (r > t1) return false;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return false;
        if (r < t1) t1 = r;
      }
      return true;
    }

    return clip(-dx, a.x - left) &&
      clip(dx, right - a.x) &&
      clip(-dy, a.y - top) &&
      clip(dy, bottom - a.y) &&
      t0 < t1;
  }

  function segmentBlocked(a, b) {
    for (const block of NAV_BLOCKS) {
      if (segmentIntersectsBlock(a, b, block)) return true;
    }
    return false;
  }

  function isAlmostStraight(a, b, c) {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const bcx = c.x - b.x;
    const bcy = c.y - b.y;
    const cross = Math.abs(abx * bcy - aby * bcx);
    const dot = abx * bcx + aby * bcy;
    return cross < 24 && dot >= -4;
  }

  function smoothPath(points) {
    if (points.length < 3) return points;
    const out = [points[0]];
    for (let i = 1; i < points.length - 1; i++) {
      const prev = out[out.length - 1];
      const cur = points[i];
      const next = points[i + 1];
      const tinyStep = pathDistance(prev, cur) < 3 || pathDistance(cur, next) < 3;
      const combined = pathDistance(prev, next);
      if (combined < 64 && (tinyStep || isAlmostStraight(prev, cur, next)) && !segmentBlocked(prev, next)) continue;
      out.push(cur);
    }
    out.push(points[points.length - 1]);
    return out;
  }

  function expandKitchenRoute(nodeRoute) {
    const route = [...nodeRoute];
    const westIdx = route.indexOf('kitchen_west');
    const annexIdx = route.indexOf('annex_pre');
    if (westIdx === -1 || annexIdx === -1 || Math.abs(annexIdx - westIdx) < 2) return route;

    const forward = westIdx < annexIdx;
    const choices = [
      ['kitchen_mid_n', 'kitchen_east_n'],
      ['kitchen_mid_s', 'kitchen_east_s'],
      ['kitchen_mid_n', 'kitchen_mid_s', 'kitchen_east_s'],
      ['kitchen_mid_s', 'kitchen_mid_n', 'kitchen_east_n'],
      ['kitchen_mid_n', 'kitchen_east_s'],
      ['kitchen_mid_s', 'kitchen_east_n'],
    ];
    const pick = choices[(Math.random() * choices.length) | 0];
    const replacement = forward ? ['kitchen_west', ...pick, 'annex_pre'] : ['annex_pre', ...pick.slice().reverse(), 'kitchen_west'];
    route.splice(Math.min(westIdx, annexIdx), Math.abs(annexIdx - westIdx) + 1, ...replacement);
    return route.filter((nodeId, i) => i === 0 || route[i - 1] !== nodeId);
  }

  // ─── STATE ────────────────────────────────────────────────────
  const agents = {};            // id -> { char, role, home{x,y}, pos{x,y}, target{x,y}|null, state:'idle'|'walking'|'visiting', visitUntil, lastLine, name, roleText, lineText }
  let edges = [];               // from API agent_map.edges
  // queue of handoff events waiting to be animated
  let handoffQueue = [];
  // ts of the newest handoff we've already animated, so we don't replay.
  // null = first fetch; we use it to seed without stampeding.
  let lastHandoffTs = null;
  // per-pair debounce so a {A→B, B→A} ping-pong shows as ONE interaction, not two
  const recentPairs = new Map();
  let rosterMeta = { count:0, total:21 };
  let eventText = 'connecting to agent roster…';
  let tick = 0;
  let lastFetch = 0;
  let apiOK = false;
  let nextSnackAt = Date.now() + SNACK_BREAK_MS;
  let nextBathroomAt = Date.now() + BATHROOM_BREAK_MS;
  let nextFakeHandoffAt = Date.now() + 1200;
  let fakeHandoffSeq = 0;

  for (const id in AGENT_HOME) {
    const h = AGENT_HOME[id];
    agents[id] = {
      id,
      char: CHARS[h.char],
      charKey: h.char,
      role: h.role,
      home: { x: h.x, y: h.y },
      homeRoom: h.room || null,
      homeFace: h.face || 'S',
      pos: { x: h.x, y: h.y },
      target: null,
      waypoints: null,
      wpIdx: 0,
      state: 'idle',
      visitUntil: 0,
      lastLine: '',
      name: id === 'user' ? 'YOU' : id,
      roleText: id === 'user' ? 'Operator' : '',
      lineText: '',
      partner: null,
      seatLockedBy: null,
      breakroomChairKey: null,
      annexChairKey: null,
      kitchenChairKey: null,
      lobbyChairKey: null,
      cooldownUntil: 0,
      activityType: null,
      ambientStage: null,
      ambientUntil: 0,
      ambientRoom: null,
      carryItem: null,
      heldItemUntil: 0,
      completionBubbleUntil: 0,
      visitFace: null,
    };
  }
  agents.user.status = 'user';

  // ─── API FETCH ────────────────────────────────────────────────
  async function fetchRoster() {
    try {
      const r = await fetch(API, { cache: 'no-store' });
      if (!r.ok) throw new Error('bad status ' + r.status);
      const data = await r.json();
      apiOK = true;

      let alive = 0;
      for (const a of data.roster || []) {
        if (!agents[a.id] || a.id === 'user') continue;
        const prev = agents[a.id].status;
        const next = a.status || 'ready';
        // Count a true idle→active transition as an activation for this agent.
        if (prev && IDLE_STATUSES.has(String(prev).toLowerCase()) &&
            !IDLE_STATUSES.has(String(next).toLowerCase())) {
          activationCount[a.id] = (activationCount[a.id] || 0) + 1;
        }
        agents[a.id].name = a.name || a.id;
        agents[a.id].roleText = a.role || '';
        agents[a.id].lineText = a.flavorLine || '';
        agents[a.id].sceneAction = a.sceneAction || '';
        agents[a.id].lastActiveText = a.lastActiveText || '';
        agents[a.id].status = next;
        agents[a.id].partner = a.partner || null;
        alive++;
      }
      rosterMeta.count = alive;
      rosterMeta.total = (data.roster || []).length || 21;

      edges = (data.agent_map && data.agent_map.edges) || [];

      // Handoff event feed (the only event signal we need from the API).
      // Expected shape: [{ ts, from, to, kind? }, ...] where `from`/`to` are
      // agent ids ("main", "agent-0", "agent-3da", ...) or "user".
      // Field is optional; if missing we fall back to status-based heuristics.
      const feed = data.recent_handoffs || data.activity_feed || [];
      if (Array.isArray(feed)) {
        const sorted = feed.slice().sort((a,b) => (a.ts||'').localeCompare(b.ts||''));
        if (lastHandoffTs === null) {
          lastHandoffTs = sorted.length ? (sorted[sorted.length-1].ts || '') : '';
        } else {
          const now = Date.now();
          for (const e of sorted) {
            if ((e.ts || '') <= lastHandoffTs) continue;
            const key = e.from < e.to ? e.from + '|' + e.to : e.to + '|' + e.from;
            const last = recentPairs.get(key) || 0;
            if (now - last < PAIR_DEBOUNCE_MS) continue; // skip the reverse ping-pong
            recentPairs.set(key, now);
            handoffQueue.push(e);
          }
          if (sorted.length) lastHandoffTs = sorted[sorted.length-1].ts || lastHandoffTs;
        }
      }

      // If nobody is walking right now, reset the event text to the resting line
      // (otherwise let the current walk label stay on screen until the walk ends).
      if (!anyAgentBusy()) setRestingEventText();
    } catch (e) {
      apiOK = false;
      eventText = 'offline · cached roster';
    }
  }

  // Used only for the "quiet on the floor" status text.
  const IDLE_STATUSES = new Set(['ready','idle','waiting','offline','unknown','']);

  function anyAgentBusy() {
    for (const id in agents) if (agents[id].state !== 'idle') return true;
    return false;
  }

  function setRestingEventText() {
    eventText = handoffQueue.length > 0
      ? `${rosterMeta.count}/${rosterMeta.total} online · ${handoffQueue.length} pending handoff${handoffQueue.length>1?'s':''}`
      : `${rosterMeta.count}/${rosterMeta.total} online · quiet on the floor`;
  }

  function countWalkingAgents() {
    let walking = 0;
    for (const id in agents) if (agents[id].state === 'walking') walking++;
    return walking;
  }

  // ─── TEST HARNESS: fake traffic injection ────────────────────
  function maybeInjectDebugHandoff() {
    if (!TEST_HARNESS.enabled || !TEST_HARNESS.injectFakeHandoffs) return;
    const now = Date.now();
    if (now < nextFakeHandoffAt) return;
    if (handoffQueue.length >= TEST_HARNESS.fakeQueueLimit) {
      nextFakeHandoffAt = now + 1000;
      return;
    }

    const movable = Object.values(agents).filter(a => a.id !== 'user' && canLeaveDesk(a));
    const seated = Object.values(agents).filter(a => a.id !== 'user' && canReceiveVisitor(a));
    if (movable.length < 1 || seated.length < 2) {
      nextFakeHandoffAt = now + 1000;
      return;
    }

    const kinds = ['handoff', 'review', 'report-back', 'task-assign'];
    let picked = null;
    for (let i = 0; i < 10; i++) {
      const from = randomFrom(movable);
      const destChoices = seated.filter(a => a.id !== from.id);
      if (!destChoices.length) continue;
      const to = randomFrom(destChoices);
      const pairKey = from.id < to.id ? `${from.id}|${to.id}` : `${to.id}|${from.id}`;
      const last = recentPairs.get(pairKey) || 0;
      if (now - last < PAIR_DEBOUNCE_MS) continue;
      if (handoffQueue.some(e => {
        const qFrom = e.from;
        const qTo = e.to;
        return (qFrom === from.id && qTo === to.id) || (qFrom === to.id && qTo === from.id);
      })) continue;
      picked = { from, to, pairKey };
      break;
    }

    if (!picked) {
      nextFakeHandoffAt = now + 1500;
      return;
    }

    recentPairs.set(picked.pairKey, now);
    handoffQueue.push({
      ts: new Date(now + fakeHandoffSeq).toISOString(),
      from: picked.from.id,
      to: picked.to.id,
      kind: randomFrom(kinds),
      debug: true,
    });
    fakeHandoffSeq++;
    nextFakeHandoffAt = now + TEST_HARNESS.fakeHandoffMs;
  }

  // ─── WALK TRIGGER ─────────────────────────────────────────────
  // Purely event-driven. Every scan replans from scratch so user events
  // adapt to whoever's actually free:
  //   user → agent, both idle  → coin flip (half operator walks, half agent)
  //   user → agent, only one free → that one walks
  //   user → agent, neither free  → keep in queue
  //   agent → X, only fires if the agent is free
  function isAtHomeSeat(a) {
    return a.state === 'idle' &&
      !a.seatLockedBy &&
      Math.abs(a.pos.x - a.home.x) < 0.5 &&
      Math.abs(a.pos.y - a.home.y) < 0.5;
  }

  function canReceiveVisitor(a) {
    return !!a && isAtHomeSeat(a);
  }

  function canLeaveDesk(a) {
    return canReceiveVisitor(a) && tick >= (a.cooldownUntil || 0);
  }

  function planWalk(e) {
    const fromA = agents[e.from];
    const toA   = agents[e.to];
    if (!fromA || !toA || fromA === toA) return { drop: true };
    if (e.from === 'user') {
      const uCanMove = canLeaveDesk(fromA);
      const aCanMove = canLeaveDesk(toA);
      const uCanReceive = canReceiveVisitor(fromA);
      const aCanReceive = canReceiveVisitor(toA);
      if (uCanMove && aCanMove && uCanReceive && aCanReceive) {
        return Math.random() < 0.5 ? { mover: fromA, dest: toA } : { mover: toA, dest: fromA };
      }
      if (uCanMove && aCanReceive) return { mover: fromA, dest: toA };
      if (aCanMove && uCanReceive) return { mover: toA, dest: fromA };
      return null;
    }
    if (!canLeaveDesk(fromA) || !canReceiveVisitor(toA)) return null;
    return { mover: fromA, dest: toA };
  }

  function triggerFromActivity() {
    for (let i = 0; i < handoffQueue.length; i++) {
      const e = handoffQueue[i];
      const p = planWalk(e);
      if (p && p.drop) { handoffQueue.splice(i, 1); i--; continue; }
      if (!p) continue;
      handoffQueue.splice(i, 1);
      walkTo(p.mover, p.dest, labelForEvent(e, p.mover, p.dest));
      return true;
    }
    return false;
  }

  function labelForEvent(e, mover, dest) {
    const kind = String(e.kind || '').toLowerCase();
    // Operator direction
    if (mover.role === 'user') return 'handing off a task';
    if (dest.role === 'user')  return kind === 'report-back' ? 'reporting to you' : 'coming to you for the task';
    // Agent ↔ agent
    if (kind === 'review')      return 'review check-in';
    if (kind === 'report-back') return 'reporting back';
    if (kind === 'handoff')     return 'handing off work';
    if (kind === 'task-assign') return 'assigning a task';
    return 'desk check-in';
  }

  // Claim the next free chair in Michael's office. Returns chair index or -1.
  function claimChair(agentId) {
    for (let i = 0; i < chairsOccupied.length; i++) {
      if (chairsOccupied[i] === null) { chairsOccupied[i] = agentId; return i; }
    }
    return -1;
  }
  function releaseChair(agentId) {
    for (let i = 0; i < chairsOccupied.length; i++) {
      if (chairsOccupied[i] === agentId) { chairsOccupied[i] = null; return; }
    }
  }

  function claimBreakroomChair(agentId, targetPos) {
    releaseBreakroomChair(agentId);

    const oppositeRow = BREAKROOM_VISITOR_SEATS.filter(seat =>
      Math.abs(seat.y - targetPos.y) > 8 &&
      !spotOccupied(seat.x, seat.y, agentId) &&
      !breakroomSeatsOccupied.has(pointKey(seat)) &&
      (Math.abs(seat.x - targetPos.x) > 0.5 || Math.abs(seat.y - targetPos.y) > 0.5)
    );
    const sameRow = BREAKROOM_VISITOR_SEATS.filter(seat =>
      Math.abs(seat.y - targetPos.y) <= 8 &&
      !spotOccupied(seat.x, seat.y, agentId) &&
      !breakroomSeatsOccupied.has(pointKey(seat)) &&
      (Math.abs(seat.x - targetPos.x) > 0.5 || Math.abs(seat.y - targetPos.y) > 0.5)
    );
    const options = oppositeRow.length ? oppositeRow : sameRow;
    if (!options.length) return null;

    let best = options[0];
    let bestDist = pathDistance(best, targetPos);
    for (const seat of options.slice(1)) {
      const d = pathDistance(seat, targetPos);
      if (d < bestDist) {
        best = seat;
        bestDist = d;
      }
    }
    breakroomSeatsOccupied.set(pointKey(best), agentId);
    return best;
  }

  function releaseBreakroomChair(agentId) {
    for (const [key, owner] of breakroomSeatsOccupied.entries()) {
      if (owner === agentId) {
        breakroomSeatsOccupied.delete(key);
        return;
      }
    }
  }

  function chooseBreakroomStandingSpot(targetPos) {
    let best = BREAKROOM_STANDING_SPOTS[0];
    let bestDist = pathDistance(best, targetPos);
    for (const spot of BREAKROOM_STANDING_SPOTS.slice(1)) {
      const d = pathDistance(spot, targetPos);
      if (d < bestDist) {
        best = spot;
        bestDist = d;
      }
    }
    return best;
  }

  function claimAnnexChair(agentId, targetPos) {
    releaseAnnexChair(agentId);

    const oppositeRow = ANNEX_VISITOR_SEATS.filter(seat =>
      Math.abs(seat.y - targetPos.y) > 8 &&
      !spotOccupied(seat.x, seat.y, agentId) &&
      !annexSeatsOccupied.has(pointKey(seat)) &&
      (Math.abs(seat.x - targetPos.x) > 0.5 || Math.abs(seat.y - targetPos.y) > 0.5)
    );
    const sameRow = ANNEX_VISITOR_SEATS.filter(seat =>
      Math.abs(seat.y - targetPos.y) <= 8 &&
      !spotOccupied(seat.x, seat.y, agentId) &&
      !annexSeatsOccupied.has(pointKey(seat)) &&
      (Math.abs(seat.x - targetPos.x) > 0.5 || Math.abs(seat.y - targetPos.y) > 0.5)
    );
    const options = oppositeRow.length ? oppositeRow : sameRow;
    if (!options.length) return null;

    let best = options[0];
    let bestDist = pathDistance(best, targetPos);
    for (const seat of options.slice(1)) {
      const d = pathDistance(seat, targetPos);
      if (d < bestDist) {
        best = seat;
        bestDist = d;
      }
    }
    annexSeatsOccupied.set(pointKey(best), agentId);
    return best;
  }

  function releaseAnnexChair(agentId) {
    for (const [key, owner] of annexSeatsOccupied.entries()) {
      if (owner === agentId) {
        annexSeatsOccupied.delete(key);
        return;
      }
    }
  }

  function chooseAnnexStandingSpot(targetPos) {
    let best = ANNEX_STANDING_SPOTS[0];
    let bestDist = pathDistance(best, targetPos);
    for (const spot of ANNEX_STANDING_SPOTS.slice(1)) {
      const d = pathDistance(spot, targetPos);
      if (d < bestDist) {
        best = spot;
        bestDist = d;
      }
    }
    return best;
  }

  function claimKitchenChair(agentId, targetPos) {
    releaseKitchenChair(agentId);

    const options = KITCHEN_VISITOR_SEATS.filter(seat =>
      !spotOccupied(seat.x, seat.y, agentId) &&
      !kitchenSeatsOccupied.has(pointKey(seat)) &&
      (Math.abs(seat.x - targetPos.x) > 0.5 || Math.abs(seat.y - targetPos.y) > 0.5)
    );
    if (!options.length) return null;

    let best = options[0];
    let bestDist = pathDistance(best, targetPos);
    for (const seat of options.slice(1)) {
      const d = pathDistance(seat, targetPos);
      if (d < bestDist) {
        best = seat;
        bestDist = d;
      }
    }
    kitchenSeatsOccupied.set(pointKey(best), agentId);
    return best;
  }

  function releaseKitchenChair(agentId) {
    for (const [key, owner] of kitchenSeatsOccupied.entries()) {
      if (owner === agentId) {
        kitchenSeatsOccupied.delete(key);
        return;
      }
    }
  }

  function claimLobbyChair(agentId, targetPos) {
    releaseLobbyChair(agentId);

    const options = LOBBY_COUCH_SEATS.filter(seat =>
      !spotOccupied(seat.x, seat.y, agentId) &&
      !lobbySeatsOccupied.has(pointKey(seat)) &&
      (Math.abs(seat.x - targetPos.x) > 0.5 || Math.abs(seat.y - targetPos.y) > 0.5)
    );
    if (!options.length) return null;

    let best = options[0];
    let bestDist = pathDistance(best, targetPos);
    for (const seat of options.slice(1)) {
      const d = pathDistance(seat, targetPos);
      if (d < bestDist) {
        best = seat;
        bestDist = d;
      }
    }
    lobbySeatsOccupied.set(pointKey(best), agentId);
    return best;
  }

  function releaseLobbyChair(agentId) {
    for (const [key, owner] of lobbySeatsOccupied.entries()) {
      if (owner === agentId) {
        lobbySeatsOccupied.delete(key);
        return;
      }
    }
  }

  function chooseLobbyStandingSpot(targetPos) {
    let best = LOBBY_STANDING_SPOTS[0];
    let bestDist = pathDistance(best, targetPos);
    for (const spot of LOBBY_STANDING_SPOTS.slice(1)) {
      const d = pathDistance(spot, targetPos);
      if (d < bestDist) {
        best = spot;
        bestDist = d;
      }
    }
    return best;
  }

  function releaseVisitSeat(a) {
    if (a.chairIdx != null) {
      releaseChair(a.id);
      a.chairIdx = null;
    }
    if (a.breakroomChairKey) {
      releaseBreakroomChair(a.id);
      a.breakroomChairKey = null;
    }
    if (a.annexChairKey) {
      releaseAnnexChair(a.id);
      a.annexChairKey = null;
    }
    if (a.kitchenChairKey) {
      releaseKitchenChair(a.id);
      a.kitchenChairKey = null;
    }
    if (a.lobbyChairKey) {
      releaseLobbyChair(a.id);
      a.lobbyChairKey = null;
    }
    a.visitFace = null;
  }

  const WOMENS_ROOM_CHARS = new Set(['pam', 'angela', 'erin', 'phyllis', 'meredith', 'kelly', 'holly', 'jan']);
  const BREAKROOM_VENDOR = { x:878, y:56, room:'breakroom' };
  const BATHROOM_SINKS = {
    mens:   [pt(427,334), pt(427,356), pt(427,378)],
    womens: [pt(642,334), pt(642,356), pt(642,378)],
  };
  const BATHROOM_TOILETS = {
    mens:   [pt(444,418), pt(472,418), pt(500,418)],
    womens: [pt(572,418), pt(600,418), pt(628,418)],
  };
  const BATHROOM_COUCH_SEATS = {
    womens: [pt(556,356), pt(556,378)],
    lobby: LOBBY_COUCH_SEATS.map(seat => pt(seat.x, seat.y)),
  };
  const TOILET_SPOT_KEYS = new Set();
  for (const room of Object.values(BATHROOM_TOILETS)) {
    for (const spot of room) TOILET_SPOT_KEYS.add(pointKey(spot));
  }
  const COUCH_SEAT_KEYS = new Set();
  for (const room of Object.values(BATHROOM_COUCH_SEATS)) {
    for (const spot of room) COUCH_SEAT_KEYS.add(pointKey(spot));
  }

  function isToiletSpot(pos) {
    return !!pos && TOILET_SPOT_KEYS.has(pointKey(pos));
  }
  function isCouchSeat(pos) {
    return !!pos && COUCH_SEAT_KEYS.has(pointKey(pos));
  }
  const SNACK_ITEMS = [
    { kind:'chips', body:'#D8B24A', accent:'#B64530' },
    { kind:'cola', body:'#B83737', accent:'#F1E7D0' },
    { kind:'soda', body:'#3F88D8', accent:'#F4F7FA' },
  ];

  function randomFrom(list) {
    return list[(Math.random() * list.length) | 0];
  }

  function clearAmbientState(a) {
    a.activityType = null;
    a.ambientStage = null;
    a.ambientUntil = 0;
    a.ambientRoom = null;
  }

  function startAmbientTravel(agent, destPos, destRoom, activityType, stage, label) {
    const path = buildPath(agent.pos, agent.homeRoom, destPos, destRoom);
    if (!path.length) return false;
    agent.waypoints = path;
    agent.wpIdx = 0;
    agent.target = {
      x: path[0].x, y: path[0].y,
      finalX: destPos.x, finalY: destPos.y,
      backX: agent.home.x, backY: agent.home.y,
      backRoom: agent.homeRoom,
      partnerRoom: destRoom,
    };
    agent.activityType = activityType;
    agent.ambientStage = stage;
    agent.ambientRoom = destRoom;
    agent.state = 'walking';
    agent.walkPhase = 'ambient';
    agent.standStart = tick;
    agent.completionBubbleUntil = 0;
    eventText = label;
    lastWalkStartTick = tick;
    return true;
  }

  function startAmbientReturn(agent) {
    const backPath = buildPath(agent.pos, agent.ambientRoom || agent.homeRoom, { x: agent.home.x, y: agent.home.y }, agent.homeRoom);
    if (!backPath.length) return false;
    agent.waypoints = backPath;
    agent.wpIdx = 0;
    agent.target = {
      x: backPath[0].x, y: backPath[0].y,
      backX: agent.home.x, backY: agent.home.y,
      backRoom: agent.homeRoom,
      partnerRoom: agent.homeRoom,
    };
    agent.state = 'walking';
    agent.walkPhase = 'ambient';
    agent.standStart = tick;
    agent.ambientStage = 'to-desk';
    return true;
  }

  function startSnackRun(agent) {
    agent.carryItem = null;
    agent.heldItemUntil = 0;
    return startAmbientTravel(agent, BREAKROOM_VENDOR, BREAKROOM_VENDOR.room, 'snack', 'to-vending', `${agent.name} → vending machine`);
  }

  function startBathroomRun(agent) {
    const room = WOMENS_ROOM_CHARS.has(agent.charKey) ? 'womens' : 'mens';
    const sink = randomFrom(BATHROOM_SINKS[room]);
    return startAmbientTravel(agent, sink, room, 'bathroom', 'to-sink', `${agent.name} → ${room === 'womens' ? "women's room" : "men's room"}`);
  }

  let lastWalkStartTick = -STAGGER_TICKS;

  // Build a waypoint list by stitching:
  // seat/table access path → fixed corridor graph → destination access path.
  function buildPath(startPos, fromRoom, destPos, destRoom) {
    const startAnchor = getAnchor(startPos, fromRoom);
    const destAnchor = getAnchor(destPos, destRoom);
    const nodeRoute = expandKitchenRoute(shortestGraphPath(startAnchor.node, destAnchor.node));
    if (!nodeRoute.length) return [];

    const pts = [...startAnchor.points];
    for (const nodeId of nodeRoute.slice(1, -1)) {
      pts.push(nodePoint(nodeId));
    }
    pts.push(...destAnchor.points.slice().reverse());

    const cleaned = dedupePoints(pts);
    if (cleaned.length && Math.abs(cleaned[0].x - startPos.x) < 0.5 && Math.abs(cleaned[0].y - startPos.y) < 0.5) {
      cleaned.shift();
    }
    if (!cleaned.length || Math.abs(cleaned[cleaned.length - 1].x - destPos.x) > 0.5 || Math.abs(cleaned[cleaned.length - 1].y - destPos.y) > 0.5) {
      cleaned.push(pt(destPos.x, destPos.y));
    }
    return cleaned;
  }

  function walkTo(from, to, label) {
    let tx, ty, destRoom;
    releaseVisitSeat(from);
    if (to.role === 'user') {
      // Visitor in Michael's office → claim next open chair, or stand if full
      const idx = claimChair(from.id);
      if (idx >= 0) {
        tx = MICHAEL_CHAIRS[idx].x;
        ty = MICHAEL_CHAIRS[idx].y;
        from.chairIdx = idx;
      } else {
        tx = MICHAEL_STANDING.x; ty = MICHAEL_STANDING.y;
        from.chairIdx = null;
      }
      destRoom = 'michael';
      from.breakroomChairKey = null;
      from.annexChairKey = null;
      from.kitchenChairKey = null;
      from.lobbyChairKey = null;
    } else if (to.homeRoom === 'lobby') {
      const seat = claimLobbyChair(from.id, to.home);
      if (seat) {
        tx = seat.x;
        ty = seat.y;
        destRoom = seat.room;
        from.breakroomChairKey = null;
        from.annexChairKey = null;
        from.kitchenChairKey = null;
        from.lobbyChairKey = pointKey(seat);
        from.chairIdx = null;
        from.visitFace = seat.face || null;
      } else {
        const visitSpot = chooseLobbyStandingSpot(to.home);
        tx = visitSpot.x;
        ty = visitSpot.y;
        destRoom = visitSpot.room ?? to.homeRoom;
        from.breakroomChairKey = null;
        from.annexChairKey = null;
        from.kitchenChairKey = null;
        from.lobbyChairKey = null;
        from.chairIdx = null;
        from.visitFace = visitSpot.face || null;
      }
    } else if (to.homeRoom === 'breakroom') {
      const seat = claimBreakroomChair(from.id, to.home);
      if (seat) {
        tx = seat.x;
        ty = seat.y;
        destRoom = seat.room;
        from.breakroomChairKey = pointKey(seat);
        from.annexChairKey = null;
        from.kitchenChairKey = null;
        from.lobbyChairKey = null;
        from.chairIdx = null;
        from.visitFace = seat.face || null;
      } else {
        const visitSpot = chooseBreakroomStandingSpot(to.home);
        tx = visitSpot.x;
        ty = visitSpot.y;
        destRoom = visitSpot.room ?? to.homeRoom;
        from.breakroomChairKey = null;
        from.annexChairKey = null;
        from.kitchenChairKey = null;
        from.lobbyChairKey = null;
        from.chairIdx = null;
        from.visitFace = visitSpot.face || null;
      }
    } else if (to.homeRoom === 'annex') {
      const seat = claimAnnexChair(from.id, to.home);
      if (seat) {
        tx = seat.x;
        ty = seat.y;
        destRoom = seat.room;
        from.breakroomChairKey = null;
        from.annexChairKey = pointKey(seat);
        from.kitchenChairKey = null;
        from.lobbyChairKey = null;
        from.chairIdx = null;
        from.visitFace = seat.face || null;
      } else {
        const visitSpot = chooseAnnexStandingSpot(to.home);
        tx = visitSpot.x;
        ty = visitSpot.y;
        destRoom = visitSpot.room ?? to.homeRoom;
        from.breakroomChairKey = null;
        from.annexChairKey = null;
        from.kitchenChairKey = null;
        from.lobbyChairKey = null;
        from.chairIdx = null;
        from.visitFace = visitSpot.face || null;
      }
    } else if (to.homeRoom === 'kitchen') {
      const seat = claimKitchenChair(from.id, to.home);
      if (seat) {
        tx = seat.x;
        ty = seat.y;
        destRoom = seat.room;
        from.breakroomChairKey = null;
        from.annexChairKey = null;
        from.kitchenChairKey = pointKey(seat);
        from.lobbyChairKey = null;
        from.chairIdx = null;
        from.visitFace = seat.face || null;
      } else {
        const visitSpot = getVisitSpot(to);
        tx = visitSpot.x;
        ty = visitSpot.y;
        destRoom = visitSpot.room ?? to.homeRoom;
        from.breakroomChairKey = null;
        from.annexChairKey = null;
        from.kitchenChairKey = null;
        from.lobbyChairKey = null;
        from.chairIdx = null;
      }
    } else {
      const visitSpot = getVisitSpot(to);
      tx = visitSpot.x;
      ty = visitSpot.y;
      destRoom = visitSpot.room ?? to.homeRoom;
      from.breakroomChairKey = null;
      from.annexChairKey = null;
      from.kitchenChairKey = null;
      from.lobbyChairKey = null;
      from.chairIdx = null;
    }
    const destPos = { x: tx, y: ty };
    const path = buildPath(from.home, from.homeRoom, destPos, destRoom);
    if (!path.length) {
      releaseVisitSeat(from);
      return;
    }
    to.seatLockedBy = from.id;
    from.waypoints = path;
    from.wpIdx = 0;
    from.target = {
      x: path[0].x, y: path[0].y,
      finalX: destPos.x, finalY: destPos.y,
      backX: from.home.x, backY: from.home.y,
      backRoom: from.homeRoom,
      partnerRoom: destRoom,
      partnerId: to.id
    };
    from.visitDest = to;
    from.activityType = 'visit';
    from.ambientStage = null;
    from.ambientRoom = destRoom;
    from.state = 'walking';
    from.walkPhase = 'to';
    from.standStart = tick;
    eventText = `${from.name} → ${to.name} · ${label}`;
    lastWalkStartTick = tick;
  }

  // ─── ANIMATION LOOP ───────────────────────────────────────────
  function stepAgents() {
    for (const id in agents) {
      const a = agents[id];
      if (a.state === 'walking') {
        const dx = a.target.x - a.pos.x;
        const dy = a.target.y - a.pos.y;
        const d = Math.hypot(dx, dy);
        if (d < SPEED) {
          a.pos.x = a.target.x; a.pos.y = a.target.y;
          const completedPhase = a.walkPhase;
          // advance to next waypoint if any
          if (a.waypoints && a.wpIdx < a.waypoints.length - 1) {
            a.wpIdx++;
            a.target.x = a.waypoints[a.wpIdx].x;
            a.target.y = a.waypoints[a.wpIdx].y;
          } else if (a.walkPhase === 'to') {
            // final destination reached — start the two-phase visit
            a.state = 'visiting';
            a.visitPhase = 'talking';
            a.talkUntil  = tick + 150;
            a.replyUntil = tick + 300;
          } else if (a.walkPhase === 'ambient') {
            a.target = null;
            a.waypoints = null;
            if (a.activityType === 'snack') {
              if (a.ambientStage === 'to-vending') {
                a.state = 'ambient';
                a.ambientStage = 'buying';
                a.ambientUntil = tick + SNACK_PICKUP_TICKS;
                a.carryItem = { ...randomFrom(SNACK_ITEMS) };
                eventText = `${a.name} → grabbing a snack`;
              } else if (a.ambientStage === 'to-desk') {
                a.state = 'ambient';
                a.ambientStage = 'consuming';
                a.ambientUntil = tick + DESK_SNACK_TICKS;
                a.heldItemUntil = tick + DESK_SNACK_TICKS;
                eventText = `${a.name} → back at their desk`;
              }
            } else if (a.activityType === 'bathroom') {
              if (a.ambientStage === 'to-sink') {
                a.state = 'ambient';
                a.ambientStage = 'washing';
                a.ambientUntil = tick + HAND_WASH_TICKS;
                eventText = `${a.name} → washing up`;
              } else if (a.ambientStage === 'to-desk') {
                a.state = 'idle';
                a.visitDest = null;
                clearAmbientState(a);
                if (!anyAgentBusy()) setRestingEventText();
              }
            }
          } else {
            // back home
            a.state = 'idle';
            a.target = null;
            a.waypoints = null;
            a.visitDest = null;
            if (completedPhase === 'back') {
              a.cooldownUntil = tick + POST_VISIT_COOLDOWN_TICKS;
            }
            clearAmbientState(a);
            releaseVisitSeat(a);
            if (!anyAgentBusy()) setRestingEventText();
          }
        } else {
          a.pos.x += dx/d*SPEED;
          a.pos.y += dy/d*SPEED;
        }
      } else if (a.state === 'visiting') {
        if (a.visitPhase === 'talking' && tick >= a.talkUntil) {
          a.visitPhase = 'replying';
        }
        if (tick >= a.replyUntil) {
          if (a.visitDest) {
            a.visitDest.seatLockedBy = null;
            a.visitDest.cooldownUntil = tick + POST_VISIT_COOLDOWN_TICKS;
          }
          // Build the reverse path back through the doors to home
          const backPath = buildPath(a.pos, a.target.partnerRoom, { x: a.target.backX, y: a.target.backY }, a.target.backRoom);
          if (!backPath.length) {
            a.state = 'idle';
            a.visitDest = null;
            clearAmbientState(a);
            releaseVisitSeat(a);
            if (!anyAgentBusy()) setRestingEventText();
            continue;
          }
          a.waypoints = backPath;
          a.wpIdx = 0;
          a.target = {
            x: backPath[0].x, y: backPath[0].y,
            backX: a.target.backX, backY: a.target.backY,
            backRoom: a.target.backRoom,
          };
          a.walkPhase = 'back';
          a.state = 'walking';
          a.standStart = tick;
        }
      } else if (a.state === 'ambient' && tick >= a.ambientUntil) {
        if (a.activityType === 'snack' && a.ambientStage === 'buying') {
          if (!startAmbientReturn(a)) {
            a.carryItem = null;
            a.state = 'idle';
            clearAmbientState(a);
            if (!anyAgentBusy()) setRestingEventText();
          }
        } else if (a.activityType === 'bathroom' && a.ambientStage === 'washing') {
          if (!startAmbientReturn(a)) {
            a.state = 'idle';
            clearAmbientState(a);
            if (!anyAgentBusy()) setRestingEventText();
          }
        } else if (a.activityType === 'snack' && a.ambientStage === 'consuming') {
          a.carryItem = null;
          a.heldItemUntil = 0;
          a.completionBubbleUntil = tick + COMPLETION_BUBBLE_TICKS;
          a.state = 'idle';
          clearAmbientState(a);
          if (!anyAgentBusy()) setRestingEventText();
        }
      }
    }
  }

  // Purely event-driven, with a stagger so starts are spaced out enough to
  // follow along. Never overlaps more than a small number of walkers at once.
  function maybeTriggerWalk() {
    if (handoffQueue.length === 0) return;
    if (tick - lastWalkStartTick < STAGGER_TICKS) return;
    if (countWalkingAgents() >= MAX_CONCURRENT_WALKING) return;
    triggerFromActivity();
  }

  // ─── ROAMING (Roy, Wallace, Gabe) ─────────────────────────────
  // Roaming is not a passive timer — it's driven by real agent activations.
  // Every time an agent's API status flips from idle → active, we count one
  // "activation". On their 2nd activation (and with a 10-minute per-agent
  // cooldown), the character picks a different free seat from their list and
  // walks there. That becomes their new home until the next roam.
  const ROAMERS = new Set(['agent-9da', 'agent-1', 'agent-8da']);
  const ROAM_ACTIVATIONS_NEEDED = 2;
  const ROAM_COOLDOWN_MS = 10 * 60 * 1000;      // 10 minutes per character
  const activationCount = {};
  const lastRoamMs = {};

  // Returns true if any OTHER agent currently sits at (x,y) within 6px.
  function spotOccupied(x, y, ignoreId) {
    for (const id in agents) {
      if (id === ignoreId) continue;
      const a = agents[id];
      if (Math.abs(a.home.x - x) < 8 && Math.abs(a.home.y - y) < 8) return true;
    }
    return false;
  }

  // Returns true if anyone is currently walking TO this agent or visiting them.
  function isBeingVisited(targetId) {
    for (const id in agents) {
      const a = agents[id];
      if (a.state === 'walking' || a.state === 'visiting') {
        if (a.target && a.target.partnerId === targetId) return true;
        if (a.visitDest && a.visitDest.id === targetId) return true;
      }
    }
    return false;
  }

  function isQueuedForHandoff(agentId) {
    return handoffQueue.some(e => e.from === agentId || e.to === agentId);
  }

  function roamTo(from, spot) {
    const destPos = { x: spot.x, y: spot.y };
    const path = buildPath(from.home, from.homeRoom, destPos, spot.room);
    if (!path.length) return;
    from.waypoints = path;
    from.wpIdx = 0;
    from.target = {
      x: path[0].x, y: path[0].y,
      finalX: destPos.x, finalY: destPos.y,
      backX: spot.x, backY: spot.y,
      backRoom: spot.room,
      partnerRoom: spot.room,
      roaming: true,
    };
    from.activityType = 'roam';
    from.ambientStage = null;
    from.ambientRoom = spot.room;
    from.state = 'walking';
    from.walkPhase = 'roam';
    from.standStart = tick;
    // New permanent home — update BEFORE walk so other walkers already-in-flight
    // still target the old pos (captured in their own target), and any NEW
    // walks see the new home.
    from.home = { x: spot.x, y: spot.y };
    from.homeRoom = spot.room;
    from.homeFace = spot.face || 'S';
    eventText = `${from.name} → ${spot.label}`;
    lastWalkStartTick = tick;
  }

  function maybeRoam() {
    if (handoffQueue.length > 0) return;
    if (tick - lastWalkStartTick < STAGGER_TICKS) return;
    // never roam while any interaction is in progress
    for (const id in agents) if (agents[id].state !== 'idle') return;
    const now = Date.now();
    for (const roamerId of ROAMERS) {
      const r = agents[roamerId];
      if (!r || !canLeaveDesk(r)) continue;
      if ((activationCount[roamerId] || 0) < ROAM_ACTIVATIONS_NEEDED) continue;
      const last = lastRoamMs[roamerId] || 0;
      if (now - last < ROAM_COOLDOWN_MS) continue;
      if (isBeingVisited(roamerId)) continue;    // never leave a visitor alone
      const spots = ROAM_SPOTS[r.charKey];
      if (!spots || spots.length < 2) continue;
      // filter out current home + any seat another agent is already using
      const options = spots.filter(s =>
        (Math.abs(s.x - r.home.x) > 10 || Math.abs(s.y - r.home.y) > 10) &&
        !spotOccupied(s.x, s.y, roamerId)
      );
      if (options.length === 0) continue;
      const spot = options[(Math.random() * options.length) | 0];
      activationCount[roamerId] = 0;
      lastRoamMs[roamerId] = now;
      roamTo(r, spot);
      return;
    }
  }

  function canStartAmbient(a) {
    return !!a &&
      a.role !== 'user' &&
      !a.activityType &&
      canLeaveDesk(a) &&
      !isBeingVisited(a.id) &&
      !isQueuedForHandoff(a.id);
  }

  function maybeTriggerAmbient() {
    const now = Date.now();
    const availableSlots = MAX_CONCURRENT_WALKING - countWalkingAgents();
    if (availableSlots <= 0) return;

    const eligible = Object.values(agents).filter(canStartAmbient);
    if (eligible.length === 0) return;

    let started = 0;
    const used = new Set();

    if (now >= nextSnackAt) {
      const snacker = randomFrom(eligible);
      if (snacker && startSnackRun(snacker)) {
        used.add(snacker.id);
        started++;
        nextSnackAt = now + SNACK_BREAK_MS;
      }
    }

    if (started < availableSlots && now >= nextBathroomAt) {
      const bathroomChoices = eligible.filter(a => !used.has(a.id));
      const washer = bathroomChoices.length ? randomFrom(bathroomChoices) : null;
      if (washer && startBathroomRun(washer)) {
        used.add(washer.id);
        started++;
        nextBathroomAt = now + BATHROOM_BREAK_MS;
      }
    }
  }

  // ─── RENDER ───────────────────────────────────────────────────
  // hover tooltip
  const tooltipEl = document.getElementById('officeTooltip');
  let spriteBounds = {};

  // ─── TEST HARNESS: lane overlay + legend ─────────────────────
  function drawDebugPathOverlay(c) {
    if (!TEST_HARNESS.enabled || !TEST_HARNESS.showPathOverlay) return;

    function drawSquare(x, y, size, color) {
      c.fillStyle = color;
      c.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
    }

    function drawRing(x, y, r, color) {
      c.strokeStyle = color;
      c.lineWidth = 2;
      c.beginPath();
      c.arc(Math.round(x), Math.round(y), r, 0, Math.PI * 2);
      c.stroke();
    }

    c.save();
    c.lineCap = 'round';
    c.lineJoin = 'round';

    // Fixed walk graph lanes
    c.strokeStyle = 'rgba(64, 220, 255, 0.5)';
    c.lineWidth = 3;
    const seenLinks = new Set();
    for (const [nodeId, node] of Object.entries(WALK_GRAPH)) {
      for (const next of node.links) {
        const key = nodeId < next ? `${nodeId}|${next}` : `${next}|${nodeId}`;
        if (seenLinks.has(key)) continue;
        seenLinks.add(key);
        c.beginPath();
        c.moveTo(node.x, node.y);
        c.lineTo(WALK_GRAPH[next].x, WALK_GRAPH[next].y);
        c.stroke();
      }
    }

    // Seat/table access paths into the lane graph
    c.strokeStyle = 'rgba(255, 208, 84, 0.46)';
    c.lineWidth = 2;
    for (const access of Object.values(ACCESS_PATHS)) {
      if (!access.points || access.points.length < 2) continue;
      c.beginPath();
      c.moveTo(access.points[0].x, access.points[0].y);
      for (let i = 1; i < access.points.length; i++) c.lineTo(access.points[i].x, access.points[i].y);
      c.stroke();
    }

    // Graph nodes
    for (const node of Object.values(WALK_GRAPH)) {
      drawSquare(node.x, node.y, 4, 'rgba(64, 220, 255, 0.9)');
    }

    // Exact anchor points for seats/props/entry spots
    for (const access of Object.values(ACCESS_PATHS)) {
      if (!access.points || !access.points.length) continue;
      const p = access.points[0];
      drawSquare(p.x, p.y, 5, 'rgba(255, 224, 122, 0.9)');
    }

    // Visit/reporting spots
    for (const spot of Object.values(VISIT_SPOTS)) {
      drawRing(spot.x, spot.y, 4, 'rgba(255, 120, 84, 0.9)');
    }

    // Other special destinations: roam spots, vending, sinks, office visitor seats, and room door anchors
    const specialSeen = new Set();
    function markSpecial(x, y, color) {
      const key = `${Math.round(x)},${Math.round(y)},${color}`;
      if (specialSeen.has(key)) return;
      specialSeen.add(key);
      drawSquare(x, y, 6, color);
    }

    for (const spots of Object.values(ROAM_SPOTS)) {
      for (const spot of spots) markSpecial(spot.x, spot.y, 'rgba(120, 255, 152, 0.88)');
    }
    for (const chair of BREAKROOM_VISITOR_SEATS) markSpecial(chair.x, chair.y, 'rgba(120, 255, 152, 0.88)');
    markSpecial(BREAKROOM_VENDOR.x, BREAKROOM_VENDOR.y, 'rgba(120, 255, 152, 0.88)');
    for (const room of Object.values(BATHROOM_SINKS)) {
      for (const sinkSpot of room) markSpecial(sinkSpot.x, sinkSpot.y, 'rgba(120, 255, 152, 0.88)');
    }
    for (const room of Object.values(BATHROOM_TOILETS)) {
      for (const toiletSpot of room) markSpecial(toiletSpot.x, toiletSpot.y, 'rgba(120, 255, 152, 0.88)');
    }
    for (const room of Object.values(BATHROOM_COUCH_SEATS)) {
      for (const couchSeat of room) markSpecial(couchSeat.x, couchSeat.y, 'rgba(120, 255, 152, 0.88)');
    }
    for (const chair of MICHAEL_CHAIRS) markSpecial(chair.x, chair.y, 'rgba(120, 255, 152, 0.88)');
    markSpecial(MICHAEL_STANDING.x, MICHAEL_STANDING.y, 'rgba(120, 255, 152, 0.88)');
    for (const door of Object.values(DOOR_POINTS)) {
      markSpecial(door.inside.x, door.inside.y, 'rgba(208, 132, 255, 0.88)');
      markSpecial(door.outside.x, door.outside.y, 'rgba(208, 132, 255, 0.88)');
    }

    if (TEST_HARNESS.showPathLegend) {
      c.fillStyle = 'rgba(8, 10, 14, 0.62)';
      c.fillRect(8, 8, 152, 38);
      c.font = '8px monospace';
      c.textAlign = 'left';
      drawSquare(16, 16, 5, 'rgba(64, 220, 255, 0.9)');
      c.fillStyle = '#D8EDF2';
      c.fillText('lanes', 24, 18);
      drawSquare(16, 28, 5, 'rgba(255, 224, 122, 0.9)');
      c.fillText('seat access', 24, 30);
      drawRing(16, 40, 4, 'rgba(255, 120, 84, 0.9)');
      c.fillText('talk spots', 24, 42);
      drawSquare(86, 16, 6, 'rgba(120, 255, 152, 0.88)');
      c.fillText('destinations', 94, 18);
      drawSquare(86, 28, 6, 'rgba(208, 132, 255, 0.88)');
      c.fillText('doors', 94, 30);
    }
    c.restore();
  }

  function render() {
    ctx.drawImage(bg, 0, 0);
    drawDebugPathOverlay(ctx);

    // draw agents sorted by y for pseudo-depth
    const list = Object.keys(agents).map(k=>agents[k]).sort((a,b)=>a.pos.y-b.pos.y);
    const bounds = {};

    function drawCarryItem(agent, box) {
      if (!agent.carryItem) return;
      const atDesk = agent.state === 'ambient' && agent.ambientStage === 'consuming';
      const itemX = Math.round(agent.pos.x + (atDesk ? 10 : 7));
      const itemY = Math.round(atDesk ? box.top + 9 : box.top + 13);
      if (agent.carryItem.kind === 'chips') {
        ctx.fillStyle = agent.carryItem.body;
        ctx.fillRect(itemX - 3, itemY - 4, 5, 6);
        ctx.fillStyle = agent.carryItem.accent;
        ctx.fillRect(itemX - 2, itemY - 3, 3, 1);
        ctx.fillRect(itemX - 2, itemY, 3, 1);
      } else {
        ctx.fillStyle = agent.carryItem.body;
        ctx.fillRect(itemX - 2, itemY - 4, 4, 6);
        ctx.fillStyle = agent.carryItem.accent;
        ctx.fillRect(itemX - 1, itemY - 3, 2, 1);
        ctx.fillRect(itemX - 1, itemY + 2, 2, 1);
      }
    }

    function drawWashEffect(agent) {
      if (agent.state !== 'ambient' || agent.activityType !== 'bathroom' || agent.ambientStage !== 'washing') return;
      ctx.fillStyle = 'rgba(120,190,255,0.9)';
      ctx.fillRect(agent.pos.x - 3, agent.pos.y - 11, 2, 2);
      ctx.fillRect(agent.pos.x + 1, agent.pos.y - 9, 2, 2);
      ctx.fillRect(agent.pos.x - 1, agent.pos.y - 6, 1, 2);
    }

    // Pass 1 — sprites + name tags
    const STAND_DURATION = 18; // frames for stand-up transition
    for (const a of list) {
      const highlight = roleAccent(a.role);
      // Determine sprite mode
      const onToilet = isToiletSpot(a.pos);
      const onCouchSeat = isCouchSeat(a.pos);
      let mode;
      if (a.state === 'walking') mode = 'walking';
      else if (a.state === 'visiting') mode = (a.chairIdx != null || a.breakroomChairKey != null || a.annexChairKey != null || a.kitchenChairKey != null || onToilet || onCouchSeat) ? 'sitting' : 'standing';
      else if (a.state === 'ambient') mode = (a.ambientStage === 'consuming' || onToilet || onCouchSeat) ? 'sitting' : 'standing';
      else mode = 'sitting'; // idle at own desk
      // Stand-up progress — fills in during the first frames after transition start
      let standUp = null;
      if (a.state === 'walking' && a.standStart != null) {
        const d = tick - a.standStart;
        if (d < STAND_DURATION) standUp = d / STAND_DURATION;
      }
      const face = a.state === 'walking' ? null : (a.visitFace || a.homeFace || 'S');
      const b = drawSprite(ctx, a.pos.x, a.pos.y, a.char, mode, tick, highlight, face, standUp);
      bounds[a.id] = b;
      drawCarryItem(a, b);
      drawWashEffect(a);

      if (a.role === 'user' && a.state === 'idle') {
        ctx.fillStyle = 'rgba(232,184,76,0.85)';
        ctx.fillRect(a.pos.x-10, b.top-9, 20, 8);
        ctx.fillStyle = '#1a1410';
        ctx.font = 'bold 7px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('YOU', a.pos.x, b.top-2.5);
        ctx.textAlign = 'left';
      }

      if (a.state === 'walking' || a.state === 'visiting' || (a.state === 'ambient' && a.ambientStage !== 'consuming')) {
        const lbl = a.role === 'user' ? 'YOU' : a.name;
        const isUser = a.role === 'user';
        ctx.fillStyle = isUser ? 'rgba(232,184,76,0.85)' : 'rgba(0,0,0,0.55)';
        ctx.fillRect(a.pos.x-16, b.top-9, 32, 8);
        ctx.fillStyle = isUser ? '#1a1410' : '#E8E0D4';
        ctx.font = (isUser ? 'bold ' : '') + '7px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(lbl, a.pos.x, b.top-2.5);
        ctx.textAlign = 'left';
      }
    }

    // Pass 2 — speech bubbles (redacted, above the current speaker)
    function drawBubble(speaker, fromSide) {
      const sb = bounds[speaker.id];
      if (!sb) return;
      const bw = 24, bh = 10, pad = 4;
      let bubX = speaker.pos.x + (fromSide < 0 ? -28 : 6);
      let bubY = sb.top - 17;
      // clamp horizontally inside canvas
      if (bubX < pad) bubX = pad;
      if (bubX + bw > W - pad) bubX = W - pad - bw;
      // clamp vertically — push below head if above is clipped
      if (bubY < pad) bubY = sb.bottom + 4;
      if (bubY + bh > H - pad) bubY = H - pad - bh;
      // bubble body
      ctx.fillStyle = 'rgba(240,240,245,0.92)';
      ctx.fillRect(bubX, bubY, bw, bh);
      ctx.fillStyle = 'rgba(10,10,16,0.2)';
      ctx.fillRect(bubX, bubY+9, bw, 1);
      ctx.fillStyle = '#0a0a10';
      for (let i=0;i<3;i++) ctx.fillRect(bubX+3+i*7, bubY+4, 4, 2);
      ctx.fillStyle = 'rgba(240,240,245,0.92)';
      if (fromSide < 0) ctx.fillRect(bubX+20, bubY+10, 3, 2);
      else              ctx.fillRect(bubX+1,  bubY+10, 3, 2);
    }

    for (const a of list) {
      if (a.state !== 'visiting') continue;
      if (a.visitPhase === 'talking') {
        drawBubble(a, a.visitDest ? (a.pos.x < a.visitDest.pos.x ? 1 : -1) : 1);
      } else if (a.visitPhase === 'replying' && a.visitDest) {
        drawBubble(a.visitDest, a.visitDest.pos.x < a.pos.x ? 1 : -1);
      }
    }

    for (const a of list) {
      if (a.completionBubbleUntil > tick) drawBubble(a, 1);
    }

    // store bounds for hit-testing
    spriteBounds = bounds;

    // status updates
    const rosterEl = document.getElementById('officeRoster');
    const eventEl = document.getElementById('officeEvent');
    if (rosterEl) rosterEl.textContent = `${rosterMeta.count} / ${rosterMeta.total}`;
    if (eventEl) eventEl.textContent = eventText;

    // clock
    const clk = document.getElementById('officeClock');
    if (clk) {
      const d = new Date();
      const pad = n=>String(n).padStart(2,'0');
      clk.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
  }

  function loop(ts) {
    tick++;
    stepAgents();
    // track whether any real handoff activity happened
    maybeInjectDebugHandoff();
    maybeTriggerWalk();
    maybeRoam();
    maybeTriggerAmbient();
    if (ts - lastFetch > POLL_MS) {
      lastFetch = ts;
      fetchRoster();
    }
    render();
    requestAnimationFrame(loop);
  }

  // ─── HOVER HIT TEST ───────────────────────────────────────────
  canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    const sx = W / r.width, sy = H / r.height;
    const mx = (e.clientX - r.left) * sx;
    const my = (e.clientY - r.top) * sy;
    let found = null;
    for (const id in spriteBounds) {
      const bb = spriteBounds[id];
      if (mx>=bb.left && mx<=bb.right && my>=bb.top && my<=bb.bottom) { found = id; break; }
    }
    if (!found) {
      tooltipEl.classList.remove('on');
      return;
    }
    const a = agents[found];
    if (!a) return;
    const officeName = CHAR_NAMES[a.charKey] || '';
    const roleLabel =
      a.role === 'user' ? 'Operator · that’s you' :
      a.roleText ||
      (a.role === 'orch' ? 'Orchestrator' : a.role === 'da' ? "Devil's Advocate" : 'Developer Agent');
    const lineHtml = a.role === 'user'
      ? '<span class="tt-line">in Michael\'s office · handing out tasks</span>'
      : `<span class="tt-line">${a.lineText || a.sceneAction || '—'}</span>`;
    const header = a.role === 'user'
      ? `<strong>${officeName}</strong><span class="tt-sub">YOU · the operator</span>`
      : `<strong>${officeName}</strong><span class="tt-sub">${a.name}</span>`;
    tooltipEl.innerHTML = `
      ${header}
      <span class="tt-role">${roleLabel}</span>
      ${lineHtml}
    `;
    // Position tooltip ABOVE the head, but clamp inside the canvas wrap so
    // it never escapes the game view. Always keep it 12px away from the
    // character's head so it doesn't block them.
    tooltipEl.classList.add('on');
    const margin = 6;
    const sprite = spriteBounds[found];
    const headTopPx = (sprite ? sprite.top : a.pos.y - 20) / H * r.height;
    // read measured size
    const tw = tooltipEl.offsetWidth;
    const th = tooltipEl.offsetHeight;
    let left = (a.pos.x / W) * r.width - tw / 2;
    let top  = headTopPx - th - 8;
    // clamp horizontally
    if (left < margin) left = margin;
    if (left + tw > r.width - margin) left = r.width - margin - tw;
    // if above would clip top of canvas, flip below the sprite instead
    if (top < margin) {
      const spriteBottomPx = (sprite ? sprite.bottom : a.pos.y + 4) / H * r.height;
      top = spriteBottomPx + 8;
    }
    // last-resort vertical clamp
    if (top + th > r.height - margin) top = r.height - margin - th;
    tooltipEl.style.left = left + 'px';
    tooltipEl.style.top = top + 'px';
    tooltipEl.style.transform = 'none';
  });
  canvas.addEventListener('mouseleave', () => tooltipEl.classList.remove('on'));

  // ─── KICK OFF ─────────────────────────────────────────────────
  fetchRoster();
  requestAnimationFrame(loop);
})();

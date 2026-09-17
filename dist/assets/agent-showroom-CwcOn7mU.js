import{a as e,c as t,d as n,f as r,i,l as a,m as o,n as s,o as c,p as l,r as u,s as d,t as f,u as p}from"./cosmetics-CXjPTKwx.js";import{i as m,n as h,o as g,r as _,s as v}from"./design-tokens-C9JwDRjn.js";var y=[`colorIndex`,`skinToneIndex`,`hairIndex`,`eyeIndex`,`armorIndex`,`helmetIndex`,`visorIndex`,`shoulderIndex`,`badgeIndex`,`weaponSkinIndex`],b=Object.keys(e),x=/^[A-Za-z0-9 _.'-]+$/,S=new Set([`wide`,`mohawk`]),C=new Set([`skinToneIndex`,`hairIndex`,`eyeIndex`]),w={gunslinger:`Requires Bureau marksman clearance`,enforcer:`Requires Enforcer division transfer`,phantom:`Requires Rift-runner certification`},T=[{name:`Regulation`,ch:{colorIndex:0,skinToneIndex:0,hairIndex:1,eyeIndex:1,armorIndex:0,helmetIndex:0,visorIndex:0,shoulderIndex:1,badgeIndex:3,weaponSkinIndex:0}},{name:`Juggernaut`,ch:{colorIndex:2,skinToneIndex:2,hairIndex:2,eyeIndex:4,armorIndex:2,helmetIndex:3,visorIndex:4,shoulderIndex:3,badgeIndex:2,weaponSkinIndex:3}},{name:`Ghost`,ch:{colorIndex:3,skinToneIndex:3,hairIndex:0,eyeIndex:3,armorIndex:3,helmetIndex:2,visorIndex:2,shoulderIndex:0,badgeIndex:6,weaponSkinIndex:1}},{name:`Engineer`,ch:{colorIndex:4,skinToneIndex:4,hairIndex:3,eyeIndex:0,armorIndex:4,helmetIndex:1,visorIndex:3,shoulderIndex:4,badgeIndex:5,weaponSkinIndex:2}}],E={identity:`<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2.4"/><path d="M5.6 16.4c.8-1.8 2-2.6 3.4-2.6s2.6.8 3.4 2.6M14.5 10h4M14.5 13.5h3"/></svg>`,suit:`<svg viewBox="0 0 24 24"><path d="M8 3 4 5.5 3 11l3 1.2V21h12v-8.8l3-1.2-1-5.5L16 3c-.8 1.6-2.2 2.4-4 2.4S8.8 4.6 8 3Z"/><path d="M12 9v8M9 12.5h6"/></svg>`,helmet:`<svg viewBox="0 0 24 24"><path d="M12 3c5 0 7.5 3.5 7.5 8.2V16c0 2.4-2 4.6-4.6 5H9.1C6.5 20.6 4.5 18.4 4.5 16v-4.8C4.5 6.5 7 3 12 3Z"/><path d="M5 11.2 11 12.4l1 1.2 1-1.2 6-1.2-.2 3.4-5.6 1-1.2.8-1.2-.8-5.6-1Z"/></svg>`,colors:`<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 2-2 0-1.4-1.2-1.6-1.2-3 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.4 17 3 12 3Z"/><circle cx="7.5" cy="11" r="1.3"/><circle cx="10" cy="7" r="1.3"/><circle cx="15" cy="7" r="1.3"/></svg>`,loadout:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>`,undo:`<svg viewBox="0 0 24 24"><path d="M9 7 4 12l5 5"/><path d="M4 12h10a6 6 0 0 1 0 12h-2" transform="translate(0 -6)"/></svg>`,reset:`<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.4h4.4"/></svg>`,dice:`<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.2"/><circle cx="15" cy="15" r="1.2"/><circle cx="15" cy="9" r="1.2"/><circle cx="9" cy="15" r="1.2"/></svg>`,lock:`<svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>`,play:`<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5Z"/></svg>`,check:`<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>`,chevron:`<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>`,turn:`<svg viewBox="0 0 24 24"><path d="M3 12c0-2.8 4-5 9-5s9 2.2 9 5-4 5-9 5"/><path d="m14 14.5-2.4 2.5 2.4 2.5"/></svg>`},D=[{id:`identity`,label:`Identity`,sections:[{type:`name`,title:`Callsign`},{key:`backstoryIndex`,title:`Origin`,data:s,kind:`origin`},{key:`voiceIndex`,title:`Voice`,data:l,kind:`voice`}]},{id:`suit`,label:`Suit`,sections:[{key:`armorIndex`,title:`Armor`,data:f,kind:`torso`},{key:`shoulderIndex`,title:`Shoulders`,data:p,kind:`torso`},{key:`badgeIndex`,title:`Badge`,data:u,kind:`badge`}]},{id:`helmet`,label:`Helmet`,camera:`bust`,sections:[{key:`helmetIndex`,title:`Helmet`,data:t,kind:`head`},{key:`visorIndex`,title:`Visor`,data:r,kind:`head`},{key:`eyeIndex`,title:`Eyes`,data:c,kind:`eye`},{key:`skinToneIndex`,title:`Face`,data:n,kind:`skin`},{key:`hairIndex`,title:`Hair`,data:d,kind:`hair`}]},{id:`colors`,label:`Colors`,sections:[{key:`colorIndex`,title:`Palette`,data:i,kind:`palette`}]},{id:`loadout`,label:`Loadout`,pose:`hero`,sections:[{key:`loadoutIndex`,title:`Class`,data:a,kind:`class`},{key:`weaponSkinIndex`,title:`Weapon finish`,data:o,kind:`rifle`}]}],O=e=>String(e).replace(/[&<>"']/g,e=>`&#${e.charCodeAt(0)};`),k=(e,t,n)=>Math.max(t,Math.min(n,e)),A=[``,`I`,`II`,`III`];function j(e){let t=e.bonuses||{},n={phantom:120,enforcer:80}[e.id]??100;return[{label:`Health`,value:t.maxHealth??100,base:100,max:150},{label:`Speed`,value:3.5+(t.moveSpeed??0),base:3.5,max:4.5,fmt:e=>e.toFixed(1)},{label:`Fire rate`,value:1/(t.fireRateMultiplier??1),base:1,max:1.25,fmt:e=>`${Math.round(e*100)}%`},{label:`Stamina`,value:t.maxStamina??100,base:100,max:150},{label:`Chrono`,value:n,base:100,max:130},{label:`Damage`,value:e.id===`enforcer`?1.15:1,base:1,max:1.25,fmt:e=>`${Math.round(e*100)}%`}]}var M=()=>window.matchMedia?.(`(prefers-reduced-motion: reduce)`).matches,N=`
${h(`:host`)}
:host {
  --accent: #00ffdd; --primary: #00ccaa;
  --panel-w: min(452px, 38vw);
  --plate-bevel: inset 0 1px 0 rgba(185, 210, 232, 0.3), inset 0 -1px 0 rgba(0, 0, 0, 0.55);
  position: fixed; inset: 0; z-index: 50; display: none;
  font-family: var(--cc-font); color: var(--cc-text);
  -webkit-font-smoothing: antialiased; user-select: none; -webkit-user-select: none;
}
:host([open]) { display: block; }
* { box-sizing: border-box; }
button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; }
svg { display: block; }
.tab svg, .tool svg, .lock svg, .play svg, .tick svg, .handle svg, .hint-turn svg {
  fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round;
}
.play svg { fill: currentColor; stroke: none; }

/* ── Shared family pieces ─────────────────────────────── */
/* Steel keycap (drawKeycap). */
.key { display: inline-flex; align-items: center; justify-content: center; min-width: 1.9em; height: 1.9em; padding: 0 0.5em;
  font: 700 var(--cc-type-keycap)/1 var(--cc-font); letter-spacing: 0.5px; color: var(--cc-text); text-transform: none;
  background: var(--cc-keycap); border: 1px solid var(--cc-ink); border-radius: var(--cc-keycap-radius);
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.35); text-shadow: none; }
/* Comic caption plate (drawCaption): gradient card, ink edge, hard ink drop shadow. */
.caption { display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px 2px; font: 700 var(--cc-type-label)/1.2 var(--cc-font);
  letter-spacing: var(--cc-track-caption); text-transform: uppercase; border: var(--cc-ink-outline) solid var(--cc-ink);
  box-shadow: 2px 2px 0 var(--cc-ink), inset 0 1px 0 rgba(255, 255, 255, 0.35); }
.caption.cream { background: var(--cc-caption-cream); color: var(--cc-caption-cream-text); }
.caption.cyan { background: var(--cc-caption-cyan); color: var(--cc-caption-cyan-text); }
.caption.amber { background: var(--cc-caption-amber); color: var(--cc-caption-amber-text); }
.caption.steel { background: var(--cc-caption-steel); color: var(--cc-caption-steel-text); }
.caption.crimson { background: var(--cc-caption-crimson); color: var(--cc-caption-crimson-text); }
/* Corner brackets on the two square corners + tick on the top-left chamfer (drawPanel). */
.brackets { position: absolute; inset: 0; pointer-events: none; z-index: 3;
  background:
    linear-gradient(var(--cc-cyan), var(--cc-cyan)) right 2px top 2px / var(--cc-bracket-len) 1.5px no-repeat,
    linear-gradient(var(--cc-cyan), var(--cc-cyan)) right 2px top 2px / 1.5px var(--cc-bracket-len) no-repeat,
    linear-gradient(var(--cc-cyan), var(--cc-cyan)) left 2px bottom 2px / var(--cc-bracket-len) 1.5px no-repeat,
    linear-gradient(var(--cc-cyan), var(--cc-cyan)) left 2px bottom 2px / 1.5px var(--cc-bracket-len) no-repeat,
    linear-gradient(135deg, transparent calc(var(--chamfer, 20px) - 2px), rgba(34, 230, 255, 0.7) calc(var(--chamfer, 20px) - 2px), rgba(34, 230, 255, 0.7) calc(var(--chamfer, 20px) - 0.5px), transparent calc(var(--chamfer, 20px) - 0.5px)) left top / calc(var(--chamfer, 20px) + 2px) calc(var(--chamfer, 20px) + 2px) no-repeat; }
/* Machined steel panel (drawPanel "menu"): ink silhouette, steel body inset, brushed grain, key-light sheen, top bevel, inner hairline. */
.frame { position: relative; --chamfer: var(--cc-chamfer-lg); background: var(--cc-ink);
  clip-path: polygon(var(--chamfer) 0, 100% 0, 100% calc(100% - var(--chamfer)), calc(100% - var(--chamfer)) 100%, 0 100%, 0 var(--chamfer)); }
.frame > .body { position: absolute; inset: var(--cc-ink-canvas); display: flex; flex-direction: column; min-height: 0;
  clip-path: polygon(calc(var(--chamfer) - 0.6px) 0, 100% 0, 100% calc(100% - var(--chamfer) + 0.6px), calc(100% - var(--chamfer) + 0.6px) 100%, 0 100%, 0 calc(var(--chamfer) - 0.6px));
  background:
    linear-gradient(160deg, rgba(190, 215, 235, 0.1), rgba(190, 215, 235, 0.02) 35%, rgba(190, 215, 235, 0) 60%),
    repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.022) 0 1px, transparent 1px 3px),
    var(--cc-panel-menu);
  box-shadow: inset 0 1px 0 rgba(185, 210, 232, 0.34), inset 1px 0 0 rgba(185, 210, 232, 0.12), inset 0 -1px 0 rgba(0, 0, 0, 0.45); }
.frame > .body::after { content: ""; position: absolute; inset: 2.5px; pointer-events: none; border: 1px solid var(--cc-hairline);
  clip-path: polygon(calc(var(--chamfer) - 1.5px) 0, 100% 0, 100% calc(100% - var(--chamfer) + 1.5px), calc(100% - var(--chamfer) + 1.5px) 100%, 0 100%, 0 calc(var(--chamfer) - 1.5px)); }
/* Section header (drawSectionHeader): accent tab, label, hairline, end tick. */
.section h3 { position: relative; display: flex; align-items: center; gap: 10px; margin: 0 0 10px; padding-left: 13px; height: 19px;
  font: 700 var(--cc-type-section)/1 var(--cc-font); letter-spacing: var(--cc-track-section); text-transform: uppercase; color: var(--cc-text); }
.section h3::before { content: ""; position: absolute; left: 0; top: 1px; bottom: 1px; width: 7px; background: var(--cc-cyan); box-shadow: 0 0 0 1px var(--cc-ink); }
.section h3::after { content: ""; flex: 1; height: 1px; order: 1; background: linear-gradient(90deg, rgba(130, 160, 188, 0.28) calc(100% - 10px), var(--cc-cyan) calc(100% - 10px)); box-shadow: 0 1px 0 transparent; }
.section h3 .cur { order: 2; font: 600 var(--cc-type-label)/1 var(--cc-font); letter-spacing: 0.04em; color: var(--cc-text-dim); text-transform: none; }
.section h3 .cur.preview { color: var(--cc-cyan); }
/* Mission plate (style.css #modeSelect .mode-btn): steel, ink edge, chamfer, left accent inset. */
.plate { position: relative; color: var(--cc-text); background: var(--cc-steel); border: var(--cc-ink-outline) solid var(--cc-ink);
  clip-path: polygon(var(--cc-chamfer) 0, 100% 0, 100% calc(100% - var(--cc-chamfer)), calc(100% - var(--cc-chamfer)) 100%, 0 100%, 0 var(--cc-chamfer));
  box-shadow: var(--plate-bevel), inset 3px 0 0 rgba(34, 230, 255, 0.35);
  transition: transform var(--cc-dur-fast), box-shadow var(--cc-dur-fast), color var(--cc-dur-fast), background var(--cc-dur-fast); }
.plate:hover, .plate:focus-visible, :host(.kbd) .plate:focus { color: #fff; background: var(--cc-steel-hi); outline: none;
  box-shadow: inset 0 1px 0 rgba(185, 210, 232, 0.42), inset 5px 0 0 var(--cc-cyan), inset 0 0 0 2px rgba(34, 230, 255, 0.6), inset 0 0 26px rgba(34, 230, 255, 0.14); }
.plate:active { background: var(--cc-steel); }

.root { position: absolute; inset: 0; overflow: hidden; opacity: 0; transition: opacity var(--cc-dur-base) var(--cc-ease);
  background:
    radial-gradient(ellipse 70% 55% at 32% 30%, rgba(34, 230, 255, 0.07), transparent 70%),
    radial-gradient(ellipse at 36% 36%, #0d1826 0%, #05070d 70%, #020306 100%); }
:host([shown]) .root { opacity: 1; }

/* ── Backdrop ─────────────────────────────────────────── */
.backdrop { position: absolute; inset: 0; pointer-events: none; }
.backdrop::before { content: ""; position: absolute; inset: 0; background: radial-gradient(60% 55% at 32% 44%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 70%); }
/* Halftone dots toward the bottom (the Modern stand-in for CRT scanlines) and ink letterbox rules. */
.halftone { position: absolute; inset: 0; background: radial-gradient(rgba(150, 180, 205, 0.07) 1px, transparent 1.6px) 0 0 / 7px 7px;
  -webkit-mask-image: linear-gradient(180deg, transparent 50%, #000 100%); mask-image: linear-gradient(180deg, transparent 50%, #000 100%); }
.letterbox { position: absolute; inset: 0; border-top: 3px solid rgba(4, 6, 11, 0.9); border-bottom: 3px solid rgba(4, 6, 11, 0.9); }
.shaft { position: absolute; top: -10%; width: 26%; height: 90%; left: 19%;
  background: linear-gradient(180deg, rgba(200, 230, 255, 0.1), rgba(200, 230, 255, 0) 80%);
  clip-path: polygon(35% 0, 65% 0, 100% 100%, 0 100%); filter: blur(6px); }
.haze { position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.45; }
.haze.h1 { width: 46vw; height: 30vh; left: 6vw; top: 52vh; background: color-mix(in srgb, var(--accent) 22%, transparent); animation: drift 14s ease-in-out infinite alternate; }
.haze.h2 { width: 30vw; height: 40vh; left: 36vw; top: 8vh; background: rgba(90, 120, 180, 0.16); animation: drift 18s ease-in-out infinite alternate-reverse; }
@keyframes drift { to { transform: translate(4vw, -3vh) scale(1.1); } }
.floor { position: absolute; left: -20%; right: 20%; bottom: -8%; height: 46%;
  background-image: linear-gradient(rgba(34, 230, 255, 0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 230, 255, 0.07) 1px, transparent 1px);
  background-size: 48px 48px; transform: perspective(520px) rotateX(64deg); transform-origin: 50% 100%;
  mask-image: radial-gradient(60% 70% at 50% 60%, #000 20%, transparent 75%); -webkit-mask-image: radial-gradient(60% 70% at 50% 60%, #000 20%, transparent 75%); }
.vignette { position: absolute; inset: 0; background: radial-gradient(120% 90% at 35% 45%, transparent 55%, rgba(0, 0, 0, 0.7) 100%); }

/* ── Stage ────────────────────────────────────────────── */
.stage { position: absolute; left: 0; top: 0; bottom: 0; right: calc(var(--panel-w) + 32px); outline: none; touch-action: none; cursor: grab; }
.stage.dragging { cursor: grabbing; }
.stage:focus-visible .pedestal .plate-disc { box-shadow: 0 0 0 2px var(--cc-cyan), 0 18px 40px rgba(0, 0, 0, 0.8); }
.rim { position: absolute; width: 34%; height: 62%; top: 16%; border-radius: 50%; filter: blur(46px); opacity: 0.55; pointer-events: none; transition: transform 0.5s var(--cc-ease); }
.rim.r1 { left: 18%; background: rgba(170, 205, 255, 0.24); transform: translateX(calc(var(--yaw) * -40px)); }
.rim.r2 { right: 14%; background: color-mix(in srgb, var(--accent) 45%, transparent); transform: translateX(calc(var(--yaw) * 40px)); animation: rimPulse 5s ease-in-out infinite; }
@keyframes rimPulse { 50% { opacity: 0.38; } }
.pedestal { position: absolute; left: 50%; bottom: 8.5%; width: min(56%, 440px); aspect-ratio: 4 / 1; transform: translateX(-50%); pointer-events: none; transition: opacity 0.4s var(--cc-ease), transform 0.5s var(--cc-ease); }
.pedestal .plate-disc { position: absolute; inset: 16% 6% 18%; border-radius: 50%;
  background: radial-gradient(60% 70% at 42% 35%, #3a4d61 0%, #1c2733 45%, #0a0f16 100%);
  box-shadow: inset 0 2px 0 rgba(180, 210, 235, 0.35), inset 0 -8px 16px rgba(0, 0, 0, 0.7), 0 0 0 var(--cc-ink-outline) var(--cc-ink), 0 18px 40px rgba(0, 0, 0, 0.8); }
.pedestal .plate-disc::after { content: ""; position: absolute; inset: 22% 14%; border-radius: 50%; border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent); box-shadow: 0 0 18px color-mix(in srgb, var(--accent) 35%, transparent), inset 0 0 12px color-mix(in srgb, var(--accent) 25%, transparent); }
.pedestal .ring { position: absolute; inset: 0; border-radius: 50%; overflow: hidden;
  -webkit-mask-image: radial-gradient(closest-side, transparent 84%, #000 88%, #000 96%, transparent 100%); mask-image: radial-gradient(closest-side, transparent 84%, #000 88%, #000 96%, transparent 100%); }
.pedestal .ring::before { content: ""; position: absolute; left: 50%; top: 50%; width: 140%; aspect-ratio: 1; transform: translate(-50%, -50%) scaleY(0.25);
  background: conic-gradient(from 0deg, transparent 0 18%, var(--accent) 24%, transparent 34% 62%, rgba(220, 240, 255, 0.9) 68%, transparent 78%);
  animation: spin 7s linear infinite; }
@keyframes spin { to { transform: translate(-50%, -50%) scaleY(0.25) rotate(360deg); } }
.figure-wrap { position: absolute; left: 50%; bottom: 11.5%; height: 78%; aspect-ratio: 148 / 182; transform: translateX(-50%); pointer-events: none; }
.figure { position: absolute; inset: 0; -webkit-box-reflect: below calc(var(--fig-h, 500px) * -0.043) linear-gradient(transparent 72%, rgba(255, 255, 255, 0.16)); }
:host([camera="bust"]) .figure { -webkit-box-reflect: none; }
.figure svg { width: 100%; height: 100%; overflow: visible; }
.sweep { position: absolute; inset: 0; mix-blend-mode: overlay; opacity: 0.9; pointer-events: none;
  background: linear-gradient(100deg, transparent 38%, rgba(255, 255, 255, 0.35) 48%, transparent 58%);
  background-size: 260% 100%; background-position: calc(50% + var(--yaw) * 60%) 0; transition: background-position 0.2s linear; }
:host([camera="bust"]) .pedestal { opacity: 0; transform: translateX(-50%) translateY(40px); }
.figure .ag-fig { animation: breathe 3.8s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 100%; }
@keyframes breathe { 50% { transform: scaleY(1.009); } }
.figure .ag-cape { animation: sway 4.6s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 0; }
@keyframes sway { 0%, 100% { transform: rotate(-0.7deg) skewX(-0.4deg); } 50% { transform: rotate(0.7deg) skewX(0.4deg); } }
.figure .ag-visor { animation: pulse 2.4s ease-in-out infinite; }
.figure .ag-glow { animation: pulse 3.4s ease-in-out infinite; }
@keyframes pulse { 50% { opacity: 0.68; } }

/* ── Header ───────────────────────────────────────────── */
.hdr { position: absolute; left: 32px; top: 24px; right: calc(var(--panel-w) + 300px); pointer-events: none; }
/* Cream caption heading, as the mission select's h2. */
.kicker { display: inline-block; padding: 4px 14px 2px; font: 800 var(--cc-type-section)/1.2 var(--cc-font); letter-spacing: 4px; text-transform: uppercase;
  color: var(--cc-caption-cream-text); background: var(--cc-caption-cream); border: var(--cc-ink-outline) solid var(--cc-ink); box-shadow: 4px 4px 0 var(--cc-ink); }
/* Chrome title with ink outline, offset ink shadow and accent rule (drawTitle / #titleScreen h1). */
.callsign { position: relative; isolation: isolate; display: block; width: max-content; max-width: 100%; margin: 14px 0 0; padding: 0 6px 2px 3px; font: 800 clamp(30px, 4.2vw, var(--cc-type-display))/1.02 var(--cc-font);
  letter-spacing: var(--cc-track-title); text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  color: transparent; filter: drop-shadow(3px 3px 0 var(--cc-ink)) drop-shadow(0 0 16px color-mix(in srgb, var(--accent) 40%, transparent)); }
/* Ink outline drawn by a stroked copy behind the chrome fill (a stroke on the
   clipped text itself would eat into the letters). */
.callsign::before, .dialog h2::before, .callsign::after, .dialog h2::after { content: attr(data-text); position: absolute; inset: 0; padding: inherit; white-space: nowrap; }
.callsign::before, .dialog h2::before { color: var(--cc-ink); -webkit-text-stroke: 6px var(--cc-ink); }
.callsign::after, .dialog h2::after { color: transparent; background: var(--cc-title-fill); -webkit-background-clip: text; background-clip: text; }
/* Accent underline rule: 2px accent line on a 6px ink bar (drawTitle). */
.rule { display: block; width: 190px; height: 6px; margin: 8px 0 10px 4px; background: linear-gradient(var(--accent), var(--accent)) 2px 50% / calc(100% - 4px) 2px no-repeat, var(--cc-ink); }
.sub { font: 700 var(--cc-type-body)/1.3 var(--cc-font); letter-spacing: 2px; text-transform: uppercase; color: var(--cc-text-dim); text-shadow: 0 1px 0 var(--cc-ink); }
.sub b { color: var(--accent); font-weight: 800; }
.ready { margin-top: 12px; }
.ready[hidden] { display: none; }

.toolbar { position: absolute; top: 24px; right: calc(var(--panel-w) + 44px); display: flex; gap: 10px; }
/* Mission-select back button: steel, ink border, hard ink shadow. */
.tool { display: inline-flex; align-items: center; gap: 8px; height: 38px; padding: 0 10px 0 9px;
  font: 700 var(--cc-type-label)/1 var(--cc-font); letter-spacing: 2px; text-transform: uppercase; color: var(--cc-text-dim);
  background: var(--cc-steel); border: var(--cc-ink-outline) solid var(--cc-ink); box-shadow: inset 0 1px 0 rgba(185, 210, 232, 0.25), 2px 2px 0 var(--cc-ink);
  transition: color var(--cc-dur-fast), background var(--cc-dur-fast), transform var(--cc-dur-fast); }
.tool svg { width: 17px; height: 17px; }
.tool:hover, .tool:focus-visible, :host(.kbd) .tool:focus { color: #fff; background: var(--cc-steel-hi); outline: 2px solid var(--cc-cyan); outline-offset: 2px; }
.tool:active { transform: translate(1px, 1px); box-shadow: inset 0 1px 0 rgba(185, 210, 232, 0.25), 1px 1px 0 var(--cc-ink); }
.tool:disabled { opacity: 0.4; cursor: default; filter: grayscale(1); outline: none; }

.stage-tools { position: absolute; bottom: 22px; left: calc((100% - var(--panel-w) - 32px) / 2); transform: translateX(-50%); display: flex; gap: 10px; align-items: center; white-space: nowrap; }
.seg { display: inline-flex; padding: 3px; gap: 3px; background: var(--cc-panel-well); border: var(--cc-ink-outline) solid var(--cc-ink); box-shadow: inset 0 2px 0 rgba(0, 0, 0, 0.55), 2px 2px 0 var(--cc-ink); }
.seg button { height: 30px; padding: 0 11px; font: 700 var(--cc-type-label)/1 var(--cc-font); letter-spacing: 1.5px; text-transform: uppercase; color: var(--cc-text-dim);
  transition: color var(--cc-dur-fast), background var(--cc-dur-fast); }
.seg button[aria-pressed="true"] { color: var(--cc-caption-cyan-text); background: var(--cc-caption-cyan); box-shadow: 0 0 0 1px var(--cc-ink), inset 0 1px 0 rgba(255, 255, 255, 0.4); }
.seg button:hover:not([aria-pressed="true"]) { color: var(--cc-text); }
.hint-turn { display: inline-flex; align-items: center; gap: 6px; font: 700 var(--cc-type-micro)/1 var(--cc-font); letter-spacing: 2px; color: var(--cc-text-faint); text-transform: uppercase; }
.hint-turn svg { width: 18px; height: 18px; }

.presets { position: absolute; left: 30px; top: 50%; transform: translateY(-40%); display: flex; flex-direction: column; gap: 12px; align-items: flex-start; }
.presets .lbl { margin-bottom: 2px; }
.preset { display: flex; align-items: center; gap: 10px; padding: 0; transition: transform var(--cc-dur-fast) var(--cc-ease); }
.preset .pthumb { position: relative; width: 52px; height: 52px; overflow: hidden; background: radial-gradient(circle at 45% 38%, #1d2e44, #060a12); border: var(--cc-ink-outline) solid var(--cc-ink);
  clip-path: polygon(var(--cc-chamfer-sm) 0, 100% 0, 100% calc(100% - var(--cc-chamfer-sm)), calc(100% - var(--cc-chamfer-sm)) 100%, 0 100%, 0 var(--cc-chamfer-sm));
  box-shadow: var(--plate-bevel), inset 0 0 0 1px rgba(111, 138, 163, 0.25); transition: box-shadow var(--cc-dur-fast); }
.preset .pthumb svg { width: 100%; height: 100%; }
.preset > span:last-child { font: 700 var(--cc-type-label)/1 var(--cc-font); letter-spacing: 1.5px; text-transform: uppercase; color: var(--cc-text-dim); transition: color var(--cc-dur-fast); }
.preset:hover, .preset:focus-visible, :host(.kbd) .preset:focus { transform: translateX(4px); outline: none; }
.preset:hover .pthumb, .preset:focus-visible .pthumb, :host(.kbd) .preset:focus .pthumb { box-shadow: inset 0 0 0 2px var(--cc-cyan), inset 0 0 16px rgba(34, 230, 255, 0.3); }
.preset:hover > span:last-child, .preset:focus-visible > span:last-child { color: #fff; }

/* ── Panel ────────────────────────────────────────────── */
.panel { position: absolute; top: 16px; right: 16px; bottom: 16px; width: var(--panel-w); filter: drop-shadow(0 24px 40px rgba(0, 0, 0, 0.6)) drop-shadow(4px 4px 0 rgba(4, 6, 11, 0.9));
  transition: transform var(--cc-dur-slow) var(--cc-ease); }
.panel > .frame { position: absolute; inset: 0; }
.handle { display: none; }
.tabs { position: relative; display: grid; grid-template-columns: auto repeat(5, 1fr) auto; align-items: center; gap: 4px; padding: 14px 14px 10px 22px; }
.tabkey { margin: 0 2px; }
.tab { position: relative; display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 8px 2px 10px; color: var(--cc-text-dim); background: transparent;
  font: 700 var(--cc-type-label)/1 var(--cc-font); letter-spacing: 1.5px; text-transform: uppercase; outline: none;
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
  transition: color var(--cc-dur-fast), background var(--cc-dur-fast), box-shadow var(--cc-dur-fast); }
.tab svg { width: 22px; height: 22px; }
.tab:hover { color: var(--cc-text); background: rgba(130, 160, 188, 0.08); }
/* Focused button (drawButton "focus"): raised steel, accent bar, centred accent underline. */
.tab[aria-selected="true"] { color: #fff; background: var(--cc-panel-raised); box-shadow: inset 0 1px 0 rgba(185, 210, 232, 0.34), inset 0 0 0 1px var(--cc-ink); }
.tab[aria-selected="true"]::after { content: ""; position: absolute; left: 30%; right: 30%; bottom: 3px; height: 2px; background: var(--cc-cyan); box-shadow: 0 0 8px var(--cc-cyan); }
.tab[aria-selected="true"] svg { color: var(--cc-cyan); filter: drop-shadow(0 0 6px rgba(34, 230, 255, 0.55)); }
.tab:focus-visible, :host(.kbd) .tab:focus { box-shadow: inset 0 0 0 2px var(--cc-cyan); }
.tabs::after { content: ""; position: absolute; left: 22px; right: 14px; bottom: 0; height: 1px; background: var(--cc-hairline); }

.content { position: relative; flex: 1; overflow-y: auto; overflow-x: hidden; padding: 4px 16px 18px 22px; scrollbar-width: thin; scrollbar-color: #2e3f51 transparent; overscroll-behavior: contain; }
.content::-webkit-scrollbar { width: 8px; }
.content::-webkit-scrollbar-thumb { background: #2e3f51; border: 1px solid var(--cc-ink); }
.content.swap { animation: swapIn var(--cc-dur-base) var(--cc-ease); }
@keyframes swapIn { from { opacity: 0; transform: translateX(var(--swap-dir, 12px)); } }
.section { margin-top: 18px; }
.grid { display: grid; gap: 8px; }
.grid.torso, .grid.head, .grid.hair { grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); }
.grid.badge { grid-template-columns: repeat(auto-fill, minmax(62px, 1fr)); }
.grid.eye, .grid.skin { grid-template-columns: repeat(6, 1fr); }
.grid.palette { grid-template-columns: repeat(2, 1fr); }
.grid.rifle { grid-template-columns: repeat(3, 1fr); }
.grid.origin, .grid.voice, .grid.class { grid-template-columns: 1fr; }

/* Option tiles are mission plates; square tiles use the small chamfer and no side bar. */
.opt { display: flex; flex-direction: column; gap: 6px; text-align: left; padding: 4px; --cc-chamfer: 9px; box-shadow: var(--plate-bevel); }
.opt.card { padding: 10px 12px 11px 14px; gap: 5px; --cc-chamfer: 12px; box-shadow: var(--plate-bevel), inset 3px 0 0 rgba(34, 230, 255, 0.35); }
.opt:hover, .opt:focus-visible, :host(.kbd) .opt:focus { box-shadow: inset 0 1px 0 rgba(185, 210, 232, 0.42), inset 0 0 0 2px rgba(34, 230, 255, 0.6), inset 0 0 22px rgba(34, 230, 255, 0.14); }
.opt.card:hover, .opt.card:focus-visible, :host(.kbd) .opt.card:focus { box-shadow: inset 0 1px 0 rgba(185, 210, 232, 0.42), inset 5px 0 0 var(--cc-cyan), inset 0 0 0 2px rgba(34, 230, 255, 0.6), inset 0 0 26px rgba(34, 230, 255, 0.14); }
.opt:focus-visible, :host(.kbd) .opt:focus { box-shadow: inset 0 0 0 2px #fff, inset 0 0 0 4px var(--cc-cyan), inset 0 0 22px rgba(34, 230, 255, 0.25) !important; }
.opt[aria-checked="true"] { background: linear-gradient(180deg, rgba(34, 230, 255, 0.16), rgba(34, 230, 255, 0) 70%), var(--cc-steel-hi); color: #fff;
  box-shadow: inset 0 1px 0 rgba(185, 240, 255, 0.45), inset 0 0 0 2px var(--cc-cyan), inset 0 0 20px rgba(34, 230, 255, 0.16); }
.opt.card[aria-checked="true"] { box-shadow: inset 0 1px 0 rgba(185, 240, 255, 0.45), inset 5px 0 0 var(--cc-cyan), inset 0 0 0 2px var(--cc-cyan), inset 0 0 26px rgba(34, 230, 255, 0.16); }
/* Brackets on the square corners of the chosen plate (mode-btn::before). */
.opt::before { content: ""; position: absolute; inset: 3px; pointer-events: none; opacity: 0.45; z-index: 2; transition: opacity var(--cc-dur-fast);
  background:
    linear-gradient(var(--cc-cyan), var(--cc-cyan)) right top / 10px 2px no-repeat,
    linear-gradient(var(--cc-cyan), var(--cc-cyan)) right top / 2px 10px no-repeat,
    linear-gradient(var(--cc-cyan), var(--cc-cyan)) left bottom / 10px 2px no-repeat,
    linear-gradient(var(--cc-cyan), var(--cc-cyan)) left bottom / 2px 10px no-repeat; }
.opt[aria-checked="true"]::before, .opt:hover::before { opacity: 1; }
.opt .tick { position: absolute; top: 3px; left: 3px; width: 15px; height: 15px; padding: 2px; color: var(--cc-caption-cyan-text); background: var(--cc-caption-cyan);
  clip-path: polygon(0 0, 100% 0, 100% 60%, 60% 100%, 0 100%); opacity: 0; transform: scale(0.6); transition: opacity var(--cc-dur-fast), transform var(--cc-dur-fast) var(--cc-ease); z-index: 3; }
.opt .tick svg { stroke-width: 3.2; }
.opt[aria-checked="true"] .tick { opacity: 1; transform: none; }
.thumb { position: relative; aspect-ratio: 1; background: radial-gradient(circle at 45% 38%, #1a2a3e, #050910 78%); box-shadow: inset 0 0 0 1px var(--cc-ink), inset 0 2px 0 rgba(0, 0, 0, 0.55); overflow: hidden; }
.thumb svg { width: 100%; height: 100%; }
.oname { font: 700 var(--cc-type-label)/1.1 var(--cc-font); letter-spacing: 0.6px; text-transform: uppercase; color: inherit; padding: 0 2px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.grid.torso .oname, .grid.head .oname, .grid.hair .oname, .grid.badge .oname, .grid.rifle .oname { min-height: 2.2em; letter-spacing: 0.2px; }
.card .oname { font-size: var(--cc-type-row); letter-spacing: var(--cc-track-row); }
.tier { display: flex; gap: 2px; padding: 0 2px 2px; align-items: center; font: 700 var(--cc-type-micro)/1 var(--cc-font); color: var(--cc-text-dim); letter-spacing: 1px; white-space: nowrap; }
.tier i { width: 8px; height: 3px; background: rgba(111, 138, 163, 0.3); box-shadow: 0 0 0 0.5px var(--cc-ink); }
.tier i.on { background: var(--cc-amber); }
.swatch { aspect-ratio: 1; border-radius: 50%; box-shadow: 0 0 0 var(--cc-ink-outline) var(--cc-ink), inset 0 -4px 6px rgba(0, 0, 0, 0.35), inset 0 3px 4px rgba(255, 255, 255, 0.25); }
.grid.eye .opt, .grid.skin .opt { padding: 7px 4px; align-items: center; --cc-chamfer: 7px; }
.grid.eye .swatch, .grid.skin .swatch { width: min(34px, 100%); flex: none; }
.grid.eye .swatch { background: radial-gradient(circle, #fff 0 12%, var(--c) 26%, color-mix(in srgb, var(--c) 30%, #000) 70%); box-shadow: 0 0 0 var(--cc-ink-outline) var(--cc-ink), 0 0 12px color-mix(in srgb, var(--c) 60%, transparent); }
.grid.eye .oname, .grid.skin .oname { display: none; }
.pal { display: grid; grid-template-columns: 2fr 1fr; grid-template-rows: 1fr 1fr; height: 42px; gap: 2px; background: var(--cc-ink); padding: 1.5px; }
.pal i:first-child { grid-row: span 2; }
.badge-tile { aspect-ratio: 1; display: grid; place-items: center; background: radial-gradient(circle at 45% 38%, #1a2a3e, #050910 78%); box-shadow: inset 0 0 0 1px var(--cc-ink), inset 0 2px 0 rgba(0, 0, 0, 0.55); }
.badge-tile svg { width: 64%; height: 64%; }
.grid.rifle .thumb { aspect-ratio: 2.4; }
.card .row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.card .desc { font: 500 var(--cc-type-body)/1.35 var(--cc-font); color: var(--cc-text-dim); letter-spacing: 0.3px; }
.perk { align-self: flex-start; margin-top: 4px; font-size: var(--cc-type-micro); padding: 2px 7px 1px; }
.play { flex: none; width: 38px; height: 38px; display: grid; place-items: center; color: var(--cc-text); background: var(--cc-keycap); border: 1px solid var(--cc-ink); border-radius: var(--cc-keycap-radius);
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.35), 2px 2px 0 var(--cc-ink); transition: background var(--cc-dur-fast), color var(--cc-dur-fast), transform var(--cc-dur-fast); }
.play svg { width: 15px; height: 15px; margin-left: 2px; }
.play:hover, .play:focus-visible, :host(.kbd) .play:focus { outline: none; color: var(--cc-caption-cyan-text); background: var(--cc-caption-cyan); }
.play:active, .play.ping { transform: translate(1px, 1px); box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.35), 1px 1px 0 var(--cc-ink); }
/* Stat bars (drawBar): inked groove, glass gloss, ink segment gaps, bright leading edge. */
.stats { display: grid; grid-template-columns: 74px 1fr 44px; gap: 6px 10px; align-items: center; margin-top: 6px; }
.stats span { font: 700 var(--cc-type-micro)/1 var(--cc-font); letter-spacing: 1.5px; color: var(--cc-text-dim); text-transform: uppercase; }
.stats b { font: 700 var(--cc-type-label)/1 var(--cc-font-mono); text-align: right; color: var(--cc-text); }
.stats b.up { color: var(--cc-green); } .stats b.down { color: var(--cc-crimson); }
.bar { position: relative; height: 7px; background: linear-gradient(180deg, rgba(2, 4, 8, 0.95), rgba(24, 33, 44, 0.95)); box-shadow: 0 0 0 1.5px var(--cc-ink), inset 0 1px 0 rgba(0, 0, 0, 0.6); }
.bar i { position: absolute; left: 0; top: 0; bottom: 0; width: var(--w); background: var(--cc-cyan); box-shadow: inset -1.5px 0 0 rgba(255, 255, 255, 0.85); transition: width 0.3s var(--cc-ease); }
.bar::after { content: ""; position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.34), rgba(255, 255, 255, 0.08) 38%, rgba(0, 0, 0, 0) 55%, rgba(0, 0, 0, 0.28)),
    repeating-linear-gradient(90deg, transparent 0 calc(10% - 1px), var(--cc-ink) calc(10% - 1px) 10%); }
.locked .thumb svg, .locked .stats { filter: saturate(0.2) brightness(0.7); }
.lock { font-size: var(--cc-type-micro); padding: 2px 6px 1px; gap: 4px; letter-spacing: 0.5px; box-shadow: 2px 2px 0 var(--cc-ink); }
.lock svg { width: 12px; height: 12px; flex: none; }
.opt.locked { cursor: not-allowed; }
.opt.shake { animation: shake 0.36s; }
@keyframes shake { 20%, 60% { transform: translateX(-4px); } 40%, 80% { transform: translateX(4px); } }
.rifle-hero { margin: 0 0 10px; height: 92px; perspective: 700px; display: grid; place-items: center;
  background: radial-gradient(60% 80% at 50% 50%, color-mix(in srgb, var(--accent) 16%, #0c1522), #04070c 80%); border: var(--cc-ink-outline) solid var(--cc-ink); box-shadow: inset 0 2px 0 rgba(0, 0, 0, 0.55); }
.rifle-hero .spin { width: 82%; animation: turntable 7s ease-in-out infinite; transform-style: preserve-3d; }
@keyframes turntable { 0%, 100% { transform: rotateY(-28deg) rotateX(8deg); } 50% { transform: rotateY(28deg) rotateX(8deg); } }

.field { position: relative; display: block; }
.field input { width: 100%; height: 50px; padding: 0 64px 0 16px; font: 800 var(--cc-type-heading)/1 var(--cc-font); letter-spacing: 2px; text-transform: uppercase; color: #fff;
  background: var(--cc-panel-well); border: var(--cc-ink-outline) solid var(--cc-ink); outline: none; user-select: text; -webkit-user-select: text;
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - var(--cc-chamfer)), calc(100% - var(--cc-chamfer)) 100%, 0 100%);
  box-shadow: inset 0 2px 0 rgba(0, 0, 0, 0.55), inset 0 -1px 0 rgba(111, 138, 163, 0.18); transition: box-shadow var(--cc-dur-fast); }
.field input:focus { box-shadow: inset 0 0 0 2px var(--cc-cyan), inset 0 0 20px rgba(34, 230, 255, 0.12); }
.field input[aria-invalid="true"] { box-shadow: inset 0 0 0 2px var(--cc-crimson); }
.field .count { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); font: 700 var(--cc-type-label)/1 var(--cc-font-mono); color: var(--cc-text-faint); }
.err { min-height: 16px; margin: 7px 0 0; font: 600 var(--cc-type-label)/1.3 var(--cc-font); letter-spacing: 0.5px; color: var(--cc-crimson); }
.err.ok { color: var(--cc-text-faint); }

.actions { display: grid; grid-template-columns: auto 1fr; gap: 10px; padding: 12px 22px 18px; position: relative; }
.actions::before { content: ""; position: absolute; left: 22px; right: 14px; top: 0; height: 1px; background: var(--cc-hairline); }
.keys { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 6px 12px; font: 700 var(--cc-type-micro)/1 var(--cc-font); color: var(--cc-text-dim); letter-spacing: 1.5px; text-transform: uppercase; }
.keys span { display: inline-flex; gap: 6px; align-items: center; }
.btn { position: relative; height: 50px; padding: 0 16px; display: inline-flex; align-items: center; justify-content: center; gap: 10px;
  font: 800 var(--cc-type-row)/1 var(--cc-font); letter-spacing: 2px; text-transform: uppercase; outline: none; }
.btn.plate:hover, .btn.plate:focus-visible, :host(.kbd) .btn.plate:focus { transform: translateX(3px); }
/* Primary action: crimson caption scheme on a chamfered plate. */
.btn.primary { color: var(--cc-primary-text); text-shadow: 1px 1px 0 rgba(60, 0, 10, 0.6); overflow: hidden; background: var(--cc-primary); border: var(--cc-ink-outline) solid var(--cc-ink);
  clip-path: polygon(var(--cc-chamfer) 0, 100% 0, 100% calc(100% - var(--cc-chamfer)), calc(100% - var(--cc-chamfer)) 100%, 0 100%, 0 var(--cc-chamfer));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35), inset 0 -3px 0 rgba(80, 0, 16, 0.45);
  transition: filter var(--cc-dur-fast), transform var(--cc-dur-fast), box-shadow var(--cc-dur-fast); }
.btn.primary::after { content: ""; position: absolute; top: 0; bottom: 0; width: 40%; left: -60%; background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.35), transparent); transform: skewX(-18deg); transition: left 0.5s var(--cc-ease); }
.btn.primary:hover::after, .btn.primary:focus-visible::after, :host(.kbd) .btn.primary:focus::after { left: 120%; }
.btn.primary:hover, .btn.primary:focus-visible, :host(.kbd) .btn.primary:focus, .btn.primary.ready:focus { filter: brightness(1.12);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45), inset 0 0 0 2px #fff, inset 0 -3px 0 rgba(80, 0, 16, 0.45); }
.btn.primary.ready { animation: readyPulse 1.8s ease-in-out infinite; }
@keyframes readyPulse { 50% { filter: brightness(1.18); } }
.btn.primary[aria-disabled="true"] { filter: saturate(0.3) brightness(0.7); cursor: not-allowed; animation: none; }
.btn.primary .key { color: var(--cc-text); }
.save .k-focus { display: none; }
.save:focus .k-focus { display: inline-flex; }
.save:focus .k-any { display: none; }
.btn:active { transform: translateY(1px); }

.toast { position: absolute; left: calc((100% - var(--panel-w) - 32px) / 2); bottom: 80px; transform: translate(-50%, 12px); white-space: nowrap; opacity: 0; pointer-events: none;
  font-size: var(--cc-type-section); padding: 5px 12px 3px; transition: opacity var(--cc-dur-base), transform var(--cc-dur-base) var(--cc-ease); }
.toast.on { opacity: 1; transform: translate(-50%, 0); }

.confirm { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(2, 4, 8, 0.72); backdrop-filter: blur(3px); animation: fadeIn var(--cc-dur-base) var(--cc-ease); z-index: 10; }
.confirm[hidden] { display: none; }
@keyframes fadeIn { from { opacity: 0; } }
.dialog { position: relative; width: min(400px, 90vw); height: 214px; filter: drop-shadow(4px 4px 0 rgba(4, 6, 11, 0.9)); animation: pop var(--cc-dur-base) var(--cc-ease); }
.dialog > .frame { position: absolute; inset: 0; }
.dialog .body { padding: 26px 24px 20px; align-items: center; text-align: center; }
@keyframes pop { from { transform: scale(0.96); opacity: 0; } }
.dialog h2 { position: relative; isolation: isolate; padding: 0 4px; margin: 0; font: 800 34px/1 var(--cc-font); letter-spacing: var(--cc-track-title); text-transform: uppercase;
  color: transparent; filter: drop-shadow(2px 2px 0 var(--cc-ink)) drop-shadow(0 0 12px rgba(255, 42, 74, 0.35)); }
.dialog .rule { margin: 8px auto 12px; width: 46%; background: linear-gradient(var(--cc-crimson), var(--cc-crimson)) 2px 50% / calc(100% - 4px) 2px no-repeat, var(--cc-ink); }
.dialog p { margin: 0 0 16px; font: 500 var(--cc-type-body)/1.4 var(--cc-font); color: var(--cc-text-dim); }
.dialog .row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%; }
.dialog .btn { height: 44px; }

.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
button:focus-visible { outline: none; }
.seg button:focus-visible, :host(.kbd) .seg button:focus { outline: 2px solid var(--cc-cyan); outline-offset: 1px; }

/* ── Phones (landscape) — panel becomes a collapsible sheet ── */
@media (max-height: 500px) {
  :host { --panel-w: 56vw; }
  .panel { top: 6px; right: 6px; bottom: 6px; }
  .panel > .frame { --chamfer: 12px; }
  .handle { display: flex; position: absolute; left: 50%; top: 1px; transform: translateX(-50%); width: 64px; height: 16px; align-items: center; justify-content: center; color: var(--cc-text-dim); z-index: 4; }
  .handle svg { width: 16px; height: 16px; transition: transform var(--cc-dur-slow) var(--cc-ease); }
  :host([sheet="collapsed"]) .panel { transform: translateY(calc(100% - 66px)); }
  :host([sheet="collapsed"]) .handle svg { transform: rotate(180deg); }
  :host([sheet="collapsed"]) .stage { right: 0; }
  :host([sheet="collapsed"]) .hdr { right: 180px; }
  .stage { right: calc(var(--panel-w) + 8px); }
  .tabs { padding: 14px 8px 6px 12px; grid-template-columns: repeat(5, 1fr); }
  .tabkey, .keys, .btn .key, .hint-turn, .presets .lbl, .preset > span:last-child { display: none; }
  .tab { padding: 4px 0 7px; font-size: var(--cc-type-micro); letter-spacing: 0.5px; gap: 3px; }
  .tab svg { width: 20px; height: 20px; }
  .tabs::after { left: 12px; right: 8px; }
  .content { padding: 0 10px 12px 12px; }
  .section { margin-top: 12px; }
  .actions { padding: 8px 12px 10px; grid-template-columns: 1fr 1.6fr; }
  .actions::before { left: 12px; right: 8px; }
  .btn { height: 44px; font-size: var(--cc-type-body); letter-spacing: 1.5px; }
  .hdr { left: 14px; top: 10px; right: calc(var(--panel-w) + 20px); }
  .kicker { display: none; }
  .callsign { margin: 0; font-size: 22px; filter: drop-shadow(2px 2px 0 var(--cc-ink)); }
  .callsign::before { -webkit-text-stroke-width: 4px; }
  .rule { height: 4px; margin: 4px 0 5px 2px; width: 110px; background: linear-gradient(var(--accent), var(--accent)) 1.5px 50% / calc(100% - 3px) 1.5px no-repeat, var(--cc-ink); }
  .sub { font-size: var(--cc-type-micro); letter-spacing: 1px; }
  .ready { margin-top: 6px; font-size: var(--cc-type-micro); }
  .toolbar { top: auto; bottom: 62px; right: auto; left: 10px; flex-direction: column; gap: 8px; }
  .tool { height: 40px; width: 44px; padding: 0; justify-content: center; }
  .tool .t, .tool .key { display: none; }
  .presets { left: auto; right: calc(var(--panel-w) + 16px); top: 60px; transform: none; gap: 6px; }
  :host([sheet="collapsed"]) .presets { right: 10px; }
  .preset .pthumb { width: 40px; height: 40px; }
  .stage-tools { bottom: 8px; left: 64px; transform: none; gap: 6px; }
  .seg button { height: 38px; padding: 0 8px; font-size: var(--cc-type-micro); letter-spacing: 0.5px; }
  .figure-wrap { bottom: 16%; height: 66%; }
  .pedestal { bottom: 12%; width: 70%; }
  .toast { bottom: 58px; }
  .grid.torso, .grid.head, .grid.hair { grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)); }
  .opt { min-height: 44px; }
}
@media (max-width: 600px) and (min-height: 501px) {
  :host { --panel-w: 100vw; }
  .panel { top: 44vh; left: 0; right: 0; bottom: 0; width: auto; }
  .stage { right: 0; bottom: 56vh; }
  .hdr { right: 16px; }
  .toolbar { top: auto; bottom: calc(56vh + 8px); right: 12px; }
  .presets, .hint-turn { display: none; }
  .stage-tools { bottom: calc(56vh + 8px); left: 12px; transform: none; }
  .toast { left: 50%; bottom: calc(56vh + 60px); }
}
@media (hover: none) { .opt:hover, .tool:hover, .preset:hover, .plate:hover { transform: none; } }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition-duration: 0.01ms !important; }
}
`,P=class extends HTMLElement{constructor(){super(),this.game=null,this.category=0,this.preview=null,this.previewSection=null,this.undoStack=[],this.snapshot=null,this.session=!1,this.isOpen=!1,this.poseChoice=`idle`,this.cameraChoice=`full`,this.helmetOff=!1,this.yaw=0,this.yawTarget=0,this.view=_.full.slice(),this._stageCache=new Map,this._raf=0,this._renderQueued=!1,this._thumbSeq=0;let e=this.attachShadow({mode:`open`});e.innerHTML=`<style>${N}</style>${this.template()}`;let t=t=>e.querySelector(t);this.$=t,this.el={root:t(`.root`),stage:t(`.stage`),figure:t(`.figure`),figureWrap:t(`.figure-wrap`),callsign:t(`.callsign`),sub:t(`.sub`),tabs:[...e.querySelectorAll(`.tab`)],content:t(`.content`),save:t(`.save`),back:t(`.back`),undo:t(`[data-act="undo"]`),toast:t(`.toast`),confirm:t(`.confirm`),presets:t(`.presets`),live:t(`.live`)},this.bind()}template(){let e=D.map((e,t)=>`<button class="tab" role="tab" id="tab-${e.id}" aria-controls="panel" aria-selected="false" data-cat="${t}" tabindex="-1">${E[e.id]}<span>${e.label}</span></button>`).join(``),t=T.map((e,t)=>`<button class="preset" data-preset="${t}" aria-label="Apply ${e.name} preset"><span class="pthumb"></span><span>${e.name}</span></button>`).join(``);return`
<div class="root">
  <div class="backdrop"><div class="shaft"></div><div class="haze h1"></div><div class="haze h2"></div><div class="floor"></div><div class="halftone"></div><div class="vignette"></div><div class="letterbox"></div></div>
  <section class="stage" tabindex="0" aria-label="Agent preview. Drag or use the arrow keys to turn the agent.">
    <div class="rim r1"></div><div class="rim r2"></div>
    <div class="pedestal"><div class="ring"></div><div class="plate-disc"></div></div>
    <div class="figure-wrap"><div class="figure"></div><div class="sweep"></div></div>
  </section>
  <header class="hdr">
    <div class="kicker">Field Armory</div>
    <h1 class="callsign">Agent</h1>
    <span class="rule" aria-hidden="true"></span>
    <div class="sub"></div>
    <div class="ready caption cyan" hidden>Returning agent · <kbd class="key">Enter</kbd> to deploy</div>
  </header>
  <div class="toolbar" role="toolbar" aria-label="Edit">
    <button class="tool" data-act="undo" aria-label="Undo last change">${E.undo}<span class="t">Undo</span><kbd class="key">Z</kbd></button>
    <button class="tool" data-act="reset" aria-label="Reset appearance to standard issue">${E.reset}<span class="t">Reset</span></button>
    <button class="tool" data-act="random" aria-label="Randomize appearance">${E.dice}<span class="t">Randomize</span><kbd class="key">R</kbd></button>
  </div>
  <div class="presets" role="group" aria-label="Presets"><span class="lbl caption steel">Presets</span>${t}</div>
  <div class="stage-tools">
    <div class="seg" role="group" aria-label="Camera">
      <button data-camera="full" aria-pressed="true">Full</button><button data-camera="bust" aria-pressed="false">Bust</button>
    </div>
    <div class="seg" role="group" aria-label="Pose">
      <button data-pose="idle" aria-pressed="true">Idle</button><button data-pose="hero" aria-pressed="false">Ready</button>
    </div>
    <div class="seg" role="group" aria-label="Helmet">
      <button data-helmet-off aria-pressed="false">Helmet off</button>
    </div>
    <span class="hint-turn" aria-hidden="true">${E.turn}Drag to turn</span>
  </div>
  <aside class="panel" aria-label="Customization">
    <div class="frame"><div class="body">
      <button class="handle" aria-label="Collapse panel" aria-expanded="true">${E.chevron}</button>
      <div class="tabs" role="tablist" aria-label="Categories"><kbd class="key tabkey" aria-hidden="true">Q</kbd>${e}<kbd class="key tabkey" aria-hidden="true">E</kbd></div>
      <div class="content" id="panel" role="tabpanel"></div>
      <footer class="actions">
        <div class="keys" aria-hidden="true">
          <span><kbd class="key">Tab</kbd>Category</span><span><kbd class="key">↑↓←→</kbd>Browse</span><span><kbd class="key">Enter</kbd>Select</span>
          <span><kbd class="key">R</kbd>Random</span><span><kbd class="key">Z</kbd>Undo</span>
        </div>
        <button class="btn plate back"><kbd class="key">Esc</kbd>Back</button>
        <button class="btn primary save">Save &amp; Deploy <kbd class="key k-any">⇧ Enter</kbd><kbd class="key k-focus">Enter</kbd></button>
      </footer>
    </div><span class="brackets"></span></div>
  </aside>
  <div class="toast caption amber" role="status" aria-live="polite"></div>
  <div class="sr live" aria-live="polite"></div>
  <div class="confirm" hidden>
    <div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="cf-t" aria-describedby="cf-d">
      <div class="frame"><div class="body">
        <h2 id="cf-t" data-text="Discard changes?">Discard changes?</h2>
        <span class="rule" aria-hidden="true"></span>
        <p id="cf-d">Your agent has unsaved changes. Leaving now restores the last saved loadout.</p>
        <div class="row"><button class="btn plate" data-confirm="keep">Keep editing</button><button class="btn primary" data-confirm="discard">Discard</button></div>
      </div><span class="brackets"></span></div>
    </div>
  </div>
</div>`}sync(e,t){if(!e){this.isOpen&&this.close(),this.session=!1,this._exitedAt=0;return}this._exitedAt&&performance.now()-this._exitedAt<5e3||(this._exitedAt=0,this.session||this.beginSession(),t&&!this.isOpen?this.open():!t&&this.isOpen&&this.close())}beginSession(){this.session=!0,this.snapshot=this.pick(this.game.character),this.undoStack=[],this.preview=null,this.previewSection=null,this.confirmOpen=!1,this.el.confirm.hidden=!0,this.category=0,this.yaw=this.yawTarget=0,this.poseChoice=`idle`,this.cameraChoice=`full`,this.setAttribute(`camera`,`full`),this.view=_.full.slice(),this._viewTween=null,this._stageKey=null,this.helmetOff=!1,this.shadowRoot.querySelector(`[data-helmet-off]`).setAttribute(`aria-pressed`,`false`),this.shadowRoot.querySelectorAll(`[data-pose]`).forEach(e=>e.setAttribute(`aria-pressed`,String(e.dataset.pose===`idle`))),this.shadowRoot.querySelectorAll(`[data-camera]`).forEach(e=>e.setAttribute(`aria-pressed`,String(e.dataset.camera===`full`))),this.removeAttribute(`sheet`),this.classList.remove(`kbd`);let e=null;try{e=localStorage.getItem(`cc_character`)}catch{}this.returning=!!e,this._focusSaveOnOpen=this.returning}open(){this.isOpen=!0,this.setAttribute(`open`,``),requestAnimationFrame(()=>this.setAttribute(`shown`,``)),this.renderAll();let e=this.shadowRoot.querySelector(`.ready`);e.hidden=!this.returning,this.el.save.classList.toggle(`ready`,!!this.returning),this._focusSaveOnOpen&&(this._focusSaveOnOpen=!1,this.el.save.focus({preventScroll:!0})),this._resizeObs??(this._resizeObs=new ResizeObserver(()=>this.onResize())),this._resizeObs.observe(this.el.figureWrap)}close(){this.isOpen=!1,this.shadowRoot.activeElement?.blur?.(),this.removeAttribute(`shown`),this.removeAttribute(`open`),this.preview=null,this._resizeObs?.disconnect(),cancelAnimationFrame(this._raf),this._raf=0}pick(e){let t={};for(let n of b)t[n]=e[n];return t}get character(){return this.game.character}isDirty(){let e=this.character;return b.some(t=>e[t]!==this.snapshot[t])}sfx(e){try{this.game?.audio?.[e]?.()}catch{}}bind(){let e=this.shadowRoot;e.addEventListener(`click`,e=>this.onClick(e)),e.addEventListener(`pointerover`,e=>this.onHover(e,!0)),e.addEventListener(`pointerout`,e=>this.onHover(e,!1)),e.addEventListener(`focusin`,e=>this.onFocus(e,!0)),e.addEventListener(`focusout`,e=>this.onFocus(e,!1)),e.addEventListener(`pointerdown`,()=>this.classList.remove(`kbd`)),e.addEventListener(`keydown`,e=>{e.target?.tagName===`INPUT`&&e.code!==`Tab`&&(e.stopPropagation(),(e.code===`Enter`||e.code===`NumpadEnter`||e.code===`Escape`)&&(e.preventDefault(),e.target.blur(),this.focusNav(this.el.tabs[this.category])))}),e.addEventListener(`input`,e=>{e.target?.name===`callsign`&&this.onName(e.target)});let t=this.el.stage;t.addEventListener(`pointerdown`,e=>{e.button!==0&&e.pointerType===`mouse`||(t.setPointerCapture(e.pointerId),this._drag={x:e.clientX,yaw:this.yawTarget},t.classList.add(`dragging`))}),t.addEventListener(`pointermove`,e=>{this._drag&&this.setYaw(this._drag.yaw+(e.clientX-this._drag.x)/240,!0)});let n=()=>{this._drag=null,t.classList.remove(`dragging`)};t.addEventListener(`pointerup`,n),t.addEventListener(`pointercancel`,n),t.addEventListener(`dblclick`,()=>this.setYaw(0));let r=this.el.content;r.addEventListener(`pointerdown`,e=>{e.pointerType!==`mouse`&&(this._swipe={x:e.clientX,y:e.clientY})}),r.addEventListener(`pointerup`,e=>{let t=this._swipe;if(this._swipe=null,!t)return;let n=e.clientX-t.x;Math.abs(n)>70&&Math.abs(e.clientY-t.y)<40&&(this._swallowClick=!0,this.setCategory(this.category+(n<0?1:-1)))})}onClick(e){let t=e.target.closest?.(`button, [data-idx]`);if(t){if(this._swallowClick){this._swallowClick=!1;return}if(t.dataset.cat!=null)return this.setCategory(Number(t.dataset.cat));if(t.dataset.voice!=null)return this.playVoice(Number(t.dataset.voice),t);if(t.dataset.idx!=null)return this.choose(t.dataset.key,Number(t.dataset.idx),t);if(t.dataset.preset!=null)return this.applyPreset(Number(t.dataset.preset));if(t.dataset.camera)return this.setCamera(t.dataset.camera,!0);if(t.dataset.pose)return this.setPose(t.dataset.pose,!0);if(t.hasAttribute(`data-helmet-off`))return this.toggleHelmet();if(t.dataset.confirm)return t.dataset.confirm===`discard`?this.discard():this.closeConfirm();if(t.classList.contains(`handle`))return this.toggleSheet();if(t===this.el.save)return this.save();if(t===this.el.back)return this.back();switch(t.dataset.act){case`undo`:return this.undo();case`reset`:return this.reset();case`random`:return this.randomize();default:}}}onHover(e,t){if(e.pointerType===`touch`)return;let n=e.target.closest?.(`.opt[data-idx]`);n&&(!t&&n.contains(e.relatedTarget)||this.setPreview(t?{key:n.dataset.key,value:Number(n.dataset.idx)}:null))}onFocus(e,t){let n=e.target.closest?.(`.opt[data-idx]`);n&&this.classList.contains(`kbd`)&&this.setPreview(t?{key:n.dataset.key,value:Number(n.dataset.idx)}:null);let r=e.target.closest?.(`.section`);this.previewSection=t&&r&&r.dataset.key||null}handleKey(e,t){if(!this.isOpen)return!1;let n=!!(t&&typeof t.preventDefault==`function`),r=()=>(n&&(t.preventDefault(),t.stopImmediatePropagation()),!0),i=this.shadowRoot.activeElement,a=!!(t?.shiftKey||this.game?.keys?.ShiftLeft||this.game?.keys?.ShiftRight),o=/^(Arrow|Key[WASD]$)/.test(e);if((o||e===`Tab`||e===`KeyQ`||e===`KeyE`)&&this.classList.add(`kbd`),this.confirmOpen){if(e===`Escape`||e===`GamepadB`)return this.closeConfirm(),r();if(o){let e=[...this.el.confirm.querySelectorAll(`button`)];return e[(e.indexOf(i)+1)%2].focus(),r()}return e===`Enter`||e===`Space`||e===`NumpadEnter`?n&&i?.tagName===`BUTTON`?!0:((i?.closest(`.confirm`)?i:this.el.confirm.querySelector(`[data-confirm=keep]`)).click(),r()):r()}switch(e){case`Tab`:return this.setCategory(this.category+(a?-1:1),!0),r();case`KeyQ`:return this.setCategory(this.category-1,!0),r();case`KeyE`:return this.setCategory(this.category+1,!0),r();case`KeyR`:case`GamepadX`:return this.randomize(),r();case`KeyZ`:return this.undo(),r();case`KeyC`:return this.setCamera(this.cameraChoice===`bust`?`full`:`bust`,!0),r();case`GamepadY`:return this.save(),r();case`Escape`:return this.back(),r();case`Enter`:case`NumpadEnter`:case`Space`:return e!==`Space`&&a?(this.save(),r()):i&&i!==this.el.stage&&i.matches(`button`)?n?!0:(i.click(),r()):(e!==`Space`&&this.save(),r());default:}if(o){let t={ArrowUp:`up`,KeyW:`up`,ArrowDown:`down`,KeyS:`down`,ArrowLeft:`left`,KeyA:`left`,ArrowRight:`right`,KeyD:`right`}[e];return i===this.el.stage&&(t===`left`||t===`right`)?(this.setYaw(this.yawTarget+(t===`left`?-.25:.25)),r()):(this.moveFocus(t,i),r())}return!1}navItems(){let e=this.shadowRoot;return[...this.el.tabs,...e.querySelectorAll(`.content .opt, .content input, .content .play`),this.el.back,this.el.save].filter(e=>e.offsetParent!==null)}moveFocus(e,t){let n=this.navItems();if(!t||!n.includes(t)){let e=this.el.content.querySelector(`.opt[aria-checked="true"]`)||n.find(e=>e.classList.contains(`opt`))||this.el.tabs[this.category];return this.focusNav(e)}if(t.classList.contains(`tab`)&&(e===`left`||e===`right`)){this.setCategory(this.category+(e===`left`?-1:1),!0,!0);return}let r=t.getBoundingClientRect(),i=r.left+r.width/2,a=r.top+r.height/2,o=null,s=1/0;for(let r of n){if(r===t)continue;let n=r.getBoundingClientRect(),c=n.left+n.width/2-i,l=n.top+n.height/2-a,u={up:-l,down:l,left:-c,right:c}[e],d=Math.abs(e===`up`||e===`down`?c:l);if(u<=4||d>u*1.2+12)continue;let f=u+d*2.2;f<s&&(s=f,o=r)}o&&(this.focusNav(o),this.sfx(`menuNav`))}focusNav(e){e&&(e.focus({preventScroll:!0}),e.scrollIntoView?.({block:`nearest`,behavior:M()?`auto`:`smooth`}))}effective(){let e=this.pick(this.character);return this.preview&&(e[this.preview.key]=this.preview.value),e}setPreview(e){if(!(e&&this.preview&&e.key===this.preview.key&&e.value===this.preview.value||!e&&!this.preview)){if(e&&this.character[e.key]===e.value&&(e=null),clearTimeout(this._previewClear),!e){this._previewClear=setTimeout(()=>{this.preview=null,this.queueRender()},70);return}this.preview=e,this.queueRender()}}choose(e,t,n){let r=this.sectionFor(e),i=r?.data?.[t];if(i){if(i.unlocked===!1){n?.classList.remove(`shake`),n?.offsetWidth,n?.classList.add(`shake`),this.toast(`${i.name} locked · ${w[i.id]||`Classified`}`),this.sfx(`menuNav`);return}if(this.character[e]===t){this.preview=null;return}this.commit({[e]:t}),this.sfx(`menuSelect`),this.announce(`${r.title}: ${i.name}`)}}commit(e){this.el.save.classList.remove(`ready`);let t=this.character,n=this.pick(t);return Object.keys(e).some(n=>t[n]!==e[n])?(this.undoStack.push(n),this.undoStack.length>60&&this.undoStack.shift(),Object.assign(t,e),this.preview=null,this.renderAll(!1),!0):!1}undo(){let e=this.undoStack.pop();if(!e)return this.sfx(`menuNav`);Object.assign(this.character,e),this.preview=null,this.sfx(`menuSelect`),this.announce(`Undone`),this.renderAll(!1)}reset(){let t={};for(let n of y)t[n]=e[n];this.commit(t)&&(this.sfx(`menuSelect`),this.toast(`Reset to standard issue`))}randomize(){let e=e=>Math.floor(Math.random()*e),s={colorIndex:e(i.length),skinToneIndex:e(n.length),hairIndex:e(d.length),eyeIndex:e(c.length),armorIndex:e(f.length),helmetIndex:e(t.length),visorIndex:e(r.length),shoulderIndex:e(p.length),badgeIndex:Math.random()<.15?0:1+e(u.length-1),weaponSkinIndex:e(o.length)};f[s.armorIndex].id===`stealth`&&(Math.random()<.6&&(s.visorIndex=Math.random()<.5?1:2),Math.random()<.6&&(s.weaponSkinIndex=1)),n[s.skinToneIndex].id===`synthetic`&&Math.random()<.7&&(s.eyeIndex=Math.random()<.5?5:1);let l=a.map((e,t)=>e.unlocked===!1?-1:t).filter(e=>e>=0);l.length>1&&(s.loadoutIndex=l[e(l.length)]),this.commit(s),this.sfx(`menuConfirm`),this.flashStage(),this.announce(`Randomized appearance`)}applyPreset(e){let t=T[e];t&&(this.commit({...t.ch}),this.sfx(`menuConfirm`),this.flashStage(),this.toast(`${t.name} preset applied`))}onName(e){let t=e.value.slice(0,16);t!==e.value&&(e.value=t);let n=this.nameError(t),r=this.shadowRoot.querySelector(`.err`);if(e.setAttribute(`aria-invalid`,String(!!n)),r&&(r.textContent=n||`Letters, numbers, space . _ ' -`,r.classList.toggle(`ok`,!n)),this.shadowRoot.querySelector(`.count`).textContent=`${t.length}/16`,!n&&t.trim()!==this.character.name){let e=performance.now();(!this._nameEditAt||e-this._nameEditAt>1200)&&this.undoStack.push(this.pick(this.character)),this._nameEditAt=e,this.character.name=t.trim()}this.el.save.setAttribute(`aria-disabled`,String(!!n)),this.el.undo.disabled=this.undoStack.length===0,this.renderHeader()}nameError(e){let t=e.trim();return t?x.test(t)?``:`Use letters, numbers, space . _ ' -`:`Callsign required`}playVoice(e,t){let n=l[e],r=this.game?.audio;try{r?.init?.(),r?.resume?.(),r?.playerGrunt?.(n,`hurt`),setTimeout(()=>r?.playerGrunt?.(n,`slide`),220)}catch{}t.classList.remove(`ping`),t.offsetWidth,t.classList.add(`ping`)}save(){let e=this.shadowRoot.querySelector(`input[name=callsign]`),t=this.nameError(e?e.value:this.character.name||``);if(t){this.setCategory(0),this.toast(t),requestAnimationFrame(()=>this.shadowRoot.querySelector(`input[name=callsign]`)?.focus());return}e&&(this.character.name=e.value.trim()||this.character.name),this.preview=null,this.sfx(`menuConfirm`),this.close(),this.session=!1,this._exitedAt=performance.now(),this.game._exitCreator(!0),this.clearExitGuard()}back(){if(this.isDirty())return this.openConfirm();this.leave()}discard(){Object.assign(this.character,this.snapshot),this.closeConfirm(!0),this.leave()}leave(){let e=this.game;this.sfx(`menuConfirm`),this.close(),this.session=!1,this._exitedAt=performance.now(),e._creatorExitTime=performance.now(),e._exitCreator(!1),this.clearExitGuard()}clearExitGuard(){this.game.state!==`characterCreate`&&(this._exitedAt=0)}openConfirm(){this.confirmOpen=!0,this.el.confirm.hidden=!1,this._confirmReturn=this.shadowRoot.activeElement,this.sfx(`menuNav`),requestAnimationFrame(()=>this.el.confirm.querySelector(`[data-confirm=keep]`).focus())}closeConfirm(e){this.confirmOpen=!1,this.el.confirm.hidden=!0,e||this._confirmReturn?.focus?.()}setCategory(e,t=!1,n=!1){let r=D.length,i=(e%r+r)%r,a=i>this.category?1:-1,o=i!==this.category;this.category=i,this.preview=null;let s=D[i];this.setCamera(s.camera||`full`),this.setPose(s.pose||`idle`),o&&this.sfx(`menuNav`),this.renderAll(!0,o?a:0),t&&(n?this.focusNav(this.el.tabs[i]):this.focusNav(this.el.content.querySelector(`.opt[aria-checked="true"]`)||this.el.content.querySelector(`.opt, input`)))}sectionFor(e){for(let t of D)for(let n of t.sections)if(n.key===e)return n;return null}setCamera(e,t=!1){this.cameraChoice=e,this.setAttribute(`camera`,e),this.shadowRoot.querySelectorAll(`[data-camera]`).forEach(t=>t.setAttribute(`aria-pressed`,String(t.dataset.camera===e))),this.tweenView(e===`bust`?_.bust:_.full),t&&this.sfx(`menuNav`)}setPose(e,t=!1){e===this.poseChoice&&!t||(this.poseChoice=e,this.shadowRoot.querySelectorAll(`[data-pose]`).forEach(t=>t.setAttribute(`aria-pressed`,String(t.dataset.pose===e))),t&&this.sfx(`menuNav`),this.queueRender())}toggleHelmet(){this.helmetOff=!this.helmetOff,this.shadowRoot.querySelector(`[data-helmet-off]`).setAttribute(`aria-pressed`,String(this.helmetOff)),this.sfx(`menuNav`),this.queueRender()}toggleSheet(){let e=this.getAttribute(`sheet`)===`collapsed`;e?this.removeAttribute(`sheet`):this.setAttribute(`sheet`,`collapsed`),this.shadowRoot.querySelector(`.handle`).setAttribute(`aria-expanded`,String(e)),this.sfx(`menuNav`)}setYaw(e,t=!1){this.yawTarget=k(e,-1,1),(t||M())&&(this.yaw=this.yawTarget),this.animate()}tweenView(e){let t=this.view.slice();if(M()||!this.isOpen){this.view=e.slice(),this.applyView();return}this._viewTween={from:t,to:e.slice(),t0:performance.now(),dur:520},this.animate()}animate(){if(this._raf||!this.isOpen)return;let e=t=>{this._raf=0;let n=!1,r=this._viewTween;if(r){let e=k((t-r.t0)/r.dur,0,1),i=e<.5?4*e*e*e:1-(-2*e+2)**3/2;this.view=r.from.map((e,t)=>e+(r.to[t]-e)*i),this.applyView(),e<1?n=!0:this._viewTween=null}Math.abs(this.yaw-this.yawTarget)>.002?(this.yaw+=(this.yawTarget-this.yaw)*.18,n=!0):this.yaw=this.yawTarget,this.applyYaw(),n&&(this._raf=requestAnimationFrame(e))};this._raf=requestAnimationFrame(e)}applyView(){this.el.figure.querySelector(`svg`)?.setAttribute(`viewBox`,this.view.map(e=>e.toFixed(2)).join(` `))}applyYaw(){let e=this.yaw;this.style.setProperty(`--yaw`,e.toFixed(3));let t=this.el.figure.querySelector(`svg`);if(!t)return;let n=(e,n)=>t.querySelector(e)?.setAttribute(`transform`,n),r=(1-Math.abs(e)*.07).toFixed(3);n(`.ag-yaw-back`,`translate(${(-e*7).toFixed(2)} 0) scale(${r} 1)`),n(`.ag-yaw-cape`,`translate(${(-e*4.5).toFixed(2)} 0) scale(${r} 1)`),n(`.ag-yaw-body`,`translate(${(e*.8).toFixed(2)} 0) scale(${r} 1)`),n(`.ag-yaw-head`,`translate(${(e*2.4).toFixed(2)} 0)`),n(`.ag-shadow`,`translate(${(e*3).toFixed(2)} 0)`)}flashStage(){let e=this.el.figure;M()||e.animate?.([{filter:`brightness(1.8)`},{filter:`brightness(1)`}],{duration:320,easing:`ease-out`})}onResize(){this.style.setProperty(`--fig-h`,`${this.el.figureWrap.clientHeight}px`)}queueRender(){this._renderQueued||(this._renderQueued=!0,requestAnimationFrame(()=>{this._renderQueued=!1,this.isOpen&&(this.renderStage(),this.renderHeader(),this.renderPreviewLabels())}))}renderAll(e=!0,t=0){if(!this.isOpen)return;let n=i[this.character.colorIndex]||i[0];this.style.setProperty(`--accent`,n.accent),this.style.setProperty(`--primary`,n.primary),this.el.tabs.forEach((e,t)=>{let n=t===this.category;e.setAttribute(`aria-selected`,String(n)),e.tabIndex=n?0:-1}),e?this.renderContent(t):this.refreshContent(),this.renderPresets(),this.renderStage(),this.renderHeader(),this.el.undo.disabled=this.undoStack.length===0}renderHeader(){let e=this.effective();this.el.callsign.textContent=e.name||`Agent`,this.el.callsign.dataset.text=e.name||`Agent`;let t=a[e.loadoutIndex]||a[0],n=s[e.backstoryIndex||0],r=f[e.armorIndex]||f[0];this.el.sub.innerHTML=`<b>${O(t.name)}</b> · ${O(n.name)} · ${O(r.name)}`;let o=i[e.colorIndex]||i[0];this.style.setProperty(`--accent`,o.accent)}stagePeek(e){if(this.helmetOff)return!0;let n=t[e.helmetIndex]?.id;if(S.has(n))return!1;let r=this.preview?.key||this.previewSection;return C.has(r)}renderStage(){let e=this.effective(),t=this.poseChoice,n=this.stagePeek(e),r=`${t}|${n}|${y.concat([`loadoutIndex`,`backstoryIndex`]).map(t=>e[t]).join(`,`)}`;if(r===this._stageKey)return;this._stageKey=r;let i=this._stageCache.get(r);i||(i=g(e,{pose:t,peek:n,idPrefix:`st-`}),this._stageCache.set(r,i),this._stageCache.size>48&&this._stageCache.delete(this._stageCache.keys().next().value)),this.el.figure.innerHTML=i,this.applyView(),this.applyYaw()}renderPresets(){this._presetsBuilt||(this._presetsBuilt=!0,this.el.presets.querySelectorAll(`.preset`).forEach((t,n)=>{let r={...e,...T[n].ch};t.querySelector(`.pthumb`).innerHTML=g(r,{view:[-22,-106,44,44],idPrefix:`ps${n}-`,lighting:`flat`})}))}renderPreviewLabels(){this.shadowRoot.querySelectorAll(`.section[data-key]`).forEach(e=>{let t=this.sectionFor(e.dataset.key),n=e.querySelector(`.cur`);if(!t||!n)return;let r=this.preview?.key===t.key,i=r?this.preview.value:this.character[t.key];n.textContent=t.data[i]?.name||``,n.classList.toggle(`preview`,r)})}renderContent(e=0){let t=D[this.category],n=this.el.content;n.setAttribute(`aria-labelledby`,`tab-${t.id}`),n.innerHTML=t.sections.map(e=>this.sectionHtml(e)).join(``),n.scrollTop=0,e&&(n.style.setProperty(`--swap-dir`,`${e*14}px`),n.classList.remove(`swap`),n.offsetWidth,n.classList.add(`swap`)),this.refreshContent(!0)}sectionHtml(e){if(e.type===`name`){let t=this.character.name||``,n=this.nameError(t);return`<div class="section" data-section="name"><h3><label for="callsign">${e.title}</label></h3>
        <label class="field"><input id="callsign" name="callsign" maxlength="16" autocomplete="off" spellcheck="false" value="${O(t)}" aria-describedby="callsign-err" aria-invalid="${!!n}"><span class="count">${t.length}/16</span></label>
        <p class="err ${n?``:`ok`}" id="callsign-err">${O(n||`Letters, numbers, space . _ ' -`)}</p></div>`}let t=e.data.map((t,n)=>this.optionHtml(e,t,n)).join(``),n=e.kind===`rifle`?`<div class="rifle-hero" aria-hidden="true"><div class="spin"></div></div>`:``;return`<div class="section" data-key="${e.key}"><h3><span>${e.title}</span><span class="cur"></span></h3>${n}<div class="grid ${e.kind}" role="radiogroup" aria-label="${e.title}">${t}</div></div>`}optionHtml(e,t,n){let r=t.unlocked===!1,i=`class="opt plate${e.kind===`origin`||e.kind===`voice`||e.kind===`class`?` card`:``}${r?` locked`:``}" role="radio" aria-checked="false" data-key="${e.key}" data-idx="${n}" tabindex="-1"`,a=`${t.name}${t.desc?`. ${t.desc}`:``}${t.perk?`. Perk: ${t.perk}`:``}${r?`. Locked: ${w[t.id]||`classified`}`:``}`,o=`<span class="tick" aria-hidden="true">${E.check}</span>`,s=t.tier?`<span class="tier" aria-hidden="true">${[1,2,3].map(e=>`<i class="${e<=t.tier?`on`:``}"></i>`).join(``)}&nbsp;${A[t.tier]}</span>`:``;switch(e.kind){case`eye`:return`<button ${i} aria-label="${O(a)}" title="${O(t.name)}"><span class="swatch" style="--c:${t.color}"></span><span class="oname">${O(t.name)}</span></button>`;case`skin`:return`<button ${i} aria-label="${O(a)}" title="${O(t.name)}"><span class="swatch" style="background:radial-gradient(circle at 35% 30%, ${t.color}, ${t.shadow})"></span><span class="oname">${O(t.name)}</span></button>`;case`palette`:return`<button ${i} aria-label="${O(a)}">${o}<span class="pal" aria-hidden="true"><i style="background:linear-gradient(135deg, ${t.primary}, ${t.dark})"></i><i style="background:${t.accent}"></i><i style="background:${t.dark}"></i></span><span class="oname">${O(t.name)}</span></button>`;case`badge`:return`<button ${i} aria-label="${O(a)}" title="${O(t.name)}">${o}<span class="badge-tile" aria-hidden="true">${t.icon?`<svg viewBox="-6.5 -6.5 13 13">${m(t.icon,`var(--accent)`,`#070b11`)}</svg>`:`<span class="oname" style="color:var(--faint)">None</span>`}</span><span class="oname">${O(t.name)}</span></button>`;case`origin`:return`<button ${i} aria-label="${O(a)}">${o}<span class="row"><span class="oname">${O(t.name)}</span></span><span class="desc">${O(t.desc)}</span><span class="perk caption cyan">${O(t.perk)}</span></button>`;case`voice`:return`<div class="voice-row" style="position:relative"><button ${i} aria-label="${O(a)}" style="width:100%;padding-right:60px">${o}<span class="oname">${O(t.name)}</span><span class="desc">${O(t.desc)}</span></button><button class="play" data-voice="${n}" aria-label="Preview ${O(t.name)} voice" style="position:absolute;right:10px;top:50%;transform:translateY(-50%)">${E.play}</button></div>`;case`class`:{let e=j(t).map(e=>{let t=t=>`${Math.round(k(t/e.max,0,1)*100)}%`,n=e.fmt||(e=>Math.round(e)),r=e.value-e.base,i=Math.abs(r)<1e-6?``:r>0?`up`:`down`;return`<span>${e.label}</span><span class="bar"><i style="--w:${t(e.value)}"></i></span><b class="${i}">${n(e.value)}</b>`}).join(``),n=r?`<span class="lock caption amber">${E.lock}${O(w[t.id]||`Classified`)}</span>`:``;return`<button ${i} aria-label="${O(a)}" aria-disabled="${r}">${o}<span class="row"><span class="oname">${O(t.name)}</span>${n}</span><span class="desc">${O(t.desc)}</span><span class="stats" aria-hidden="true">${e}</span></button>`}case`rifle`:return`<button ${i} aria-label="${O(a)}">${o}<span class="thumb" data-thumb="rifle"></span><span class="oname">${O(t.name)}</span></button>`;default:return`<button ${i} aria-label="${O(a)}">${o}<span class="thumb" data-thumb="${e.kind}"></span><span class="oname">${O(t.name)}</span>${s}</button>`}}refreshContent(e=!1){let t=this.character,n=y.map(e=>t[e]).join(`,`);this.shadowRoot.querySelectorAll(`.content .opt[data-key]`).forEach(r=>{let i=r.dataset.key,a=Number(r.dataset.idx);r.setAttribute(`aria-checked`,String(t[i]===a));let o=r.querySelector(`.thumb[data-thumb]`);if(!o||!e&&o.dataset.sig===n)return;o.dataset.sig=n;let s={...t,[i]:a},c=`t${this._thumbSeq++}-`;switch(o.dataset.thumb){case`head`:o.innerHTML=g(s,{headOnly:!0,idPrefix:c});break;case`hair`:o.innerHTML=g(s,{headOnly:!0,peek:!0,idPrefix:c});break;case`torso`:o.innerHTML=g(s,{view:_.torso,idPrefix:c,lighting:`flat`});break;case`rifle`:o.innerHTML=v(s,{idPrefix:c});break;default:}});let r=this.shadowRoot.querySelector(`.rifle-hero .spin`);r&&(e||r.dataset.sig!==n)&&(r.dataset.sig=n,r.innerHTML=v(t,{idPrefix:`rh${this._thumbSeq++}-`}));let i=this.shadowRoot.querySelector(`input[name=callsign]`);i&&this.shadowRoot.activeElement!==i&&i.value!==(t.name||``)&&(i.value=t.name||``),this.el.save.setAttribute(`aria-disabled`,String(!!this.nameError(t.name||``))),this.renderPreviewLabels(),this.el.undo.disabled=this.undoStack.length===0}toast(e){let t=this.el.toast;t.textContent=e,t.classList.add(`on`),clearTimeout(this._toastT),this._toastT=setTimeout(()=>t.classList.remove(`on`),2200)}announce(e){this.el.live.textContent=e}};customElements.get(`agent-showroom`)||customElements.define(`agent-showroom`,P);function F(e){let t=document.querySelector(`agent-showroom`);return t||(t=document.createElement(`agent-showroom`),document.body.appendChild(t)),t.game=e,t}export{F as mountShowroom};
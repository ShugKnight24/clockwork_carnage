const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/cutscene-ONmpINYQ.js","assets/data-kdRqmto-.js","assets/builder-U-bd2uYW.js","assets/analytics-5fjFOfxM.js"])))=>i.map(i=>d[i]);
import{i as e,n as t,r as n,t as r}from"./analytics-5fjFOfxM.js";import{C as i,S as a,_ as o,a as s,b as c,c as l,d as u,f as d,g as f,h as p,i as m,l as h,m as g,n as _,o as v,p as y,r as b,s as x,t as S,u as C,v as w,w as T,x as E,y as D}from"./data-kdRqmto-.js";import{_ as O,a as k,c as A,d as j,f as M,g as N,h as P,i as F,l as ee,m as te,n as ne,o as I,p as re,r as ie,s as L,t as ae,u as oe}from"./enemy-renderers-D7d6X9kW.js";(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var se=class{constructor(e){this.game=e,this.active=!1,this.selectedCategory=`enemies`,this.selectedId=null,this.tweakData={},this.container=null,this.initUI()}initUI(){this.container=document.createElement(`div`),this.container.id=`asset-editor-overlay`,this.container.style.cssText=`
            position: absolute;
            top: 20px;
            right: 20px;
            width: 320px;
            max-height: 80vh;
            background: rgba(10, 10, 20, 0.95);
            border: 2px solid #00f2ff;
            color: #fff;
            font-family: 'Courier New', monospace;
            padding: 15px;
            display: none;
            z-index: 10000;
            overflow-y: auto;
            box-shadow: 0 0 20px rgba(0, 242, 255, 0.3);
            border-radius: 8px;
            user-select: none;
        `,this.container.innerHTML=`
            <h2 style="margin: 0 0 15px 0; color: #00f2ff; font-size: 18px; text-transform: uppercase; letter-spacing: 2px;">Asset Precision v0.8.0</h2>
            
            <div style="margin-bottom: 15px;">
                <label>Category:</label>
                <select id="editor-category" style="background: #1a1a2e; color: #fff; border: 1px solid #00f2ff; width: 100%;">
                    <option value="enemies">Enemies</option>
                    <option value="weapons">Weapons</option>
                    <option value="skins">Skins</option>
                </select>
            </div>

            <div style="margin-bottom: 15px;">
                <label>Selection:</label>
                <select id="editor-selection" style="background: #1a1a2e; color: #fff; border: 1px solid #00f2ff; width: 100%;">
                    <!-- Populated dynamically -->
                </select>
            </div>

            <hr style="border: 0; border-top: 1px solid #333; margin: 15px 0;">

            <div id="editor-controls">
                <!-- Control sliders will appear here -->
            </div>

            <div style="margin-top: 20px;">
                <button id="editor-export" style="background: #00f2ff; color: #000; border: none; padding: 8px; width: 100%; cursor: pointer; font-weight: bold;">EXPORT CONFIG</button>
            </div>
            
            <p style="font-size: 10px; color: #666; margin-top: 10px;">[Shift + U] to toggle. Changes apply in real-time.</p>
        `,document.body.appendChild(this.container),this.container.querySelector(`#editor-category`).addEventListener(`change`,e=>{this.selectedCategory=e.target.value,this.populateSelection()}),this.container.querySelector(`#editor-selection`).addEventListener(`change`,e=>{this.selectedId=e.target.value,this.loadCurrentAsset()}),this.container.querySelector(`#editor-export`).addEventListener(`click`,()=>{this.exportConfig()}),this.container.addEventListener(`mousedown`,e=>e.stopPropagation()),this.container.addEventListener(`keydown`,e=>e.stopPropagation())}toggle(){this.active=!this.active,this.container.style.display=this.active?`block`:`none`,this.active?(this.populateSelection(),this.game.unlockPointer&&this.game.unlockPointer()):this.game.lockPointer&&this.game.lockPointer()}populateSelection(){let e=this.container.querySelector(`#editor-selection`);e.innerHTML=``;let t={};this.selectedCategory===`enemies`?t=this.game.getAssetMetadata(`enemies`):this.selectedCategory===`weapons`&&(t=this.game.getAssetMetadata(`weapons`)),Object.keys(t).forEach(t=>{let n=document.createElement(`option`);n.value=t,n.textContent=t,e.appendChild(n)}),Object.keys(t).length>0&&(this.selectedId=Object.keys(t)[0],this.loadCurrentAsset())}loadCurrentAsset(){let e=this.container.querySelector(`#editor-controls`);e.innerHTML=``;let t=this.game.getAssetConfig(this.selectedCategory,this.selectedId);t&&(this.createSlider(e,`Scale`,`scale`,.1,5,.1,t.scale||1),this.createSlider(e,`Y-Offset`,`yOffset`,-2,2,.05,t.yOffset||0),this.createSlider(e,`Anim Speed`,`animSpeed`,.1,20,.5,t.animSpeed||8),this.createSlider(e,`Glow Str`,`glowStrength`,0,1,.05,t.glowStrength||.15),this.createSlider(e,`Tech Opacity`,`techLineOpacity`,0,1,.05,t.techLineOpacity||.3),this.createColorPicker(e,`Primary Tint`,`color1`,t.color1||`#ffffff`))}createSlider(e,t,n,r,i,a,o){let s=document.createElement(`div`);s.style.marginBottom=`10px`,s.innerHTML=`
            <div style="display: flex; justify-content: space-between; font-size: 12px;">
                <label>${t}</label>
                <span id="val-${n}">${o}</span>
            </div>
            <input type="range" min="${r}" max="${i}" step="${a}" value="${o}" style="width: 100%;">
        `,s.querySelector(`input`).addEventListener(`input`,e=>{let t=parseFloat(e.target.value);s.querySelector(`#val-${n}`).textContent=t,this.updateAsset(n,t)}),e.appendChild(s)}createColorPicker(e,t,n,r){let i=document.createElement(`div`);i.style.marginBottom=`10px`,i.innerHTML=`
            <div style="display: flex; justify-content: space-between; font-size: 12px;">
                <label>${t}</label>
            </div>
            <input type="color" value="${r}" style="width: 100%; border: 1px solid #333; background: none; cursor: pointer;">
        `,i.querySelector(`input`).addEventListener(`input`,e=>{this.updateAsset(n,e.target.value)}),e.appendChild(i)}updateAsset(e,t){this.game.updateAssetLive(this.selectedCategory,this.selectedId,e,t)}exportConfig(){let e=this.game.getAssetConfig(this.selectedCategory,this.selectedId),t=JSON.stringify(e,null,2);console.log(`[ASSET EDITOR] Exported ${this.selectedId}:`,t),navigator.clipboard.writeText(t).then(()=>{alert(`Config for ${this.selectedId} copied to clipboard!`)})}},ce=.18,le=.3,ue=.0017,de=.002,R=.6,z=.5,fe=.04,pe=.16,me=.012,he=.016,ge=.4,_e=.02,ve=.72,ye=.75,be=.45,xe=`cc_keybinds`;Math.PI/2;var Se=Math.PI*2;Math.PI/180,180/Math.PI;var Ce={moveForward:`KeyW`,moveBack:`KeyS`,moveLeft:`KeyA`,moveRight:`KeyD`,sprint:`ShiftLeft`,interact:`KeyE`,pause:`Escape`,weapon1:`Digit1`,weapon2:`Digit2`,weapon3:`Digit3`,weapon4:`Digit4`,weapon5:`Digit5`,weapon6:`Digit6`,weapon7:`Digit7`,weapon8:`Digit8`,toggleFPS:`KeyF`,chronoShift:`KeyQ`,crouch:`ControlLeft`},we=class{constructor({canvas:e,onKeyDown:t=()=>{},onKeyUp:n=()=>{},onDashTrigger:r=()=>{},onMouseDown:i=()=>{},onMouseUp:a=()=>{},onWheel:o=()=>{},onLockChange:s=()=>{},getState:c=()=>null,playingState:l=`PLAYING`}={}){this.canvas=e,this.keys={},this.mouse={dx:0,dy:0,locked:!1},this.keybinds={...Ce},this._onKeyDown=t,this._onKeyUp=n,this._onDashTrigger=r,this._onMouseDown=i,this._onMouseUp=a,this._onWheel=o,this._onLockChange=s,this._getState=c,this._playingState=l,this._lastTapKey=null,this._lastTapTime=0,this._lastWeaponSwitch=0,this._WEAPON_SWITCH_COOLDOWN=200,this._WHEEL_THRESHOLD=50,this._bound={},this._register()}loadKeybinds(){try{let e=localStorage.getItem(xe);if(!e)return;let t=JSON.parse(e);for(let e of Object.keys(this.keybinds))Object.prototype.hasOwnProperty.call(t,e)&&typeof t[e]==`string`&&(this.keybinds[e]=t[e])}catch{}}saveKeybinds(){try{localStorage.setItem(xe,JSON.stringify(this.keybinds))}catch{}}rebind(e,t){let n=this.keybinds[e],r=null;for(let i of Object.keys(this.keybinds))if(i!==e&&this.keybinds[i]===t){this.keybinds[i]=n,r=i;break}return this.keybinds[e]=t,this.saveKeybinds(),{swappedAction:r}}consumeMouseDelta(){let{dx:e,dy:t}=this.mouse;return this.mouse.dx=0,this.mouse.dy=0,{dx:e,dy:t}}lockPointer(){e(this.canvas)}unlockPointer(){n()}destroy(){document.removeEventListener(`keydown`,this._bound.keydown),document.removeEventListener(`keyup`,this._bound.keyup),document.removeEventListener(`mousemove`,this._bound.mousemove),document.removeEventListener(`pointerlockchange`,this._bound.lockchange),this.canvas.removeEventListener(`contextmenu`,this._bound.contextmenu),this.canvas.removeEventListener(`mousedown`,this._bound.mousedown),this.canvas.removeEventListener(`mouseup`,this._bound.mouseup),this.canvas.removeEventListener(`wheel`,this._bound.wheel)}_register(){let e=this._bound;e.keydown=e=>this._handleKeyDown(e),e.keyup=e=>{this.keys[e.code]=!1,this._onKeyUp(e.code)},e.mousemove=e=>{this.mouse.locked&&(this.mouse.dx+=e.movementX,this.mouse.dy+=e.movementY)},e.contextmenu=e=>e.preventDefault(),e.mousedown=e=>this._onMouseDown(e),e.mouseup=e=>this._onMouseUp(e),e.wheel=e=>{e.preventDefault();let t=Date.now();t-this._lastWeaponSwitch<this._WEAPON_SWITCH_COOLDOWN||Math.abs(e.deltaY)<this._WHEEL_THRESHOLD||(this._lastWeaponSwitch=t,this._onWheel(e.deltaY))},e.lockchange=()=>{let e=document.pointerLockElement===this.canvas,t=this.mouse.locked;this.mouse.locked=e,this._onLockChange(e,t)},document.addEventListener(`keydown`,e.keydown),document.addEventListener(`keyup`,e.keyup),document.addEventListener(`mousemove`,e.mousemove),document.addEventListener(`pointerlockchange`,e.lockchange),this.canvas.addEventListener(`contextmenu`,e.contextmenu),this.canvas.addEventListener(`mousedown`,e.mousedown),this.canvas.addEventListener(`mouseup`,e.mouseup),this.canvas.addEventListener(`wheel`,e.wheel,{passive:!1})}_handleKeyDown(e){if(!e.repeat&&this._getState()===this._playingState&&[this.keybinds.moveForward,this.keybinds.moveLeft,this.keybinds.moveBack,this.keybinds.moveRight].includes(e.code)){let t=performance.now();this._lastTapKey===e.code&&t-this._lastTapTime<250?(this._onDashTrigger(e.code),this._lastTapKey=null):(this._lastTapKey=e.code,this._lastTapTime=t)}this.keys[e.code]=!0,this._onKeyDown(e.code,e)}},B={A:0,B:1,X:2,Y:3,LB:4,RB:5,LT:6,RT:7,SELECT:8,START:9,L3:10,R3:11,DPAD_UP:12,DPAD_DOWN:13,DPAD_LEFT:14,DPAD_RIGHT:15,HOME:16},Te={LEFT_X:0,LEFT_Y:1,RIGHT_X:2,RIGHT_Y:3},Ee={enabled:!0,deadzone:.15,lookSensitivity:2.5,moveSensitivity:1,vibrationEnabled:!0,invertLookY:!1},De=class{constructor(e={}){this.settings={...Ee,...e},this.activeGamepad=null,this.activeIndex=-1,this._prevButtons=Array(17).fill(!1),this.controllerName=``,this.controllerType=`unknown`,this.onConnect=null,this.onDisconnect=null,this._onConnected=this._handleConnect.bind(this),this._onDisconnected=this._handleDisconnect.bind(this),window.addEventListener(`gamepadconnected`,this._onConnected),window.addEventListener(`gamepaddisconnected`,this._onDisconnected),this._scanForGamepad()}_handleConnect(e){let t=e.gamepad;this.activeIndex===-1&&(this.activeIndex=t.index,this.controllerName=t.id,this.controllerType=this._detectType(t.id),this.onConnect&&this.onConnect(this.controllerName,this.controllerType))}_handleDisconnect(e){e.gamepad.index===this.activeIndex&&(this.onDisconnect&&this.onDisconnect(this.controllerName),this.activeIndex=-1,this.activeGamepad=null,this.controllerName=``,this.controllerType=`unknown`,this._prevButtons.fill(!1),this._scanForGamepad())}_scanForGamepad(){let e=navigator.getGamepads?navigator.getGamepads():[];for(let t of e)if(t&&t.connected){this.activeIndex=t.index,this.controllerName=t.id,this.controllerType=this._detectType(t.id);return}}_detectType(e){let t=e.toLowerCase();return t.includes(`xbox`)||t.includes(`xinput`)||t.includes(`microsoft`)?`xbox`:t.includes(`dualsense`)||t.includes(`dualshock`)||t.includes(`sony`)||t.includes(`playstation`)||t.includes(`054c`)?`playstation`:t.includes(`pro controller`)||t.includes(`057e`)||t.includes(`nintendo`)?`switch`:`generic`}get connected(){return this.activeIndex>=0}poll(){let e={moveX:0,moveY:0,lookX:0,lookY:0,shoot:!1,aim:!1,interact:!1,dash:!1,reload:!1,chronoShift:!1,sprint:!1,weaponNext:!1,weaponPrev:!1,pause:!1,minimap:!1,dpadUp:!1,dpadDown:!1,dpadLeft:!1,dpadRight:!1,justPressed:{interact:!1,dash:!1,reload:!1,chronoShift:!1,pause:!1,minimap:!1,weaponNext:!1,weaponPrev:!1,dpadUp:!1,dpadDown:!1,dpadLeft:!1,dpadRight:!1},connected:!1,controllerType:`unknown`};if(!this.settings.enabled||this.activeIndex<0)return e;let t=(navigator.getGamepads?navigator.getGamepads():[])[this.activeIndex];if(!t||!t.connected)return e;this.activeGamepad=t,e.connected=!0,e.controllerType=this.controllerType,e.moveX=this._applyDeadzone(t.axes[Te.LEFT_X]||0)*this.settings.moveSensitivity,e.moveY=this._applyDeadzone(t.axes[Te.LEFT_Y]||0)*this.settings.moveSensitivity,e.lookX=this._applyDeadzone(t.axes[Te.RIGHT_X]||0)*this.settings.lookSensitivity,e.lookY=this._applyDeadzone(t.axes[Te.RIGHT_Y]||0)*this.settings.lookSensitivity,this.settings.invertLookY&&(e.lookY*=-1);let n=t.buttons[B.LT]?typeof t.buttons[B.LT].value==`number`?t.buttons[B.LT].value:+!!t.buttons[B.LT].pressed:0;e.shoot=(t.buttons[B.RT]?typeof t.buttons[B.RT].value==`number`?t.buttons[B.RT].value:+!!t.buttons[B.RT].pressed:0)>.1,e.aim=n>.1,e.interact=this._btn(t,B.A),e.dash=this._btn(t,B.B),e.reload=this._btn(t,B.X),e.chronoShift=this._btn(t,B.Y),e.weaponNext=this._btn(t,B.RB),e.weaponPrev=this._btn(t,B.LB),e.sprint=this._btn(t,B.L3),e.pause=this._btn(t,B.START),e.minimap=this._btn(t,B.SELECT),e.dpadUp=this._btn(t,B.DPAD_UP),e.dpadDown=this._btn(t,B.DPAD_DOWN),e.dpadLeft=this._btn(t,B.DPAD_LEFT),e.dpadRight=this._btn(t,B.DPAD_RIGHT);let r=this._currentButtons(t);e.justPressed.interact=r[B.A]&&!this._prevButtons[B.A],e.justPressed.dash=r[B.B]&&!this._prevButtons[B.B],e.justPressed.reload=r[B.X]&&!this._prevButtons[B.X],e.justPressed.chronoShift=r[B.Y]&&!this._prevButtons[B.Y],e.justPressed.pause=r[B.START]&&!this._prevButtons[B.START],e.justPressed.minimap=r[B.SELECT]&&!this._prevButtons[B.SELECT],e.justPressed.weaponNext=r[B.RB]&&!this._prevButtons[B.RB],e.justPressed.weaponPrev=r[B.LB]&&!this._prevButtons[B.LB],e.justPressed.dpadUp=r[B.DPAD_UP]&&!this._prevButtons[B.DPAD_UP],e.justPressed.dpadDown=r[B.DPAD_DOWN]&&!this._prevButtons[B.DPAD_DOWN],e.justPressed.dpadLeft=r[B.DPAD_LEFT]&&!this._prevButtons[B.DPAD_LEFT],e.justPressed.dpadRight=r[B.DPAD_RIGHT]&&!this._prevButtons[B.DPAD_RIGHT];for(let e=0;e<r.length;e++)this._prevButtons[e]=r[e];return e}vibrate(e=100,t=.3,n=.5){if(!this.settings.vibrationEnabled||!this.activeGamepad)return;let r=this.activeGamepad.vibrationActuator;r&&r.playEffect&&r.playEffect(`dual-rumble`,{startDelay:0,duration:e,weakMagnitude:Math.min(1,t),strongMagnitude:Math.min(1,n)}).catch(()=>{})}vibrateLight(){this.vibrate(80,.2,.1)}vibrateMedium(){this.vibrate(150,.4,.3)}vibrateHeavy(){this.vibrate(300,.6,.8)}vibratePulse(e=3,t=100){for(let n=0;n<e;n++)setTimeout(()=>this.vibrate(60,.3,.4),n*t)}updateSettings(e){Object.assign(this.settings,e)}destroy(){window.removeEventListener(`gamepadconnected`,this._onConnected),window.removeEventListener(`gamepaddisconnected`,this._onDisconnected),this.activeGamepad=null,this.activeIndex=-1}getButtonLabels(){switch(this.controllerType){case`playstation`:return{interact:`✕`,dash:`○`,reload:`□`,chronoShift:`△`,shoot:`R2`,aim:`L2`,weaponNext:`R1`,weaponPrev:`L1`,pause:`OPTIONS`,minimap:`SHARE`,sprint:`L3`};case`switch`:return{interact:`B`,dash:`A`,reload:`Y`,chronoShift:`X`,shoot:`ZR`,aim:`ZL`,weaponNext:`R`,weaponPrev:`L`,pause:`+`,minimap:`-`,sprint:`LS`};default:return{interact:`A`,dash:`B`,reload:`X`,chronoShift:`Y`,shoot:`RT`,aim:`LT`,weaponNext:`RB`,weaponPrev:`LB`,pause:`MENU`,minimap:`VIEW`,sprint:`LS`}}}_applyDeadzone(e){let t=this.settings.deadzone;return Math.abs(e)<t?0:(e>0?1:-1)*((Math.abs(e)-t)/(1-t))}_btn(e,t){let n=e.buttons[t];return n?n.pressed:!1}_currentButtons(e){let t=[];for(let n=0;n<17;n++)t.push(e.buttons[n]?e.buttons[n].pressed:!1);return t}};function Oe(e,t,n,r){let{wep:i,energyColor:a,isAiming:o,isSprinting:s,isDashing:c,weaponBob:l,weaponKick:u,weaponAnimFrame:d,time:f,lastFireTime:p,isTouchDevice:m,drawGlow:h}=r;if(!i)return;let g=o?2:c?18:s?14:8,_=o?1.5:c?12:s?10:5,v=Math.sin(l)*g,y=Math.abs(Math.cos(l))*_,b=u*40,x=s?Math.sin(l)*.06:0,S=n/720,C=+!!o,w=(e,t,n)=>e+(t-e)*n,T=w(.112*t,0,C),E=w(-.11,0,C),D=w(4.5,4.35,C)*S,O=(r.weaponSwayX||0)*w(1,.22,C)*S,k=(r.weaponSwayY||0)*w(1,.22,C)*S,A=t/2+T+v+O,j=n-(r.hudStyle===1?160*S:0)-w(196,250,C)*S+y+k+b*w(1,.45,C);{let t=260*S,n=e.createRadialGradient(A,j+90*S,0,A,j+90*S,t);n.addColorStop(0,`rgba(0,0,0,0.38)`),n.addColorStop(.6,`rgba(0,0,0,0.16)`),n.addColorStop(1,`transparent`),e.fillStyle=n,e.fillRect(A-t,j-t+90*S,t*2,t*2)}e.save(),e.translate(A,j);let M=(r.weaponSwayX||0)*-.0022*w(1,.2,C),N=E+x+M;if(N!==0&&e.rotate(N),e.scale(D,D*w(.94,.99,C)),d===2?(e.translate(0,-3),e.rotate(-.03)):d===3&&(e.translate(0,-1),e.rotate(-.01)),d===1){h(e,0,-42,32,a,.4),h(e,0,-42,12,`#ffffff`,.8),e.strokeStyle=a,e.lineWidth=2;for(let t=0;t<8;t++){let n=t/8*Math.PI*2+f*.05,r=15+Math.random()*20;e.beginPath(),e.moveTo(Math.cos(n)*8,-42+Math.sin(n)*8),e.lineTo(Math.cos(n)*r,-42+Math.sin(n)*r),e.stroke()}}d===2&&i.id!==2&&(e.fillStyle=`#ddaa44`,e.globalAlpha=.8,e.fillRect(7,-18,3,2),e.globalAlpha=1),d===3&&(e.fillStyle=`rgba(180,180,180,0.15)`,e.beginPath(),e.arc(1,-42,5,0,Math.PI*2),e.fill());let P=f-(p||0);if(p&&P>=0&&P<500){let t=.18*(1-P/500);e.save(),e.globalAlpha=t,e.strokeStyle=`rgba(255,200,150,0.7)`,e.lineWidth=1,e.beginPath();for(let t=-10;t<=10;t++){let n=t,r=-50+Math.sin(t*.8+f*.03)*1.8;t===-10?e.moveTo(n,r):e.lineTo(n,r)}e.stroke(),e.restore()}if(i.id===0){e.fillStyle=`#445566`,e.fillRect(-6,-35,12,15),e.fillStyle=`#556677`,e.fillRect(-4,-32,8,10),e.fillStyle=`#222233`,e.beginPath(),e.arc(0,-35,3,0,Math.PI*2),e.fill(),e.fillStyle=a,e.fillRect(-3,-35,6,3),e.fillStyle=`rgba(255,255,255,0.12)`,e.fillRect(-5,-34,2,12),e.fillStyle=`#334455`,e.fillRect(-9,-20,18,35),e.fillStyle=`#3d4f60`,e.fillRect(-7,-18,14,30),e.fillStyle=`#2a3a4a`;for(let t=0;t<5;t++)e.fillRect(-8,-18+t*3,16,1);e.fillStyle=`#222233`,e.fillRect(5,-16,3,6),e.fillStyle=a,e.globalAlpha=.6+Math.sin(f*.008)*.3,e.fillRect(-2,-18,4,25);for(let t=0;t<4;t++){let n=-16+t*6+Math.sin(f*.01+t)*2;e.beginPath(),e.arc(0,n,1.5,0,Math.PI*2),e.fill()}e.globalAlpha=1,e.strokeStyle=`#445566`,e.lineWidth=2,e.beginPath(),e.arc(0,12,6,0,Math.PI),e.stroke(),e.fillStyle=`#334455`,e.fillRect(-1,8,2,6),e.fillStyle=`#223344`,e.fillRect(-7,15,16,25),e.fillStyle=`#2a3a4a`,e.fillRect(-5,17,12,20),e.fillStyle=`#1a2a3a`;for(let t=0;t<4;t++)e.fillRect(-5,19+t*5,12,1);e.fillStyle=`#445566`,e.fillRect(-6,38,14,3),e.fillStyle=`#2a3a4a`,e.fillRect(-5,-20,3,3),e.fillRect(2,-20,3,3),e.fillStyle=a,e.globalAlpha=.7,e.fillRect(-1,-36,2,2),e.globalAlpha=1,e.fillStyle=`#667788`;for(let[t,n]of[[-6,-5],[6,-5],[-6,8],[6,8]])e.beginPath(),e.arc(t,n,1,0,Math.PI*2),e.fill()}else if(i.id===1){e.fillStyle=`#333333`,e.fillRect(-10,-48,8,12),e.fillRect(2,-48,8,12),e.fillStyle=`#444444`,e.fillRect(-8,-46,4,8),e.fillRect(4,-46,4,8),e.fillStyle=`#1a1a1a`,e.beginPath(),e.arc(-6,-48,2.5,0,Math.PI*2),e.fill(),e.beginPath(),e.arc(6,-48,2.5,0,Math.PI*2),e.fill(),e.fillStyle=a,e.fillRect(-8,-48,3,2),e.fillRect(5,-48,3,2),e.fillStyle=`#555555`,e.fillRect(-10,-40,20,2),e.fillStyle=`rgba(255,255,255,0.1)`,e.fillRect(-9,-47,1.5,10),e.fillRect(3,-47,1.5,10),e.fillStyle=`#554433`,e.fillRect(-14,-36,28,50),e.fillStyle=`#665544`,e.fillRect(-11,-33,22,44),e.fillStyle=`#443322`,e.fillRect(-5,-34,10,6),e.fillStyle=`#887766`,e.beginPath(),e.arc(0,-31,3,0,Math.PI*2),e.fill(),e.fillStyle=`#776655`,e.fillRect(-12,-10,24,12),e.fillStyle=`#887766`,e.fillRect(-10,-8,20,8),e.fillStyle=`#665544`;for(let t=0;t<4;t++)e.fillRect(-11,-9+t*3,22,1);e.fillStyle=`#222222`,e.fillRect(8,-30,5,8),e.fillStyle=`#ccaa44`,e.fillRect(9,-28,3,4),e.fillStyle=`#443322`,e.fillRect(-11,14,24,30),e.fillStyle=`#554433`,e.fillRect(-9,16,20,26),e.fillStyle=`#3a2a1a`;for(let t=0;t<5;t++)e.fillRect(-8,18+t*5,18,1);e.fillStyle=`#332211`,e.fillRect(-10,42,22,3),e.fillStyle=a,e.globalAlpha=.4+Math.sin(f*.006)*.2,e.fillRect(-12,-25,2,20),e.fillRect(10,-25,2,20);for(let t=0;t<3;t++){let n=-23+t*7+Math.sin(f*.008+t*1.5)*2;e.beginPath(),e.arc(-11,n,1.2,0,Math.PI*2),e.fill(),e.beginPath(),e.arc(11,n,1.2,0,Math.PI*2),e.fill()}e.globalAlpha=1,e.fillStyle=`#998877`;for(let[t,n]of[[-10,-15],[10,-15],[-10,5],[10,5]])e.beginPath(),e.arc(t,n,1.2,0,Math.PI*2),e.fill()}else if(i.id===2){e.fillStyle=`#2a2a44`,e.fillRect(-5,-58,10,30),e.fillStyle=`#3a3a55`,e.fillRect(-3,-55,6,25),e.fillStyle=`#1a1a33`,e.beginPath(),e.arc(0,-58,3,0,Math.PI*2),e.fill(),e.fillStyle=a,e.fillRect(-4,-60,8,3),e.fillStyle=`#222244`;for(let t=0;t<3;t++)e.fillRect(-4,-52+t*7,2,4),e.fillRect(2,-52+t*7,2,4);e.fillStyle=`rgba(255,255,255,0.08)`,e.fillRect(-4,-57,1.5,28),e.fillStyle=`#2a2a44`,e.fillRect(-10,-28,20,48),e.fillStyle=`#3a3a55`,e.fillRect(-8,-25,16,42),e.strokeStyle=`#222244`,e.lineWidth=.8,e.beginPath(),e.moveTo(-8,-10),e.lineTo(8,-10),e.moveTo(-8,5),e.lineTo(8,5),e.stroke(),e.fillStyle=`#252545`,e.fillRect(-9,-22,3,15),e.fillRect(6,-22,3,15),e.fillStyle=a;for(let t=0;t<5;t++)e.globalAlpha=.3+Math.sin(f*.01+t*1.2)*.3,e.fillRect(-6,-50+t*8,12,2),e.beginPath(),e.arc(-7,-49+t*8,1,0,Math.PI*2),e.fill(),e.beginPath(),e.arc(7,-49+t*8,1,0,Math.PI*2),e.fill();e.globalAlpha=1,e.fillStyle=a,e.globalAlpha=.15+Math.sin(f*.008)*.1,e.fillRect(-5,-20,10,12),e.globalAlpha=1,e.fillStyle=`#222244`,e.fillRect(-3,-55,6,8),e.fillStyle=`#1a1a33`,e.beginPath(),e.arc(0,-59,4,0,Math.PI*2),e.fill(),e.fillStyle=a,e.globalAlpha=.5,e.beginPath(),e.arc(0,-59,2,0,Math.PI*2),e.fill(),e.globalAlpha=1,e.strokeStyle=a,e.lineWidth=.5,e.globalAlpha=.4,e.beginPath(),e.moveTo(-2,-59),e.lineTo(2,-59),e.moveTo(0,-61),e.lineTo(0,-57),e.stroke(),e.globalAlpha=1,e.fillStyle=`#1a1a33`,e.fillRect(-4,8,10,14),e.fillStyle=a,e.globalAlpha=.3,e.fillRect(-2,10,6,10),e.globalAlpha=1,e.fillStyle=`#1a1a33`,e.fillRect(-7,20,16,25),e.fillStyle=`#252545`,e.fillRect(-5,22,12,20),e.fillStyle=`#1a1a33`,e.fillRect(-6,43,14,3),e.fillStyle=`#5555aa`;for(let[t,n]of[[-8,-8],[8,-8],[-8,10],[8,10]])e.beginPath(),e.arc(t,n,1,0,Math.PI*2),e.fill()}else if(i.id===3){e.fillStyle=`#331111`,e.fillRect(-12,-55,24,20),e.fillStyle=`#441122`,e.fillRect(-10,-52,20,15),e.fillStyle=`#110008`,e.beginPath(),e.arc(0,-55,5,0,Math.PI*2),e.fill(),e.strokeStyle=a,e.lineWidth=1.5;let t=.4+Math.sin(f*.01)*.4;e.globalAlpha=t,e.beginPath(),e.arc(0,-55,6,0,Math.PI*2),e.stroke(),e.globalAlpha=1,e.fillStyle=a,e.globalAlpha=t,e.beginPath(),e.arc(0,-48,6,0,Math.PI*2),e.fill(),e.globalAlpha=t*.3,e.beginPath(),e.arc(0,-48,9,0,Math.PI*2),e.fill(),e.globalAlpha=1,e.fillStyle=`rgba(255,255,255,0.06)`,e.fillRect(-11,-54,2,18),e.fillStyle=`#441122`,e.fillRect(-18,-35,36,55),e.fillStyle=`#552233`,e.fillRect(-15,-32,30,48),e.strokeStyle=`#331122`,e.lineWidth=.8,e.beginPath(),e.moveTo(-15,-15),e.lineTo(15,-15),e.moveTo(-15,0),e.lineTo(15,0),e.stroke(),e.fillStyle=`#ff3333`,e.globalAlpha=.15,e.fillRect(-15,-35,30,3),e.globalAlpha=1,e.fillStyle=a,e.globalAlpha=t*.8,e.fillRect(-8,-25,16,16),e.globalAlpha=t*.4,e.fillRect(-12,-28,24,22),e.globalAlpha=1,e.strokeStyle=a,e.lineWidth=.5,e.globalAlpha=.4,e.beginPath(),e.moveTo(-4,-17),e.lineTo(4,-17),e.moveTo(0,-21),e.lineTo(0,-13),e.stroke(),e.globalAlpha=1,e.fillStyle=a,e.globalAlpha=.5,e.fillRect(-17,-28,3,35),e.fillRect(14,-28,3,35),e.globalAlpha=1;for(let t=0;t<4;t++){let n=.3+Math.sin(f*.012+t*1.5)*.3;e.fillStyle=a,e.globalAlpha=n,e.beginPath(),e.arc(-15.5,-22+t*8,1.2,0,Math.PI*2),e.fill(),e.beginPath(),e.arc(15.5,-22+t*8,1.2,0,Math.PI*2),e.fill()}e.globalAlpha=1,e.fillStyle=`#220011`;for(let t=0;t<3;t++)e.fillRect(-14,-5+t*6,10,2),e.fillRect(4,-5+t*6,10,2);e.fillStyle=a,e.globalAlpha=t*.2;for(let t=0;t<3;t++)e.fillRect(-13,-4+t*6,8,1),e.fillRect(5,-4+t*6,8,1);e.globalAlpha=1,e.fillStyle=`#330011`,e.fillRect(-12,20,26,28),e.fillStyle=`#440022`,e.fillRect(-10,22,22,24),e.fillStyle=`#2a000e`;for(let t=0;t<4;t++)e.fillRect(-9,24+t*5,20,1.5);e.fillStyle=`#330011`,e.fillRect(-11,46,24,3),e.fillStyle=`#aa3355`;for(let[t,n]of[[-16,-30],[16,-30],[-16,10],[16,10]])e.beginPath(),e.arc(t,n,1.2,0,Math.PI*2),e.fill()}else if(i.id===4){let t=.4+Math.sin(f*.009)*.3;e.fillStyle=`#3a1a2a`,e.fillRect(-14,-42,28,16),e.fillStyle=`#4a2a3a`,e.fillRect(-12,-40,24,12),e.fillStyle=`#1a0a15`;for(let t=-1;t<=1;t++)e.beginPath(),e.arc(t*7,-42,3,0,Math.PI*2),e.fill();e.fillStyle=a,e.globalAlpha=t,e.fillRect(-14,-44,28,3),e.globalAlpha=1,e.fillStyle=`#2a1020`,e.fillRect(-13,-36,6,2),e.fillRect(7,-36,6,2),e.fillRect(-13,-32,6,2),e.fillRect(7,-32,6,2),e.fillStyle=a,e.globalAlpha=t*.3,e.fillRect(-12,-35,4,1),e.fillRect(8,-35,4,1),e.fillRect(-12,-31,4,1),e.fillRect(8,-31,4,1),e.globalAlpha=1,e.fillStyle=`#3a1a2a`,e.fillRect(-16,-26,32,44),e.fillStyle=`#4a2a3a`,e.fillRect(-13,-23,26,38),e.strokeStyle=`#2a0a1a`,e.lineWidth=.8,e.beginPath(),e.moveTo(-13,-10),e.lineTo(13,-10),e.moveTo(-13,4),e.lineTo(13,4),e.stroke(),e.fillStyle=a,e.globalAlpha=t*.6,e.beginPath(),e.arc(0,-15,5,0,Math.PI*2),e.fill(),e.globalAlpha=t*.2,e.beginPath(),e.arc(0,-15,9,0,Math.PI*2),e.fill(),e.globalAlpha=1,e.fillStyle=a,e.globalAlpha=.5,e.fillRect(-15,-22,3,28),e.fillRect(12,-22,3,28),e.globalAlpha=1;for(let t=0;t<3;t++){let n=Math.sin(f*.01+t*2)*2;e.fillStyle=a,e.globalAlpha=.4+Math.sin(f*.012+t)*.3,e.beginPath(),e.arc(-13.5,-18+t*9+n,1.5,0,Math.PI*2),e.fill(),e.beginPath(),e.arc(13.5,-18+t*9+n,1.5,0,Math.PI*2),e.fill()}e.globalAlpha=1,e.fillStyle=`#5a3a4a`,e.fillRect(-12,-2,24,10),e.fillStyle=`#6a4a5a`,e.fillRect(-10,0,20,6),e.fillStyle=`#4a2a3a`;for(let t=0;t<3;t++)e.fillRect(-11,0+t*3,22,1);e.fillStyle=`#2a1020`,e.fillRect(-10,18,22,26),e.fillStyle=`#3a1a2a`,e.fillRect(-8,20,18,22),e.fillStyle=`#1a0a15`;for(let t=0;t<4;t++)e.fillRect(-7,22+t*5,16,1);e.fillStyle=`#3a1a2a`,e.fillRect(-9,42,20,3),e.fillStyle=a,e.globalAlpha=.12,e.fillRect(-13,-26,26,2),e.globalAlpha=1,e.fillStyle=`#aa5588`;for(let[t,n]of[[-14,-20],[14,-20],[-14,8],[14,8]])e.beginPath(),e.arc(t,n,1.2,0,Math.PI*2),e.fill()}else if(i.id===5){let t=.4+Math.sin(f*.007)*.3;e.fillStyle=`#1a2a3a`,e.fillRect(-4,-68,8,40),e.fillStyle=`#2a3a4a`,e.fillRect(-3,-65,6,35),e.fillStyle=`#0a1520`,e.beginPath(),e.arc(0,-68,2.5,0,Math.PI*2),e.fill(),e.strokeStyle=a,e.lineWidth=1.5,e.globalAlpha=t,e.beginPath(),e.arc(0,-68,4,0,Math.PI*2),e.stroke(),e.globalAlpha=1,e.fillStyle=`#0f1f2f`;for(let t=0;t<5;t++)e.fillRect(-3,-62+t*7,1.5,4),e.fillRect(1.5,-62+t*7,1.5,4);e.fillStyle=`rgba(255,255,255,0.08)`,e.fillRect(-3,-67,1,38),e.fillStyle=`#1a2a3a`,e.fillRect(-6,-58,12,14),e.fillStyle=`#2a3a4a`,e.fillRect(-5,-56,10,10),e.fillStyle=`#0a1520`,e.beginPath(),e.arc(0,-51,4,0,Math.PI*2),e.fill(),e.fillStyle=a,e.globalAlpha=.6+Math.sin(f*.01)*.3,e.beginPath(),e.arc(0,-51,2,0,Math.PI*2),e.fill(),e.globalAlpha=1,e.strokeStyle=a,e.lineWidth=.5,e.globalAlpha=.5,e.beginPath(),e.moveTo(-3,-51),e.lineTo(3,-51),e.moveTo(0,-54),e.lineTo(0,-48),e.stroke(),e.globalAlpha=1,e.fillStyle=`#2a3a4a`,e.fillRect(-2,-44,4,4),e.fillStyle=`#1a2a3a`,e.fillRect(-8,-28,16,40),e.fillStyle=`#2a3a4a`,e.fillRect(-6,-25,12,35),e.strokeStyle=`#0f1f2f`,e.lineWidth=.6,e.beginPath(),e.moveTo(-6,-12),e.lineTo(6,-12),e.moveTo(-6,0),e.lineTo(6,0),e.stroke(),e.fillStyle=a,e.globalAlpha=t*.5,e.fillRect(-1.5,-25,3,30);for(let n=0;n<4;n++){let r=(f*.05+n*8)%30-25;e.globalAlpha=t*.8,e.beginPath(),e.arc(0,r,2,0,Math.PI*2),e.fill()}e.globalAlpha=1,e.fillStyle=`#4a5a6a`,e.fillRect(6,-20,6,3),e.fillStyle=`#5a6a7a`,e.beginPath(),e.arc(11,-18.5,2,0,Math.PI*2),e.fill(),e.fillStyle=`#0f1f2f`,e.fillRect(-3,5,8,12),e.fillStyle=a,e.globalAlpha=.25,e.fillRect(-1,7,4,8),e.globalAlpha=1,e.fillStyle=`#1a2a3a`,e.fillRect(-7,12,16,32),e.fillStyle=`#2a3a4a`,e.fillRect(-5,14,12,28),e.fillStyle=`#1a2a3a`,e.fillRect(-4,16,10,4),e.fillStyle=`#0f1f2f`,e.fillRect(-6,42,14,3),e.fillStyle=`#5588cc`;for(let[t,n]of[[-7,-22],[7,-22],[-7,6],[7,6]])e.beginPath(),e.arc(t,n,1,0,Math.PI*2),e.fill()}else if(i.id===6){let t=.5+Math.sin(f*.012)*.3;e.fillStyle=`#3a3520`,e.fillRect(-5,-38,10,18),e.fillStyle=`#4a4530`,e.fillRect(-3,-35,6,14),e.fillStyle=`#1a1810`,e.beginPath(),e.arc(0,-38,2.5,0,Math.PI*2),e.fill(),e.fillStyle=a,e.globalAlpha=t,e.beginPath(),e.moveTo(-5,-39),e.lineTo(5,-39),e.lineTo(3,-42),e.lineTo(-3,-42),e.closePath(),e.fill(),e.globalAlpha=1,e.fillStyle=`rgba(255,255,255,0.1)`,e.fillRect(-4,-37,1.5,15),e.fillStyle=`#5a5540`,e.beginPath(),e.moveTo(-7,-30),e.lineTo(-5,-36),e.lineTo(-5,-25),e.closePath(),e.fill(),e.beginPath(),e.moveTo(7,-30),e.lineTo(5,-36),e.lineTo(5,-25),e.closePath(),e.fill(),e.fillStyle=`#3a3520`,e.fillRect(-8,-20,16,32),e.fillStyle=`#4a4530`,e.fillRect(-6,-18,12,28),e.strokeStyle=a,e.lineWidth=1.5,e.globalAlpha=t*.6,e.beginPath(),e.moveTo(-6,-16),e.lineTo(6,-4),e.moveTo(-6,-4),e.lineTo(6,8),e.stroke(),e.globalAlpha=1,e.fillStyle=a,e.globalAlpha=t,e.beginPath(),e.arc(0,-10,2,0,Math.PI*2),e.fill(),e.beginPath(),e.arc(0,2,2,0,Math.PI*2),e.fill(),e.globalAlpha=1,e.strokeStyle=`#2a2510`,e.lineWidth=.6,e.beginPath(),e.moveTo(-6,-5),e.lineTo(6,-5),e.stroke(),e.strokeStyle=`#5a5540`,e.lineWidth=1.5,e.beginPath(),e.moveTo(-3,8),e.lineTo(-4,14),e.lineTo(4,14),e.lineTo(3,8),e.stroke(),e.fillStyle=`#3a3520`,e.fillRect(-1,8,2,5),e.fillStyle=`#2a2510`,e.fillRect(-6,12,14,24),e.fillStyle=`#3a3520`,e.fillRect(-4,14,10,20),e.fillStyle=`#1a1810`;for(let t=0;t<3;t++)for(let n=0;n<2;n++)e.fillRect(-3+n*5,16+t*6,3,3);e.fillStyle=`#5a5540`,e.fillRect(-5,34,12,2),e.fillStyle=`#3a3520`,e.beginPath(),e.moveTo(-4,-20),e.lineTo(-3,-23),e.lineTo(-2,-20),e.fill(),e.beginPath(),e.moveTo(2,-20),e.lineTo(3,-23),e.lineTo(4,-20),e.fill(),e.fillStyle=`#bbaa55`;for(let[t,n]of[[-6,-8],[6,-8],[-6,6],[6,6]])e.beginPath(),e.arc(t,n,.8,0,Math.PI*2),e.fill()}else if(i.id===7){let t=.3+Math.sin(f*.008)*.4;e.fillStyle=`#1a2a2a`,e.fillRect(-14,-50,28,22),e.fillStyle=`#2a3a3a`,e.fillRect(-12,-48,24,18),e.fillStyle=`#0a1515`,e.beginPath(),e.arc(0,-50,6,0,Math.PI*2),e.fill(),e.strokeStyle=a,e.lineWidth=2,e.globalAlpha=t,e.beginPath(),e.arc(0,-50,8,0,Math.PI*2),e.stroke(),e.lineWidth=1,e.beginPath(),e.arc(0,-50,4,-Math.PI*t,Math.PI*t),e.stroke(),e.globalAlpha=1,e.fillStyle=a,e.globalAlpha=t*.5,e.beginPath(),e.arc(0,-44,5,0,Math.PI*2),e.fill(),e.globalAlpha=1,e.fillStyle=`#1a2a2a`;for(let t=0;t<3;t++)e.fillRect(-16,-46+t*6,4,3),e.fillRect(12,-46+t*6,4,3);e.fillStyle=a,e.globalAlpha=t*.25;for(let t=0;t<3;t++)e.fillRect(-15,-45+t*6,2,1),e.fillRect(13,-45+t*6,2,1);e.globalAlpha=1,e.fillStyle=`#1a2a2a`,e.fillRect(-16,-28,32,48),e.fillStyle=`#2a3a3a`,e.fillRect(-13,-25,26,42),e.strokeStyle=`#0a1a1a`,e.lineWidth=.8,e.beginPath(),e.moveTo(-13,-12),e.lineTo(13,-12),e.moveTo(-13,4),e.lineTo(13,4),e.stroke(),e.fillStyle=a,e.globalAlpha=t*.3,e.fillRect(-10,-22,20,18),e.globalAlpha=t*.7,e.fillRect(-6,-18,12,10),e.globalAlpha=1,e.strokeStyle=a,e.lineWidth=1,e.globalAlpha=t*.8;for(let t=0;t<4;t++){let n=-5+Math.sin(f*.02+t*1.5)*5,r=-17+Math.cos(f*.02+t*1.5)*4;e.beginPath(),e.moveTo(0,-13),e.lineTo(n,r),e.stroke()}e.globalAlpha=1,e.fillStyle=`#ffaa00`,e.globalAlpha=.15,e.fillRect(-13,-28,26,3),e.fillRect(-13,17,26,3),e.globalAlpha=1,e.fillStyle=a,e.globalAlpha=.4,e.fillRect(-15,-22,3,30),e.fillRect(12,-22,3,30),e.globalAlpha=1;for(let t=0;t<4;t++){let n=.3+Math.sin(f*.015+t*1.2)*.4;e.fillStyle=a,e.globalAlpha=n,e.beginPath(),e.arc(-13.5,-16+t*7,1.5,0,Math.PI*2),e.fill(),e.beginPath(),e.arc(13.5,-16+t*7,1.5,0,Math.PI*2),e.fill()}e.globalAlpha=1,e.fillStyle=`#0a1a1a`,e.fillRect(-10,20,22,26),e.fillStyle=`#1a2a2a`,e.fillRect(-8,22,18,22),e.fillStyle=`#0a1515`;for(let t=0;t<4;t++)e.fillRect(-7,24+t*5,16,1.5);e.fillStyle=`#2a3a3a`,e.fillRect(-9,44,20,3),e.strokeStyle=a,e.lineWidth=1,e.globalAlpha=.3,e.beginPath(),e.moveTo(0,-20),e.lineTo(-4,-12),e.lineTo(4,-12),e.closePath(),e.stroke(),e.globalAlpha=1,e.fillStyle=`#55aaaa`;for(let[t,n]of[[-14,-24],[14,-24],[-14,10],[14,10]])e.beginPath(),e.arc(t,n,1.2,0,Math.PI*2),e.fill()}{let t=i.id===3?-18:i.id===4||i.id===7?-16:-10,n=i.id===3?36:i.id===4||i.id===7?32:20,r=i.id===5?-68:i.id===1?-48:i.id===3?-55:i.id===7?-50:-38,a=e.createLinearGradient(t,r,t+n,r);a.addColorStop(0,`transparent`),a.addColorStop(.5,`rgba(255,255,255,0.15)`),a.addColorStop(1,`transparent`),e.fillStyle=a,e.fillRect(t,r,n,2)}{let t=i.id===3?14:i.id===4?12:i.id===7?13:7,n=i.id===5?-65:i.id===1?-46:i.id===3?-52:i.id===7?-48:-35,r=i.id===5?75:i.id===3?68:i.id===7?65:50,a=e.createLinearGradient(t,n,t+3,n);a.addColorStop(0,`rgba(200,220,255,0.12)`),a.addColorStop(1,`transparent`),e.fillStyle=a,e.fillRect(t,n,3,r)}ke(e,i,a,r.skinTone||`#c9956a`,C),e.restore()}function ke(e,t,n,r,i){let a=`#1b212b`,o=`#2a323f`,s=t.id===1||t.id===3||t.id===4||t.id===5||t.id===7,c=s?-13:-9,l=s?-14:16;e.save(),e.fillStyle=a,e.beginPath(),e.moveTo(c-3,l-5),e.lineTo(c+9,l-2),e.lineTo(c+9,l+8),e.lineTo(c-6,l+12),e.lineTo(-13,58),e.lineTo(-25,58),e.closePath(),e.fill(),e.fillStyle=`#0e1218`,e.beginPath(),e.moveTo(c-6,l+12),e.lineTo(-13,58),e.lineTo(-20,58),e.lineTo(c-8,l+10),e.closePath(),e.fill(),e.fillStyle=o;for(let t=0;t<4;t++)e.beginPath(),e.roundRect(c-1+t*2.6,l-4+t*.5,2.4,7,1.2),e.fill();e.fillStyle=a,e.beginPath(),e.moveTo(-6,18),e.lineTo(10,16),e.lineTo(15,32),e.lineTo(27,60),e.lineTo(9,60),e.lineTo(-6,36),e.closePath(),e.fill(),e.fillStyle=o,e.beginPath(),e.moveTo(10,16),e.lineTo(15,32),e.lineTo(20,44),e.lineTo(14,18),e.closePath(),e.fill(),e.fillStyle=o;for(let t=0;t<4;t++)e.beginPath(),e.roundRect(-7,19+t*4.4,8.5,3.8,1.6),e.fill();e.fillStyle=a,e.beginPath(),e.roundRect(-1,14,9,4.2,2),e.fill(),e.restore()}var Ae=new class{constructor(e,t,n=0){this.pool=[],this.createFn=e,this.resetFn=t;for(let e=0;e<n;e++)this.pool.push(this.createFn())}acquire(){return this.pool.pop()??this.createFn()}release(e){this.resetFn(e),this.pool.push(e)}releaseAll(e){for(let t of e)this.release(t);e.length=0}get available(){return this.pool.length}}(()=>({x:0,y:0,z:0,vx:0,vy:0,vz:0,r:0,g:0,b:0,life:0,size:0,_type:``}),e=>{e.x=e.y=e.z=0,e.vx=e.vy=e.vz=0,e.r=e.g=e.b=0,e.life=e.size=0,e._type=``},256);function je(e,t,n,r,i=1){let a,o,s;r===`health`?(a=50,o=255,s=80):r===`ammo`?(a=255,o=220,s=50):(a=50,o=200,s=255);let c=Math.max(0,Math.round(10*i));for(let r=0;r<c;r++){let i=r/c*Math.PI*2,l=1+Math.random()*1.5,u=Ae.acquire();u.x=t,u.y=n,u.z=-.3-Math.random()*.2,u.vx=Math.cos(i)*l,u.vy=Math.sin(i)*l,u.vz=-(2+Math.random()*2),u.r=a+Math.floor(Math.random()*30),u.g=o,u.b=s,u.life=.4+Math.random()*.3,u.size=.04+Math.random()*.04,u._type=``,e.push(u)}}function Me(e,t,n,r={}){let i=r.count??8,a=r.r??120,o=r.g??115,s=r.b??110;for(let c=0;c<i;c++){let i=Math.random()*Math.PI*2,c=(r.speed??.4)+Math.random()*.6,l=Ae.acquire();l.x=t+(Math.random()-.5)*.3,l.y=n+(Math.random()-.5)*.3,l.z=-.2-Math.random()*.15,l.vx=Math.cos(i)*c*.5,l.vy=Math.sin(i)*c*.5,l.vz=-(.8+Math.random()*.6),l.r=a+Math.floor(Math.random()*40-20),l.g=o+Math.floor(Math.random()*40-20),l.b=s+Math.floor(Math.random()*40-20),l.life=(r.life??.6)+Math.random()*.4,l.size=.06+Math.random()*.05,l._type=`smoke`,e.push(l)}}function Ne(e,t,n,r={}){let i=r.count??12,a=r.r??0,o=r.g??200,s=r.b??255,c=r.angle;for(let l=0;l<i;l++){let u=c==null?l/i*Math.PI*2:c+(Math.random()-.5)*1.2,d=(r.speed??3)+Math.random()*3,f=Ae.acquire();f.x=t,f.y=n,f.z=-.25-Math.random()*.15,f.vx=Math.cos(u)*d,f.vy=Math.sin(u)*d,f.vz=-(1+Math.random()*2),f.r=Math.min(255,a+Math.floor(Math.random()*80)),f.g=Math.min(255,o+Math.floor(Math.random()*55)),f.b=Math.min(255,s+Math.floor(Math.random()*30)),f.life=(r.life??.2)+Math.random()*.2,f.size=.03+Math.random()*.03,f._type=`energy`,e.push(f)}}function Pe(e,t,n,r={}){let i=r.count??6,a=r.r??80,o=r.g??75,s=r.b??70;for(let c=0;c<i;c++){let i=Math.random()*Math.PI*2,c=(r.speed??2)+Math.random()*3,l=Ae.acquire();l.x=t+(Math.random()-.5)*.2,l.y=n+(Math.random()-.5)*.2,l.z=-.15-Math.random()*.2,l.vx=Math.cos(i)*c,l.vy=Math.sin(i)*c,l.vz=-(3+Math.random()*4),l.r=a+Math.floor(Math.random()*50),l.g=o+Math.floor(Math.random()*40),l.b=s+Math.floor(Math.random()*30),l.life=(r.life??.5)+Math.random()*.5,l.size=.03+Math.random()*.04,l._type=`debris`,e.push(l)}}function Fe(e,t,n,r,i,a={}){if(e&&e.length>0){let r=n;for(let n=e.length-1;n>=0;n--){let i=e[n];if(i.x+=i.vx*t*r,i.y+=i.vy*t*r,i.z+=i.vz*t*r,i.life-=t*r,i._type===`smoke`?(i.vz+=2*t*r,i.vx*=1-1.5*t,i.vy*=1-1.5*t,i.size+=.08*t*r):i._type===`debris`?i.vz+=25*t*r:i._type===`energy`?(i.vz+=5*t*r,i.size*=1-2*t):i.vz+=15*t*r,i.z>.48){i.z=.48;let e=i._type===`debris`?-.45:-.3;i.vz*=e,i.vx*=.6,i.vy*=.6}i.life<=0&&(Ae.release(i),e[n]=e[e.length-1],e.pop())}}return a.enableDust===!1?null:Ie(r,t,i)}function Ie(e,t,n){if(!e){e=[];for(let t=0;t<35;t++)e.push({x:n.x+(Math.random()-.5)*16,y:n.y+(Math.random()-.5)*16,z:-.1-Math.random()*.8,vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3,vz:(Math.random()-.5)*.15,r:180+Math.floor(Math.random()*50),g:170+Math.floor(Math.random()*50),b:150+Math.floor(Math.random()*40),life:.3+Math.random()*.3,size:.015+Math.random()*.015})}for(let r of e){r.x+=r.vx*t,r.y+=r.vy*t,r.z+=r.vz*t,r.vx+=(Math.random()-.5)*.1*t,r.vy+=(Math.random()-.5)*.1*t,r.vz+=(Math.random()-.5)*.05*t,r.vx=Math.max(-.4,Math.min(.4,r.vx)),r.vy=Math.max(-.4,Math.min(.4,r.vy)),r.vz=Math.max(-.15,Math.min(.15,r.vz)),r.z>.45&&(r.z=.45,r.vz*=-1),r.z<-.9&&(r.z=-.9,r.vz*=-1);let e=r.x-n.x,i=r.y-n.y;e>8&&(r.x-=16),e<-8&&(r.x+=16),i>8&&(r.y-=16),i<-8&&(r.y+=16)}return e}function Le(e,t=[128,128,128]){return!e||e.length<7?t:[parseInt(e.slice(1,3),16)||t[0],parseInt(e.slice(3,5),16)||t[1],parseInt(e.slice(5,7),16)||t[2]]}var Re=(e,t=1)=>Math.max(0,Math.round(e*t));function ze(e,t,n,r,i,a,o){e&&e.push({x:t,y:n,color:r,radius:i,baseIntensity:a,intensity:a,life:o,maxLife:o})}function Be(e,t,n,r,i,a=1){let[o,s,c]=Le(r,[200,60,60]);o=Math.min(255,Math.floor(o*.5+200*.5)),s=Math.min(255,Math.floor(s*.3+30*.7)),c=Math.min(255,Math.floor(c*.3+30*.7));let l=Re(i?10:6,a);for(let r=0;r<l;r++){let r=Math.random()*Math.PI*2,a=1.5+Math.random()*3,l=Ae.acquire();Object.assign(l,{x:t,y:n,z:-.15-Math.random()*.3,vx:Math.cos(r)*a,vy:Math.sin(r)*a,vz:(Math.random()-.6)*3,r:o+Math.floor((Math.random()-.5)*40),g:Math.max(0,s+Math.floor((Math.random()-.5)*20)),b:Math.max(0,c+Math.floor((Math.random()-.5)*20)),life:.2+Math.random()*.25,size:i?.04+Math.random()*.05:.03+Math.random()*.03,_type:``}),e.push(l)}}function Ve(e,t,n,r=1){let i=.6,a=t.x+Math.cos(t.angle)*i,o=t.y+Math.sin(t.angle)*i,[s,c,l]={2:[80,220,255],7:[80,220,255],3:[255,160,40],6:[100,255,120]}[n.id]||[255,200,60],u=Re(n.id===1||n.id===4?8:5,r);for(let n=0;n<u;n++){let n=(Math.random()-.5)*.8,r=t.angle+n,i=3+Math.random()*4,u=Ae.acquire();Object.assign(u,{x:a,y:o,z:-.15-Math.random()*.1,vx:Math.cos(r)*i,vy:Math.sin(r)*i,vz:(Math.random()-.5)*2,r:s+Math.floor(Math.random()*30),g:c,b:l,life:.06+Math.random()*.08,size:.03+Math.random()*.03,_type:``}),e.push(u)}}function He(e,t,n,r,i,a=1){let o=Re(12,a);for(let a=0;a<o;a++){let a=Math.random()*Math.PI*2,o=1+Math.random()*2,[s,c,l]=Le(Math.random()>.5?r:i,[255,255,255]),u=Ae.acquire();Object.assign(u,{x:t,y:n,z:-.1-Math.random()*.3,vx:Math.cos(a)*o,vy:Math.sin(a)*o,vz:(Math.random()-.7)*4,r:s,g:c,b:l,life:.8+Math.random()*.4,size:.05+Math.random()*.08,_type:``}),e.push(u)}Me(e,t,n,{count:Re(5,a)});let[s,c,l]=Le(i||`#808080`,[80,75,70]);Pe(e,t,n,{count:Re(4,a),r:s,g:c,b:l})}function Ue(e,t,n,r=1){let i=Re(5+Math.floor(Math.random()*4),r);for(let r=0;r<i;r++){let r=Math.random()*Math.PI*2,i=1.5+Math.random()*2.5,a=Ae.acquire();Object.assign(a,{x:t,y:n,z:-.2-Math.random()*.3,vx:Math.cos(r)*i,vy:Math.sin(r)*i,vz:(Math.random()-.5)*3,r:255,g:140+Math.floor(Math.random()*115),b:Math.floor(Math.random()*40),life:.15+Math.random()*.2,size:.02+Math.random()*.03,_type:``}),e.push(a)}Pe(e,t,n,{count:Re(3,r),speed:1,life:.3})}var V=(e,t,n=0)=>{let r=Math.sin(e*12.9898+t*78.233+n*37.719)*43758.5453;return r-Math.floor(r)},We=(e,t,n,r=0)=>{let i=Math.min(e-r,t-r,n-1-r-e,n-1-r-t);return Math.max(0,1-i/20)},Ge=(e,t)=>Math.max(0,Math.min(255,e+t));function Ke(){let e={};for(let[t,n]of Object.entries(h)){let r=document.createElement(`canvas`);r.width=256,r.height=256;let i=r.getContext(`2d`),a=i.createImageData(256,256),o=a.data,s=parseInt(t);for(let e=0;e<256;e++)for(let t=0;t<256;t++){let r=(e*256+t)*4,i=n.r,a=n.g,c=n.b,l=(V(t,e,s)*14-7|0)+(V(t*3,e*3,s+11)*5-2|0);if(s===1){let n=Math.floor(e/64)%2*(128/2),r=(t+n)%128,o=e%64<6||r<6,s=e%64<14||r<14?10:r>114||e%64>50?-12:0;o?(i-=42,a-=44,c-=48):(i+=s,a+=s,c+=s+4),V(Math.floor(t/16),Math.floor(e/16),1)>.82&&(i+=18,a+=20,c+=26),V(Math.floor(t/4),Math.floor(e/4),91)>.92&&(i-=20,a-=22,c-=18)}else if(s===2){let n=t%64<4||e%64<4,r=t%128<8&&e>36&&e<220||e%96<8&&t>24&&t<232,o=t%128<20&&e%96<20||t%128>108&&e%96>76;n&&(i-=18,a-=22,c-=18),r&&(i+=25,a+=135,c+=155),o&&(i+=65,a+=170,c+=125),We(t,e,256,4)>.4&&(i-=22,a-=18,c-=10)}else if(s===3){let n=Math.sin(e*.35+V(0,e,3)*2)*8;i+=n,a+=n,c+=n,(t%84<4||e%84<4)&&(i-=30,a-=30,c-=32),[[24,24],[232,24],[24,232],[232,232],[128,64],[128,192]].some(([n,r])=>(t-n)**2+(e-r)**2<40)&&(i+=70,a+=70,c+=78),(t<10||t>245||e<10||e>245)&&(i-=28,a-=28,c-=30),V(Math.floor(t/6),Math.floor(e/6),77)>.93&&(i-=15,a-=15,c-=12)}else if(s===4){let n=Math.sin(e*.055+t*.0275)*28,r=t%64<6||e%64<6;i+=n+(r?50:0),a+=n*.15,c+=n+(r?90:28),(t-128)**2+(e-128)**2<3600&&(i+=28,c+=48)}else if(s===5){let n=t<28||t>227||e<28||e>227,r=!n&&(t<40||t>215||e<40||e>215);if(n)i-=40,a-=30,c-=10,(t===27||t===228)&&e>=28&&e<=227&&(i-=20,a+=60,c+=40),(e===27||e===228)&&t>=28&&t<=227&&(i-=20,a+=60,c+=40),(t<40&&e<40||t<40&&e>215||t>215&&e<40||t>215&&e>215)&&(t+e)%3==0&&(i-=10,a+=40,c+=30);else if(r)i+=5,a+=15,c+=10;else{i+=15,a+=8,(t===127||t===128)&&(i+=60,a+=50,c+=20),(e-40)%64==0&&e>40&&e<216&&(i-=25,a-=20,c-=10);for(let{bx:n,by:r}of[{bx:60,by:60},{bx:60,by:196},{bx:104,by:60},{bx:104,by:196},{bx:148,by:60},{bx:148,by:196},{bx:192,by:60},{bx:192,by:196}]){let o=t-n,s=e-r;o*o+s*s<=32&&(i+=80,a+=70,c+=30)}e>=192&&e<216&&((t+e)%40<20?(i+=80,a+=40,c-=20):(i-=30,a-=30,c-=30));let n=t-127,r=e-128;n*n+r*r<=72&&(i+=100,a+=20,c-=20),t===126&&(i-=20,a-=15),t===129&&(i-=20,a-=15)}for(let{dx:n,dy:r}of[{dx:14,dy:14},{dx:241,dy:14}]){let o=t-n,s=e-r;o*o+s*s<=18&&(i=0,a=200,c=120)}}else if(s===6){let n=Math.floor(e/64)%2*(128/2),r=(t+n)%128;(e%64<4||r<4)&&(i-=30,a-=30,c-=30)}else if(s===7){let n=Math.abs(Math.sin((t+e)*.04)),r=Math.abs(Math.sin(t*.085-e*.055))>.94,o=Math.sin(t*.0375)*Math.sin(e*.0375)*25;i+=o*2+(r?95:0)-n*18,a+=o*.25-n*12,c+=o+n*20,We(t,e,256)>.5&&(i+=25,c+=18),V(Math.floor(t/5),Math.floor(e/5),63)>.91&&(i-=18,a-=8,c-=14)}else if(s===8){let n=(t+e)%56<4||Math.abs(t-e)%84<4,r=V(Math.floor(t/12),Math.floor(e/12),8)*20;i+=r+(n?35:0),a+=r+(n?48:0),c+=r+(n?55:15)}else if(s===9){let n=Math.sin(t*.075+e*.05)*20,r=Math.cos(t*.0375-e*.0625)*15,o=Math.abs(Math.sin(t*.105+e*.165))>.96;i+=n,a+=n+r+(o?90:0),c+=r+40+(o?70:0)}let u=V(t,e,s+50),d=t<255?V(t+1,e,s+50):u,f=e<255?V(t,e+1,s+50):u,p=((u-d)*18+(u-f)*18)*.5;if(i+=p,a+=p,c+=p,e<12){let t=(1-e/12)*25;i-=t,a-=t,c-=t}else if(e>243){let t=(1-(255-e)/12)*25;i-=t,a-=t,c-=t}i=Ge(i,l),a=Ge(a,l),c=Ge(c,l),o[r]=i,o[r+1]=a,o[r+2]=c,o[r+3]=255}i.putImageData(a,0,0),e[t]=r}return e}var qe={1:{normal:{floorBase:{r:28,g:42,b:48},floorGrid:{r:15,g:28,b:35},floorGlow:{r:5,g:40,b:60},ceilBase:{r:18,g:22,b:38},ceilLight:{r:40,g:35,b:18},seamG:14,seamB:18,rivetG:30,rivetB:45},brutal:{floorBase:{r:22,g:25,b:32},floorGrid:{r:12,g:15,b:20},floorGlow:{r:8,g:18,b:30},ceilBase:{r:10,g:10,b:20},ceilLight:{r:15,g:20,b:35},seamG:10,seamB:14,rivetG:22,rivetB:28}},2:{normal:{floorBase:{r:48,g:34,b:14},floorGrid:{r:28,g:18,b:6},floorGlow:{r:60,g:40,b:5},ceilBase:{r:30,g:18,b:8},ceilLight:{r:55,g:38,b:8},seamG:12,seamB:6,rivetG:28,rivetB:10},brutal:{floorBase:{r:35,g:22,b:8},floorGrid:{r:20,g:12,b:4},floorGlow:{r:50,g:28,b:4},ceilBase:{r:20,g:12,b:4},ceilLight:{r:45,g:28,b:6},seamG:8,seamB:4,rivetG:20,rivetB:6}},3:{normal:{floorBase:{r:40,g:10,b:20},floorGrid:{r:24,g:6,b:14},floorGlow:{r:55,g:5,b:40},ceilBase:{r:20,g:6,b:30},ceilLight:{r:44,g:8,b:50},seamG:6,seamB:18,rivetG:14,rivetB:45},brutal:{floorBase:{r:30,g:8,b:14},floorGrid:{r:18,g:4,b:8},floorGlow:{r:45,g:4,b:30},ceilBase:{r:14,g:4,b:20},ceilLight:{r:35,g:6,b:40},seamG:4,seamB:12,rivetG:8,rivetB:30}}};function Je(e,t){let n=t===1,r=qe[e||1]||qe[1],i=n?r.brutal:r.normal,{floorBase:a,floorGrid:o,floorGlow:s,ceilBase:c,ceilLight:l}=i,u=new ImageData(256,256).data;for(let t=0;t<256;t++)for(let r=0;r<256;r++){let c=(t*256+r)*4,l=a.r,d=a.g,f=a.b,p=V(r,t,e||1)*8-4|0,m=r%64,h=t%64;m===0||h===0?(l+=o.r,d+=o.g,f+=o.b):m===1||h===1?(l+=6,d+=8,f+=10):(m===63||h===63)&&(l-=8,d-=8,f-=6),(r%128<8||t%128<8)&&(l+=8,d+=i.seamG,f+=i.seamB);let g=r%128,_=t%128;g>=8&&g<=16&&_>=8&&_<=16&&(l+=n?20:10,d+=i.rivetG,f+=i.rivetB);let v=r%128-64,y=t%128-64,b=Math.sqrt(v*v+y*y);if(b<16){let e=1-b/16;l+=s.r*e|0,d+=s.g*e|0,f+=s.b*e|0}V(r,Math.floor(t/2),(e||1)+77)>.96&&(l+=4,d+=5,f+=6),u[c]=Ge(l,p),u[c+1]=Ge(d,p),u[c+2]=Ge(f,p),u[c+3]=255}let d=new ImageData(256,256).data;for(let t=0;t<256;t++)for(let r=0;r<256;r++){let i=(t*256+r)*4,a=c.r,o=c.g,s=c.b,u=V(r,t,(e||1)+20)*6-3|0;r%128==0||t%128==0?(a-=5,o-=5,s-=4):r%128==1||t%128==1?(a-=3,o-=3,s-=2):(r%128==127||t%128==127)&&(a+=2,o+=2,s+=3),t%128<12&&(a+=n?6:10,o+=n?6:8,s+=n?8:6);let f=r%128;if(f>=56&&f<=72&&t%128>=14&&t%128<=24){let e=Math.abs(f-64),t=e<4?8:e<6?4:-2;a+=t,o+=t+2,s+=t+4}let p=r%128-64,m=t%128-64,h=Math.sqrt(p*p+m*m);if(h<14){let e=1-h/14;a+=l.r*e|0,o+=l.g*e|0,s+=l.b*e|0}(r+t)%128<2&&V(Math.floor(r/128),Math.floor(t/128),55)>.65&&(a+=3,o+=6,s+=8),d[i]=Ge(a,u),d[i+1]=Ge(o,u),d[i+2]=Ge(s,u),d[i+3]=255}return{floorPixels:u,ceilPixels:d}}var Ye={drone:N,phantom:P,beast:te,boss:re,boss_form2:re,boss_form3:re,corruptCop:M,sentinel:j,glitchling:oe,shieldCommander:ee,temporalSummoner:A,chronoBomber:L,henchman:I,phaseStalker:k,timeWarden:F,echoDrone:ie,riftLeaper:ne,temporalEngineer:ae};function Xe(e,t,n,r,i,a,o,s){if(s<=0)return;let c=Math.max(6,r*.35),l=Math.sin(o*.004)*c*.2,u=n+i*.15+l,d=.8+Math.sin(o*.006)*.2;e.globalAlpha=s*.2*d,e.fillStyle=`#00ff44`,e.beginPath(),e.arc(t,u,c*1.6,0,Math.PI*2),e.fill(),e.globalAlpha=s*.3,e.fillStyle=`#00ff44`,e.beginPath(),e.arc(t,u,c*1.2,0,Math.PI*2),e.fill(),e.globalAlpha=s,e.fillStyle=`#ffffff`,e.fillRect(t-c*.6,u-c*.6,c*1.2,c*1.2),e.fillStyle=`rgba(255,255,255,0.4)`,e.fillRect(t-c*.6,u-c*.6,c*.4,c*1.2);let f=c*.22;e.fillStyle=`#ff2222`,e.fillRect(t-f/2,u-c*.45,f,c*.9),e.fillRect(t-c*.45,u-f/2,c*.9,f),e.fillStyle=`rgba(255,100,100,0.3)`,e.fillRect(t-f/2,u-c*.45,f*.4,c*.9),e.strokeStyle=`#00cc44`,e.lineWidth=1.5,e.globalAlpha=s*d,e.strokeRect(t-c*.6,u-c*.6,c*1.2,c*1.2),e.fillStyle=`#00ff44`,e.globalAlpha=s*.6,[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([n,r])=>{e.beginPath(),e.arc(t+n*c*.6,u+r*c*.6,Math.max(1,c*.06),0,Math.PI*2),e.fill()}),e.globalAlpha=1}function Ze(e,t,n,r,i,a,o,s){if(s<=0)return;let c=Math.max(6,r*.35),l=Math.sin(o*.004+1)*c*.2,u=n+i*.15+l;e.globalAlpha=s*.3,e.fillStyle=`#ffaa00`,e.beginPath(),e.arc(t,u,c*1,0,Math.PI*2),e.fill(),e.globalAlpha=s;let d=c*.5,f=c*1;e.fillStyle=`#555555`,e.fillRect(t-d/2,u-f/2,d,f),e.fillStyle=`#777777`,e.fillRect(t-d/2+1,u-f/2+1,d*.3,f-2);let p=f*.15;e.fillStyle=`#ddaa33`,e.fillRect(t-d/2+1,u-f/2-p+1,d*.25,p),e.fillRect(t,u-f/2-p+1,d*.25,p),e.fillRect(t-d/4,u-f/2-p*.7+1,d*.25,p*.7),e.fillStyle=`#666666`,e.fillRect(t-d/2-1,u-f/2,d+2,2),e.strokeStyle=`#ffaa00`,e.lineWidth=1,e.strokeRect(t-d/2,u-f/2,d,f),e.globalAlpha=1}function Qe(e,t,n,r,i,a,o,s){if(s<=0)return;let c=Math.max(6,r*.35),l=Math.sin(o*.004+2)*c*.2,u=n+i*.15+l;e.globalAlpha=s*.3,e.fillStyle=`#00ccff`,e.beginPath(),e.arc(t,u,c*1.2,0,Math.PI*2),e.fill(),e.globalAlpha=s;let d=c*.9,f=c*.7;e.fillStyle=`#667788`,e.fillRect(t-d/2,u-f/2,d,f),e.fillStyle=`#889aaa`,e.beginPath(),e.moveTo(t-d/2,u-f/2),e.lineTo(t-d/2+d*.15,u-f/2-f*.2),e.lineTo(t+d/2+d*.15,u-f/2-f*.2),e.lineTo(t+d/2,u-f/2),e.closePath(),e.fill(),e.fillStyle=`#556677`,e.beginPath(),e.moveTo(t+d/2,u-f/2),e.lineTo(t+d/2+d*.15,u-f/2-f*.2),e.lineTo(t+d/2+d*.15,u+f/2-f*.2),e.lineTo(t+d/2,u+f/2),e.closePath(),e.fill(),e.strokeStyle=`#88aacc`,e.lineWidth=1.5,e.beginPath(),e.moveTo(t-d/2,u-f/2),e.lineTo(t+d/2,u+f/2),e.moveTo(t+d/2,u-f/2),e.lineTo(t-d/2,u+f/2),e.stroke(),e.fillStyle=`#aaccee`;let p=Math.max(1,c*.05);[[-d/2+2,-f/2+2],[d/2-2,-f/2+2],[-d/2+2,f/2-2],[d/2-2,f/2-2]].forEach(([n,r])=>{e.beginPath(),e.arc(t+n,u+r,p,0,Math.PI*2),e.fill()}),e.strokeStyle=`#00ccff`,e.lineWidth=1,e.strokeRect(t-d/2,u-f/2,d,f),e.globalAlpha=1}function $e(e,t,n,r,i,a,o,s){if(s<=0)return;let c=Math.max(8,r*.5),l=o*.003,u=.7+Math.sin(l*1.4)*.3;e.save(),e.translate(t,n);let d=c*1.4,f=c*2,p=Math.max(2,c*.12);e.globalAlpha=s*u*.18;let m=e.createRadialGradient(0,0,c*.2,0,0,c*2.4);m.addColorStop(0,`#00ffaa`),m.addColorStop(1,`transparent`),e.fillStyle=m,e.fillRect(-c*2.4,-c*2.4,c*4.8,c*4.8),e.globalAlpha=s*.7,e.fillStyle=`#0a1a12`,e.fillRect(-d,-f,d*2,f*2),e.globalAlpha=s*.08,e.fillStyle=`#00ff88`;let h=o*.04%(f*2);e.fillRect(-d,-f+h,d*2,2),e.globalAlpha=s*u*.85,e.strokeStyle=`#00cc88`,e.lineWidth=p,e.strokeRect(-d,-f,d*2,f*2),e.globalAlpha=s*.4,e.strokeStyle=`#005533`,e.lineWidth=p*.5,e.strokeRect(-d+p,-f+p,(d-p)*2,(f-p)*2),e.globalAlpha=s*.55;let g=Math.max(3,c*.18),_=d*2/6;for(let t=0;t<6;t++)e.fillStyle=t%2==0?`#ffcc00`:`#111111`,e.fillRect(-d+t*_,-f,_,g),e.fillRect(-d+t*_,f-g,_,g);let v=Math.max(2,c*.1),y=f*.4,b=.8+Math.sin(l*2.2)*.2;for(let t=0;t<3;t++){let n=-f*.35+t*y;e.globalAlpha=s*b*.4,e.fillStyle=`#00ff88`,e.beginPath(),e.arc(-d-v*.5,n,v*2,0,Math.PI*2),e.fill(),e.globalAlpha=s*b*.9,e.fillStyle=`#00ff88`,e.beginPath(),e.arc(-d-v*.5,n,v,0,Math.PI*2),e.fill()}for(let t=0;t<4;t++){let n=l*2+t*Math.PI/2,r=Math.cos(n)*c*.9,i=Math.sin(n)*c*1.3;e.globalAlpha=s*.6,e.fillStyle=t%2==0?`#00ffcc`:`#88ffdd`,e.beginPath(),e.arc(r,i,Math.max(2,c*.12),0,Math.PI*2),e.fill()}if(e.globalAlpha=s*u*.5,e.strokeStyle=`#00ffaa`,e.lineWidth=1.5,e.beginPath(),e.moveTo(0,-f+g),e.lineTo(0,f-g),e.stroke(),e.globalAlpha=s*.3,e.fillStyle=`#004422`,e.fillRect(-d*.6,-c*.08,d*1.2,c*.16),e.globalAlpha=s*u*.7,e.strokeStyle=`#00cc88`,e.lineWidth=1,e.strokeRect(-d*.6,-c*.08,d*1.2,c*.16),c>14){let t=Math.max(7,c*.22);e.globalAlpha=s*u*.75,e.fillStyle=`#00ffcc`,e.font=`bold ${t}px monospace`,e.textAlign=`center`,e.fillText(`AIRLOCK`,0,-f-t*.3)}e.globalAlpha=1,e.textAlign=`left`,e.restore()}function et(e,t,n,r,i,a,o,s){if(s<=0)return;let c=Math.max(3,r*.15),l=a.color||`#ff0044`,u=o*.006;e.globalAlpha=s*.35;let d=e.createRadialGradient(t,n,0,t,n,c*3);d.addColorStop(0,l),d.addColorStop(1,`transparent`),e.fillStyle=d,e.fillRect(t-c*3,n-c*3,c*6,c*6),e.globalAlpha=s*.8,e.fillStyle=l,e.beginPath(),e.arc(t,n,c*.9,0,Math.PI*2),e.fill(),e.globalAlpha=s,e.fillStyle=`#ffffff`,e.beginPath(),e.arc(t,n,c*.4,0,Math.PI*2),e.fill(),e.globalAlpha=s*.6;for(let r=0;r<3;r++){let i=u+r*2.1,a=t+Math.cos(i)*c*1.4,o=n+Math.sin(i)*c*1.4;e.fillStyle=l,e.fillRect(a-1,o-1,2,2)}e.globalAlpha=1}function tt(e,t,n,r,i,a,o,s,c){if(s<=0)return;let l=Math.max(7,r*.4),u=Math.sin(o*.005)*l*.25,d=n+i*.1+u,f=.7+Math.sin(o*.008)*.3,p=o*.003%(Math.PI*2),m=c===`damage2x`,h=m?`#ff3322`:`#ffdd44`,g=m?`#ff6644`:`#ffee88`,_=m?`#661100`:`#886600`;e.globalAlpha=s*.25*f,e.fillStyle=g,e.beginPath(),e.arc(t,d,l*2,0,Math.PI*2),e.fill(),e.globalAlpha=s*.45,e.fillStyle=h,e.beginPath(),e.arc(t,d,l*1.3,0,Math.PI*2),e.fill(),e.save(),e.translate(t,d),e.rotate(p),e.globalAlpha=s,e.fillStyle=h,e.beginPath(),e.moveTo(0,-l*.9),e.lineTo(l*.9,0),e.lineTo(0,l*.9),e.lineTo(-l*.9,0),e.closePath(),e.fill(),e.strokeStyle=_,e.lineWidth=1.5,e.stroke(),e.fillStyle=`rgba(255,255,255,0.55)`,e.beginPath(),e.moveTo(0,-l*.5),e.lineTo(l*.25,-l*.25),e.lineTo(0,0),e.closePath(),e.fill(),e.restore(),e.globalAlpha=s,e.fillStyle=`#ffffff`,e.font=`bold ${Math.max(9,Math.floor(l*.95))}px monospace`,e.textAlign=`center`,e.textBaseline=`middle`,e.fillText(m?`2x`:`+`,t,d),e.textBaseline=`alphabetic`,e.textAlign=`left`,e.globalAlpha=1}var H=(e,t)=>e+t*.45,nt=1;function rt(e){nt=70/Math.max(50,e)}var U=(e,t,n)=>Math.max(e*nt,t*n),it={locker:ot,bench:st,target:ct,ammo_crate:lt,weight_rack:ut,dumbbell:dt,punching_bag:ft,desk:pt,filing_cabinet:mt,monitor_bank:ht,table:gt,chair:_t,vending_machine:vt,weapon_rack:yt,potted_plant:bt,barrier:xt};function at(e,t,n,r,i,a,o,s,c){if(c<=0)return;let l=it[t.propType];l&&l(e,n,r,i,a,o,s,c)}function ot(e,t,n,r,i,a,o,s){let c=U(6,r,.35),l=c*.7,u=c*1.6,d=H(n,i)-u/2;e.globalAlpha=s*.9,e.fillStyle=`#556677`,e.fillRect(t-l/2,d-u/2,l,u),e.fillStyle=`#6a7a8a`,e.fillRect(t-l/2,d-u/2,l*.2,u),e.strokeStyle=`#334455`,e.lineWidth=1,e.globalAlpha=s*.7,e.beginPath(),e.moveTo(t,d-u/2+2),e.lineTo(t,d+u/2-2),e.stroke(),e.globalAlpha=s*.5,e.fillStyle=`#223344`;for(let n=0;n<3;n++)e.fillRect(t-l*.3,d-u/2+3+n*3,l*.6,1);e.globalAlpha=s*.8,e.fillStyle=`#99aabb`,e.beginPath(),e.arc(t+l*.15,d,Math.max(1,c*.06),0,Math.PI*2),e.fill(),e.strokeStyle=`#445566`,e.globalAlpha=s*.4,e.beginPath(),e.moveTo(t-l/2+1,d-u*.15),e.lineTo(t+l/2-1,d-u*.15),e.stroke(),e.globalAlpha=1}function st(e,t,n,r,i,a,o,s){let c=U(6,r,.35),l=c*1.4,u=c*.3,d=H(n,i)-u*2.5;e.globalAlpha=s*.85,e.fillStyle=`#8B6914`,e.fillRect(t-l/2,d,l,u),e.fillStyle=`#a07a1a`,e.fillRect(t-l/2,d,l,u*.3),e.fillStyle=`#555555`,e.globalAlpha=s*.7;let f=Math.max(1,c*.08);e.fillRect(t-l*.4,d+u,f,u*1.5),e.fillRect(t+l*.4-f,d+u,f,u*1.5),e.globalAlpha=1}function ct(e,t,n,r,i,a,o,s){let c=U(8,r,.4),l=Math.sin(o*.002)*c*.05,u=H(n,i)-c*1.3+l;e.globalAlpha=s*.7,e.fillStyle=`#444444`,e.fillRect(t-c*.05,u+c*.5,c*.1,c*.8),e.globalAlpha=s*.9,e.fillStyle=`#ddddcc`,e.beginPath(),e.arc(t,u,c*.5,0,Math.PI*2),e.fill();for(let n of[{r:.4,c:`#cc3333`},{r:.28,c:`#ffffff`},{r:.18,c:`#cc3333`},{r:.08,c:`#ffcc00`}])e.fillStyle=n.c,e.beginPath(),e.arc(t,u,c*n.r,0,Math.PI*2),e.fill();e.globalAlpha=1}function lt(e,t,n,r,i,a,o,s){let c=U(6,r,.35),l=c*1,u=c*.7,d=H(n,i)-u/2;e.globalAlpha=s*.9,e.fillStyle=`#556B2F`,e.fillRect(t-l/2,d-u/2,l,u),e.fillStyle=`#667F3F`,e.beginPath(),e.moveTo(t-l/2,d-u/2),e.lineTo(t-l/2+l*.12,d-u/2-u*.2),e.lineTo(t+l/2+l*.12,d-u/2-u*.2),e.lineTo(t+l/2,d-u/2),e.closePath(),e.fill(),e.strokeStyle=`#8B8B00`,e.lineWidth=Math.max(1,c*.04),e.globalAlpha=s*.8,e.beginPath(),e.moveTo(t-l*.3,d-u/2),e.lineTo(t-l*.3,d+u/2),e.moveTo(t+l*.3,d-u/2),e.lineTo(t+l*.3,d+u/2),e.stroke(),c>10&&(e.globalAlpha=s*.5,e.fillStyle=`#8B8B00`,e.font=`bold ${Math.max(5,c*.18)}px monospace`,e.textAlign=`center`,e.fillText(`AMMO`,t,d+c*.08),e.textAlign=`left`),e.globalAlpha=1}function ut(e,t,n,r,i,a,o,s){let c=U(6,r,.35),l=c*.8,u=c*1.4,d=H(n,i)-u/2;e.globalAlpha=s*.8,e.fillStyle=`#444444`,e.fillRect(t-l/2,d-u/2,c*.08,u),e.fillRect(t+l/2-c*.08,d-u/2,c*.08,u),e.fillStyle=`#555555`;for(let n=0;n<3;n++){let r=d-u*.3+n*u*.3;e.fillRect(t-l/2,r,l,c*.04)}e.fillStyle=`#222222`;for(let n=0;n<3;n++){let r=d-u*.3+n*u*.3,i=l*(.5-n*.1);e.fillRect(t-i/2,r-c*.12,i,c*.12)}e.globalAlpha=1}function dt(e,t,n,r,i,a,o,s){let c=U(6,r,.3),l=H(n,i)-c*.18;e.globalAlpha=s*.85,e.fillStyle=`#777777`,e.fillRect(t-c*.4,l-c*.06,c*.8,c*.12),e.fillStyle=`#333333`,e.fillRect(t-c*.55,l-c*.18,c*.18,c*.36),e.fillRect(t+c*.37,l-c*.18,c*.18,c*.36),e.fillStyle=`#444444`,e.fillRect(t-c*.55,l-c*.18,c*.05,c*.36),e.fillRect(t+c*.37,l-c*.18,c*.05,c*.36),e.globalAlpha=1}function ft(e,t,n,r,i,a,o,s){let c=U(8,r,.4),l=Math.sin(o*.0015)*c*.06,u=n-c*.1;e.globalAlpha=s*.5,e.strokeStyle=`#888888`,e.lineWidth=Math.max(1,c*.03),e.beginPath(),e.moveTo(t,u-c*.9),e.lineTo(t+l,u-c*.5),e.stroke(),e.globalAlpha=s*.85,e.fillStyle=`#8B2500`;let d=t+l;e.beginPath(),e.ellipse(d,u,c*.28,c*.55,0,0,Math.PI*2),e.fill(),e.fillStyle=`#a03010`,e.beginPath(),e.ellipse(d-c*.08,u,c*.08,c*.5,0,0,Math.PI*2),e.fill(),e.strokeStyle=`#661800`,e.lineWidth=1,e.globalAlpha=s*.4,e.beginPath(),e.moveTo(d,u-c*.5),e.lineTo(d,u+c*.5),e.stroke(),e.globalAlpha=1}function pt(e,t,n,r,i,a,o,s){let c=U(6,r,.35),l=c*1.3,u=c*.35,d=H(n,i)-u*3.2;e.globalAlpha=s*.9,e.fillStyle=`#6B4226`,e.fillRect(t-l/2,d,l,u),e.fillStyle=`#7d5030`,e.fillRect(t-l/2,d,l,u*.25),e.fillStyle=`#5a3520`,e.fillRect(t-l/2,d+u,l,u*2.2),e.strokeStyle=`#4a2a18`,e.lineWidth=1,e.globalAlpha=s*.6,e.beginPath(),e.moveTo(t-l*.4,d+u*1.8),e.lineTo(t+l*.4,d+u*1.8),e.stroke(),e.fillStyle=`#998877`,e.globalAlpha=s*.7,e.fillRect(t-c*.06,d+u*1.4,c*.12,c*.04),e.globalAlpha=1}function mt(e,t,n,r,i,a,o,s){let c=U(6,r,.35),l=c*.65,u=c*1.3,d=H(n,i)-u/2;e.globalAlpha=s*.85,e.fillStyle=`#707070`,e.fillRect(t-l/2,d-u/2,l,u),e.fillStyle=`#808080`,e.fillRect(t-l/2,d-u/2,l*.15,u),e.strokeStyle=`#555555`,e.lineWidth=1,e.globalAlpha=s*.7;for(let n=1;n<3;n++){let r=d-u/2+u/3*n;e.beginPath(),e.moveTo(t-l/2+1,r),e.lineTo(t+l/2-1,r),e.stroke()}e.fillStyle=`#999999`,e.globalAlpha=s*.8;for(let n=0;n<3;n++){let r=d-u/2+u/3*n+u/6;e.fillRect(t-c*.06,r-1,c*.12,2)}e.fillStyle=`#aaaaaa`,e.globalAlpha=s*.4,e.fillRect(t-l*.2,d-u/2+u/6-c*.06,l*.4,c*.05),e.globalAlpha=1}function ht(e,t,n,r,i,a,o,s){let c=U(8,r,.4),l=c*.45,u=c*.35,d=H(n,i)-u/2-c*.16;for(let n=-1;n<=1;n+=2){let r=t+n*l*.55;e.globalAlpha=s*.85,e.fillStyle=`#333333`,e.fillRect(r-l/2,d-u/2,l,u),e.globalAlpha=s*(.7+Math.sin(o*.008+n)*.15),e.fillStyle=`#003322`,e.fillRect(r-l/2+2,d-u/2+2,l-4,u-4),e.globalAlpha=s*.15,e.fillStyle=`#00ff88`;let i=(o*.03+n*20)%(u-4);e.fillRect(r-l/2+2,d-u/2+2+i,l-4,1),e.globalAlpha=s*.4,e.fillStyle=`#00cc66`;for(let t=0;t<3;t++){let i=l*(.3+Math.sin(t*2.3+n)*.15);e.fillRect(r-l/2+4,d-u/2+5+t*4,i,1.5)}}e.globalAlpha=s*.7,e.fillStyle=`#444444`,e.fillRect(t-c*.04,d+u/2,c*.08,c*.15),e.fillRect(t-c*.15,d+u/2+c*.12,c*.3,c*.04),e.globalAlpha=1}function gt(e,t,n,r,i,a,o,s){let c=U(6,r,.35),l=c*1.1,u=c*.2,d=H(n,i)-u-c*.5;e.globalAlpha=s*.85,e.fillStyle=`#887766`,e.fillRect(t-l/2,d,l,u),e.fillStyle=`#998877`,e.fillRect(t-l/2,d,l,u*.3),e.fillStyle=`#666655`,e.globalAlpha=s*.7;let f=Math.max(1,c*.06);e.fillRect(t-l*.42,d+u,f,c*.5),e.fillRect(t+l*.42-f,d+u,f,c*.5),e.globalAlpha=1}function _t(e,t,n,r,i,a,o,s){let c=U(6,r,.3),l=H(n,i)-c*.55;e.globalAlpha=s*.8,e.fillStyle=`#444455`,e.fillRect(t-c*.35,l,c*.7,c*.2),e.fillStyle=`#3a3a4a`,e.fillRect(t-c*.3,l-c*.5,c*.6,c*.5),e.fillStyle=`#4a4a5a`,e.fillRect(t-c*.3,l-c*.5,c*.12,c*.5),e.fillStyle=`#555555`,e.globalAlpha=s*.6;let u=Math.max(1,c*.05);e.fillRect(t-c*.3,l+c*.2,u,c*.35),e.fillRect(t+c*.3-u,l+c*.2,u,c*.35),e.globalAlpha=1}function vt(e,t,n,r,i,a,o,s){let c=U(8,r,.4),l=c*.8,u=c*1.5,d=H(n,i)-u/2;e.globalAlpha=s*.9,e.fillStyle=`#2244aa`,e.fillRect(t-l/2,d-u/2,l,u),e.fillStyle=`#3355bb`,e.fillRect(t-l/2,d-u/2,l*.12,u),e.globalAlpha=s*.7,e.fillStyle=`#aaddff`,e.fillRect(t-l*.35,d-u*.35,l*.7,u*.35),e.fillStyle=`#1133aa`;for(let n=1;n<3;n++)e.fillRect(t-l*.35,d-u*.35+n*u*.12,l*.7,1);e.globalAlpha=s*.6;for(let n=0;n<3;n++)for(let r=0;r<3;r++)e.fillStyle=[`#ff4444`,`#44ff44`,`#ffaa00`][(n+r)%3],e.beginPath(),e.arc(t-l*.2+r*l*.2,d-u*.28+n*u*.12,Math.max(1,c*.04),0,Math.PI*2),e.fill();e.globalAlpha=s*.8,e.fillStyle=`#111133`,e.fillRect(t-l*.25,d+u*.1,l*.5,u*.12),e.globalAlpha=s*(Math.sin(o*.005)>0?.9:.3),e.fillStyle=`#00ff44`,e.beginPath(),e.arc(t+l*.3,d-u*.42,Math.max(1,c*.04),0,Math.PI*2),e.fill(),e.globalAlpha=1}function yt(e,t,n,r,i,a,o,s){let c=U(6,r,.35),l=c*.9,u=c*1.2,d=n-u*.1;e.globalAlpha=s*.8,e.fillStyle=`#555566`,e.fillRect(t-l/2,d-u/2,l,u),e.fillStyle=`#777788`,e.globalAlpha=s*.85;for(let n=0;n<3;n++){let r=d-u*.3+n*u*.3;e.fillRect(t-l*.35,r-1,l*.2,3),e.fillRect(t+l*.15,r-1,l*.2,3)}e.fillStyle=`#222233`,e.globalAlpha=s*.7;for(let n=0;n<3;n++){let r=d-u*.3+n*u*.3,i=l*(.7-n*.1);e.fillRect(t-i/2,r-2,i,3),e.fillRect(t+i*.1,r,c*.06,c*.1)}e.globalAlpha=1}function bt(e,t,n,r,i,a,o,s){let c=U(6,r,.3),l=H(n,i)-c*.4;e.globalAlpha=s*.85,e.fillStyle=`#8B4513`,e.beginPath(),e.moveTo(t-c*.3,l),e.lineTo(t-c*.22,l+c*.4),e.lineTo(t+c*.22,l+c*.4),e.lineTo(t+c*.3,l),e.closePath(),e.fill(),e.fillStyle=`#9a5520`,e.fillRect(t-c*.33,l-c*.04,c*.66,c*.08),e.fillStyle=`#3a2510`,e.fillRect(t-c*.28,l-c*.02,c*.56,c*.06),e.globalAlpha=s*.8;let u=Math.sin(o*.001)*.05;for(let n=-2;n<=2;n++){let r=-Math.PI/2+n*.35+u,i=Math.cos(r)*c*.5,a=Math.sin(r)*c*.5;e.strokeStyle=n%2==0?`#228833`:`#33aa44`,e.lineWidth=Math.max(2,c*.08),e.lineCap=`round`,e.beginPath(),e.moveTo(t,l-c*.05),e.quadraticCurveTo(t+i*.6,l+a*.6-c*.2,t+i,l+a-c*.1),e.stroke()}e.fillStyle=`#33aa44`,e.globalAlpha=s*.6;for(let n=-2;n<=2;n++){let r=-Math.PI/2+n*.35+u,i=Math.cos(r)*c*.5,a=Math.sin(r)*c*.5;e.beginPath(),e.arc(t+i,l+a-c*.1,Math.max(1,c*.06),0,Math.PI*2),e.fill()}e.lineCap=`butt`,e.globalAlpha=1}function xt(e,t,n,r,i,a,o,s){let c=U(8,r,.4),l=c*1.2,u=c*.8,d=H(n,i)-u/2;e.globalAlpha=s*.85,e.fillStyle=`#888888`,e.beginPath(),e.moveTo(t-l/2,d+u/2),e.lineTo(t-l*.35,d-u/2),e.lineTo(t+l*.35,d-u/2),e.lineTo(t+l/2,d+u/2),e.closePath(),e.fill(),e.fillStyle=`#999999`,e.fillRect(t-l*.35,d-u/2-u*.08,l*.7,u*.08),e.fillStyle=`#aaaaaa`,e.globalAlpha=s*.5,e.beginPath(),e.moveTo(t-l/2,d+u/2),e.lineTo(t-l*.35,d-u/2),e.lineTo(t-l*.35,d-u/2-u*.08),e.lineTo(t-l/2,d+u/2),e.closePath(),e.fill(),e.globalAlpha=s*.6;let f=l*.7/4;for(let n=0;n<4;n++)e.fillStyle=n%2==0?`#ffcc00`:`#222222`,e.fillRect(t-l*.35+n*f,d-u*.1,f,u*.15);e.globalAlpha=1}var St=`#version 300 es
precision highp float;
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`,Ct=`#version 300 es
precision highp float;

uniform vec2 u_resolution;     // canvas width, height
uniform vec2 u_camPos;         // camera world position
uniform vec2 u_dir;            // camera direction
uniform vec2 u_plane;          // camera plane (FOV)
uniform float u_yShift;        // pitch offset
uniform sampler2D u_floorTex;  // 256x256 floor texture
uniform sampler2D u_ceilTex;   // 256x256 ceiling texture
uniform vec3 u_fogColor;       // act-tinted fog RGB (0-1)
uniform float u_fogMax;        // max fog opacity
uniform int u_numLights;       // number of dynamic lights
uniform vec4 u_lights[16];     // xyz=position, w=intensity (max 16)
uniform vec3 u_lightColors[16];

out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy;
  float w = u_resolution.x;
  float h = u_resolution.y;
  float halfH = floor(h * 0.5) + u_yShift;
  float projH = floor(h * 0.5);

  float y = uv.y;
  // Flip Y — WebGL origin is bottom-left, canvas is top-left
  float screenY = h - 1.0 - y;

  bool isFloor = screenY > halfH;
  bool isCeiling = screenY < halfH;

  if (!isFloor && !isCeiling) {
    // Horizon line
    fragColor = vec4(u_fogColor, 1.0);
    return;
  }

  float p;
  if (isFloor) {
    p = screenY - halfH;
  } else {
    p = halfH - screenY;
  }

  if (p <= 0.0) {
    fragColor = vec4(u_fogColor, 1.0);
    return;
  }

  float rowDist = projH / p;

  // Ray direction for this pixel's column
  float cameraX = (2.0 * uv.x / w) - 1.0;
  float rayDirX = u_dir.x + u_plane.x * cameraX;
  float rayDirY = u_dir.y + u_plane.y * cameraX;

  // World-space floor position
  float floorX = u_camPos.x + rowDist * rayDirX;
  float floorY = u_camPos.y + rowDist * rayDirY;

  // Texture coordinates (256x256, wrapping)
  vec2 texCoord = fract(vec2(floorX, floorY));

  // Sample texture
  vec3 texColor;
  if (isFloor) {
    texColor = texture(u_floorTex, texCoord).rgb;
  } else {
    texColor = texture(u_ceilTex, texCoord).rgb;
  }

  // Distance fog
  float fog = min(u_fogMax, rowDist / 12.0);
  vec3 color = mix(texColor, u_fogColor, fog);

  // Dynamic point lights — additive
  for (int i = 0; i < 16; i++) {
    if (i >= u_numLights) break;
    vec3 lightPos = u_lights[i].xyz;
    float intensity = u_lights[i].w;
    float dist = distance(vec2(floorX, floorY), lightPos.xy);
    float radius = intensity * 3.0;
    if (dist < radius) {
      float atten = 1.0 - (dist / radius);
      atten *= atten; // quadratic falloff
      color += u_lightColors[i] * atten * intensity * 0.3;
    }
  }

  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}`,wt=St,Tt=`#version 300 es
precision highp float;

uniform sampler2D u_scene;     // the rendered scene
uniform vec2 u_resolution;
uniform float u_time;
uniform bool u_enableBloom;
uniform bool u_enableCA;
uniform bool u_enableGrain;
uniform vec3 u_gradeColor;     // per-act color grade tint

out vec4 fragColor;

// Simple pseudo-random
float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;

  vec3 color;

  // Chromatic aberration
  if (u_enableCA) {
    float caAmount = 0.002;
    float r = texture(u_scene, uv + vec2(caAmount, 0.0)).r;
    float g = texture(u_scene, uv).g;
    float b = texture(u_scene, uv - vec2(caAmount, 0.0)).b;
    color = vec3(r, g, b);
  } else {
    color = texture(u_scene, uv).rgb;
  }

  // Bloom (simplified — sample blurred neighbors)
  if (u_enableBloom) {
    vec3 bloom = vec3(0.0);
    float texelW = 1.0 / u_resolution.x;
    float texelH = 1.0 / u_resolution.y;
    for (int i = -2; i <= 2; i++) {
      for (int j = -2; j <= 2; j++) {
        vec2 offset = vec2(float(i) * texelW * 4.0, float(j) * texelH * 4.0);
        vec3 s = texture(u_scene, uv + offset).rgb;
        float brightness = dot(s, vec3(0.2126, 0.7152, 0.0722));
        if (brightness > 0.7) bloom += s;
      }
    }
    bloom /= 25.0;
    color += bloom * 0.15;
  }

  // Film grain
  if (u_enableGrain) {
    float grain = rand(uv + fract(u_time * 0.001)) * 0.06 - 0.03;
    color += grain;
  }

  // Color grading (per-act tint)
  color = mix(color, u_gradeColor, 0.03);

  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}`;function Et(e,t,n){let r=e.createShader(t);return e.shaderSource(r,n),e.compileShader(r),e.getShaderParameter(r,e.COMPILE_STATUS)?r:(console.warn(`[GL] Shader compile error:`,e.getShaderInfoLog(r)),e.deleteShader(r),null)}function Dt(e,t,n){let r=Et(e,e.VERTEX_SHADER,t),i=Et(e,e.FRAGMENT_SHADER,n);if(!r||!i)return null;let a=e.createProgram();return e.attachShader(a,r),e.attachShader(a,i),e.linkProgram(a),e.getProgramParameter(a,e.LINK_STATUS)?a:(console.warn(`[GL] Program link error:`,e.getProgramInfoLog(a)),null)}function Ot(e,t,n,r){let i=e.createTexture();return e.bindTexture(e.TEXTURE_2D,i),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,t,n,0,e.RGBA,e.UNSIGNED_BYTE,r),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.REPEAT),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.REPEAT),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),i}var kt=class e{static create(t,n){let r=document.createElement(`canvas`);r.width=t,r.height=n;let i=r.getContext(`webgl2`,{alpha:!1,antialias:!1,depth:!1,stencil:!1,premultipliedAlpha:!1,preserveDrawingBuffer:!0});if(!i)return null;try{return new e(r,i,t,n)}catch(e){return console.warn(`[GL] Failed to initialize WebGL renderer:`,e),null}}constructor(e,t,n,r){if(this.canvas=e,this.gl=t,this.width=n,this.height=r,this.floorProgram=Dt(t,St,Ct),this.postfxProgram=Dt(t,wt,Tt),!this.floorProgram||!this.postfxProgram)throw Error(`Shader compilation failed`);this._cacheUniforms(),this.quadVAO=this._createQuadVAO(),this.floorTex=null,this.ceilTex=null,this._texPixelsCache=null,this.sceneFBO=this._createFramebuffer(n,r)}_cacheUniforms(){let e=this.gl,t=this.floorProgram;this.u_floor={resolution:e.getUniformLocation(t,`u_resolution`),camPos:e.getUniformLocation(t,`u_camPos`),dir:e.getUniformLocation(t,`u_dir`),plane:e.getUniformLocation(t,`u_plane`),yShift:e.getUniformLocation(t,`u_yShift`),floorTex:e.getUniformLocation(t,`u_floorTex`),ceilTex:e.getUniformLocation(t,`u_ceilTex`),fogColor:e.getUniformLocation(t,`u_fogColor`),fogMax:e.getUniformLocation(t,`u_fogMax`),numLights:e.getUniformLocation(t,`u_numLights`),lights:[],lightColors:[]};for(let n=0;n<16;n++)this.u_floor.lights.push(e.getUniformLocation(t,`u_lights[${n}]`)),this.u_floor.lightColors.push(e.getUniformLocation(t,`u_lightColors[${n}]`));let n=this.postfxProgram;this.u_postfx={scene:e.getUniformLocation(n,`u_scene`),resolution:e.getUniformLocation(n,`u_resolution`),time:e.getUniformLocation(n,`u_time`),enableBloom:e.getUniformLocation(n,`u_enableBloom`),enableCA:e.getUniformLocation(n,`u_enableCA`),enableGrain:e.getUniformLocation(n,`u_enableGrain`),gradeColor:e.getUniformLocation(n,`u_gradeColor`)}}_createQuadVAO(){let e=this.gl,t=e.createVertexArray();e.bindVertexArray(t);let n=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,n),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),e.STATIC_DRAW);let r=e.getAttribLocation(this.floorProgram,`a_pos`);return e.enableVertexAttribArray(r),e.vertexAttribPointer(r,2,e.FLOAT,!1,0,0),e.bindVertexArray(null),t}_createFramebuffer(e,t){let n=this.gl,r=n.createFramebuffer();n.bindFramebuffer(n.FRAMEBUFFER,r);let i=n.createTexture();return n.bindTexture(n.TEXTURE_2D,i),n.texImage2D(n.TEXTURE_2D,0,n.RGBA,e,t,0,n.RGBA,n.UNSIGNED_BYTE,null),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MAG_FILTER,n.LINEAR),n.framebufferTexture2D(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,i,0),n.bindFramebuffer(n.FRAMEBUFFER,null),{fbo:r,texture:i}}uploadFloorCeilTextures(e,t){let n=this.gl;this.floorTex&&n.deleteTexture(this.floorTex),this.ceilTex&&n.deleteTexture(this.ceilTex),this.floorTex=Ot(n,256,256,e),this.ceilTex=Ot(n,256,256,t)}resize(e,t){this.width=e,this.height=t,this.canvas.width=e,this.canvas.height=t;let n=this.gl;n.deleteFramebuffer(this.sceneFBO.fbo),n.deleteTexture(this.sceneFBO.texture),this.sceneFBO=this._createFramebuffer(e,t)}renderFloorCeiling(e,t,n,r,i,a,o,s,c,l){let u=this.gl,d=this.width,f=this.height;u.viewport(0,0,d,f),u.useProgram(this.floorProgram),u.bindVertexArray(this.quadVAO),u.uniform2f(this.u_floor.resolution,d,f),u.uniform2f(this.u_floor.camPos,e,t),u.uniform2f(this.u_floor.dir,n,r),u.uniform2f(this.u_floor.plane,i,a),u.uniform1f(this.u_floor.yShift,o),u.uniform3f(this.u_floor.fogColor,s[0],s[1],s[2]),u.uniform1f(this.u_floor.fogMax,c),u.activeTexture(u.TEXTURE0),u.bindTexture(u.TEXTURE_2D,this.floorTex),u.uniform1i(this.u_floor.floorTex,0),u.activeTexture(u.TEXTURE1),u.bindTexture(u.TEXTURE_2D,this.ceilTex),u.uniform1i(this.u_floor.ceilTex,1);let p=Math.min(l?l.length:0,16);u.uniform1i(this.u_floor.numLights,p);for(let e=0;e<p;e++){let t=l[e];u.uniform4f(this.u_floor.lights[e],t.x,t.y,t.z??0,t.intensity??1),u.uniform3f(this.u_floor.lightColors[e],(t.r??255)/255,(t.g??200)/255,(t.b??150)/255)}u.drawArrays(u.TRIANGLE_STRIP,0,4),u.bindVertexArray(null)}renderPostFX(e,t,n,r,i){let a=this.gl,o=this.width,s=this.height;a.bindFramebuffer(a.FRAMEBUFFER,this.sceneFBO.fbo),a.copyTexImage2D(a.TEXTURE_2D,0,a.RGBA,0,0,o,s,0),a.bindFramebuffer(a.FRAMEBUFFER,null),a.viewport(0,0,o,s),a.useProgram(this.postfxProgram),a.bindVertexArray(this.quadVAO),a.activeTexture(a.TEXTURE0),a.bindTexture(a.TEXTURE_2D,this.sceneFBO.texture),a.uniform1i(this.u_postfx.scene,0),a.uniform2f(this.u_postfx.resolution,o,s),a.uniform1f(this.u_postfx.time,e),a.uniform1i(this.u_postfx.enableBloom,+!!t),a.uniform1i(this.u_postfx.enableCA,+!!n),a.uniform1i(this.u_postfx.enableGrain,+!!r),a.uniform3f(this.u_postfx.gradeColor,i[0],i[1],i[2]),a.drawArrays(a.TRIANGLE_STRIP,0,4),a.bindVertexArray(null)}renderPostFXFromCanvas(e,t,n,r,i,a){let o=this.gl,s=this.width,c=this.height;o.bindTexture(o.TEXTURE_2D,this.sceneFBO.texture),o.texImage2D(o.TEXTURE_2D,0,o.RGBA,o.RGBA,o.UNSIGNED_BYTE,e),o.bindFramebuffer(o.FRAMEBUFFER,null),o.viewport(0,0,s,c),o.useProgram(this.postfxProgram),o.bindVertexArray(this.quadVAO),o.activeTexture(o.TEXTURE0),o.bindTexture(o.TEXTURE_2D,this.sceneFBO.texture),o.uniform1i(this.u_postfx.scene,0),o.uniform2f(this.u_postfx.resolution,s,c),o.uniform1f(this.u_postfx.time,t),o.uniform1i(this.u_postfx.enableBloom,+!!n),o.uniform1i(this.u_postfx.enableCA,+!!r),o.uniform1i(this.u_postfx.enableGrain,+!!i),o.uniform3f(this.u_postfx.gradeColor,a[0],a[1],a[2]),o.drawArrays(o.TRIANGLE_STRIP,0,4),o.bindVertexArray(null)}destroy(){let e=this.gl;e.deleteProgram(this.floorProgram),e.deleteProgram(this.postfxProgram),this.floorTex&&e.deleteTexture(this.floorTex),this.ceilTex&&e.deleteTexture(this.ceilTex),e.deleteFramebuffer(this.sceneFBO.fbo),e.deleteTexture(this.sceneFBO.texture)}},At=64,jt=new Map;function Mt(e,t,n,r){let i=Math.min(At,r*At+.5|0),a=`${e},${t},${n}`,o=jt.get(a);if(!o){o=Array(At+1);for(let r=0;r<=At;r++){let i=(r/At).toFixed(4);o[r]=`rgba(${e},${t},${n},${i})`}jt.set(a,o)}return o[i]}var Nt=new Float64Array(256),Pt=new Int32Array(256),Ft=0,It=class{constructor(e,t=0){this.canvas=e,this.ctx=e.getContext(`2d`),this.width=e.width,this.height=e.height,this.textures={},this.zBuffer=new Float64Array(this.width),this.wallTopY=new Float64Array(this.width),this._visualStyle=0,this._actPalette=1,this.textures=Ke(),this._regenerateFloorCeil(),this._floorCeilBuffer=null,this.glRenderer=null,this.useWebGL=!1,t!==1&&(this.glRenderer=kt.create(this.width,this.height),this.glRenderer?(this.useWebGL=!0,this._uploadFloorCeilToGL(),console.log(`[Renderer] WebGL2 hybrid renderer active`)):t===2&&console.warn(`[Renderer] WebGL2 requested but unavailable — falling back to Canvas2D`))}applyActPalette(e){let t=e??1;this._actPalette!==t&&(this._actPalette=t,this._regenerateFloorCeil(),this._floorCeilBuffer=null,this.useWebGL&&this._uploadFloorCeilToGL())}applyVisualStyle(e){let t=e??0;this._visualStyle!==t&&(this._visualStyle=t,this._regenerateFloorCeil(),this._floorCeilBuffer=null)}resize(e,t){this.width=e,this.height=t,this.canvas.width=e,this.canvas.height=t,this.zBuffer=new Float64Array(e),this.wallTopY=new Float64Array(e),this._floorCeilBuffer=null,this.glRenderer&&this.glRenderer.resize(e,t)}_uploadFloorCeilToGL(){if(!this.glRenderer)return;let e=new Uint8ClampedArray(256*256*4),t=new Uint8ClampedArray(256*256*4);for(let n=0;n<256*256;n++){let r=n*4;e[r]=this._floorTexPixels[r],e[r+1]=this._floorTexPixels[r+1],e[r+2]=this._floorTexPixels[r+2],e[r+3]=255,t[r]=this._ceilTexPixels[r],t[r+1]=this._ceilTexPixels[r+1],t[r+2]=this._ceilTexPixels[r+2],t[r+3]=255}this.glRenderer.uploadFloorCeilTextures(e,t)}_regenerateFloorCeil(){let{floorPixels:e,ceilPixels:t}=Je(this._actPalette,this._visualStyle);this._floorTexPixels=e,this._ceilTexPixels=t}_renderFloorCeiling(e,t,n,r,i,a,o=0){let s=this.width,c=this.height,l=(c>>1)+Math.round(o),u=c>>1;(!this._floorCeilBuffer||this._floorCeilBuffer.width!==s||this._floorCeilBuffer.height!==c)&&(this._floorCeilBuffer=this.ctx.createImageData(s,c));let d=this._floorCeilBuffer.data,f=new Uint32Array(d.buffer),p=this._floorTexPixels,m=this._ceilTexPixels,h=n-i,g=r-a,_=n+i,v=r+a,y=this._actPalette||1,b=y===2?{r:20,g:10,b:4}:y===3?{r:22,g:4,b:8}:{r:8,g:18,b:30},x=this._visualStyle===1,S=x?b.r:b.r+4,C=x?b.g:b.g+4,w=x?b.b:b.b+8,T=x?.92:.7,E=255<<24|w<<16|C<<8|S;f.fill(E);let D=Math.max(1,l+1),O=c%2==0?c:c-1;for(let n=D;n<O;n+=2){let r=n-l;if(r<=0)continue;let i=u/r,a=i*(_-h)/s,o=i*(v-g)/s,d=e+i*h,y=t+i*g,b=Math.min(T,i/12),x=1-b,E=S*b,D=C*b,O=w*b,k=n*s,A=(n-1)*s;for(let e=0;e<s;e++){let t=(d*256|0)&255,r=(((y*256|0)&255)*256+t)*4;if(n<c){let t=p[r]*x+E|0,i=p[r+1]*x+D|0,a=255<<24|(p[r+2]*x+O|0)<<16|i<<8|t;f[k+e]=a,n-1>=0&&(f[A+e]=a)}let i=2*l-1-n;if(i>=0&&i<c){let t=m[r]*x+E|0,n=m[r+1]*x+D|0,a=255<<24|(m[r+2]*x+O|0)<<16|n<<8|t;f[i*s+e]=a;let o=i+1;o>=0&&o<c&&(f[o*s+e]=a)}d+=a,y+=o}}if(l>=0&&l<c){let e=l*s;for(let t=0;t<s;t++)f[e+t]=E}this.ctx.putImageData(this._floorCeilBuffer,0,0)}renderScene(e,t,n,r,i=70,a=0,o=!1,s=0){let c=this.ctx,l=this.width,u=this.height;this.zBuffer.fill(1/0),this.wallTopY.fill(-1);let d=Math.tan(i*.5*Math.PI/180),f=Math.cos(e.angle),p=Math.sin(e.angle),m=e.x,h=e.y;if(a===1){let n=1.8,r=e.x-f*n,i=e.y-p*n;for(let e=0;e<6;e++){let e=Math.floor(r),n=Math.floor(i);if(e>=0&&n>=0&&e<t.width&&n<t.height&&t.grid[n][e]===0)break;r+=f*.3,i+=p*.3}m=r,h=i}if(o){let e=(u>>1)+s,t=c.createLinearGradient(0,0,0,e);t.addColorStop(0,`#0a0a1a`),t.addColorStop(1,`#1a1a2e`),c.fillStyle=t,c.fillRect(0,0,l,e);let n=c.createLinearGradient(0,e,0,u);n.addColorStop(0,`#1a1a2e`),n.addColorStop(1,`#0d0d1a`),c.fillStyle=n,c.fillRect(0,e,l,u-e)}else if(this.useWebGL&&this.glRenderer){let e=this._actPalette||1,t=this._visualStyle===1,n=e===2?[24/255,14/255,12/255]:e===3?[26/255,8/255,16/255]:[12/255,22/255,38/255],r=t?.92:.7;this.glRenderer.renderFloorCeiling(m,h,f,p,-p*d,f*d,Math.round(s),n,r,this.lights||[]),c.drawImage(this.glRenderer.canvas,0,0)}else this._renderFloorCeiling(m,h,f,p,-p*d,f*d,s);let g=-p*d,_=f*d;for(let e=0;e<l;e++){let n=2*e/l-1,r=f+g*n,i=p+_*n,a=m|0,o=h|0,d=Math.abs(1/r),v=Math.abs(1/i),y,b,x,S;r<0?(y=-1,x=(m-a)*d):(y=1,x=(a+1-m)*d),i<0?(b=-1,S=(h-o)*v):(b=1,S=(o+1-h)*v);let C=0,w=0,T=0;for(;C===0;){if(x<S?(x+=d,a+=y,w=0):(S+=v,o+=b,w=1),a<0||o<0||a>=t.width||o>=t.height){C=1,T=1;break}t.grid[o][a]>0&&(C=1,T=t.grid[o][a])}let E;E=w===0?(a-m+(1-y)/2)/r:(o-h+(1-b)/2)/i,E<.01&&(E=.01),this.zBuffer[e]=E;let D=u/E|0,O=-D/2+u/2+s|0,k=D/2+u/2+s|0,A=1;if(t.heightMap&&a>=0&&o>=0&&a<t.width&&o<t.height){let e=t.heightMap[o]?.[a]??5;e>0&&e<5&&(A=e/5)}let j,M;if(A<1){M=k;let t=k-O;j=M-t*A|0,this.wallTopY[e]=j}else j=O,M=k,this.wallTopY[e]=-1;j<0&&(j=0),M>=u&&(M=u-1);let N;N=w===0?h+E*i:m+E*r,N-=Math.floor(N);let P=this.textures[T];if(P){let n=N*256|0;(w===0&&r>0||w===1&&i<0)&&(n=255-n);let s=256/D,l=(j-u/2+D/2)*s,d=Math.max(0,l),f=Math.min(256,(M-j)*s);f>0&&M>j&&c.drawImage(P,n,d,1,f,e,j,1,M-j),w===1&&(c.fillStyle=`rgba(0,0,0,0.3)`,c.fillRect(e,j,1,M-j));let p=this._visualStyle===1?.85:.6,g=Math.min(p,E/20);if(g>0){let[t,n,r]=this._visualStyle===1?[8,8,20]:[10,18,32];c.fillStyle=Mt(t,n,r,g),c.fillRect(e,j,1,M-j)}if(this.lights&&this.lights.length>0){let t=m+E*r,n=h+E*i,a=0,o=0,s=0;for(let e=0;e<this.lights.length;e++){let r=this.lights[e],i=r.x-t,c=r.y-n,l=i*i+c*c;if(l>=r.radius*r.radius)continue;let u=1-Math.sqrt(l)/r.radius,d=u*u*r.intensity;a+=r.color[0]*d,o+=r.color[1]*d,s+=r.color[2]*d}if(a+o+s>1){let t=Math.min(.85,Math.max(a,o,s)/255),n=Math.min(255,a|0),r=Math.min(255,o|0),i=Math.min(255,s|0),l=c.globalCompositeOperation;c.globalCompositeOperation=`lighter`,c.fillStyle=Mt(n,r,i,t),c.fillRect(e,j,1,M-j),c.globalCompositeOperation=l}}if(T!==5&&T>0&&E<15){let n=!1;w===0?(N<.12&&o>0&&t.grid[o-1][a]===5||N>.88&&o<t.height-1&&t.grid[o+1][a]===5)&&(n=!0):(N<.12&&a>0&&t.grid[o][a-1]===5||N>.88&&a<t.width-1&&t.grid[o][a+1]===5)&&(n=!0),n&&(c.fillStyle=Mt(0,180,120,Math.max(0,(1-g)*.5)),c.fillRect(e,j,1,M-j))}}}rt(i),this.renderSprites(e,n,r,d,m,h,e._drawDistance),e.particles&&this.renderParticles(e,e.particles,r,d,m,h)}renderParticles(e,t,n,r=.66,i,a){if(!t||t.length===0)return;let o=this.ctx,s=this.width,c=this.height,l=Math.cos(e.angle),u=Math.sin(e.angle),d=-u*r,f=l*r,p=i??e.x,m=a??e.y,h=c/2;for(let e=0;e<t.length;e++){let n=t[e],r=n.x-p,i=n.y-m,a=1/(d*u-l*f),g=a*(u*r-l*i),_=a*(-f*r+d*i);if(_<=.1)continue;let v=s/2*(1+g/_)|0;if(v<0||v>=s||_>this.zBuffer[v]+.1)continue;let y=Math.abs(c/_*(n.size||.05))|0,b=h+(n.z||0)*(c/_)|0;o.fillStyle=Mt(n.r??255,n.g??255,n.b??255,n.life??1),o.fillRect(v-y/2|0,b-y/2|0,Math.max(1,y),Math.max(1,y))}}_projectWorld(e,t,n,r,i,a,o=0){let s=this.width,c=this.height,l=Math.cos(e.angle),u=Math.sin(e.angle),d=-u*r,f=l*r,p=i??e.x,m=a??e.y,h=t-p,g=n-m,_=1/(d*u-l*f),v=_*(u*h-l*g),y=_*(-f*h+d*g);return y<=.1?null:{x:s/2*(1+v/y),y:c/2+c/y*o,depth:y}}renderTracers(e,t,n=.66,r,i){if(!t||t.length===0)return;let a=this.ctx,o=this.width;for(let s of t){let t=Math.max(0,s.life/s.maxLife);if(t<=0)continue;let c=-.05+Math.tan(s.pitch||0)*0,l=this._projectWorld(e,s.x1,s.y1,n,r,i,-.05),u=this._projectWorld(e,s.x2,s.y2,n,r,i,c);if(!l||!u)continue;let d=Math.max(0,Math.min(o-1,Math.floor(u.x)));u.depth>this.zBuffer[d]+.1||(a.save(),a.globalCompositeOperation=`lighter`,a.lineCap=`round`,a.globalAlpha=.35*t,a.strokeStyle=`rgba(${s.color},1)`,a.lineWidth=5,a.beginPath(),a.moveTo(l.x,l.y),a.lineTo(u.x,u.y),a.stroke(),a.globalAlpha=t,a.strokeStyle=`rgba(255,255,240,1)`,a.lineWidth=1.5,a.beginPath(),a.moveTo(l.x,l.y),a.lineTo(u.x,u.y),a.stroke(),a.restore())}}renderSprites(e,t,n,r=.66,i,a,o){let s=this.ctx,c=this.width,l=this.height,u=Math.cos(e.angle),d=Math.sin(e.angle),f=-d*r,p=u*r,m=i??e.x,h=a??e.y,g=o?o*o:1/0;t.length>Nt.length&&(Nt=new Float64Array(t.length*2),Pt=new Int32Array(t.length*2)),Ft=0;for(let e=0;e<t.length;e++){if(t[e].active===!1&&!t[e].dissolving)continue;let n=(m-t[e].x)**2+(h-t[e].y)**2;n>g&&t[e].type!==`exit`||(Pt[Ft++]=e,Nt[e]=n)}let _=Array.prototype.slice.call(Pt,0,Ft);_.sort((e,t)=>Nt[t]-Nt[e]);for(let e=0;e<_.length;e++){let r=t[_[e]],i=r.x-m,a=r.y-h,o=1/(f*d-u*p),g=o*(d*i-u*a),v=o*(-p*i+f*a);if(v<=.1)continue;let y=c/2*(1+g/v)|0,b=Math.abs(l/v)|0,x=b,S=Math.max(0,-b/2+l/2|0),C=Math.min(l-1,b/2+l/2|0),w=Math.max(0,-x/2+y|0),T=Math.min(c-1,x/2+y|0),E=!1;for(let e=w;e<=T;e++){if(v<this.zBuffer[e]){E=!0;break}if(this.wallTopY[e]>=0&&S<this.wallTopY[e]){E=!0;break}}if(E){if(r.type===`enemy`&&!r.dissolving){let e=x*.6,t=b*.12,n=Math.floor(b/2+l/2)-t*.5;s.save(),s.globalAlpha=Math.min(.35,2/v),s.fillStyle=`#000`,s.beginPath(),s.ellipse(y,n,e/2,t/2,0,0,Math.PI*2),s.fill(),s.restore()}this.drawEntity(s,r,y,S,C,w,T,x,b,v,n)}}}drawEntity(e,t,n,r,i,a,o,s,c,l,u){this.width;let d=this.height/2|0,f=this._visualStyle===1?20:30,p=Math.max(0,1-l/f);if(t.type===`enemy`)this.drawEnemy(e,t,n,r,i,a,o,s,c,l,u,p);else if(t.type===`health`)Xe(e,n,d,s,c,l,u,p);else if(t.type===`ammo`)Ze(e,n,d,s,c,l,u,p);else if(t.type===`weapon`)Qe(e,n,d,s,c,l,u,p);else if(t.type===`damage2x`||t.type===`invuln`)tt(e,n,d,s,c,l,u,p,t.type);else if(t.type===`exit`)$e(e,n,d,s,c,l,u,p);else if(t.type===`projectile`)et(e,n,d,s,l,t,u,p);else if(t.type===`prop`){e.save(),e.beginPath();for(let t=a;t<=o;t++)l<this.zBuffer[t]&&e.rect(t,r,1,i-r);e.clip(),at(e,t,n,d,s,c,l,u,p),e.restore()}}drawEnemy(e,t,n,r,i,a,o,s,c,l,u,d){let f=this.height/2|0,p=s/2,m=c/2,h=t.def;if(!h)return;let g=t.baseColor||h.color1,_=t.darkColor||h.color2;e.save(),e.beginPath();for(let t=a;t<=o;t++)l<this.zBuffer[t]&&e.rect(t,r,1,i-r);e.clip();let v=d;if(v<=0){e.restore();return}let y=f-m*.4,b=f+m*.5,x=p*.6,S=t.hitTime&&u-t.hitTime<100,C=S?`#ffffff`:g,w=S?`#ffaaaa`:_;e.globalAlpha=v;let T=1;t.dissolving&&t.dissolveTimer!=null&&(T=Math.max(0,t.dissolveTimer/.5),e.globalAlpha=v*T,T<.5&&(e.globalCompositeOperation=`lighter`));let E=Ye[t.enemyType];if(E)E(e,n,f,p,m,y,b,x,C,w,v,u,t,S);else{e.fillStyle=w,e.fillRect(n-x,y,x*2,b-y),e.fillStyle=C,e.fillRect(n-x*.7,y+(b-y)*.1,x*1.4,(b-y)*.8),e.fillStyle=`#00ffaa`;let t=x*.2;e.fillRect(n-t,y+(b-y)*.25-t/2,t*2,t),e.fillStyle=w;let r=x*.3;e.fillRect(n-x*.5,b,r,m*.3),e.fillRect(n+x*.2,b,r,m*.3)}e.globalAlpha=1,e.restore()}};function Lt(e,t,n,r){let{time:i,player:a,canvas:o}=r,s=r.postProcessing!==!1,c=r.act||1;if(r.muzzleFlashTime&&i-r.muzzleFlashTime<100){let a=.12*(1-(i-r.muzzleFlashTime)/100),o=e.globalCompositeOperation;e.globalCompositeOperation=`lighter`,e.fillStyle=`rgba(${r.muzzleFlashColor},${a})`,e.fillRect(0,0,t,n),e.globalCompositeOperation=o}s&&a.hurtTime&&i-a.hurtTime<200&&(e.fillStyle=`rgba(255,0,0,${.3*(1-(i-a.hurtTime)/200)})`,e.fillRect(0,0,t,n)),s&&a.hurtTime&&i-a.hurtTime<500&&a.lastDamageAngle!=null&&Ht(e,t,n,i,a);let l=a.health/a.maxHealth;if(a.alive&&l<.25&&l>0){let a=1-l/.25,o=a*(.5+.5*Math.sin(i*.006*(1+a)))*.35,s=e.createRadialGradient(t/2,n/2,t*.2,t/2,n/2,t*.7);s.addColorStop(0,`rgba(180,0,0,0)`),s.addColorStop(1,`rgba(180,0,0,${o})`),e.fillStyle=s,e.fillRect(0,0,t,n),l<.1&&(e.fillStyle=`rgba(128,128,128,${(1-l/.1)*.12})`,e.globalCompositeOperation=`saturation`,e.fillRect(0,0,t,n),e.globalCompositeOperation=`source-over`),r.audio?.heartbeat?.(a)}s&&r.glitchEffect>.01&&Ut(e,t,n,o,r.glitchEffect),s&&r.enableChromaticAberration!==!1&&Wt(e,t,n,o,i,a,r.glitchEffect),s&&r.enableBloom!==!1&&Yt(e,t,n,o),s&&r.enableFilmGrain!==!1&&Vt(e,t,n,i),s&&Xt(e,t,n,c),a.alive||(e.fillStyle=`rgba(80,0,0,0.5)`,e.fillRect(0,0,t,n))}var Rt=null,zt=256;function Bt(){if(Rt)return Rt;let e=typeof OffscreenCanvas<`u`?new OffscreenCanvas(zt,zt):Object.assign(document.createElement(`canvas`),{width:zt,height:zt}),t=e.getContext(`2d`),n=t.createImageData(zt,zt);for(let e=0;e<n.data.length;e+=4){let t=Math.random()*255|0;n.data[e]=n.data[e+1]=n.data[e+2]=t,n.data[e+3]=255}return t.putImageData(n,0,0),Rt=e,e}function Vt(e,t,n,r){let i=Bt(),a=r*1e-4;e.save(),e.globalAlpha=.045,e.globalCompositeOperation=`overlay`;let o=t/2,s=n/2,c=Math.max(t,n)/zt*1.5;e.setTransform(Math.cos(a)*c,Math.sin(a)*c,-Math.sin(a)*c,Math.cos(a)*c,o,s),e.drawImage(i,-zt/2,-zt/2),e.restore()}function Ht(e,t,n,r,i){let a=.6*(1-(r-i.hurtTime)/500),o=i.lastDamageAngle-i.angle;for(;o>Math.PI;)o-=Math.PI*2;for(;o<-Math.PI;)o+=Math.PI*2;let s=t/2,c=n/2,l=Math.min(t,n)*.48,u=l*.85;e.save(),e.translate(s,c),e.rotate(o),e.beginPath(),e.arc(0,0,l,-.35,.35),e.arc(0,0,u,.35,-.35,!0),e.closePath(),e.fillStyle=`rgba(255,20,0,${a})`,e.fill(),e.restore()}function Ut(e,t,n,r,i){for(let a=0;a<3;a++){let a=Math.random()*n,o=2+Math.random()*10,s=(Math.random()-.5)*30*i;e.drawImage(r,0,a,t,o,s,a,t,o)}}function Wt(e,t,n,r,i,a,o){let s=o*.5;if(a.hurtTime){let e=i-a.hurtTime;e<300&&(s+=.3*(1-e/300))}s=Math.max(0,Math.min(1,s));let c=Math.ceil(s*3);if(c<1)return;e.save(),e.globalCompositeOperation=`screen`,e.globalAlpha=s*.12,e.drawImage(r,-c,0),e.drawImage(r,c,0);let l=Math.ceil(c*.5);l>=1&&(e.globalAlpha=s*.06,e.drawImage(r,0,-l),e.drawImage(r,0,l)),e.restore()}var Gt=null,Kt=null,qt=0,Jt=0;function Yt(e,t,n,r){let i=t>>2||1,a=n>>2||1;(!Gt||qt!==i||Jt!==a)&&(Gt=typeof OffscreenCanvas<`u`?new OffscreenCanvas(i,a):Object.assign(document.createElement(`canvas`),{width:i,height:a}),Kt=Gt.getContext(`2d`),qt=i,Jt=a),Kt.drawImage(r,0,0,i,a),Kt.globalCompositeOperation=`multiply`,Kt.fillStyle=`rgb(180,180,180)`,Kt.fillRect(0,0,i,a),Kt.globalCompositeOperation=`source-over`,e.save(),e.globalCompositeOperation=`lighter`,e.globalAlpha=.18,e.drawImage(Gt,0,0,t,n),e.restore()}function Xt(e,t,n,r){let i={1:`rgba(0,40,60,0.06)`,2:`rgba(40,25,0,0.06)`,3:`rgba(40,0,10,0.06)`};e.fillStyle=i[r]||i[1],e.fillRect(0,0,t,n)}var Zt=class{constructor(){this.ctx=null,this.masterGain=null,this.musicGain=null,this.sfxGain=null,this.ambientGain=null,this.enabled=!0,this.musicEnabled=!0,this.musicOscillators=[],this._musicTimer=null,this._currentTrack=null,this._trackBeat=0,this._trackTempo=130,this._ambientTimer=null,this._ambientType=null,this._ambientNodes=[],this._lastFootstepTime=0,this._footstepCadence=350,this._footstepSide=0,this._duckLevel=0,this._duckTarget=0,this._musicBaseGain=.15,this._timeScale=1}init(){this.ctx||(this.ctx=new(window.AudioContext||window.webkitAudioContext),this.masterGain=this.ctx.createGain(),this.masterGain.gain.value=.8,this.masterGain.connect(this.ctx.destination),this.sfxGain=this.ctx.createGain(),this.sfxGain.gain.value=1,this.sfxGain.connect(this.masterGain),this.musicGain=this.ctx.createGain(),this.musicGain.gain.value=.15,this._musicBaseGain=.15,this.musicGain.connect(this.masterGain),this.ambientGain=this.ctx.createGain(),this.ambientGain.gain.value=.12,this.ambientGain.connect(this.masterGain))}resume(){this.ctx&&this.ctx.state===`suspended`&&this.ctx.resume()}playNoise(e,t,n,r=`lowpass`,i=0){if(!this.ctx||!this.enabled)return;let a=this.ctx.sampleRate*e,o=this.ctx.createBuffer(1,a,this.ctx.sampleRate),s=o.getChannelData(0);for(let e=0;e<a;e++)s[e]=Math.random()*2-1;let c=this.ctx.createBufferSource();c.buffer=o;let l=this.ctx.createBiquadFilter();l.type=r,l.frequency.value=n;let u=this.ctx.createGain();u.gain.setValueAtTime(t,this.ctx.currentTime),u.gain.exponentialRampToValueAtTime(.001,this.ctx.currentTime+e);let d=this.ctx.createStereoPanner();d.pan.value=Math.max(-1,Math.min(1,i)),c.connect(l),l.connect(u),u.connect(d),d.connect(this.sfxGain),c.onended=()=>{c.disconnect(),l.disconnect(),u.disconnect(),d.disconnect()},c.start()}playTone(e,t,n=`square`,r=.3,i=0,a=0){if(!this.ctx||!this.enabled)return;let o=this.ctx.createOscillator();o.type=n,o.frequency.value=e,o.detune.value=i;let s=this.ctx.createGain();s.gain.setValueAtTime(r,this.ctx.currentTime),s.gain.exponentialRampToValueAtTime(.001,this.ctx.currentTime+t);let c=this.ctx.createStereoPanner();c.pan.value=Math.max(-1,Math.min(1,a)),o.connect(s),s.connect(c),c.connect(this.sfxGain),o.onended=()=>{o.disconnect(),s.disconnect(),c.disconnect()},o.start(),o.stop(this.ctx.currentTime+t)}_playMusicTone(e,t,n=`sawtooth`,r=.3,i=0){if(!this.ctx||!this.musicEnabled)return;let a=this.ctx.createOscillator();a.type=n,a.frequency.value=e,a.detune.value=i;let o=this.ctx.createGain();o.gain.setValueAtTime(r,this.ctx.currentTime),o.gain.exponentialRampToValueAtTime(.001,this.ctx.currentTime+t),a.connect(o),o.connect(this.musicGain),a.onended=()=>{a.disconnect(),o.disconnect()},a.start(),a.stop(this.ctx.currentTime+t)}_playMusicNoise(e,t,n,r=`lowpass`){if(!this.ctx||!this.musicEnabled)return;let i=this.ctx.sampleRate*e,a=this.ctx.createBuffer(1,i,this.ctx.sampleRate),o=a.getChannelData(0);for(let e=0;e<i;e++)o[e]=Math.random()*2-1;let s=this.ctx.createBufferSource();s.buffer=a;let c=this.ctx.createBiquadFilter();c.type=r,c.frequency.value=n;let l=this.ctx.createGain();l.gain.setValueAtTime(t,this.ctx.currentTime),l.gain.exponentialRampToValueAtTime(.001,this.ctx.currentTime+e),s.connect(c),c.connect(l),l.connect(this.musicGain),s.onended=()=>{s.disconnect(),c.disconnect(),l.disconnect()},s.start()}calculatePan(e,t,n,r,i){let a=e-n,o=t-r,s=Math.atan2(o,a)-i;for(;s>Math.PI;)s-=Math.PI*2;for(;s<-Math.PI;)s+=Math.PI*2;return Math.sin(s)}playSpatial(e,t,n,r){r(this.calculatePan(e,t,n.x,n.y,n.angle))}playerGrunt(e={},t=`hurt`){if(!this.ctx||!this.enabled)return;let n=Math.max(.6,Math.min(1.8,e.pitch||1)),r=t===`death`?150:t===`slide`?210:190,i=t===`death`?.28:.12,a=this.ctx.currentTime,o=this.ctx.createOscillator(),s=this.ctx.createBiquadFilter(),c=this.ctx.createGain();o.type=e.id===`synthetic`?`sawtooth`:`triangle`,o.frequency.setValueAtTime(r*n,a),o.frequency.exponentialRampToValueAtTime(Math.max(40,r*n*.55),a+i),s.type=`bandpass`,s.frequency.value=e.id===`synthetic`?900:420,c.gain.setValueAtTime(t===`death`?.22:.12,a),c.gain.exponentialRampToValueAtTime(.001,a+i),o.connect(s),s.connect(c),c.connect(this.sfxGain),o.onended=()=>{o.disconnect(),s.disconnect(),c.disconnect()},o.start(a),o.stop(a+i)}_randomDetune(){return(Math.random()-.5)*100+(this._timeScale<.8?-600*(1-this._timeScale):0)}_duckMusic(){!this.ctx||!this.musicGain||(this._duckTarget=1)}updateDucking(e){if(!this.ctx||!this.musicGain)return;this._duckLevel+=(this._duckTarget-this._duckLevel)*Math.min(1,8*e),this._duckTarget*=Math.max(0,1-2*e);let t=this._musicBaseGain*(1-this._duckLevel*.7);this.musicGain.gain.setTargetAtTime(t,this.ctx.currentTime,.05)}_spatialNode(e=0,t=0){if(!this.ctx)return{gain:null,connect:()=>{}};let n=this.ctx.createGain(),r=Math.min(1,e/18);n.gain.value=Math.max(.1,1-r*.7);let i=this.ctx.createBiquadFilter();i.type=`lowpass`,i.frequency.value=8e3-r*6e3,i.Q.value=.7;let a=this.ctx.createStereoPanner();return a.pan.value=Math.max(-1,Math.min(1,t)),n.connect(i),i.connect(a),{gain:n,connect:e=>a.connect(e)}}setTimeScale(e=1){if(!this.ctx||!this.sfxGain)return;let t=this.ctx.currentTime;this._timeScale=Math.max(.25,Math.min(2,e)),e<.8?this.masterGain.gain.setTargetAtTime(.6,t,.1):this.masterGain.gain.setTargetAtTime(.8,t,.1)}shootPistol(){if(!this.ctx||!this.enabled)return;let e=this.ctx.currentTime;this.playNoise(.02,.9,3500,`bandpass`);let t=this.ctx.createOscillator();t.type=`sawtooth`,t.detune.value=this._randomDetune(),t.frequency.setValueAtTime(700,e),t.frequency.exponentialRampToValueAtTime(200,e+.08);let n=this.ctx.createGain();n.gain.setValueAtTime(.8,e),n.gain.exponentialRampToValueAtTime(.001,e+.1),t.connect(n),n.connect(this.sfxGain),t.onended=()=>{t.disconnect(),n.disconnect()},t.start(e),t.stop(e+.1);let r=this.ctx.createOscillator();r.type=`sine`,r.frequency.setValueAtTime(1800,e),r.frequency.exponentialRampToValueAtTime(900,e+.1);let i=this.ctx.createGain();i.gain.setValueAtTime(.45,e),i.gain.exponentialRampToValueAtTime(.001,e+.1),r.connect(i),i.connect(this.sfxGain),r.onended=()=>{r.disconnect(),i.disconnect()},r.start(e),r.stop(e+.1),this.playTone(120,.07,`sine`,.6),this.playNoise(.04,.5,4e3,`bandpass`),this._duckMusic()}shootShotgun(){if(!this.ctx||!this.enabled)return;let e=this.ctx.currentTime;this.playNoise(.025,1,1200,`lowpass`);let t=this.ctx.createOscillator();t.type=`sawtooth`,t.detune.value=this._randomDetune(),t.frequency.setValueAtTime(140,e),t.frequency.exponentialRampToValueAtTime(20,e+.4);let n=this.ctx.createGain();n.gain.setValueAtTime(1,e),n.gain.exponentialRampToValueAtTime(.001,e+.45),t.connect(n),n.connect(this.sfxGain),t.onended=()=>{t.disconnect(),n.disconnect()},t.start(e),t.stop(e+.45);let r=this.ctx.createOscillator();r.type=`sawtooth`,r.frequency.setValueAtTime(300,e),r.frequency.exponentialRampToValueAtTime(2e3,e+.06),r.frequency.exponentialRampToValueAtTime(60,e+.25);let i=this.ctx.createGain();i.gain.setValueAtTime(.5,e),i.gain.exponentialRampToValueAtTime(.001,e+.28),r.connect(i),i.connect(this.sfxGain),r.onended=()=>{r.disconnect(),i.disconnect()},r.start(e),r.stop(e+.28),this.playNoise(.3,1,700,`lowpass`),this.playNoise(.08,.7,5e3,`highpass`),this.playTone(25,.4,`sine`,.9),this.playTone(55,.3,`sine`,.7),this._duckMusic()}shootPlasma(){if(!this.ctx||!this.enabled)return;let e=this.ctx.currentTime;this.playNoise(.015,1,3e3,`bandpass`);let t=this.ctx.createOscillator();t.type=`sawtooth`,t.detune.value=this._randomDetune(),t.frequency.setValueAtTime(500,e),t.frequency.exponentialRampToValueAtTime(150,e+.1);let n=this.ctx.createGain();n.gain.setValueAtTime(.8,e),n.gain.exponentialRampToValueAtTime(.001,e+.12),t.connect(n),n.connect(this.sfxGain),t.onended=()=>{t.disconnect(),n.disconnect()},t.start(e),t.stop(e+.12);let r=this.ctx.createOscillator();r.type=`sine`,r.frequency.setValueAtTime(1400,e),r.frequency.exponentialRampToValueAtTime(700,e+.14);let i=this.ctx.createGain();i.gain.setValueAtTime(.5,e),i.gain.exponentialRampToValueAtTime(.001,e+.14),r.connect(i),i.connect(this.sfxGain),r.onended=()=>{r.disconnect(),i.disconnect()},r.start(e),r.stop(e+.14);let a=this.ctx.createOscillator();a.type=`sine`,a.frequency.setValueAtTime(1470,e),a.frequency.exponentialRampToValueAtTime(740,e+.14);let o=this.ctx.createGain();o.gain.setValueAtTime(.4,e),o.gain.exponentialRampToValueAtTime(.001,e+.14),a.connect(o),o.connect(this.sfxGain),a.onended=()=>{a.disconnect(),o.disconnect()},a.start(e),a.stop(e+.14),this.playNoise(.06,.6,3e3,`bandpass`),this.playTone(80,.08,`sine`,.6),this._duckMusic()}shootCannon(){if(!this.ctx||!this.enabled)return;let e=this.ctx.currentTime;this.playNoise(.02,1,1500,`lowpass`);let t=this.ctx.createOscillator();t.type=`sawtooth`,t.detune.value=this._randomDetune(),t.frequency.setValueAtTime(100,e),t.frequency.exponentialRampToValueAtTime(12,e+.7);let n=this.ctx.createGain();n.gain.setValueAtTime(1,e),n.gain.exponentialRampToValueAtTime(.001,e+.8),t.connect(n),n.connect(this.sfxGain),t.onended=()=>{t.disconnect(),n.disconnect()},t.start(e),t.stop(e+.8);let r=this.ctx.createOscillator();r.type=`sawtooth`,r.frequency.setValueAtTime(200,e),r.frequency.exponentialRampToValueAtTime(3500,e+.12),r.frequency.exponentialRampToValueAtTime(40,e+.55);let i=this.ctx.createGain();i.gain.setValueAtTime(.6,e),i.gain.exponentialRampToValueAtTime(.001,e+.55),r.connect(i),i.connect(this.sfxGain),r.onended=()=>{r.disconnect(),i.disconnect()},r.start(e),r.stop(e+.55);let a=this.ctx.createOscillator();a.type=`square`,a.frequency.setValueAtTime(60,e+.04),a.frequency.exponentialRampToValueAtTime(1800,e+.18),a.frequency.exponentialRampToValueAtTime(25,e+.6);let o=this.ctx.createGain();o.gain.setValueAtTime(.001,e),o.gain.linearRampToValueAtTime(.5,e+.06),o.gain.exponentialRampToValueAtTime(.001,e+.6),a.connect(o),o.connect(this.sfxGain),a.onended=()=>{a.disconnect(),o.disconnect()},a.start(e),a.stop(e+.6),this.playNoise(.6,1,600,`lowpass`),this.playNoise(.35,.6,7e3,`highpass`),this.playTone(18,.7,`sine`,.9),this.playTone(40,.5,`sine`,.7),this._duckMusic()}shootScattergun(){if(!this.ctx||!this.enabled)return;let e=this.ctx.currentTime;this.playNoise(.03,.9,2e3,`bandpass`),this.playNoise(.06,.7,800,`lowpass`);let t=this.ctx.createOscillator();t.type=`sawtooth`,t.detune.value=this._randomDetune(),t.frequency.setValueAtTime(400,e),t.frequency.exponentialRampToValueAtTime(80,e+.18);let n=this.ctx.createGain();n.gain.setValueAtTime(.7,e),n.gain.exponentialRampToValueAtTime(.001,e+.2),t.connect(n),n.connect(this.sfxGain),t.onended=()=>{t.disconnect(),n.disconnect()},t.start(e),t.stop(e+.2);let r=this.ctx.createOscillator();r.type=`sawtooth`,r.frequency.setValueAtTime(420,e),r.frequency.exponentialRampToValueAtTime(85,e+.18),r.detune.value=15;let i=this.ctx.createGain();i.gain.setValueAtTime(.6,e),i.gain.exponentialRampToValueAtTime(.001,e+.2),r.connect(i),i.connect(this.sfxGain),r.onended=()=>{r.disconnect(),i.disconnect()},r.start(e),r.stop(e+.2),this.playNoise(.04,.5,6e3,`highpass`),this.playTone(60,.15,`sine`,.5),this._duckMusic()}shootSniper(){if(!this.ctx||!this.enabled)return;let e=this.ctx.currentTime;this.playNoise(.01,1,5e3,`highpass`);let t=this.ctx.createOscillator();t.type=`sawtooth`,t.detune.value=this._randomDetune(),t.frequency.setValueAtTime(3e3,e),t.frequency.exponentialRampToValueAtTime(200,e+.06);let n=this.ctx.createGain();n.gain.setValueAtTime(.9,e),n.gain.exponentialRampToValueAtTime(.001,e+.08),t.connect(n),n.connect(this.sfxGain),t.onended=()=>{t.disconnect(),n.disconnect()},t.start(e),t.stop(e+.08);let r=this.ctx.createOscillator();r.type=`sine`,r.frequency.setValueAtTime(600,e+.05),r.frequency.exponentialRampToValueAtTime(1200,e+.15),r.frequency.exponentialRampToValueAtTime(300,e+.4);let i=this.ctx.createGain();i.gain.setValueAtTime(.001,e),i.gain.linearRampToValueAtTime(.35,e+.08),i.gain.exponentialRampToValueAtTime(.001,e+.4),r.connect(i),i.connect(this.sfxGain),r.onended=()=>{r.disconnect(),i.disconnect()},r.start(e),r.stop(e+.4),this.playTone(35,.25,`sine`,.8),this.playNoise(.2,.3,2e3,`bandpass`),this._duckMusic()}shootRicochet(){if(!this.ctx||!this.enabled)return;let e=this.ctx.currentTime;this.playNoise(.015,.8,4e3,`bandpass`);let t=this.ctx.createOscillator();t.type=`square`,t.detune.value=this._randomDetune(),t.frequency.setValueAtTime(1200,e),t.frequency.exponentialRampToValueAtTime(600,e+.06);let n=this.ctx.createGain();n.gain.setValueAtTime(.7,e),n.gain.exponentialRampToValueAtTime(.001,e+.08),t.connect(n),n.connect(this.sfxGain),t.onended=()=>{t.disconnect(),n.disconnect()},t.start(e),t.stop(e+.08);let r=this.ctx.createOscillator();r.type=`triangle`,r.frequency.setValueAtTime(2e3,e+.03),r.frequency.exponentialRampToValueAtTime(4e3,e+.06),r.frequency.exponentialRampToValueAtTime(1500,e+.12);let i=this.ctx.createGain();i.gain.setValueAtTime(.001,e),i.gain.linearRampToValueAtTime(.4,e+.04),i.gain.exponentialRampToValueAtTime(.001,e+.15),r.connect(i),i.connect(this.sfxGain),r.onended=()=>{r.disconnect(),i.disconnect()},r.start(e),r.stop(e+.15),this.playTone(150,.06,`sine`,.5),this._duckMusic()}shootEMP(){if(!this.ctx||!this.enabled)return;let e=this.ctx.currentTime;this.playNoise(.03,1,2500,`bandpass`);let t=this.ctx.createOscillator();t.type=`sine`,t.detune.value=this._randomDetune(),t.frequency.setValueAtTime(80,e),t.frequency.exponentialRampToValueAtTime(20,e+.3);let n=this.ctx.createGain();n.gain.setValueAtTime(.9,e),n.gain.exponentialRampToValueAtTime(.001,e+.35),t.connect(n),n.connect(this.sfxGain),t.onended=()=>{t.disconnect(),n.disconnect()},t.start(e),t.stop(e+.35);let r=this.ctx.createOscillator();r.type=`square`,r.frequency.setValueAtTime(200,e),r.frequency.linearRampToValueAtTime(800,e+.05),r.frequency.linearRampToValueAtTime(150,e+.1),r.frequency.linearRampToValueAtTime(600,e+.15),r.frequency.exponentialRampToValueAtTime(50,e+.35);let i=this.ctx.createGain();i.gain.setValueAtTime(.5,e),i.gain.exponentialRampToValueAtTime(.001,e+.35),r.connect(i),i.connect(this.sfxGain),r.onended=()=>{r.disconnect(),i.disconnect()},r.start(e),r.stop(e+.35),this.playNoise(.15,.5,7e3,`highpass`),this.playTone(440,.12,`sine`,.3),this.playTone(445,.12,`sine`,.25),this._duckMusic()}enemyShoot(e=0){this.playTone(600,.06,`sawtooth`,.2,0,e),this.playTone(450,.04,`square`,.15,0,e),this.playNoise(.05,.1,2e3,`highpass`,e)}enemyHit(e=0,t=0){if(!(!this.ctx||!this.enabled))if(t>0){let n=this._spatialNode(t,e),r=this.ctx.currentTime,i=this.ctx.createOscillator();i.type=`square`,i.frequency.setValueAtTime(300,r);let a=this.ctx.createGain();a.gain.setValueAtTime(.3,r),a.gain.exponentialRampToValueAtTime(.001,r+.08),i.connect(a),a.connect(n.gain),n.connect(this.sfxGain),i.onended=()=>{i.disconnect(),a.disconnect()},i.start(r),i.stop(r+.08);let o=this.ctx.createOscillator();o.type=`square`,o.frequency.setValueAtTime(200,r);let s=this.ctx.createGain();s.gain.setValueAtTime(.2,r),s.gain.exponentialRampToValueAtTime(.001,r+.06),o.connect(s),s.connect(n.gain),o.onended=()=>{o.disconnect(),s.disconnect()},o.start(r),o.stop(r+.06)}else this.playTone(300,.08,`square`,.3,0,e),this.playTone(200,.06,`square`,.2,0,e)}hitConfirm(e=0){if(!this.ctx||!this.enabled)return;let t=this.ctx.currentTime,n=this.ctx.createOscillator();n.type=`triangle`,n.frequency.setValueAtTime(1800,t);let r=this.ctx.createGain();r.gain.setValueAtTime(.12,t),r.gain.exponentialRampToValueAtTime(.001,t+.08);let i=this.ctx.createStereoPanner();i.pan.value=Math.max(-1,Math.min(1,e)),n.connect(r),r.connect(i),i.connect(this.sfxGain),n.onended=()=>{n.disconnect(),r.disconnect(),i.disconnect()},n.start(t),n.stop(t+.08);let a=this.ctx.createOscillator();a.type=`sine`,a.frequency.setValueAtTime(3600,t);let o=this.ctx.createGain();o.gain.setValueAtTime(.04,t),o.gain.exponentialRampToValueAtTime(.001,t+.04);let s=this.ctx.createStereoPanner();s.pan.value=Math.max(-1,Math.min(1,e)),a.connect(o),o.connect(s),s.connect(this.sfxGain),a.onended=()=>{a.disconnect(),o.disconnect(),s.disconnect()},a.start(t),a.stop(t+.04)}enemyDeath(e=0,t=0){if(!(!this.ctx||!this.enabled))if(t>0){let n=this._spatialNode(t,e),r=this.ctx.currentTime,i=this.ctx.createOscillator();i.type=`square`,i.frequency.setValueAtTime(400,r);let a=this.ctx.createGain();a.gain.setValueAtTime(.3,r),a.gain.exponentialRampToValueAtTime(.001,r+.1),i.connect(a),a.connect(n.gain),n.connect(this.sfxGain),i.onended=()=>{i.disconnect(),a.disconnect()},i.start(r),i.stop(r+.1);let o=this.ctx.createOscillator();o.type=`sawtooth`,o.frequency.setValueAtTime(200,r);let s=this.ctx.createGain();s.gain.setValueAtTime(.3,r),s.gain.exponentialRampToValueAtTime(.001,r+.15),o.connect(s),s.connect(n.gain),o.onended=()=>{o.disconnect(),s.disconnect()},o.start(r),o.stop(r+.15);let c=this.ctx.createOscillator();c.type=`sawtooth`,c.frequency.setValueAtTime(100,r);let l=this.ctx.createGain();l.gain.setValueAtTime(.2,r),l.gain.exponentialRampToValueAtTime(.001,r+.2),c.connect(l),l.connect(n.gain),c.onended=()=>{c.disconnect(),l.disconnect()},c.start(r),c.stop(r+.2)}else this.playTone(400,.1,`square`,.3,0,e),this.playTone(200,.15,`sawtooth`,.3,0,e),this.playTone(100,.2,`sawtooth`,.2,0,e)}dashSound(){if(!this.ctx||!this.enabled)return;let e=this.ctx.currentTime,t=this.ctx.createOscillator();t.type=`sawtooth`,t.frequency.setValueAtTime(800,e),t.frequency.exponentialRampToValueAtTime(200,e+.1);let n=this.ctx.createGain();n.gain.setValueAtTime(.22,e),n.gain.exponentialRampToValueAtTime(.001,e+.1),t.connect(n),n.connect(this.sfxGain),t.onended=()=>{t.disconnect(),n.disconnect()},t.start(e),t.stop(e+.1),this.playNoise(.05,.2,3e3,`bandpass`)}playerHit(){this.playTone(200,.15,`sawtooth`,.4),this.playNoise(.1,.3,1e3,`lowpass`)}playerDeath(){this.playTone(300,.2,`sawtooth`,.5),this.playTone(150,.4,`sawtooth`,.4),this.playTone(75,.6,`sawtooth`,.3)}pickup(){this.playTone(523,.08,`square`,.2),setTimeout(()=>this.playTone(659,.08,`square`,.2),80),setTimeout(()=>this.playTone(784,.12,`square`,.2),160)}doorOpen(){this.playNoise(.3,.3,500,`lowpass`),this.playTone(100,.3,`sawtooth`,.2)}secretFound(){this.playTone(440,.1,`sine`,.3),setTimeout(()=>this.playTone(554,.1,`sine`,.3),100),setTimeout(()=>this.playTone(659,.1,`sine`,.3),200),setTimeout(()=>this.playTone(880,.2,`sine`,.3),300)}timerWarning(){this.playTone(880,.1,`square`,.3)}roundComplete(){[523,659,784,1047].forEach((e,t)=>{setTimeout(()=>this.playTone(e,.2,`square`,.25),t*150)})}menuSelect(){this.playTone(600,.06,`square`,.2)}menuConfirm(){this.playTone(800,.05,`square`,.2),setTimeout(()=>this.playTone(1e3,.08,`square`,.2),60)}menuNav(){this.playTone(500,.04,`square`,.15)}updateFootsteps(e,t){if(!this.ctx||!this.enabled||!e||t-this._lastFootstepTime<this._footstepCadence)return;this._lastFootstepTime=t,this._footstepSide^=1;let n=this._footstepSide?-.15:.15;this.playNoise(.06,.15,400,`lowpass`,n),this.playTone(90+Math.random()*30,.04,`triangle`,.07,0,n)}setFootstepCadence(e){this._footstepCadence=Math.max(150,350/Math.max(.5,e))}heartbeat(e=.5){if(!this.ctx||!this.enabled)return;let t=this.ctx.currentTime,n=.8-e*.4;if(this._lastHeartbeat&&t-this._lastHeartbeat<n)return;this._lastHeartbeat=t;let r=.08+e*.15,i=t,a=this.ctx.createOscillator();a.type=`sine`,a.frequency.setValueAtTime(60,i),a.frequency.exponentialRampToValueAtTime(45,i+.1);let o=this.ctx.createGain();o.gain.setValueAtTime(.001,i),o.gain.linearRampToValueAtTime(r,i+.01),o.gain.exponentialRampToValueAtTime(.001,i+.1),a.connect(o),o.connect(this.sfxGain),a.onended=()=>{a.disconnect(),o.disconnect()},a.start(i),a.stop(i+.1);let s=i+.12,c=this.ctx.createOscillator();c.type=`sine`,c.frequency.setValueAtTime(55,s),c.frequency.exponentialRampToValueAtTime(40,s+.08);let l=this.ctx.createGain();l.gain.setValueAtTime(.001,s),l.gain.linearRampToValueAtTime(r*.7,s+.01),l.gain.exponentialRampToValueAtTime(.001,s+.08),c.connect(l),l.connect(this.sfxGain),c.onended=()=>{c.disconnect(),l.disconnect()},c.start(s),c.stop(s+.08)}meltdownJump(){!this.ctx||!this.enabled||(this.playTone(300,.08,`square`,.25),this.playTone(500,.06,`sine`,.2))}meltdownHit(){!this.ctx||!this.enabled||(this.playNoise(.08,.5,800,`lowpass`),this.playTone(150,.12,`sawtooth`,.35))}meltdownCollect(){!this.ctx||!this.enabled||(this.playTone(880,.05,`square`,.2),setTimeout(()=>this.playTone(1100,.06,`square`,.2),50))}meltdownDeath(){!this.ctx||!this.enabled||(this.playTone(400,.15,`sawtooth`,.4),this.playTone(200,.25,`sawtooth`,.35),this.playTone(100,.4,`sawtooth`,.25),this.playNoise(.3,.3,600,`lowpass`))}meltdownSpeedUp(){!this.ctx||!this.enabled||(this.playTone(660,.06,`square`,.2),setTimeout(()=>this.playTone(880,.06,`square`,.2),60),setTimeout(()=>this.playTone(1100,.08,`square`,.2),120))}startTrack(e,t){if(!this.ctx||!this.musicEnabled)return;let n=t||this._defaultTempo(e);if(this._currentTrack===e&&this._trackTempo===n&&this._musicTimer)return;this.stopMusic(),this._currentTrack=e,this._trackTempo=n,this._trackBeat=0;let r=60/this._trackTempo,i=()=>{this.musicEnabled&&(this._dispatchBeat(e,this._trackBeat,r),this._trackBeat++,this._musicTimer=setTimeout(i,r*1e3))};i()}_defaultTempo(e){return{campaign:130,arena:145,boss:155,menu:90,meltdown:160}[e]||130}_dispatchBeat(e,t,n){switch(e){case`campaign`:this._beatCampaign(t,n);break;case`arena`:this._beatArena(t,n);break;case`boss`:this._beatBoss(t,n);break;case`menu`:this._beatMenu(t,n);break;case`meltdown`:this._beatMeltdown(t,n);break;default:this._beatCampaign(t,n)}}_beatCampaign(e,t){let n=[55,55,65,55,73,55,65,82],r=n[e%n.length],i=this.ctx.createOscillator();i.type=`sawtooth`,i.frequency.value=r;let a=this.ctx.createGain();a.gain.setValueAtTime(.3,this.ctx.currentTime),a.gain.exponentialRampToValueAtTime(.001,this.ctx.currentTime+t*.8),i.connect(a),a.connect(this.musicGain),i.onended=()=>{i.disconnect(),a.disconnect()},i.start(),i.stop(this.ctx.currentTime+t*.8),e%2==0&&this._musicHiHat(.05,.15),e%4==0&&this._musicKick(150,.5),e%4==2&&this._musicSnare(.2);let o=[220,261,294,330,392,330,294,261];e%2==0&&this._playMusicTone(o[Math.floor(e/2)%o.length],t*.6,`square`,.08),e%8==0&&(this._playMusicTone(110,t*4,`sine`,.06),this._playMusicTone(165,t*4,`sine`,.04))}_beatArena(e,t){let n=[55,55,82,55,73,98,73,110],r=n[e%n.length],i=this.ctx.createOscillator();i.type=`sawtooth`,i.frequency.value=r;let a=this.ctx.createGain();a.gain.setValueAtTime(.35,this.ctx.currentTime),a.gain.exponentialRampToValueAtTime(.001,this.ctx.currentTime+t*.7),i.connect(a),a.connect(this.musicGain),i.onended=()=>{i.disconnect(),a.disconnect()},i.start(),i.stop(this.ctx.currentTime+t*.7),this._musicHiHat(.04,.18),e%2==0&&this._musicKick(160,.55),e%4==2&&this._musicSnare(.25),e%4==0&&(this._playMusicTone(220,t*.3,`sawtooth`,.12),this._playMusicTone(330,t*.3,`sawtooth`,.08)),e%16<4&&e%2==0&&this._playMusicTone(330+e%16*55,t*.5,`square`,.06)}_beatBoss(e,t){let n=[55,55,78,55,55,78,82,78],r=n[e%n.length],i=this.ctx.createOscillator();i.type=`sawtooth`,i.frequency.value=r;let a=this.ctx.createGain();a.gain.setValueAtTime(.38,this.ctx.currentTime),a.gain.exponentialRampToValueAtTime(.001,this.ctx.currentTime+t*.6),i.connect(a),a.connect(this.musicGain),i.onended=()=>{i.disconnect(),a.disconnect()},i.start(),i.stop(this.ctx.currentTime+t*.6),this._musicKick(170,.6),this._musicHiHat(.04,e%2==1?.22:.12),e%4==2&&this._musicSnare(.3),e%2==0&&(this._playMusicTone(220,t*.25,`square`,.1),this._playMusicTone(311,t*.25,`square`,.08)),e%8>=4&&this._playMusicTone([440,392,311,220][e%4],t*.4,`sawtooth`,.07),e%4==0&&this._playMusicTone(27.5,t*2,`sine`,.15)}_beatMenu(e,t){let n=[220,261,330,392,440,392,330,261];this._playMusicTone(n[e%n.length],t*1.5,`sine`,.1),e%8==0&&(this._playMusicTone(110,t*6,`sine`,.05),this._playMusicTone(165,t*6,`sine`,.04),this._playMusicTone(196,t*6,`sine`,.03)),e%4==0&&this._musicKick(80,.15),e%2==0&&this._musicHiHat(.03,.06)}_beatMeltdown(e,t){let n=[55,65,73,82,98,110,98,82],r=n[e%n.length],i=this.ctx.createOscillator();i.type=`sawtooth`,i.frequency.value=r;let a=this.ctx.createGain();a.gain.setValueAtTime(.32,this.ctx.currentTime),a.gain.exponentialRampToValueAtTime(.001,this.ctx.currentTime+t*.5),i.connect(a),a.connect(this.musicGain),i.onended=()=>{i.disconnect(),a.disconnect()},i.start(),i.stop(this.ctx.currentTime+t*.5),this._musicHiHat(.03,.16),this._musicKick(160,.5),e%4==2&&this._musicSnare(.22);let o=[440,523,440,523,392,440,392,349];e%2==0&&this._playMusicTone(o[Math.floor(e/2)%o.length],t*.3,`square`,.07),e%8==0&&this._playMusicNoise(t*.2,.1,3e3,`bandpass`)}_musicHiHat(e,t){if(!this.ctx||!this.musicEnabled)return;let n=this.ctx.sampleRate*e,r=this.ctx.createBuffer(1,n,this.ctx.sampleRate),i=r.getChannelData(0);for(let e=0;e<n;e++)i[e]=Math.random()*2-1;let a=this.ctx.createBufferSource();a.buffer=r;let o=this.ctx.createGain();o.gain.setValueAtTime(t,this.ctx.currentTime),o.gain.exponentialRampToValueAtTime(.001,this.ctx.currentTime+e);let s=this.ctx.createBiquadFilter();s.type=`highpass`,s.frequency.value=8e3,a.connect(s),s.connect(o),o.connect(this.musicGain),a.onended=()=>{a.disconnect(),s.disconnect(),o.disconnect()},a.start()}_musicKick(e,t){if(!this.ctx||!this.musicEnabled)return;let n=this.ctx.createOscillator();n.type=`sine`,n.frequency.setValueAtTime(e,this.ctx.currentTime),n.frequency.exponentialRampToValueAtTime(30,this.ctx.currentTime+.15);let r=this.ctx.createGain();r.gain.setValueAtTime(t,this.ctx.currentTime),r.gain.exponentialRampToValueAtTime(.001,this.ctx.currentTime+.15),n.connect(r),r.connect(this.musicGain),n.onended=()=>{n.disconnect(),r.disconnect()},n.start(),n.stop(this.ctx.currentTime+.15)}_musicSnare(e){if(!this.ctx||!this.musicEnabled)return;let t=this.ctx.sampleRate*.1,n=this.ctx.createBuffer(1,t,this.ctx.sampleRate),r=n.getChannelData(0);for(let e=0;e<t;e++)r[e]=Math.random()*2-1;let i=this.ctx.createBufferSource();i.buffer=n;let a=this.ctx.createGain();a.gain.setValueAtTime(e,this.ctx.currentTime),a.gain.exponentialRampToValueAtTime(.001,this.ctx.currentTime+.1);let o=this.ctx.createBiquadFilter();o.type=`bandpass`,o.frequency.value=3e3,i.connect(o),o.connect(a),a.connect(this.musicGain),i.onended=()=>{i.disconnect(),o.disconnect(),a.disconnect()},i.start();let s=this.ctx.createOscillator();s.type=`triangle`,s.frequency.setValueAtTime(200,this.ctx.currentTime),s.frequency.exponentialRampToValueAtTime(100,this.ctx.currentTime+.05);let c=this.ctx.createGain();c.gain.setValueAtTime(e*.5,this.ctx.currentTime),c.gain.exponentialRampToValueAtTime(.001,this.ctx.currentTime+.06),s.connect(c),c.connect(this.musicGain),s.onended=()=>{s.disconnect(),c.disconnect()},s.start(),s.stop(this.ctx.currentTime+.06)}startAmbient(e){if(!this.ctx||!this.enabled||this._ambientType===e&&this._ambientTimer)return;this.stopAmbient(),this._ambientType=e;let t=()=>{!this.enabled||this._ambientType!==e||(this._ambientPulse(e),this._ambientTimer=setTimeout(t,(e===`menu`?3e3:2e3)+Math.random()*1e3))};t()}stopAmbient(){this._ambientTimer&&(clearTimeout(this._ambientTimer),this._ambientTimer=null),this._ambientType=null;for(let e of this._ambientNodes)try{e.disconnect()}catch{}this._ambientNodes=[]}_ambientPulse(e){switch(e){case`industrial`:this._ambientIndustrial();break;case`arena`:this._ambientArena();break;case`meltdown`:this._ambientMeltdown();break;case`menu`:this._ambientMenu();break}}_ambientIndustrial(){let e=this.ctx.sampleRate*2,t=this.ctx.createBuffer(1,e,this.ctx.sampleRate),n=t.getChannelData(0);for(let t=0;t<e;t++)n[t]=Math.random()*2-1;let r=this.ctx.createBufferSource();r.buffer=t;let i=this.ctx.createBiquadFilter();i.type=`lowpass`,i.frequency.value=120;let a=this.ctx.createGain();if(a.gain.setValueAtTime(.08,this.ctx.currentTime),a.gain.setValueAtTime(.08,this.ctx.currentTime+1.5),a.gain.exponentialRampToValueAtTime(.001,this.ctx.currentTime+2),r.connect(i),i.connect(a),a.connect(this.ambientGain),r.onended=()=>{r.disconnect(),i.disconnect(),a.disconnect()},r.start(),Math.random()<.3){let e=Math.random()*1500;setTimeout(()=>{if(!this.ctx||!this.enabled)return;let e=(Math.random()-.5)*1.6,t=800+Math.random()*600,n=this.ctx.createOscillator();n.type=`triangle`,n.frequency.setValueAtTime(t,this.ctx.currentTime),n.frequency.exponentialRampToValueAtTime(t*.3,this.ctx.currentTime+.15);let r=this.ctx.createGain();r.gain.setValueAtTime(.06,this.ctx.currentTime),r.gain.exponentialRampToValueAtTime(.001,this.ctx.currentTime+.2);let i=this.ctx.createStereoPanner();i.pan.value=Math.max(-1,Math.min(1,e)),n.connect(r),r.connect(i),i.connect(this.ambientGain),n.onended=()=>{n.disconnect(),r.disconnect(),i.disconnect()},n.start(),n.stop(this.ctx.currentTime+.2)},e)}}_ambientArena(){let e=this.ctx.sampleRate*2.5,t=this.ctx.createBuffer(1,e,this.ctx.sampleRate),n=t.getChannelData(0);for(let t=0;t<e;t++)n[t]=Math.random()*2-1;let r=this.ctx.createBufferSource();r.buffer=t;let i=this.ctx.createBiquadFilter();i.type=`bandpass`,i.frequency.value=400,i.Q.value=.5;let a=this.ctx.createGain();a.gain.setValueAtTime(.04,this.ctx.currentTime),a.gain.setValueAtTime(.04,this.ctx.currentTime+2),a.gain.exponentialRampToValueAtTime(.001,this.ctx.currentTime+2.5),r.connect(i),i.connect(a),a.connect(this.ambientGain),r.onended=()=>{r.disconnect(),i.disconnect(),a.disconnect()},r.start(),Math.random()<.2&&setTimeout(()=>{if(!this.ctx||!this.enabled)return;let e=this.ctx.createOscillator();e.type=`sine`,e.frequency.setValueAtTime(500,this.ctx.currentTime),e.frequency.linearRampToValueAtTime(700,this.ctx.currentTime+.8),e.frequency.linearRampToValueAtTime(500,this.ctx.currentTime+1.6);let t=this.ctx.createGain();t.gain.setValueAtTime(.02,this.ctx.currentTime),t.gain.exponentialRampToValueAtTime(.001,this.ctx.currentTime+1.8),e.connect(t),t.connect(this.ambientGain),e.onended=()=>{e.disconnect(),t.disconnect()},e.start(),e.stop(this.ctx.currentTime+1.8)},Math.random()*1e3)}_ambientMeltdown(){let e=this.ctx.currentTime,t=this.ctx.createOscillator();t.type=`square`,t.frequency.setValueAtTime(600,e),t.frequency.setValueAtTime(800,e+.4),t.frequency.setValueAtTime(600,e+.8),t.frequency.setValueAtTime(800,e+1.2);let n=this.ctx.createGain();n.gain.setValueAtTime(.03,e),n.gain.setValueAtTime(.03,e+1.4),n.gain.exponentialRampToValueAtTime(.001,e+1.6),t.connect(n),n.connect(this.ambientGain),t.onended=()=>{t.disconnect(),n.disconnect()},t.start(e),t.stop(e+1.6);let r=this.ctx.sampleRate*2,i=this.ctx.createBuffer(1,r,this.ctx.sampleRate),a=i.getChannelData(0);for(let e=0;e<r;e++)a[e]=Math.random()*2-1;let o=this.ctx.createBufferSource();o.buffer=i;let s=this.ctx.createBiquadFilter();s.type=`lowpass`,s.frequency.value=100;let c=this.ctx.createGain();c.gain.setValueAtTime(.06,e),c.gain.exponentialRampToValueAtTime(.001,e+2),o.connect(s),s.connect(c),c.connect(this.ambientGain),o.onended=()=>{o.disconnect(),s.disconnect(),c.disconnect()},o.start()}_ambientMenu(){let e=this.ctx.createOscillator();e.type=`sine`,e.frequency.value=60;let t=this.ctx.createGain();if(t.gain.setValueAtTime(.02,this.ctx.currentTime),t.gain.setValueAtTime(.02,this.ctx.currentTime+2.5),t.gain.exponentialRampToValueAtTime(.001,this.ctx.currentTime+3),e.connect(t),t.connect(this.ambientGain),e.onended=()=>{e.disconnect(),t.disconnect()},e.start(),e.stop(this.ctx.currentTime+3),Math.random()<.5){let e=this.ctx.sampleRate*3,t=this.ctx.createBuffer(1,e,this.ctx.sampleRate),n=t.getChannelData(0);for(let t=0;t<e;t++)n[t]=Math.random()*2-1;let r=this.ctx.createBufferSource();r.buffer=t;let i=this.ctx.createBiquadFilter();i.type=`bandpass`,i.frequency.value=200+Math.random()*200,i.Q.value=2;let a=this.ctx.createGain();a.gain.setValueAtTime(.001,this.ctx.currentTime),a.gain.linearRampToValueAtTime(.015,this.ctx.currentTime+1),a.gain.exponentialRampToValueAtTime(.001,this.ctx.currentTime+3),r.connect(i),i.connect(a),a.connect(this.ambientGain),r.onended=()=>{r.disconnect(),i.disconnect(),a.disconnect()},r.start()}}startMusic(e=140){this.startTrack(`campaign`,e)}setVolume(e){this.masterGain&&(this.masterGain.gain.value=Math.max(0,Math.min(1,e)))}setMusicVolume(e){if(this.musicGain){let t=Math.max(0,Math.min(1,e*.15));this.musicGain.gain.value=t,this._musicBaseGain=t}}setSfxVolume(e){this.sfxGain&&(this.sfxGain.gain.value=Math.max(0,Math.min(1,e)))}setAmbientVolume(e){this.ambientGain&&(this.ambientGain.gain.value=Math.max(0,Math.min(1,e*.12)))}stopMusic(){this._musicTimer&&(clearTimeout(this._musicTimer),this._musicTimer=null),this._currentTrack=null,this.stopAmbient()}alarmKlaxon(){if(!this.ctx)return;let e=this.ctx.currentTime,t=this.ctx.createOscillator();t.type=`square`,t.frequency.setValueAtTime(600,e),t.frequency.setValueAtTime(800,e+.4),t.frequency.setValueAtTime(600,e+.8),t.frequency.setValueAtTime(800,e+1.2);let n=this.ctx.createGain();n.gain.setValueAtTime(.05,e),n.gain.setValueAtTime(.05,e+1.4),n.gain.exponentialRampToValueAtTime(.001,e+1.6),t.connect(n),n.connect(this.sfxGain),t.onended=()=>{t.disconnect(),n.disconnect()},t.start(e),t.stop(e+1.6)}stopAll(){this.stopMusic()}};function Qt(e){"@babel/helpers - typeof";return Qt=typeof Symbol==`function`&&typeof Symbol.iterator==`symbol`?function(e){return typeof e}:function(e){return e&&typeof Symbol==`function`&&e.constructor===Symbol&&e!==Symbol.prototype?`symbol`:typeof e},Qt(e)}function $t(e,t){if(Qt(e)!=`object`||!e)return e;var n=e[Symbol.toPrimitive];if(n!==void 0){var r=n.call(e,t||`default`);if(Qt(r)!=`object`)return r;throw TypeError(`@@toPrimitive must return a primitive value.`)}return(t===`string`?String:Number)(e)}function en(e){var t=$t(e,`string`);return Qt(t)==`symbol`?t:t+``}function tn(e,t,n){return(t=en(t))in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}var nn=class e{constructor(e=2,t=2,n=0){this.reset(e,t,n)}reset(e=2,t=2,n=0){this.x=e,this.y=t,this.angle=n,this.aimOffsetX=0,this.aimOffsetY=0,this.health=100,this.maxHealth=100,this.armor=0,this.ammo=50,this.moveSpeed=3.5,this.rotSpeed=3,this.weapons=[0],this.currentWeapon=0,this.damageMultiplier=1,this.regenRate=0,this.critChance=0,this.lifeSteal=0,this.splashDamage=0,this.fireRateMultiplier=1,this.dodgeChance=0,this.maxShield=0,this.shield=0,this.multiShot=1,this.thorns=0,this.score=0,this.kills=0,this.secretsFound=0,this.lastFireTime=0,this.isFiring=!1,this.isAiming=!1,this.weaponBob=0,this.weaponKick=0,this.weaponSwayX=0,this.weaponSwayY=0,this.weaponSwayTargetX=0,this.weaponSwayTargetY=0,this.cameraPunch=0,this.hurtTime=0,this.alive=!0,this.stamina=100,this.maxStamina=100,this.isSprinting=!1,this.isDashing=!1,this.isCrouching=!1,this.isSliding=!1,this.slideTime=0,this.slideDirX=0,this.slideDirY=0,this.slideCooldown=0,this.slideDuration=.6,this.slideSpeedMult=3,this.slideStaminaCost=18,this.dashTime=0,this.dashDirX=0,this.dashDirY=0,this.dashCooldown=0,this.staminaRegenDelay=0,this.staminaRegenRate=1,this.dashDistMult=1,this.dashStaminaCost=20,this.sprintDrainMult=1,this.chronoEnergy=100/2,this.maxChronoEnergy=100,this.chronoActive=!1,this.particles=[]}getWeaponDef(){return s[this.weapons[this.currentWeapon]]}serialize(){let t={};for(let n of e.SAVE_FIELDS)t[n]=this[n];return t}deserialize(t){for(let n of e.SAVE_FIELDS)n in t&&(this[n]=t[n])}};tn(nn,`SAVE_FIELDS`,`health.maxHealth.armor.ammo.weapons.currentWeapon.moveSpeed.damageMultiplier.regenRate.critChance.lifeSteal.splashDamage.fireRateMultiplier.dodgeChance.maxShield.shield.multiShot.thorns.score.kills.secretsFound.staminaRegenRate.dashDistMult.dashStaminaCost.sprintDrainMult.chronoEnergy.maxChronoEnergy.aimOffsetX.aimOffsetY`.split(`.`));var W=class{constructor(e,t,n){let r=m[n];this.x=e,this.y=t,this.enemyType=n,this.def=r,this.health=r.health,this.maxHealth=r.health,this.speed=r.speed,this.state=`idle`,this.active=!0,this.lastAttackTime=0,this.hitTime=0,this.stateTime=0,this.type=`enemy`,this.angle=Math.random()*Se,this.painTimer=0,this.alertRange=r.sightRange,this.chronoMultiplier=Number.isFinite(r.chronoMultiplier)?r.chronoMultiplier:.15}},rn=class{constructor(e,t,n,r={}){this.x=e,this.y=t,this.type=n,this.active=!0,this.weaponId=r.weaponId}},an=class{constructor(e,t,n){this.x=e,this.y=t,this.type=`prop`,this.propType=n,this.active=!0}},on=class{constructor(e,t,n,r,i,a,o){this.x=e,this.y=t,this.dirX=n,this.dirY=r,this.originX=e,this.originY=t,this.damage=i,this.speed=a,this.owner=o,this.type=`projectile`,this.active=!0,this.color=`#ff0044`,this.pitch=0,this.life=3}},sn=[{key:`raycast`,label:`ray`,color:`rgba(0,100,255,0.5)`},{key:`vignette`,label:`vig`,color:`rgba(0,60,180,0.4)`},{key:`weapon`,label:`wpn`,color:`rgba(80,80,255,0.4)`},{key:`effects`,label:`fx`,color:`rgba(120,40,200,0.4)`},{key:`hud`,label:`hud`,color:`rgba(200,200,0,0.4)`},{key:`overlays`,label:`ovr`,color:`rgba(180,120,0,0.4)`}],cn=[{key:`player`,label:`plr`,color:`rgba(0,255,100,0.5)`},{key:`enemies`,label:`ent`,color:`rgba(0,200,60,0.4)`},{key:`projectiles`,label:`prj`,color:`rgba(0,160,40,0.4)`},{key:`pickups`,label:`pkp`,color:`rgba(0,120,30,0.4)`},{key:`misc`,label:`msc`,color:`rgba(0,80,20,0.3)`}],G=120,ln=class{constructor(){this.frameHistory=new Float64Array(G),this.updateHistory=new Float64Array(G),this.renderHistory=new Float64Array(G),this.entityHistory=new Uint16Array(G),this.historyIdx=0,this.historyLen=0,this.phaseHistory={};for(let e of[...sn,...cn])this.phaseHistory[e.key]=new Float64Array(G);this.avgFps=60,this.avgUpdate=0,this.avgRender=0,this.avgPhases={};for(let e of[...sn,...cn])this.avgPhases[e.key]=0;this.targetFps=60,this.frameBudgetMs=1e3/60,this.lastFrameTime=performance.now(),this.peakUpdate=0,this.peakRender=0,this.peakFrame=0,this.currentPhases={}}recordFrame(e,t,n){let r=performance.now(),i=r-this.lastFrameTime;this.lastFrameTime=r;let a=this.historyIdx%G;this.frameHistory[a]=i,this.updateHistory[a]=e,this.renderHistory[a]=t,this.entityHistory[a]=n;for(let e of[...sn,...cn]){let t=this.currentPhases[e.key]||0;this.phaseHistory[e.key][a]=t,this.avgPhases[e.key]=this.avgPhases[e.key]*.9+t*.1}this.currentPhases={},this.historyIdx++,this.historyLen=Math.min(this.historyLen+1,G),this.avgFps=this.avgFps*.9+1e3/Math.max(i,.1)*.1,this.avgUpdate=this.avgUpdate*.9+e*.1,this.avgRender=this.avgRender*.9+t*.1,this.peakUpdate=Math.max(this.peakUpdate,e),this.peakRender=Math.max(this.peakRender,t),this.peakFrame=Math.max(this.peakFrame,i),this.historyIdx%G===0&&(this.peakUpdate=0,this.peakRender=0,this.peakFrame=0)}getSnapshot(){let e={};for(let t of[...sn,...cn])e[t.key]=+this.avgPhases[t.key].toFixed(2);return{fps:Math.round(this.avgFps),updateMs:+this.avgUpdate.toFixed(2),renderMs:+this.avgRender.toFixed(2),peakFrame:+this.peakFrame.toFixed(2),peakUpdate:+this.peakUpdate.toFixed(2),peakRender:+this.peakRender.toFixed(2),phases:e}}render(e,t,n,r,i){e.fillStyle=`rgba(0, 0, 0, 0.8)`,e.fillRect(t,n,r,i);let a=Math.round(this.avgFps);e.font=`bold 16px monospace`,e.textBaseline=`top`,e.fillStyle=a>=55?`#0f0`:a>=30?`#ff0`:`#f00`,e.fillText(`${a} FPS`,t+4,n+2),e.font=`9px monospace`,e.fillStyle=`#aaa`;let o=this.entityHistory[(this.historyIdx-1+G)%G]||0;e.fillText(`upd: ${this.avgUpdate.toFixed(1)}ms  rnd: ${this.avgRender.toFixed(1)}ms  ent: ${o}`,t+80,n+6);let s=n+20;e.font=`8px monospace`,e.fillStyle=`#68f`,e.fillText(`RENDER`,t+4,s),s+=9;for(let n of sn){let r=this.avgPhases[n.key],i=r/Math.max(this.avgRender,.01)*100;e.fillStyle=r>4?`#f88`:r>2?`#ff8`:`#8f8`,e.fillText(`${n.label}: ${r.toFixed(1)}ms (${i.toFixed(0)}%)`,t+8,s),s+=9}s+=2,e.fillStyle=`#6f8`,e.fillText(`UPDATE`,t+4,s),s+=9;for(let n of cn){let r=this.avgPhases[n.key],i=r/Math.max(this.avgUpdate,.01)*100;e.fillStyle=r>4?`#f88`:r>2?`#ff8`:`#8f8`,e.fillText(`${n.label}: ${r.toFixed(1)}ms (${i.toFixed(0)}%)`,t+8,s),s+=9}s+=2,e.fillStyle=`#888`,e.fillText(`peak: ${this.peakFrame.toFixed(1)}ms (upd:${this.peakUpdate.toFixed(1)} rnd:${this.peakRender.toFixed(1)})`,t+4,s);let c=s+12,l=n+i-c-4,u=r-8,d=t+4;if(l<10){e.strokeStyle=`#333`,e.strokeRect(t,n,r,i);return}if(e.strokeStyle=`#0f03`,e.beginPath(),e.moveTo(d,c+l*(1-60/120)),e.lineTo(d+u,c+l*(1-60/120)),e.stroke(),e.strokeStyle=`#f003`,e.beginPath(),e.moveTo(d,c+l*(1-30/120)),e.lineTo(d+u,c+l*(1-30/120)),e.stroke(),this.historyLen>1){let t=u/(G-1);for(let n=0;n<this.historyLen;n++){let r=(this.historyIdx-this.historyLen+n+G)%G,i=0;for(let a of sn){let o=this.phaseHistory[a.key][r]/this.frameBudgetMs*l;e.fillStyle=a.color,e.fillRect(d+n*t,c+l-i-o,Math.max(t-1,1),o),i+=o}for(let a of cn){let o=this.phaseHistory[a.key][r]/this.frameBudgetMs*l;e.fillStyle=a.color,e.fillRect(d+n*t,c+l-i-o,Math.max(t-1,1),o),i+=o}}e.strokeStyle=`#0f0`,e.lineWidth=1,e.beginPath();for(let n=0;n<this.historyLen;n++){let r=(this.historyIdx-this.historyLen+n+G)%G,i=1e3/Math.max(this.frameHistory[r],.1),a=c+l*(1-Math.min(i,120)/120);n===0?e.moveTo(d+n*t,a):e.lineTo(d+n*t,a)}e.stroke()}e.strokeStyle=`#333`,e.strokeRect(t,n,r,i)}},un=[`Gameplay`,`Display`,`Performance`,`Audio`,`Controls`,`Gamepad`,`Accessibility`,`HUD`,`Mobile`],dn=[{key:`difficulty`,label:`Difficulty`,category:`Gameplay`,type:`enum`,values:[`Easy`,`Normal`,`Hard`,`Nightmare`],colors:[`#44ff44`,`#00ccff`,`#ffaa00`,`#ff2200`],min:0,max:3,step:1,wrap:!0,platform:`all`,height:{compact:30,normal:44}},{key:`cutsceneAutoAdvance`,label:`Cutscene Auto-Advance`,category:`Gameplay`,type:`toggle`,onColor:`#ffaa00`,platform:`all`,height:{compact:30,normal:44}},{key:`crosshair`,label:`Crosshair`,category:`Gameplay`,type:`enum`,values:[`Red Dot`,`Green Cross`,`ACOG Scope`,`Circle`,`Minimal`,`None`],min:0,max:5,step:1,wrap:!0,platform:`all`,height:{compact:50,normal:70},widget:`crosshairPreview`},{key:`minimapSize`,label:`Minimap Size`,category:`Display`,type:`slider`,min:100,max:300,step:20,format:e=>`${e}px`,barColor:()=>`#00ccff`,platform:`all`,height:{compact:42,normal:60}},{key:`visualStyle`,label:`Visual Style`,category:`Display`,type:`enum`,values:[`Clockwork`,`Brutal`],colors:[`#00ccff`,`#ff4422`],min:0,max:1,step:1,wrap:!0,platform:`all`,height:{compact:30,normal:44},onChange:e=>{e.renderer&&e.renderer.applyVisualStyle(e.settings.visualStyle)}},{key:`graphicsPreset`,label:`Graphics Preset`,category:`Performance`,type:`enum`,values:[`Auto`,`Ultra-Low`,`Low`,`Medium`,`High`,`Ultra`,`Custom`],colors:[`#00ffcc`,`#666688`,`#88aacc`,`#00ccff`,`#44ffaa`,`#ffaa00`,`#cc88ff`],min:0,max:6,step:1,wrap:!0,platform:`all`,height:{compact:30,normal:44},onChange:e=>e.applyPerformanceSettings?.()},{key:`frameTarget`,label:`Frame Target`,category:`Performance`,type:`enum`,values:[`Auto`,`30 FPS`,`60 FPS`,`90 FPS`,`120 FPS`],colors:[`#00ffcc`,`#88aacc`,`#00ccff`,`#44ffaa`,`#ffaa00`],min:0,max:4,step:1,wrap:!0,platform:`all`,height:{compact:30,normal:44},onChange:e=>e.applyPerformanceSettings?.()},{key:`batterySaver`,label:`Battery Saver`,category:`Performance`,type:`toggle`,onColor:`#44ffaa`,platform:`all`,height:{compact:30,normal:44},onChange:e=>e.applyPerformanceSettings?.()},{key:`renderScale`,label:`Render Scale`,category:`Performance`,type:`slider`,min:50,max:100,step:10,format:e=>`${e}%`,barColor:()=>`#00ccff`,platform:`all`,height:{compact:42,normal:60},onChange:e=>e.applyPerformanceSettings?.()},{key:`effectsQuality`,label:`Effects Quality`,category:`Performance`,type:`enum`,values:[`Low`,`Medium`,`High`],colors:[`#88aacc`,`#00ccff`,`#ffaa00`],min:0,max:2,step:1,wrap:!0,platform:`all`,height:{compact:30,normal:44},onChange:e=>e.applyPerformanceSettings?.()},{key:`postProcessing`,label:`Post Processing`,category:`Performance`,type:`toggle`,onColor:`#cc88ff`,platform:`all`,height:{compact:30,normal:44},onChange:e=>e.applyPerformanceSettings?.()},{key:`floorTexture`,label:`Floor Detail`,category:`Performance`,type:`toggle`,onColor:`#ffaa00`,platform:`all`,height:{compact:30,normal:44},onChange:e=>e.applyPerformanceSettings?.()},{key:`screenShake`,label:`Screen Shake`,category:`Performance`,type:`toggle`,onColor:`#ff8844`,platform:`all`,height:{compact:30,normal:44}},{key:`weaponBob`,label:`Weapon Bob`,category:`Performance`,type:`toggle`,onColor:`#44ffaa`,platform:`all`,height:{compact:30,normal:44}},{key:`showPerformanceOverlay`,label:`Performance Overlay`,category:`Performance`,type:`toggle`,onColor:`#ffcc00`,platform:`all`,height:{compact:30,normal:44},onChange:e=>{e.showFPS=!!e.settings.showPerformanceOverlay}},{key:`enableBloom`,label:`Bloom`,category:`Performance`,type:`toggle`,onColor:`#cc88ff`,platform:`all`,height:{compact:30,normal:44}},{key:`enableChromaticAberration`,label:`Chromatic Aberration`,category:`Performance`,type:`toggle`,onColor:`#cc88ff`,platform:`all`,height:{compact:30,normal:44}},{key:`enableFilmGrain`,label:`Film Grain`,category:`Performance`,type:`toggle`,onColor:`#cc88ff`,platform:`all`,height:{compact:30,normal:44}},{key:`shadowQuality`,label:`Shadow Quality`,category:`Performance`,type:`enum`,values:[`Off`,`Low`,`High`],colors:[`#888888`,`#88aacc`,`#ffaa00`],min:0,max:2,step:1,wrap:!0,platform:`all`,height:{compact:30,normal:44}},{key:`lightingQuality`,label:`Lighting Quality`,category:`Performance`,type:`enum`,values:[`Low`,`Medium`,`High`],colors:[`#88aacc`,`#00ccff`,`#ffaa00`],min:0,max:2,step:1,wrap:!0,platform:`all`,height:{compact:30,normal:44},onChange:e=>e.applyPerformanceSettings?.()},{key:`renderMode`,label:`Render Mode`,category:`Display`,type:`enum`,values:[`Auto`,`2D (Canvas)`,`3D (WebGL)`],colors:[`#00ffcc`,`#00ccff`,`#ffaa00`],min:0,max:2,step:1,wrap:!0,platform:`all`,height:{compact:30,normal:44}},{key:`musicVolume`,label:`Music Volume`,category:`Audio`,type:`slider`,min:0,max:100,step:10,format:e=>e===0?`MUTED`:`${e}%`,barColor:e=>e===0?`#ff4444`:`#00ff88`,onChange:e=>e.audio.setMusicVolume(e.settings.musicVolume/100),platform:`all`,height:{compact:42,normal:60}},{key:`sfxVolume`,label:`SFX Volume`,category:`Audio`,type:`slider`,min:0,max:100,step:10,format:e=>e===0?`MUTED`:`${e}%`,barColor:e=>e===0?`#ff4444`:`#88aaff`,onChange:e=>e.audio.setSfxVolume(e.settings.sfxVolume/100),platform:`all`,height:{compact:42,normal:60}},{key:`sensitivity`,label:`Mouse Sensitivity`,category:`Controls`,type:`slider`,min:.5,max:2,step:.1,round:1,format:e=>`${e.toFixed(1)}x`,barColor:()=>`#ffcc00`,platform:`desktop`,height:{compact:42,normal:60}},{key:`fov`,label:`FOV`,category:`Controls`,type:`slider`,min:50,max:120,step:5,format:e=>`${e}°`,barColor:()=>`#cc88ff`,platform:`all`,height:{compact:42,normal:60}},{key:`viewMode`,label:`View Mode`,category:`Controls`,type:`enum`,values:[`First Person`,`Third Person`],colors:[`#00ccff`,`#ff88cc`],min:0,max:1,step:1,wrap:!0,platform:`all`,height:{compact:30,normal:44}},{key:`invertX`,label:`Invert X Axis`,category:`Controls`,type:`toggle`,onColor:`#ff8844`,platform:`desktop`,height:{compact:30,normal:44}},{key:`invertY`,label:`Invert Y Axis`,category:`Controls`,type:`toggle`,onColor:`#ff8844`,platform:`desktop`,height:{compact:30,normal:44}},{key:`gamepadEnabled`,label:`Controller Support`,category:`Gamepad`,type:`toggle`,onColor:`#00ffcc`,platform:`all`,height:{compact:30,normal:44},onChange:e=>e.applyGamepadSettings?.()},{key:`gamepadLookSensitivity`,label:`Look Sensitivity`,category:`Gamepad`,type:`slider`,min:.5,max:4,step:.25,round:2,format:e=>`${e.toFixed(2)}x`,barColor:()=>`#cc88ff`,platform:`all`,height:{compact:42,normal:60},onChange:e=>e.applyGamepadSettings?.()},{key:`gamepadDeadzone`,label:`Stick Deadzone`,category:`Gamepad`,type:`slider`,min:.05,max:.35,step:.05,round:2,format:e=>`${Math.round(e*100)}%`,barColor:()=>`#00ccff`,platform:`all`,height:{compact:42,normal:60},onChange:e=>e.applyGamepadSettings?.()},{key:`gamepadRumble`,label:`Controller Rumble`,category:`Gamepad`,type:`toggle`,onColor:`#ffaa00`,platform:`all`,height:{compact:30,normal:44},onChange:e=>e.applyGamepadSettings?.()},{key:`fontScale`,label:`Font Scale`,category:`Accessibility`,type:`slider`,min:100,max:150,step:25,format:e=>`${e}%`,barColor:()=>`#aaaacc`,platform:`all`,height:{compact:30,normal:44}},{key:`colorblind`,label:`Colorblind Mode`,category:`Accessibility`,type:`enum`,values:[`Off`,`Deuteranopia`,`Protanopia`,`Tritanopia`],colors:[`#888888`,`#ffcc00`,`#ffcc00`,`#ffcc00`],min:0,max:3,step:1,wrap:!0,platform:`all`,height:{compact:30,normal:44}},{key:`hudStyle`,label:`HUD Style`,category:`HUD`,type:`enum`,values:[`Minimal`,`Classic DOOM`,`Tactical`,`Custom`],colors:[`#00ccff`,`#ff2200`,`#44ffaa`,`#cc88ff`],min:0,max:3,step:1,wrap:!0,platform:`all`,height:{compact:30,normal:44}},{key:`editCustomHud`,label:`Edit Custom HUD`,category:`HUD`,type:`action`,buttonLabel:`EDIT LAYOUT`,color:`#cc88ff`,platform:`all`,height:{compact:30,normal:44},onClick:e=>e.hudEditor.start()},{key:`hudScale`,label:`HUD Scale`,category:`HUD`,type:`slider`,min:75,max:125,step:25,format:e=>`${e}%`,barColor:()=>`#44ffaa`,platform:`all`,height:{compact:42,normal:60}},{key:`staminaBarSize`,label:`Stamina Bar Size`,category:`HUD`,type:`slider`,min:75,max:150,step:25,format:e=>`${e}%`,barColor:()=>`#00ccff`,platform:`all`,height:{compact:42,normal:60}},{key:`showPortrait`,label:`Show Portrait`,category:`HUD`,type:`toggle`,onColor:`#00ccff`,platform:`all`,height:{compact:30,normal:44}},{key:`showWeapons`,label:`Show Weapons`,category:`HUD`,type:`toggle`,onColor:`#00ccff`,platform:`all`,height:{compact:30,normal:44}},{key:`showKills`,label:`Show Kills`,category:`HUD`,type:`toggle`,onColor:`#00ccff`,platform:`all`,height:{compact:30,normal:44}},{key:`showScore`,label:`Show Score`,category:`HUD`,type:`toggle`,onColor:`#00ccff`,platform:`all`,height:{compact:30,normal:44}},{key:`touchSensitivity`,label:`Touch Sensitivity`,category:`Mobile`,type:`slider`,min:.5,max:3,step:.1,round:1,format:e=>`${e.toFixed(1)}x`,barColor:()=>`#ff88cc`,platform:`mobile`,height:{compact:42,normal:60}},{key:`haptics`,label:`Haptic Feedback`,category:`Mobile`,type:`toggle`,onColor:`#00ffcc`,platform:`all`,height:{compact:30,normal:44}},{key:`autoFire`,label:`Auto-Fire (Twin Stick)`,category:`Mobile`,type:`toggle`,onColor:`#ffaa00`,platform:`mobile`,height:{compact:30,normal:44}},{key:`swipeWeapons`,label:`Swipe to Swap Weapons`,category:`Mobile`,type:`toggle`,onColor:`#00ccff`,platform:`mobile`,height:{compact:30,normal:44}}];function fn(e,t){return dn.filter(n=>n.isVisible&&t&&!n.isVisible(t)?!1:n.platform===`all`||n.platform===`mobile`&&e||n.platform===`desktop`&&!e)}function pn(e,t,n){return fn(e,n).filter(e=>e.category===t)}function mn(e,t){let n=fn(e,t);return un.filter(e=>n.some(t=>t.category===e))}function hn(e,t,n){let r=e[t.key];if(t.type===`toggle`)e[t.key]=!e[t.key];else if(t.wrap){let r=t.max-t.min+1;e[t.key]=t.min+(e[t.key]-t.min+n+r)%r}else{let r=e[t.key]+n*t.step;r=Math.max(t.min,Math.min(t.max,r)),t.round!=null&&(r=Math.round(r*10**t.round)/10**t.round),e[t.key]=r}return e[t.key]!==r}function gn(e,t){let n=t[e.key];switch(e.type){case`toggle`:return{label:e.label,value:n?`ON`:`OFF`,color:n?e.onColor||`#00ccff`:`#888888`};case`enum`:return{label:e.label,value:e.values[n]||String(n),color:e.colors?e.colors[n]:void 0};case`slider`:return{label:e.label,value:e.format?e.format(n):String(n),color:void 0};case`action`:return{label:e.label,value:e.buttonLabel||`ACT`,color:e.color||`#ffffff`};default:return{label:e.label,value:String(n)}}}function K(e){return e<420}function _n(e,t,n){let r=K(t),i=r?t*.55:t/2+115,a=r?40:50,o=Math.max(44,Math.min(r?80:90,(e-60)/4-10)),s=r?6:10,c=[`RESUME`,`SETTINGS`,`CONTROLS`,`QUIT`],l=[`#00ccff`,`#88aaff`,`#aabbcc`,`#ff4444`],u=(e-(c.length*o+(c.length-1)*s))/2;return{btnY:i,btnH:a,btnW:o,gap:s,buttons:c.map((e,t)=>({label:e,color:l[t],x:u+t*(o+s),y:i,w:o,h:a,index:t})),saveBtn:n===`campaign`?{label:`SAVE`,x:(e-100)/2,y:i+a+10,w:100,h:40}:null,compact:r}}function vn(e,t,n,r,i){let a=r&&K(t),o=a?36:52,s=a?90:160,c=s+1,l=e-c-12,u=o+8,d=Math.min(l*.55,240),f=a?28:38,p=i?pn(r,i):fn(r),m=p.map(e=>a?e.height.compact:e.height.normal);return{headerH:o,sideW:s,panelX:c,panelW:l,barW:d,barH:6,contentTop:u,catItemH:f,itemHeights:m,totalH:m.reduce((e,t)=>e+t,0),compact:a,visibleDefs:p}}function yn(e,t,n,r){let i=r&&K(t),a=i?14:40,o=a+(i?30:90),s=i?40:64,c=i?3:6,l=i?Math.min(280,Math.floor((e-36)/2)):320,u=e/2-l-(i?6:12),d=e/2+(i?6:12),f=Math.ceil(n/2);return{cols:2,headerY:a,startY:o,cardH:s,cardGap:c,colW:l,leftX:u,rightX:d,totalRows:f,contY:o+f*(s+c)+20,compact:i}}function bn(e,t,n){let r=Math.min(360,e-40);return{menuW:r,itemH:52,menuH:n*52+16,mx:(e-r)/2,my:t*.35}}var xn=[null,{text:`DOUBLE KILL`,color:`#ffcc00`,size:32},{text:`TRIPLE KILL`,color:`#ff8800`,size:36},{text:`OVERKILL`,color:`#ff4400`,size:40},{text:`RAMPAGE`,color:`#ff0044`,size:44},{text:`UNSTOPPABLE`,color:`#ff00ff`,size:48},{text:`GODLIKE`,color:`#aa00ff`,size:52}],Sn=3,Cn=2,wn=class{constructor(){this.streak=0,this.timer=0,this.display=null,this.best=0}reset(){this.streak=0,this.timer=0,this.display=null,this.best=0}onKill(){this.streak++,this.timer=0,this.streak>this.best&&(this.best=this.streak);let e=Math.min(this.streak,xn.length)-1,t={tier:e,chronoBonus:this.streak>=3?30:20,screenShake:0,glitchEffect:0,playAudio:!1,ariaCategory:null};if(e>=1){let n=xn[e];this.display={text:n.text,color:n.color,size:n.size,life:Cn},t.screenShake=4+e*2,t.playAudio=!0,e>=3&&(t.glitchEffect=.15+e*.05),this.streak===3?t.ariaCategory=`killStreak3`:this.streak===5?t.ariaCategory=`killStreak5`:this.streak===7&&(t.ariaCategory=`killStreak7`)}return t}update(e){this.streak>0&&(this.timer+=e,this.timer>Sn&&(this.streak=0,this.timer=0)),this.display&&(this.display.life-=e,this.display.life<=0&&(this.display=null))}renderFirstPerson(e,t,n,r){if(!this.display)return;let i=this.display,a=i.life>1.5?Math.min(1,(2-i.life)*4):Math.min(1,i.life/.5);e.save(),e.globalAlpha=a,e.textAlign=`center`,e.textBaseline=`middle`,e.font=`bold ${Math.round(i.size*.8)}px monospace`,e.fillStyle=i.color,e.fillText(i.text,t/2,(n-r)*.3),e.restore()}renderThirdPerson(e,t,n){if(!this.display)return;let r=this.display,i=r.life>1.5?Math.min(1,(2-r.life)*4):Math.min(1,r.life/.5),a=r.life>1.8?1.2+(2-r.life)*3:1,o=Math.round(r.size*a),s=n*.3;e.save(),e.globalAlpha=i,e.textAlign=`center`,e.textBaseline=`middle`,e.font=`bold ${o}px monospace`;let c=e.measureText(r.text).width+60,l=o+20;e.fillStyle=`rgba(0,0,0,0.5)`,e.fillRect(t/2-c/2,s-l/2,c,l),e.fillStyle=r.color,e.globalAlpha=i*.6,e.fillRect(t/2-c/2,s-l/2,c,2),e.fillRect(t/2-c/2,s+l/2-2,c,2),e.globalAlpha=i,e.shadowColor=r.color,e.shadowBlur=20,e.fillStyle=r.color,e.fillText(r.text,t/2,s),e.shadowBlur=0,e.strokeStyle=`rgba(255,255,255,0.4)`,e.lineWidth=1.5,e.strokeText(r.text,t/2,s),e.restore()}},Tn=class{constructor(){this.queue=[],this.message=null,this.triggered={},this.enabled=!1,this.idleTimer=0,this.idleThreshold=30,this.combatTimer=0,this.messageLog=[],this.showLog=!1,this.logScroll=0}enable(){this.enabled=!0}resetTriggered(){this.triggered={}}resetCombatTimer(){this.combatTimer=0}resetAll(){this.queue=[],this.message=null,this.triggered={},this.enabled=!1,this.idleTimer=0,this.idleThreshold=30,this.combatTimer=0,this.messageLog=[],this.showLog=!1,this.logScroll=0}queueMessage(e,t){if(!this.enabled)return;let n=C[e];if(!n||n.length===0)return;let r=n[Math.floor(Math.random()*n.length)];r=r.replace(`{ROUNDS}`,String(t||0));let i=![`idle`,`ariaPersonality`].includes(e);this.queue.push({text:r,color:`#00ffdd`,duration:i?4.5:3.5,prominent:i,speaker:`ARIA`})}queueSquadMessage(e,t,n){if(!this.enabled)return;let r=C[t];if(!r||r.length===0)return;let i=r[Math.floor(Math.random()*r.length)];this.queue.push({text:i,color:n||`#ffcc66`,duration:3.5,prominent:!1,speaker:e||`SQUAD`})}triggerOnce(e,t,n){this.triggered[e]||(this.triggered[e]=!0,this.queueMessage(t,n))}update(e,t){if(this.enabled){if(!this.message&&this.queue.length>0){let e=this.queue.shift();this.message={...e,life:0},this.idleTimer=0,this.messageLog.push(e.text)}if(this.message&&(this.message.life+=e,this.message.life>=this.message.duration&&(this.message=null)),t&&(this.combatTimer+=e,this.combatTimer>120&&this.triggerOnce(`longSurvival`,`longSurvival`),this.idleTimer+=e,this.idleTimer>=this.idleThreshold&&!this.message&&this.queue.length===0)){let e=this._pickIdlePool();this.queueMessage(e),this.idleThreshold=25+Math.random()*25,this.idleTimer=0}}}setNarrativeContext({act:e=1,ngPlusCycle:t=0}={}){this.narrativeAct=e|0,this.ngPlusCycle=t|0}_pickIdlePool(){let e=this.narrativeAct||1,t=this.ngPlusCycle||0,n=Math.random();return t>=1&&n<.25?`ngPlusAriaLoop`:e===3&&n<.35?`act3Ambient`:e===2&&n<.35?`act2Ambient`:n<.5?`idle`:`ariaPersonality`}renderMessage(e,t,n,r,i){let a=this.message;if(!a)return;let o=a.life,s=a.duration,c=r||`Agent`;a.prominent?this._renderProminent(e,t,n,a,o,s,c):this._renderSubtle(e,t,n,a,o,s,c,i)}renderLog(e,t,n,r){let i=Math.min(520,t-40),a=Math.min(400,n-80),o=(t-i)/2,s=(n-a)/2;e.fillStyle=`rgba(0, 8, 16, 0.96)`,e.beginPath(),e.roundRect(o,s,i,a,10),e.fill(),e.strokeStyle=`rgba(0, 200, 255, 0.4)`,e.lineWidth=1.5,e.beginPath(),e.roundRect(o,s,i,a,10),e.stroke(),e.fillStyle=`#00ccff`,e.font=`bold 18px monospace`,e.textAlign=`center`,e.fillText(`ARIA COMMS LOG`,t/2,s+28);let c=this.messageLog,l=Math.floor((a-70)/22),u=Math.max(0,c.length-l-this.logScroll),d=Math.min(c.length,u+l);e.font=`13px monospace`,e.textAlign=`left`;let f=o+16,p=i-32;if(c.length===0)e.fillStyle=`rgba(255,255,255,0.3)`,e.textAlign=`center`,e.fillText(`No messages yet`,t/2,s+a/2);else for(let t=u;t<d;t++){let n=s+50+(t-u)*22;e.fillStyle=`rgba(0, 200, 255, 0.4)`,e.fillText(`${String(t+1).padStart(2,` `)}.`,f,n);let i=c[t].replace(/\{AGENT\}/g,r||`Agent`);e.fillStyle=`#00ffdd`;let a=i;for(;e.measureText(a).width>p-30&&a.length>3;)a=a.slice(0,-4)+`...`;e.fillText(a,f+30,n)}c.length>l&&(e.fillStyle=`rgba(255,255,255,0.3)`,e.font=`11px monospace`,e.textAlign=`center`,e.fillText(`W/S to scroll`,t/2,s+a-10)),e.fillStyle=`rgba(255,255,255,0.4)`,e.font=`12px monospace`,e.textAlign=`center`,e.fillText(`L to close  |  ESC to resume`,t/2,s+a+20),e.textAlign=`left`}_renderProminent(e,t,n,r,i,a,o){let s=1;i<.4?s=i/.4:i>a-.5&&(s=1-(i-(a-.5))/.5);let c=i<.4?(1-i/.4)*-40:0;e.save(),e.globalAlpha=s;let l=(t-460)/2,u=n*.135+c,d=r.text.replace(/\{AGENT\}/g,o);e.font=`14px monospace`;let f=this._wordWrap(e,d,428),p=64+Math.max(0,f.length-1)*17;e.fillStyle=`rgba(0, 8, 16, 0.95)`,e.beginPath(),e.roundRect(l,u,460,p,8),e.fill(),e.shadowColor=`#00ccff`,e.shadowBlur=12,e.strokeStyle=`rgba(0, 200, 255, 0.6)`,e.lineWidth=1.5,e.beginPath(),e.roundRect(l,u,460,p,8),e.stroke(),e.shadowBlur=0,e.fillStyle=r.speaker&&r.speaker!==`ARIA`?r.color||`#ffcc66`:`#00ccff`,e.font=`bold 11px monospace`,e.textAlign=`center`,e.fillText(r.speaker||`ARIA`,t/2,u+18),e.fillStyle=r.color,e.font=`14px monospace`;let m=f.length>1?u+36:u+44;for(let n=0;n<f.length;n++)e.fillText(f[n],t/2,m+n*17);e.textAlign=`left`,e.restore()}_renderSubtle(e,t,n,r,i,a,o,s){let c=0;i<.3?c=(1-i/.3)*-360:i>a-.4&&(c=(i-(a-.4))/.4*-360);let l=1;i<.3?l=i/.3:i>a-.4&&(l=1-(i-(a-.4))/.4),e.save(),e.globalAlpha=l;let u=r.text.replace(/\{AGENT\}/g,o),d=s&&K(n)?Math.min(340,t-32):340,f=d-54-12;e.font=`13px monospace`;let p=this._wordWrap(e,u,f),m=54+Math.max(0,p.length-1)*15,h=(t-d)/2+c,g=n-m-70;e.fillStyle=`rgba(0, 10, 20, 0.92)`,e.beginPath(),e.roundRect(h,g,d,m,6),e.fill(),e.strokeStyle=`rgba(0,200,255,0.35)`,e.lineWidth=1,e.beginPath(),e.roundRect(h,g,d,m,6),e.stroke(),this._renderPortrait(e,h+7,g+5,40,44,i);let _=h+54;e.fillStyle=r.speaker&&r.speaker!==`ARIA`?r.color||`#ffcc66`:`#00ccff`,e.font=`bold 10px monospace`,e.textAlign=`left`,e.fillText(r.speaker||`ARIA`,_,g+17),e.fillStyle=`rgba(0,255,200,${.5+Math.sin(i*6)*.4})`,e.beginPath(),e.arc(_+32,g+14,2.5,0,Math.PI*2),e.fill(),e.strokeStyle=`rgba(0, 200, 255, ${.3+Math.sin(i*4)*.15})`,e.lineWidth=.8,e.beginPath();for(let t=0;t<20;t++){let n=_+42+t*3,r=Math.sin(i*10+t*.7)*(3+Math.sin(i*3+t)*2);e.moveTo(n,g+14-r),e.lineTo(n,g+14+r)}e.stroke(),e.fillStyle=r.color,e.font=`13px monospace`;for(let t=0;t<p.length;t++)e.fillText(p[t],_,g+38+t*15);e.restore()}_renderPortrait(e,t,n,r,i,a){e.fillStyle=`rgba(0, 30, 50, 0.9)`,e.beginPath(),e.roundRect(t,n,r,i,4),e.fill(),e.strokeStyle=`rgba(0,200,255,0.5)`,e.lineWidth=.8,e.beginPath(),e.roundRect(t,n,r,i,4),e.stroke();let o=t+r/2,s=n+i/2-1,c=Math.sin(a*2)*.5;e.fillStyle=`rgba(180, 220, 240, 0.7)`,e.fillRect(o-3,s+8,6,7),e.fillStyle=`rgba(20, 50, 70, 0.95)`,e.beginPath(),e.moveTo(o-14,s+14+c),e.lineTo(o-6,s+9),e.lineTo(o-3,s+13),e.lineTo(o+3,s+13),e.lineTo(o+6,s+9),e.lineTo(o+14,s+14+c),e.lineTo(o+14,s+22),e.lineTo(o-14,s+22),e.closePath(),e.fill(),e.strokeStyle=`#00ddff`,e.lineWidth=.6,e.beginPath(),e.moveTo(o-6,s+9),e.lineTo(o-14,s+14+c),e.moveTo(o+6,s+9),e.lineTo(o+14,s+14+c),e.stroke(),e.strokeStyle=`rgba(0,200,255,0.4)`,e.lineWidth=.5,e.beginPath(),e.moveTo(o,s+13),e.lineTo(o,s+22),e.stroke(),e.fillStyle=`rgba(190, 225, 245, 0.8)`,e.beginPath(),e.ellipse(o,s-2,9,11,0,0,Math.PI*2),e.fill(),e.strokeStyle=`rgba(0,200,255,0.12)`,e.lineWidth=.3;for(let t=s-12;t<s+9;t+=3)e.beginPath(),e.moveTo(o-9,t),e.lineTo(o+9,t),e.stroke();e.fillStyle=`rgba(40, 50, 70, 0.9)`,e.beginPath(),e.moveTo(o-3,s-14),e.quadraticCurveTo(o-13,s-10,o-12,s+3),e.lineTo(o-9,s+2),e.quadraticCurveTo(o-10,s-8,o-3,s-11),e.closePath(),e.fill(),e.beginPath(),e.moveTo(o+3,s-14),e.quadraticCurveTo(o+12,s-10,o+10,s-1),e.lineTo(o+8,s-2),e.quadraticCurveTo(o+9,s-8,o+3,s-11),e.closePath(),e.fill(),e.beginPath(),e.moveTo(o-5,s-13),e.quadraticCurveTo(o,s-16,o+5,s-13),e.quadraticCurveTo(o,s-11,o-5,s-13),e.fill(),e.strokeStyle=`#00eeff`,e.lineWidth=1.2,e.beginPath(),e.moveTo(o-5,s-13),e.quadraticCurveTo(o-12,s-7,o-11,s+1),e.stroke();let l=.7+Math.sin(a*3)*.3;e.fillStyle=`rgba(0, 230, 255, ${l})`,e.beginPath(),e.ellipse(o-4,s-3,1.8,1.2,0,0,Math.PI*2),e.fill(),e.beginPath(),e.ellipse(o+4,s-3,1.8,1.2,0,0,Math.PI*2),e.fill(),e.fillStyle=`rgba(0, 200, 255, ${l*.15})`,e.beginPath(),e.ellipse(o-4,s-3,4,3,0,0,Math.PI*2),e.fill(),e.beginPath(),e.ellipse(o+4,s-3,4,3,0,0,Math.PI*2),e.fill(),e.strokeStyle=`rgba(100, 160, 200, 0.5)`,e.lineWidth=.5,e.beginPath(),e.arc(o,s+1,3,.15*Math.PI,.85*Math.PI),e.stroke(),e.strokeStyle=`rgba(80, 100, 120, 0.9)`,e.lineWidth=1.2,e.beginPath(),e.arc(o,s-3,11,-.65*Math.PI,-.15*Math.PI),e.stroke(),e.fillStyle=`rgba(30, 50, 70, 0.9)`,e.beginPath(),e.ellipse(o+10,s-1,2.5,4,.15,0,Math.PI*2),e.fill(),e.strokeStyle=`rgba(80, 100, 120, 0.7)`,e.lineWidth=.8,e.beginPath(),e.moveTo(o+9,s+2),e.quadraticCurveTo(o+8,s+6,o+3,s+7),e.stroke(),e.fillStyle=`#00ddff`,e.beginPath(),e.arc(o+3,s+7,1.2,0,Math.PI*2),e.fill(),e.fillStyle=`rgba(0, 200, 255, ${.03+Math.sin(a*8)*.02})`;for(let a=0;a<i;a+=2)e.fillRect(t,n+a,r,1)}_wordWrap(e,t,n){let r=t.split(` `),i=[],a=``;for(let t of r){let r=a?a+` `+t:t;e.measureText(r).width>n&&a?(i.push(a),a=t):a=r}return a&&i.push(a),i}},En={kael:{label:`KAEL`,category:`kaelComms`,color:`#ff8844`},nova:{label:`NOVA`,category:`novaComms`,color:`#ffcc33`},rook:{label:`ROOK`,category:`rookComms`,color:`#66ccff`},lyra:{label:`LYRA`,category:`lyraComms`,color:`#ffaa44`}};function Dn(e,t=0){return e<=1?[]:e===2?t>=1?[`kael`,`nova`,`rook`,`lyra`]:[`kael`,`nova`,`rook`]:[`kael`,`nova`,`rook`,`lyra`]}var On=class{constructor(e){this.ariaComms=e,this.cooldown=0,this.minCooldown=8,this.maxCooldown=18,this.triggered=new Set,this.context={act:1,level:0}}setContext(e,t){this.context={act:e|0,level:t|0},this.triggered.clear()}reset(){this.cooldown=0,this.triggered.clear(),this.context={act:1,level:0}}update(e){this.cooldown>0&&(this.cooldown-=e)}emit(e={}){let{act:t,level:n}=this.context,r=Dn(t,n);if(r.length===0||!e.force&&this.cooldown>0)return!1;let i=En[e.preferred&&r.includes(e.preferred)?e.preferred:r[Math.floor(Math.random()*r.length)]];return i?(this.ariaComms.queueSquadMessage(i.label,i.category,i.color),this.cooldown=this.minCooldown+Math.random()*(this.maxCooldown-this.minCooldown),!0):!1}emitOnce(e,t={}){if(this.triggered.has(e))return!1;let n=this.emit(t);return n&&this.triggered.add(e),n}onCombatStart(){this.emitOnce(`combatStart:${this.context.act}.${this.context.level}`)}onKillStreak(e){e>=3&&this.emit()}onLowHealth(){this.emitOnce(`lowHp:${this.context.act}.${this.context.level}`,{preferred:`kael`})}onBossPhase(e){let t=`bossPhase${e}Squad`,n=`bossPhase:${e}`;this.triggered.has(n)||!this.ariaComms||!this.ariaComms.queueSquadMessage||(this.ariaComms.queueSquadMessage(`SQUAD`,t,`#ffddaa`),this.triggered.add(n))}onSecretFound(){this.emit({preferred:`rook`})}},kn=1;function An(e,t){let n=dn.find(t=>t.key===e);if(!n)return t;if((n.type===`slider`||n.type===`enum`)&&typeof t==`number`){let e=Math.max(n.min,Math.min(n.max,t));return n.type===`slider`&&n.step&&(e=Math.round(e/n.step)*n.step),n.type===`enum`&&(e=Math.round(e)),n.round!=null&&(e=Math.round(e*10**n.round)/10**n.round),Math.max(n.min,Math.min(n.max,e))}return t}function jn(e){try{localStorage.setItem(`cc_settings`,JSON.stringify(e))}catch{}}function Mn(e){try{let t=localStorage.getItem(`cc_settings`);if(!t)return;let n=JSON.parse(t);for(let t of Object.keys(e))if(Object.prototype.hasOwnProperty.call(n,t)){let r=n[t];if(typeof r!=typeof e[t])continue;e[t]=An(t,r)}}catch{}}function Nn(e,t,n){if(e)try{if(!localStorage.getItem(`cc_mobile_v2`)){let e=localStorage.getItem(`cc_settings`)!==null,r=t.fov===90&&t.hudScale===75||t.fov===70&&t.hudScale===100;(!e||r)&&(t.fov=100,t.hudScale=75,n()),localStorage.setItem(`cc_mobile_v2`,`1`),localStorage.setItem(`cc_mobile_v1`,`1`)}localStorage.getItem(`cc_mobile_v3`)||(t.touchSensitivity===1.5&&(t.touchSensitivity=2,n()),localStorage.setItem(`cc_mobile_v3`,`1`))}catch{}}function Pn(){try{return localStorage.getItem(`cc_dev_always_tutorial`)===`1`}catch{return!1}}function Fn(e){try{e?localStorage.setItem(`cc_dev_always_tutorial`,`1`):localStorage.removeItem(`cc_dev_always_tutorial`)}catch{}}function In(e){try{localStorage.setItem(`cc_character`,JSON.stringify(e))}catch{}}function Ln(e){try{let t=localStorage.getItem(`cc_character`);if(!t)return;let n=JSON.parse(t),r={colorIndex:g.length-1,skinToneIndex:E.length-1,hairIndex:o.length-1,eyeIndex:f.length-1,armorIndex:u.length-1,helmetIndex:w.length-1,visorIndex:a.length-1,shoulderIndex:c.length-1,badgeIndex:y.length-1,weaponSkinIndex:T.length-1,loadoutIndex:D.length-1,backstoryIndex:d.length-1,voiceIndex:i.length-1};for(let t of Object.keys(p))if(Object.prototype.hasOwnProperty.call(n,t)){let i=n[t];if(typeof i!=typeof p[t])continue;t in r&&(i=Math.max(0,Math.min(i,r[t]))),e[t]=i}}catch{}}function Rn(e,t){try{localStorage.setItem(`cc_achievements`,JSON.stringify({unlocked:e,stats:t}))}catch{}}function zn(e,t){try{let n=localStorage.getItem(`cc_achievements`);if(!n)return;let r=JSON.parse(n);if(r.unlocked&&typeof r.unlocked==`object`)for(let t of Object.keys(r.unlocked))Object.prototype.hasOwnProperty.call(S,t)&&(e[t]=!0);if(r.stats&&typeof r.stats==`object`){for(let e of Object.keys(t))if(Object.prototype.hasOwnProperty.call(r.stats,e)){let n=r.stats[e];typeof n==typeof t[e]&&(t[e]=n)}}}catch{}}function Bn(e,t,n,r){try{let i={version:kn,round:e,...t.serialize(),upgradeLevels:n,difficulty:r};localStorage.setItem(`cc_arena_save`,JSON.stringify(i))}catch{}}function Vn(){try{let e=localStorage.getItem(`cc_arena_save`);if(!e)return null;let t=JSON.parse(e);return t.version===kn?t:(Hn(),null)}catch{return null}}function Hn(){try{localStorage.removeItem(`cc_arena_save`)}catch{}}function Un(e,t,n,r,i,a,o,s){try{let c=o.map(e=>e.type===`enemy`?{type:`enemy`,active:e.active,health:e.health,x:e.x,y:e.y,state:e.state}:{type:e.type,active:e.active}),l={version:kn,level:e,act:t||1,ngPlusCycle:n||0,playerX:r.x,playerY:r.y,playerAngle:r.angle,aimOffsetX:r.aimOffsetX||0,aimOffsetY:r.aimOffsetY||0,...r.serialize(),difficulty:i,mapGrid:a,entityStates:c,killedEnemies:s};localStorage.setItem(`cc_campaign_save`,JSON.stringify(l))}catch{}}function Wn(){try{let e=localStorage.getItem(`cc_campaign_save`);if(!e)return null;let t=JSON.parse(e);return t.version===kn?t:(Gn(),null)}catch{return null}}function Gn(){try{localStorage.removeItem(`cc_campaign_save`)}catch{}}function Kn(){return qn().length>0}function qn(){let e=[];try{let t=localStorage.getItem(`cc_arena_save`);if(t){let n=JSON.parse(t);e.push({mode:`arena`,round:n.round,score:n.score})}let n=localStorage.getItem(`cc_campaign_save`);if(n){let t=JSON.parse(n);e.push({mode:`campaign`,level:t.level+1,score:t.score,ngPlusCycle:t.ngPlusCycle||0})}}catch{}return e}function Jn(e){try{return localStorage.getItem(e)===`1`}catch{return!1}}function Yn(e){try{localStorage.setItem(e,`1`)}catch{}}function Xn(e){try{e>parseInt(localStorage.getItem(`cc_ng_plus_best`)||`0`,10)&&localStorage.setItem(`cc_ng_plus_best`,String(e))}catch{}}function Zn(e,t,n,r){let i=r;e.fillStyle=`rgba(0,0,0,0.92)`,e.fillRect(0,0,t,n),e.fillStyle=`#00ffcc`,e.font=`bold 28px monospace`,e.textAlign=`center`,e.fillText(`LIFETIME STATS`,t/2,50);let a=Math.floor(i.totalTimePlayed||0),o=Math.floor(a/3600),s=Math.floor(a%3600/60),c=a%60,l=o>0?`${o}h ${s}m ${c}s`:`${s}m ${c}s`,u=i.totalShotsFired>0?(i.totalShotsHit/i.totalShotsFired*100).toFixed(1)+`%`:`N/A`,d=i.totalDeaths>0?(i.totalKills/i.totalDeaths).toFixed(2):i.totalKills>0?`Perfect`:`N/A`,f=[{label:`TOTAL KILLS`,value:(i.totalKills||0).toLocaleString(),color:`#ff4444`},{label:`TOTAL DEATHS`,value:(i.totalDeaths||0).toLocaleString(),color:`#ff6666`},{label:`K/D RATIO`,value:d,color:`#ffcc00`},{label:`TIME PLAYED`,value:l,color:`#00ccff`},{label:`SHOTS FIRED`,value:(i.totalShotsFired||0).toLocaleString(),color:`#aaddff`},{label:`ACCURACY`,value:u,color:`#44ff88`},{label:`SECRETS FOUND`,value:(i.totalSecretsFound||0).toLocaleString(),color:`#ffaa00`},{label:`CAMPAIGN LEVELS`,value:(i.totalCampaignLevels||0).toLocaleString(),color:`#cc88ff`},{label:`GAMES PLAYED`,value:(i.totalGamesPlayed||0).toLocaleString(),color:`#88ccff`},{label:`HIGHEST ARENA`,value:`Round `+(i.highestArenaRound||0),color:`#ff88cc`},{label:`HIGHEST SCORE`,value:(i.highestScore||0).toLocaleString(),color:`#ffcc44`},{label:`TOTAL DASHES`,value:(i.totalDashes||0).toLocaleString(),color:`#88ffcc`},{label:`UPGRADES BOUGHT`,value:(i.upgradesBought||0).toLocaleString(),color:`#ccccff`},{label:`FLAWLESS ROUNDS`,value:(i.flawlessRounds||0).toLocaleString(),color:`#44ffff`}],p=t/2-520/2;for(let t=0;t<f.length;t++){let n=t%2,r=Math.floor(t/2),i=p+n*260,a=80+r*42;e.fillStyle=`rgba(180,190,200,0.6)`,e.font=`11px monospace`,e.textAlign=`left`,e.fillText(f[t].label,i+10,a+14),e.fillStyle=f[t].color,e.font=`bold 18px monospace`,e.fillText(f[t].value,i+10,a+34)}i.campaignComplete&&(e.fillStyle=`#ffcc00`,e.font=`bold 14px monospace`,e.textAlign=`center`,e.fillText(`★ CAMPAIGN COMPLETED ★`,t/2,80+Math.ceil(f.length/2)*42+20)),e.fillStyle=`rgba(255,255,255,0.25)`,e.font=`11px monospace`,e.textAlign=`center`,e.fillText(`ESC to go back`,t/2,n-20),e.textAlign=`left`}var Qn=class{constructor(){this.unlockedAchievements={},this.achievementQueue=[],this.achievementToast=null,this.achievementsScroll=0,this._lastStatsSave=0,this.roundDamageTaken=0,this.achievementIcons={};for(let[e,t]of Object.entries(_)){let n=new Image;n.src=`data:image/svg+xml;charset=utf-8,`+encodeURIComponent(t),this.achievementIcons[e]=n}this.achievementStats={totalKills:0,totalDashes:0,highestArenaRound:0,highestScore:0,campaignComplete:!1,bossKilled:!1,tutorialComplete:!1,upgradesBought:0,flawlessRounds:0,totalDeaths:0,totalTimePlayed:0,totalShotsFired:0,totalShotsHit:0,totalSecretsFound:0,totalCampaignLevels:0,totalGamesPlayed:0}}save(){Rn(this.unlockedAchievements,this.achievementStats)}load(){zn(this.unlockedAchievements,this.achievementStats)}unlockAchievement(e){this.unlockedAchievements[e]||!S[e]||e.startsWith(`_`)||(this.unlockedAchievements[e]=!0,this.achievementQueue.push(e),this.save())}checkAchievements(e){this.achievementStats.highestScore=Math.max(this.achievementStats.highestScore,e);for(let[e,t]of Object.entries(S))e.startsWith(`_`)||this.unlockedAchievements[e]||t.check(this.achievementStats)&&this.unlockAchievement(e);let t=performance.now();(!this._lastStatsSave||t-this._lastStatsSave>3e4)&&(this._lastStatsSave=t,this.save())}updateToast(e){let t=!1;if(!this.achievementToast&&this.achievementQueue.length>0){let e=this.achievementQueue.shift(),n=S[e];n&&(this.achievementToast={id:e,name:n.name,description:n.description,icon:n.icon,time:0,duration:3.5},t=!0)}return this.achievementToast&&(this.achievementToast.time+=e,this.achievementToast.time>=this.achievementToast.duration&&(this.achievementToast=null)),{playSound:t}}renderToast(e,t,n){let r=this.achievementToast;if(!r)return;let i=r.time,a=r.duration,o=0;i<.4?o=(1-i/.4)*350:i>a-.4&&(o=(i-(a-.4))/.4*350);let s=t-320-20+o;e.save(),e.fillStyle=`rgba(10, 10, 30, 0.92)`,e.beginPath(),e.roundRect(s,20,320,70,8),e.fill(),e.strokeStyle=`#ffcc00`,e.lineWidth=2,e.beginPath(),e.roundRect(s,20,320,70,8),e.stroke(),e.fillStyle=`#ffcc00`,e.beginPath(),e.roundRect(s,20,4,70,[8,0,0,8]),e.fill();let c=this.achievementIcons[r.icon];c?.complete&&c.naturalWidth>0?e.drawImage(c,s+14,39,32,32):(e.font=`28px monospace`,e.textAlign=`center`,e.fillText(r.icon,s+30,64)),e.fillStyle=`#ffcc00`,e.font=`bold 11px monospace`,e.textAlign=`left`,e.fillText(`ACHIEVEMENT UNLOCKED`,s+55,42),e.fillStyle=`#ffffff`,e.font=`bold 16px monospace`,e.fillText(r.name,s+55,62),e.fillStyle=`rgba(255,255,255,0.6)`,e.font=`12px monospace`,e.fillText(r.description,s+55,78),e.restore()}renderScreen(e,t,n){e.fillStyle=`rgba(0,0,0,0.92)`,e.fillRect(0,0,t,n),e.fillStyle=`#ffcc00`,e.font=`bold 28px monospace`,e.textAlign=`center`,e.fillText(`ACHIEVEMENTS`,t/2,50);let r=Object.entries(S),i=t/2-532/2,a=Math.floor((n-80-50)/84),o=Math.max(0,Math.ceil(r.length/2)-a);this.achievementsScroll=Math.min(this.achievementsScroll||0,o);let s=this.achievementsScroll||0,c=0;for(let[e]of r)this.unlockedAchievements[e]&&c++;let l=t/2-300/2,u=r.length>0?c/r.length:0;e.fillStyle=`rgba(255,255,255,0.06)`,e.beginPath(),e.roundRect(l,58,300,10,4),e.fill(),u>0&&(e.fillStyle=`#ffcc00`,e.beginPath(),e.roundRect(l,58,300*u,10,4),e.fill()),e.fillStyle=`rgba(255,255,255,0.4)`,e.font=`10px monospace`,e.fillText(`${c} / ${r.length}`,t/2,80);for(let t=0;t<r.length;t++){let[n,o]=r[t],c=Math.floor(t/2)-s,l=t%2;if(c<0||c>=a)continue;let u=i+l*272,d=80+c*84,f=!!this.unlockedAchievements[n];e.fillStyle=f?`rgba(40,40,10,0.7)`:`rgba(10,10,20,0.6)`,e.beginPath(),e.roundRect(u,d,260,72,6),e.fill(),e.strokeStyle=f?`rgba(255,204,0,0.4)`:`rgba(100,100,120,0.2)`,e.lineWidth=1,e.beginPath(),e.roundRect(u,d,260,72,6),e.stroke();let p=this.achievementIcons[o.icon];p?.complete&&(e.globalAlpha=f?1:.25,e.drawImage(p,u+8,d+10,48,48),e.globalAlpha=1),e.fillStyle=f?`#ffcc00`:`#555566`,e.font=`bold 13px monospace`,e.textAlign=`left`,e.fillText(o.name,u+64,d+24),e.fillStyle=f?`rgba(200,210,220,0.7)`:`rgba(100,100,120,0.5)`,e.font=`11px monospace`,e.fillText(o.description,u+64,d+42),f&&(e.fillStyle=`rgba(0,255,100,0.6)`,e.font=`bold 10px monospace`,e.textAlign=`right`,e.fillText(`UNLOCKED`,u+260-8,d+60),e.textAlign=`left`)}e.fillStyle=`rgba(255,255,255,0.25)`,e.font=`11px monospace`,e.textAlign=`center`,e.fillText(`W/S to scroll  ·  ESC to go back`,t/2,n-20),e.textAlign=`left`}renderStats(e,t,n){Zn(e,t,n,this.achievementStats)}};function q(e,t,n){return t<0||n<0||t>=e.width||n>=e.height?!1:e.grid[n][t]===0}function $n(e,t,n,r,i){let a=r-t,o=i-n,s=Math.sqrt(a*a+o*o),c=Math.ceil(s/.2),l=a/c,u=o/c;for(let r=1;r<c;r++){let i=Math.floor(t+l*r),a=Math.floor(n+u*r);if(i<0||a<0||i>=e.width||a>=e.height||e.grid[a][i]>0)return!1}return!0}var er=(e,t,n)=>e<t?t:e>n?n:e,tr=(e,t)=>e**(t*60),nr=(e,t,n)=>Math.max(t,Math.min(n,e)),rr=0,ir=0,ar=0;function or(e,t,n,r={}){let i=ue*(r.sensitivity||1),a=r.invertX?-1:1,o=r.invertY?-1:1,s=(e.aimOffsetX||0)+t*i*a,c=(e.aimOffsetY||0)+n*i*o;return e.aimOffsetX=nr(s,-ce,ce),e.aimOffsetY=nr(c,-le,le),{overflowX:(s-e.aimOffsetX)/(i*a||1e-9),overflowY:(c-e.aimOffsetY)/(i*o||1e-9)}}function sr(e,t,n=R){let r=Math.min(1,n*t);e.aimOffsetX=(e.aimOffsetX||0)*(1-r),e.aimOffsetY=(e.aimOffsetY||0)*(1-r)}function cr(e,t=70,n={}){let r=Math.tan(t*.5*Math.PI/180),i=e.aimOffsetX||0,a=e.aimOffsetY||0,o=n.h||1,s=n.barH||0,c=(o-s)/o,l=e.angle+Math.atan(2*i*r),u=s/(2*o)-a*c;return{yaw:l,pitch:Math.atan(u)}}function lr(e,t={}){return((t.fov||70)+ir)*(1-rr*(1-ve))}function ur(e,t){let n=+!!e?.isAiming;rr+=(n-rr)*Math.min(1,8*t)}function dr(e,t){ar=e.isDashing?12:e.isSliding?10:e.isSprinting?8:0,ir+=(ar-ir)*Math.min(1,6*t)}function fr(){rr=0}function pr(e){let t=e.canvas?.height||0,n=(e.settings?.hudScale||100)/100;return e.isTouchDevice&&t>0&&t<=420?Math.round(60*n):e.settings?.hudStyle===1?Math.round(160*n):0}function mr(e){let t=lr(e.player,e.settings);return cr(e.player,t,{h:e.canvas?.height||1,barH:pr(e)})}function hr(e,t,n=0,r){let i=t-n;return{x:e/2+(r?.aimOffsetX||0)*e,y:i/2+(r?.aimOffsetY||0)*i}}function gr(e,t,n){if(t.dx===0&&t.dy===0)return!1;let r=n.sensitivity||1,i=n.invertX?-1:1,{overflowX:a}=or(e,t.dx,t.dy,n);return a!==0&&(e.angle+=a*de*e.rotSpeed*r*i),t.dx=0,t.dy=0,!0}var _r=class{constructor(){tn(this,`_prevCrouchKey`,!1)}update(e,t){let{player:n,keys:r,keybinds:i,mouse:a,settings:o,mode:s,map:c,audio:l,noclip:u,voiceProfile:d}=e,f=0,p=0,m=Math.cos(n.angle),h=Math.sin(n.angle),g=null;if(n.dashCooldown>0&&(n.dashCooldown-=t),n.isDashing)if(n.dashTime-=t,n.dashTime<=0)n.isDashing=!1;else{let e=n.moveSpeed*3.5*n.dashDistMult;f=n.dashDirX*e*t,p=n.dashDirY*e*t;let i=.2,s=n.x+f,l=n.y+p;return(u||q(c,Math.floor(s+i*Math.sign(f)),Math.floor(n.y)))&&(n.x=s),(u||q(c,Math.floor(n.x),Math.floor(l+i*Math.sign(p))))&&(n.y=l),gr(n,a,o),r.ArrowLeft&&(n.angle-=n.rotSpeed*t),r.ArrowRight&&(n.angle+=n.rotSpeed*t),n.staminaRegenDelay=.5,g}let _=r[i.moveForward]||r[i.moveBack]||r[i.moveLeft]||r[i.moveRight]||r.ArrowUp||r.ArrowDown;n.isSprinting=(r[i.sprint]||r.ShiftRight)&&_&&n.stamina>0,l.setFootstepCadence(n.isSprinting?1.6:1),l.updateFootsteps(_&&!n.isDashing&&!n.isSliding,performance.now()),n.isSprinting?(n.stamina=Math.max(0,n.stamina-25*Math.max(0,n.sprintDrainMult)*t),n.staminaRegenDelay=.5,n.stamina<=0&&(n.isSprinting=!1)):n.staminaRegenDelay>0?n.staminaRegenDelay-=t:n.stamina=Math.min(n.maxStamina,n.stamina+15*n.staminaRegenRate*t);let v=!!r[i.crouch],y=v&&!this._prevCrouchKey;if(n.isCrouching=v&&!n.isSliding,y&&(n.isSprinting||n.isDashing)&&!n.isSliding&&n.slideCooldown<=0&&n.stamina>=n.slideStaminaCost&&(n.isSliding=!0,n.slideTime=n.slideDuration,n.slideDirX=Math.cos(n.angle),n.slideDirY=Math.sin(n.angle),n.stamina=Math.max(0,n.stamina-n.slideStaminaCost),n.slideCooldown=.8,n.staminaRegenDelay=.5,l.playerGrunt?.(d,`slide`),s===`tutorial`&&(g=g||{},g.tutorialSlid=!0)),n.slideCooldown>0&&(n.slideCooldown-=t),n.isSliding)if(n.slideTime-=t,n.slideTime<=0)n.isSliding=!1;else{let e=n.slideTime/n.slideDuration,r=n.moveSpeed*n.slideSpeedMult*(.6+.4*e);f=n.slideDirX*r*t,p=n.slideDirY*r*t;let i=.2,a=n.x+f,o=n.y+p;return(u||q(c,Math.floor(a+i*Math.sign(f)),Math.floor(n.y)))&&(n.x=a),(u||q(c,Math.floor(n.x),Math.floor(o+i*Math.sign(p))))&&(n.y=o),n.cameraTilt=(n.cameraTilt||0)+(.08-(n.cameraTilt||0))*Math.min(1,8*t),n.weaponBob+=t*18,n.staminaRegenDelay=.5,s===`tutorial`&&(g=g||{},g.tutorialCrouched=!0),this._prevCrouchKey=v,g}n.cameraTilt&&(n.cameraTilt+=(0-n.cameraTilt)*Math.min(1,8*t),Math.abs(n.cameraTilt)<.001&&(n.cameraTilt=0));let b=n.isSprinting?n.moveSpeed*1.6:n.moveSpeed;n.isCrouching&&(b*=.5,s===`tutorial`&&(g=g||{},g.tutorialCrouched=!0)),n.isAiming&&(b*=ye);let x=s===`meltdown`;!x&&(r[i.moveForward]||r.ArrowUp)&&(f+=m,p+=h),!x&&(r[i.moveBack]||r.ArrowDown)&&(f-=m,p-=h),r[i.moveLeft]&&(f+=h,p-=m),r[i.moveRight]&&(f-=h,p+=m);let S=Math.sqrt(f*f+p*p);S>0&&(f=f/S*b*t,p=p/S*b*t),n.isDashing?n.weaponBob+=t*22:S>0?n.weaponBob+=t*(n.isSprinting?15:8):n.weaponBob*=tr(.9,t);let C=a?.dx||0,w=a?.dy||0,T=n.isAiming?.25:1,E=!!r[i.moveRight]-+!!r[i.moveLeft];n.weaponSwayTargetX=er((n.weaponSwayTargetX-C*.45-E*2.2)*tr(.8,t),-22,22),n.weaponSwayTargetY=er((n.weaponSwayTargetY+w*.35)*tr(.8,t),-16,16);let D=Math.min(1,11*t);n.weaponSwayX+=(n.weaponSwayTargetX*T-n.weaponSwayX)*D,n.weaponSwayY+=(n.weaponSwayTargetY*T-n.weaponSwayY)*D,!gr(n,a,o)&&S>0&&!n.isFiring&&sr(n,t),r.ArrowLeft&&(n.angle-=n.rotSpeed*t),r.ArrowRight&&(n.angle+=n.rotSpeed*t);let O=.2,k=n.x+f,A=n.y+p;return(u||q(c,Math.floor(k+O*Math.sign(f)),Math.floor(n.y)))&&(n.x=k),(u||q(c,Math.floor(n.x),Math.floor(A+O*Math.sign(p))))&&(n.y=A),this._prevCrouchKey=v,g}triggerDash(e,t,n,r){let{player:i,keybinds:a}=e,o=Math.max(0,i.dashStaminaCost);if(i.dashCooldown>0||i.stamina<o||i.isDashing)return!1;let s=0,c=0;if(n!==void 0&&r!==void 0)s=n,c=r;else{let e=Math.cos(i.angle),n=Math.sin(i.angle);t===a.moveForward?(s=e,c=n):t===a.moveBack?(s=-e,c=-n):t===a.moveLeft?(s=n,c=-e):t===a.moveRight&&(s=-n,c=e)}return i.isDashing=!0,i.dashTime=.15,i.dashDirX=s,i.dashDirY=c,i.dashCooldown=.4,i.stamina-=o,i.staminaRegenDelay=.5,!0}},vr=class{update(e,t){let{entities:n,player:r,map:i,time:a,timeScale:o,projectiles:s,chronoBombs:c,damageNumbers:l,audio:u}=e,d={damagePlayerCalls:[],screenShake:0,hudDisabledUntil:null,ariaMessages:[],totalEnemiesAdded:0};for(let e=n.length-1;e>=0;e--){let r=n[e];r.dissolving&&(r.dissolveTimer-=t,r.dissolveTimer<=0&&(r.dissolving=!1,r.active=!1))}for(let e of n){if(e.type!==`enemy`||!e.active||e.dissolving)continue;let f=Number.isFinite(e.chronoMultiplier)?e.chronoMultiplier:Number.isFinite(e.def?.chronoMultiplier)?e.def.chronoMultiplier:.15,p=r.chronoActive?t*f:t,m=r.x-e.x,h=r.y-e.y,g=Math.sqrt(m*m+h*h),_=e.def.ai||`chase`;if(e.painTimer>0){e.painTimer-=p*1e3,e.painTimer<=0&&(e.state=`chase`);continue}if(!(e._empDisabledUntil&&a<e._empDisabledUntil)){if(e.stateTime+=p,e.state===`idle`&&(_===`patrol`&&this._patrolWander(e,p,i),g<e.alertRange&&$n(i,e.x,e.y,r.x,r.y)&&(e.state=`chase`,e.stateTime=0,e.lastAttackTime=a)),e.state===`chase`){let t=Math.atan2(h,m);e.angle=t,this._updateBeastCharge(e,p,g,t,r,i,d);let n=g<=e.def.attackRange*.8,s=_===`strafe_fire`||_===`erratic`;if(e._chargeState!==`sprint`&&(!n||s)){let n=t,r=e.speed;if(_===`flanker`)n=t+(Math.floor(e.x*7+e.y*13)%2?1:-1)*Math.min(1,g/(e.def.attackRange*1.5))*1.05,r*=1.1;else if(_===`strafe_fire`){e._orbitDir??(e._orbitDir=Math.floor(e.x*11+e.y*17)%2?1:-1),e._orbitFlipTimer??(e._orbitFlipTimer=2+Math.random()*2),e._orbitFlipTimer-=p,e._orbitFlipTimer<=0&&(e._orbitDir*=-1,e._orbitFlipTimer=2+Math.random()*2);let i=e.def.attackRange*.7,a=g>i?0:Math.PI,o=e._orbitDir*Math.PI*.5;n=g<i*.75?t+a:t+o,r*=.9}else _===`erratic`?(e._jitterTimer??(e._jitterTimer=0),e._dodgeTimer??(e._dodgeTimer=1+Math.random()*2),e._jitterTimer-=p,e._dodgeTimer-=p,e._jitterTimer<=0&&(e._jitterOffset=(Math.random()-.5)*1.4,e._jitterTimer=.15+Math.random()*.2),e._dodgeTimer<=0&&(e._dodgeOffset=Math.PI*.5*(Math.random()<.5?-1:1),e._dodgeDuration=.25,e._dodgeTimer=1.5+Math.random()*2),e._dodgeDuration>0?(n=t+(e._dodgeOffset||0),e._dodgeDuration-=p,r*=1.3):n=t+(e._jitterOffset||0)):_===`ambush`?e.stateTime<2&&(r*=1.8):_===`guard`?g<e.def.attackRange*.5?(n=t+Math.PI,r*=.6):r=0:_===`swarm`?(n=t+(Math.floor(e.x*3+e.y*7)%2?1:-1)*Math.PI*.45,r*=1.2):_===`support`?g<e.def.attackRange*.6?(n=t+Math.PI,r*=.8):g>e.def.attackRange*.9?r*=.6:r=0:(_===`teleport_strike`||_===`teleport_melee`)&&(r*=.5);let a=r*p,o=e.x+Math.cos(n)*a,s=e.y+Math.sin(n)*a,c=.3,l=Math.cos(n)>=0?c:-c,u=Math.sin(n)>=0?c:-c;q(i,Math.floor(o+l),Math.floor(e.y))&&q(i,Math.floor(o+l),Math.floor(e.y+c))&&q(i,Math.floor(o+l),Math.floor(e.y-c))&&(e.x=o),q(i,Math.floor(e.x),Math.floor(s+u))&&q(i,Math.floor(e.x+c),Math.floor(s+u))&&q(i,Math.floor(e.x-c),Math.floor(s+u))&&(e.y=s)}let c=r.chronoActive&&f>0?f:1,l=e.def.attackRate/o/c;g<e.def.attackRange&&a-e.lastAttackTime>l&&$n(i,e.x,e.y,r.x,r.y)&&(e.state=`attack`,e.stateTime=0,e.lastAttackTime=a)}if(e.state===`attack`){if($n(i,e.x,e.y,r.x,r.y))if(e.def.attackType===`ranged`){let t=Math.atan2(r.y-e.y,r.x-e.x),i=new on(e.x+Math.cos(t)*.4,e.y+Math.sin(t)*.4,Math.cos(t),Math.sin(t),e.def.damage,e.def.projectileSpeed||6,`enemy`);i.color=e.def.color1,s.push(i),n.push(i),u.enemyShoot(u.calculatePan(e.x,e.y,r.x,r.y,r.angle))}else d.damagePlayerCalls.push({damage:e.def.damage,attacker:e});e.state=`chase`,e.stateTime=0}if(e.def.summonType&&e.state!==`dead`&&(e._summonTimer=(e._summonTimer||0)+t*1e3,e._summonTimer>=e.def.summonInterval&&(e._summonTimer=0,n.filter(e=>e.type===`enemy`&&e.active&&e._summoned&&e.state!==`dead`).length<(e.def.summonMax||3)))){let t=Math.random()*Math.PI*2,r=e.x+Math.cos(t)*1.5,a=e.y+Math.sin(t)*1.5;if(q(i,Math.floor(r),Math.floor(a))){let t=new W(r,a,e.def.summonType);t._summoned=!0,n.push(t),d.totalEnemiesAdded++}}if(e.def.dropsBombs&&e.state===`chase`&&(e._bombTimer=(e._bombTimer||0)+t*1e3,e._bombTimer>=4e3&&(e._bombTimer=0,c.push({x:e.x,y:e.y,radius:e.def.bombRadius||2,damage:e.def.bombDamage||25,fuseLife:0,fuseDuration:1.5,active:!0}))),e.state!==`dead`){if(e.def.teleportCooldown||e.def.leapDistance){e._teleportTimer=e._teleportTimer||0,e._teleportTimer+=t*1e3;let n=e.def.teleportCooldown||3e3;if(e._teleportTimer>=n&&(e._teleportTimer=0,g>(e.def.attackRange||2)*.8&&g<30)){let t=Math.atan2(r.y-e.y,r.x-e.x),n=e.def.leapDistance||Math.max(1.5,e.def.attackRange||3),o=r.x-Math.cos(t)*Math.min(1.5,n),s=r.y-Math.sin(t)*Math.min(1.5,n);q(i,Math.floor(o),Math.floor(s))&&(e.x=o,e.y=s,e.state=`attack`,e.stateTime=0,e.lastAttackTime=a,d.screenShake=Math.max(d.screenShake,2),u.enemyHit(u.calculatePan(e.x,e.y,r.x,r.y,r.angle),Math.hypot(e.x-r.x,e.y-r.y)))}}e.def.shieldRegen&&(e._shieldMax??(e._shieldMax=e.def.shieldMax||Math.max(20,Math.floor(e.def.health*.25)),e._shield=e._shieldMax),e._shield=Math.min(e._shieldMax,(e._shield||0)+(e.def.shieldRegenRate||2)*t)),e.def.disablesHUD&&(e._supportTimer=(e._supportTimer||0)+t*1e3,e._supportTimer>=(e.def.supportInterval||8500)&&(e._supportTimer=0,d.hudDisabledUntil=a+(e.def.disableDuration||3e3),d.ariaMessages.push(`hudDisrupted`))),this._updateBoss(e,t,g,r,i,s,n,l,u,d)}}}for(let e of c)if(e.active&&(e.fuseLife+=t,e.fuseLife>=e.fuseDuration)){let t=r.x-e.x,n=r.y-e.y;t*t+n*n<e.radius*e.radius&&d.damagePlayerCalls.push({damage:e.damage}),e.active=!1}return d}_updateBoss(e,t,n,r,i,a,o,s,c,l){if(!(e.enemyType===`boss`||e.enemyType===`boss_form2`||e.enemyType===`boss_form3`)||e.state===`dead`||e.dissolving)return;let u=e.def.form||1;e._bossChargeCD=e._bossChargeCD||0,e._bossStompCD=e._bossStompCD||0,e._bossMissileCD=e._bossMissileCD||0,e._bossTeleportCD=e._bossTeleportCD||0,e._bossChargeCD-=t*1e3,e._bossStompCD-=t*1e3,e._bossMissileCD-=t*1e3,e._bossTeleportCD-=t*1e3;let d=Math.atan2(r.y-e.y,r.x-e.x);if(u>=1&&e._bossChargeCD<=0&&n>4&&n<20&&(e._bossChargeCD=6e3,e._bossCharging=!0,e._bossChargeTimer=0,e._bossChargeDuration=1,e._bossChargeAngle=d),e._bossCharging){e._bossChargeTimer+=t;let n=e.speed*3.5*t,a=e.x+Math.cos(e._bossChargeAngle)*n,o=e.y+Math.sin(e._bossChargeAngle)*n;q(i,Math.floor(a),Math.floor(o))&&(e.x=a,e.y=o);let s=r.x-e.x,c=r.y-e.y;s*s+c*c<1.5*1.5&&(l.damagePlayerCalls.push({damage:e.def.damage*1.5,attacker:e}),l.screenShake=Math.max(l.screenShake,8),e._bossCharging=!1),e._bossChargeTimer>=e._bossChargeDuration&&(e._bossCharging=!1,l.screenShake=Math.max(l.screenShake,3))}if(u>=2&&e._bossStompCD<=0&&n<5&&(e._bossStompCD=5e3,n<4&&(l.damagePlayerCalls.push({damage:e.def.damage*.8,attacker:e}),l.screenShake=Math.max(l.screenShake,12)),s.push({x:e.x,y:e.y,value:`STOMP!`,crit:!0,life:1.2,vx:(Math.random()-.5)*20})),u>=2&&e._bossMissileCD<=0&&n>3&&n<e.def.attackRange*1.2){e._bossMissileCD=4e3;for(let t=-1;t<=1;t++){let n=d+t*.3,r=new on(e.x+Math.cos(n)*.5,e.y+Math.sin(n)*.5,Math.cos(n),Math.sin(n),e.def.damage*.6,7,`enemy`);r.color=u===3?`#ff2244`:`#e04800`,a.push(r),o.push(r)}c.enemyShoot(c.calculatePan(e.x,e.y,r.x,r.y,r.angle))}if(u>=3&&e._bossTeleportCD<=0&&n>8){e._bossTeleportCD=8e3;let t=r.angle+Math.PI,n=r.x+Math.cos(t)*3,a=r.y+Math.sin(t)*3;q(i,Math.floor(n),Math.floor(a))&&(e.x=n,e.y=a,l.screenShake=Math.max(l.screenShake,5),s.push({x:e.x,y:e.y,value:`WARP!`,crit:!0,life:1,vx:(Math.random()-.5)*20}))}}_updateBeastCharge(e,t,n,r,i,a,o){let s=e.def;if(s.chargeCooldown){if(e._chargeCD=(e._chargeCD??0)-t,e._chargeState=e._chargeState??`ready`,e._chargeState===`ready`){e._chargeCD<=0&&n>s.attackRange&&n<s.sightRange&&(e._chargeState=`windup`,e._chargeTimer=s.chargeWindup??.6,e._chargeAngle=r);return}if(e._chargeState===`windup`){e._chargeTimer-=t,e._chargeTimer<=0&&(e._chargeState=`sprint`,e._chargeTimer=s.chargeDuration??.9,e._chargeAngle=r);return}if(e._chargeState===`sprint`){let n=e.speed*(s.chargeSpeedMul??3)*t,r=e.x+Math.cos(e._chargeAngle)*n,c=e.y+Math.sin(e._chargeAngle)*n,l=.3,u=!1;q(a,Math.floor(r+(Math.cos(e._chargeAngle)>=0?l:-l)),Math.floor(e.y))?e.x=r:u=!0,q(a,Math.floor(e.x),Math.floor(c+(Math.sin(e._chargeAngle)>=0?l:-l)))?e.y=c:u=!0;let d=i.x-e.x,f=i.y-e.y;if(d*d+f*f<1.2*1.2){o.damagePlayerCalls.push({damage:s.damage*(s.chargeDamageMul??1.5),attacker:e}),o.screenShake=Math.max(o.screenShake,6),e._chargeState=`ready`,e._chargeCD=s.chargeCooldown;return}e._chargeTimer-=t,(e._chargeTimer<=0||u)&&(e._chargeState=`ready`,e._chargeCD=s.chargeCooldown)}}}_patrolWander(e,t,n){e._wanderAngle??(e._wanderAngle=e.angle,e._wanderTimer=0),e._wanderTimer-=t,e._wanderTimer<=0&&(e._wanderAngle+=(Math.random()-.5)*Math.PI,e._wanderTimer=1.5+Math.random()*2);let r=e.speed*.35*t,i=e.x+Math.cos(e._wanderAngle)*r,a=e.y+Math.sin(e._wanderAngle)*r,o=.3,s=Math.cos(e._wanderAngle)>=0?o:-o,c=Math.sin(e._wanderAngle)>=0?o:-o;q(n,Math.floor(i+s),Math.floor(e.y))&&q(n,Math.floor(i+s),Math.floor(e.y+o))&&q(n,Math.floor(i+s),Math.floor(e.y-o))?e.x=i:e._wanderAngle+=Math.PI,q(n,Math.floor(e.x),Math.floor(a+c))&&q(n,Math.floor(e.x+o),Math.floor(a+c))&&q(n,Math.floor(e.x-o),Math.floor(a+c))?e.y=a:e._wanderAngle+=Math.PI,e.angle=e._wanderAngle}},yr=class{constructor(e){this._state=e|0}next(){let e=this._state+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}nextInt(e,t){return e+Math.floor(this.next()*(t-e+1))}pick(e){return e[Math.floor(this.next()*e.length)]}shuffle(e){for(let t=e.length-1;t>0;t--){let n=Math.floor(this.next()*(t+1));[e[t],e[n]]=[e[n],e[t]]}return e}static arenaSeed(e,t){return e*2654435761+t*40503|0}};function br(e,t,n){if(!e||n===`boss`||n===`boss_form2`||n===`boss_form3`)return[e,t];let r=(Math.random()-.5)*16,i=(Math.random()-.5)*.12;return[xr(e,r,i),xr(t,r,i*.6)]}function xr(e,t,n){if(!e||e.length<7)return e;let r=parseInt(e.slice(1,3),16)/255,i=parseInt(e.slice(3,5),16)/255,a=parseInt(e.slice(5,7),16)/255,o=Math.max(r,i,a),s=Math.min(r,i,a),c=0,l=0,u=(o+s)/2;if(o!==s){let e=o-s;switch(l=u>.5?e/(2-o-s):e/(o+s),o){case r:c=((i-a)/e+(i<a?6:0))/6;break;case i:c=((a-r)/e+2)/6;break;case a:c=((r-i)/e+4)/6;break}}c=(c*360+t+360)%360/360;let d=Math.max(0,Math.min(1,u+n));return Sr(c,l,d)}function Sr(e,t,n){let r,i,a;if(t===0)r=i=a=n;else{let o=(e,t,n)=>(n<0&&(n+=1),n>1&&--n,n<1/6?e+(t-e)*6*n:n<1/2?t:n<2/3?e+(t-e)*(2/3-n)*6:e),s=n<.5?n*(1+t):n+t-n*t,c=2*n-s;r=o(c,s,e+1/3),i=o(c,s,e),a=o(c,s,e-1/3)}let o=e=>Math.round(e*255).toString(16).padStart(2,`0`);return`#`+o(r)+o(i)+o(a)}function Cr(e){switch(e){case 0:return{healthMul:.6,damageMul:.5,speedMul:.8,spawnMul:.7,timerBonus:20};case 2:return{healthMul:1.4,damageMul:1.4,speedMul:1.15,spawnMul:1.3,timerBonus:-10};case 3:return{healthMul:2,damageMul:1.8,speedMul:1.3,spawnMul:1.6,timerBonus:-20};default:return{healthMul:1,damageMul:1,speedMul:1,spawnMul:1,timerBonus:0}}}function wr(e){let t=[`drone`,`glitchling`];return e>=2&&t.push(`phantom`,`corruptCop`),e>=4&&t.push(`beast`,`sentinel`),e>=6&&t.push(`henchman`,`chronoBomber`),e>=8&&t.push(`shieldCommander`),e>=10&&t.push(`temporalSummoner`),t}function Tr(e,t,n,r){let i=wr(e),a=Math.min(t.length,Math.floor((4+e*3)*n.spawnMul)),o=[];for(let s=0;s<a;s++){let a=t[s%t.length],c=r?r.pick(i):i[Math.floor(Math.random()*i.length)],l=new W(a.x,a.y,c);l.health=Math.floor(l.health*(1+(e-1)*.15)*n.healthMul),l.maxHealth=l.health,l.def={...l.def,damage:Math.floor(l.def.damage*n.damageMul),speed:l.def.speed*n.speedMul},o.push(l)}return o}function Er(e,t,n){let r=[];for(let t of e)r.push(new rn(t.x+.5,t.y+.5,t.type,{weaponId:t.weaponId}));if(t>=3){let e=n.width-4.5,i=t>=5?3:2;r.push(new rn(e,4.5,`weapon`,{weaponId:i}))}return r}function Dr(e,t,n,r,i){let a=e.filter(e=>{let i=e.x-t,a=e.y-n;if(Math.sqrt(i*i+a*a)<5)return!1;let o=Math.floor(e.x),s=Math.floor(e.y);return s<0||s>=r.length||o<0||o>=r[0].length?!1:r[s][o]===0});return i?i.shuffle(a):a.sort(()=>Math.random()-.5)}function Or(e,t,n,r){let i=1+(n||0)*.3,a=[],o=e.width??e.grid?.[0]?.length??0,s=e.height??e.grid?.length??0,c=(t,n)=>{if(!e.grid)return{x:t,y:n};let r=Fr(t|0,n|0,e.grid,o,s);return r?{x:r.x+.5,y:r.y+.5}:{x:t,y:n}};for(let o of e.entities){let e=c(o.x,o.y);if(o.type===`enemy`){let s=o.enemyType;s===`boss`&&(t===2?s=`boss_form2`:t===3&&(s=`boss_form3`));let c=new W(e.x,e.y,s),l=s.startsWith(`boss`)?1:1+(t-1)*.4;c.health=Math.floor(c.health*r.healthMul*l*i),c.maxHealth=c.health,c.def={...c.def,damage:Math.floor(c.def.damage*r.damageMul*l*i),speed:c.def.speed*r.speedMul*(1+(n||0)*.1)},a.push(c)}else a.push(new rn(e.x,e.y,o.type,{weaponId:o.weaponId}))}let l=null;if(e.exit){let t=c(e.exit.x,e.exit.y);l={x:t.x,y:t.y,type:`exit`,active:!0},a.push(l)}if(Array.isArray(e.props)&&e.grid){let t=e.width??e.grid[0]?.length??0,n=e.height??e.grid.length??0;for(let r of e.props){let i=Fr(r.x|0,r.y|0,e.grid,t,n);i&&a.push(new an(i.x+.5,i.y+.5,r.type))}}return{entities:a,exitEntity:l}}function kr(e,t,n,r){let i=[];for(let a=0;a<e.length;a++){let o=e[a];if(!t.includes(o)){let t=a/e.length*Math.PI*2;i.push(new rn(n+Math.cos(t)*1.5,r+Math.sin(t)*1.5,`weapon`,{weaponId:o}))}}return i}function Ar(e,t){let n=[];for(let r of e){let e=m[r.type]||m.drone,i=new W(r.x,r.y,r.type);i.health=e.health*t.healthMul,i.maxHealth=i.health,i.speed=e.speed*t.speedMul,i.damage=(e.damage||10)*t.damageMul,i.aiType=e.aiType||`patrol`;let[a,o]=br(e.baseColor||`#ff0000`,e.darkColor||`#880000`,i.enemyType);i.baseColor=a,i.darkColor=o,n.push(i)}return n}function jr(e){return e.map(e=>new rn(e.x,e.y,e.type,{weaponId:e.weaponId}))}var Mr={1:[`drone`,`glitchling`,`phantom`,`corruptCop`,`sentinel`],2:[`corruptCop`,`henchman`,`beast`,`phaseStalker`,`chronoBomber`,`temporalEngineer`,`shieldCommander`],3:[`beast`,`riftLeaper`,`timeWarden`,`temporalSummoner`,`echoDrone`,`sentinel`,`phaseStalker`]},Nr={1:{henchman:`corruptCop`,beast:`sentinel`,phaseStalker:`phantom`,chronoBomber:`phantom`,temporalEngineer:`phantom`,shieldCommander:`sentinel`,riftLeaper:`phantom`,timeWarden:`sentinel`,temporalSummoner:`phantom`,echoDrone:`drone`},2:{drone:`corruptCop`,glitchling:`phaseStalker`,phantom:`henchman`,sentinel:`shieldCommander`,riftLeaper:`phaseStalker`,timeWarden:`shieldCommander`,temporalSummoner:`temporalEngineer`,echoDrone:`chronoBomber`},3:{drone:`echoDrone`,glitchling:`phaseStalker`,corruptCop:`sentinel`,phantom:`riftLeaper`,henchman:`riftLeaper`,chronoBomber:`temporalSummoner`,temporalEngineer:`temporalSummoner`,shieldCommander:`timeWarden`}};function Pr(e,t,n){let r=Mr[t]||Mr[1],i=Nr[t]||{};for(let t of e)if(t.type===`enemy`&&!(t.enemyType&&t.enemyType.startsWith(`boss`))&&t.enemyType&&!r.includes(t.enemyType)){let e=i[t.enemyType];if(e&&m[e]){let r=m[e];t.enemyType=e,t.health=r.health*n.healthMul,t.maxHealth=t.health,t.speed=r.speed*n.speedMul,t.damage=(r.damage||10)*n.damageMul;let[i,a]=br(r.color1||`#ff0000`,r.color2||`#880000`,t.enemyType);t.baseColor=i,t.darkColor=a}}}function Fr(e,t,n,r,i){if(e>=0&&t>=0&&e<r&&t<i&&n[t][e]===0)return{x:e,y:t};let a=[[e,t,0]],o=new Set([`${e},${t}`]),s=[[1,0],[-1,0],[0,1],[0,-1]];for(let e=0;e<a.length;e++){let[t,c,l]=a[e];if(l>5)break;for(let[e,u]of s){let s=t+e,d=c+u,f=`${s},${d}`;if(!o.has(f)){if(o.add(f),s>=0&&d>=0&&s<r&&d<i&&n[d][s]===0)return{x:s,y:d};a.push([s,d,l+1])}}}return null}function Ir(e,t,n,r){let i=e,a=!1,o=!1;if(n&&Math.random()<n&&(i*=2,a=!0),t.def.frontShield){let e=r.x-t.x,n=r.y-t.y,a=Math.atan2(n,e),o=t.angle||0,s=Math.abs(a-o);s>Math.PI&&(s=2*Math.PI-s),s<Math.PI/3&&(i*=.2)}if(t._shield&&t._shield>0){let e=Math.min(t._shield,i);t._shield-=e,i-=e,e>0&&(o=!0)}return{finalDamage:i,isCrit:a,shieldSpark:o}}function Lr(e,t,n,r,i){let a=2.5,o=n*r,s=[];for(let n of e){if(n===t||n.type!==`enemy`||!n.active||n.state===`dead`)continue;let e=n.x-t.x,r=n.y-t.y;e*e+r*r>=a*a||(n.health-=o,n.hitTime=i,n.health<=0&&(n.state=`dead`,n.dissolving=!0,n.dissolveTimer=.5,n.deathTime=i,s.push(n)))}return s}function Rr(e,t){e.state=`dead`,e.dissolving=!0,e.dissolveTimer=.5,e.deathTime=t}function zr(e,t){if(t.dodgeChance>0&&Math.random()<t.dodgeChance)return{actualDamage:0,dodged:!0,shieldAbsorbed:0};let n=Math.max(1,e-t.armor*.3),r=0;return t.shield>0&&(r=Math.min(t.shield,n),t.shield-=r,n-=r),{actualDamage:n,dodged:!1,shieldAbsorbed:r}}function Br(e){return e.enemyType===`boss`||e.enemyType===`boss_form2`||e.enemyType===`boss_form3`}function Vr(e){return Math.max(z,(e.def?.radius||0)+fe)}function Hr(e,t,n,r,i){let a=Math.floor(e.x),o=Math.floor(e.y),s=Math.abs(1/(Math.abs(t)<1e-9?1e-9:t)),c=Math.abs(1/(Math.abs(n)<1e-9?1e-9:n)),l=t<0?-1:1,u=n<0?-1:1,d=t<0?(e.x-a)*s:(a+1-e.x)*s,f=n<0?(e.y-o)*c:(o+1-e.y)*c,p=0;for(;;){if(d<f?(d+=s,a+=l,p=0):(f+=c,o+=u,p=1),a<0||o<0||a>=r.width||o>=r.height)return i;let m=p===0?(a-e.x+(1-l)/2)/t:(o-e.y+(1-u)/2)/n;if(m>i)return i;if(r.grid[o][a]>0)return Math.max(0,m)}}function Ur(e,t,n,r,i,a){if(a.type!==`enemy`||!a.active||a.state===`dead`)return null;let o=a.x-e.x,s=a.y-e.y,c=o*t+s*n;if(c<=0||c>r)return null;let l=Math.tan(i||0)*c,u=Wr(a,l,t,n),d=u.tight?ge:1,f=o-t*c,p=s-n*c,m=Math.max(Vr(a)-(u.tight?_e:0),c*me*d);if(f*f+p*p>m*m){if(u.tight){let e=Math.max(Vr(a),c*me);if(f*f+p*p>e*e)return null;let t=(a.def?.hitCenter??.35)+(a.z||0),n=Math.max((a.def?.hitHeight??.55)+pe,c*he);return Math.abs(l-t)>n?null:{enemy:a,dist:c,zone:{name:`body`,mult:1,tight:!1}}}return null}let h=(a.def?.hitCenter??.35)+(a.z||0),g=Math.max((a.def?.hitHeight??.55)+pe,c*he);return Math.abs(l-h)>g?null:{enemy:a,dist:c,zone:u}}function Wr(e,t,n,r){let i=e.def?.hitZones;if(!i||!i.length)return{name:`body`,mult:1,tight:!1};let a=e.def?.hitCenter??.35,o=e.def?.hitHeight??.55,s=t-((e.z||0)+a-o);for(let t of i)if(!(s>t.top||s<t.bottom)){if(t.frontOnly||t.rearOnly){let i=e.angle||0,a=Math.atan2(r,n)+Math.PI-i;for(;a>Math.PI;)a-=2*Math.PI;for(;a<-Math.PI;)a+=2*Math.PI;let o=Math.abs(a)<Math.PI/3;if(t.frontOnly&&!o||t.rearOnly&&o)continue}return{name:t.name,mult:t.mult,tight:!!t.tight}}return{name:`body`,mult:1,tight:!1}}function Gr(e,t,n,r,i,a,o){let s=o?Hr(e,t,n,o,i):i,c=null;for(let i of a){let a=Ur(e,t,n,s,r,i);a&&(!c||a.dist<c.dist)&&(c=a)}return c}function Kr(e,t,n,r){if(t.type!==`enemy`||!t.active||t.state===`dead`)return null;let i=e.originX??n??e.x,a=e.originY??r??e.y,o=Math.hypot(e.x-i,e.y-a);if(o<=0){let n=e.x-t.x,r=e.y-t.y,i=Vr(t);return n*n+r*r<=i*i?{enemy:t,dist:0}:null}let s=(e.x-i)/o,c=(e.y-a)/o,l=Ur({x:i,y:a},s,c,o,e.pitch||0,t);if(!l)return null;let u=n!=null&&r!=null?Math.hypot(n-i,r-a):0;return l.dist+.05<u?null:l}var qr=3e3,Jr=500,Yr=3,Xr=2,Zr=.5,Qr=50,$r=.25;function ei(e){return e?.type===`enemy`&&e.active&&e.state!==`dead`}function ti(e,t,n,r,i,a){let o=a.query(e.x,e.y,Yr);for(let t of o){if(!ei(t))continue;let r=t.x-e.x,i=t.y-e.y;r*r+i*i>=Yr*Yr||t.def?.attackType!==`ranged`&&t.enemyType!==`drone`||(t._empDisabledUntil=n+qr,t.state=`pain`,t.painTimer=Jr)}}function ni(e,t,n){let r=n.entityGrid.query(e.x,e.y,Xr);for(let i of r){if(i===t||!ei(i))continue;let r=e.x-i.x,a=e.y-i.y;r*r+a*a<Xr*Xr&&n.damageEnemy(i,e.damage*Zr)}n.lights&&n.lights.push({x:e.x,y:e.y,color:[255,140,50],radius:6,baseIntensity:2.2,intensity:2.2,life:.25,maxLife:.25})}function ri(e,t,n,r){let i=Math.max(1.5,Math.hypot(e.x-n,e.y-r)+.8),a=t.entityGrid.query(e.x,e.y,i),o=null;for(let t of a){let i=Kr(e,t,n,r);i&&(!o||i.dist<o.dist)&&(o=i)}if(!o)return!1;let s=o.enemy;if(e.emp){s._shield&&(s._shield=0),s._empDisabledUntil=t.time+qr,s.state=`pain`,s.painTimer=Jr;let n=t.audio.calculatePan(s.x,s.y,t.player.x,t.player.y,t.player.angle),r=Math.hypot(s.x-t.player.x,s.y-t.player.y);t.audio.enemyHit(n,r),ti(e,s,t.time,t.audio,t.player,t.entityGrid)}return t.damageEnemy(s,e.damage,o.zone),e.active=!1,e.damage>Qr&&ni(e,s,t),!0}function ii(e,t){let n=e.x-t.player.x,r=e.y-t.player.y;return n*n+r*r<$r?(t.damagePlayer(e.damage),e.active=!1,!0):!1}function ai(e,t,n){let r=e.x,i=e.y;e.x+=e.dirX*e.speed*n,e.y+=e.dirY*e.speed*n;let a=Math.floor(e.x),o=Math.floor(e.y),{map:s}=t;if(a<0||o<0||a>=s.width||o>=s.height){e.active=!1;return}if(s.grid[o][a]>0){t.spawnWallSparks(e.x,e.y),e.active=!1;return}e.owner===`player`?ri(e,t,r,i):e.owner===`enemy`&&ii(e,t)}function oi(e,t){let{projectiles:n,entities:r}=e;for(let r of n){if(!r.active)continue;let n=r.speed*t,i=Math.max(1,Math.ceil(n/.3)),a=t/i;for(let t=0;t<i&&r.active;t++)ai(r,e,a);r.life-=t,r.life<=0&&(r.active=!1)}let i=0;for(let e=0;e<n.length;e++)n[e].active&&(n[i++]=n[e]);n.length=i;let a=0;for(let e=0;e<r.length;e++){let t=r[e];(t.type!==`projectile`||t.active)&&(r[a++]=t)}r.length=a}function si(e){let t=e.time,n=e.player.getWeaponDef();if(!n||t-e.player.lastFireTime<n.fireRate/(e.player.fireRateMultiplier||1)||e.player.ammo<n.ammoPerShot&&n.id!==0)return;e.player.lastFireTime=t,n.id!==0&&(e.player.ammo-=n.ammoPerShot),e.player.weaponKick=1,e.weaponAnimFrame=1,e.weaponAnimTime=t,e.shotsFired++,e.achievementStats.totalShotsFired++,e.mode===`tutorial`&&(e.tutorialFired=!0),e._spawnMuzzleFlash(n),e._muzzleFlashTime=t,e._muzzleFlashColor={2:`80,220,255`,7:`80,220,255`,3:`255,160,40`,6:`100,255,120`}[n.id]||`255,200,60`;let r=[`shootPistol`,`shootShotgun`,`shootPlasma`,`shootCannon`,`shootScattergun`,`shootSniper`,`shootRicochet`,`shootEMP`][n.id];r&&e.audio[r]();let i=n.damage*e.player.damageMultiplier,{yaw:a,pitch:o}=mr(e),s=e.player.isAiming?be:1;if(n.type===`hitscan`){let t=(n.pellets||1)*(e.player.multiShot||1);for(let r=0;r<t;r++)ci(e,a+(t>1?(Math.random()-.5)*n.spread*2*s:0),i,n.range,o)}else{let t=e.player.multiShot||1;for(let r=0;r<t;r++){let c=a+(t>1?(r-(t-1)/2)*.12*s:0),l=Math.cos(c),u=Math.sin(c),d=new on(e.player.x,e.player.y,l,u,i,12,`player`);d.pitch=o,d.weaponId=n.id,n.id===7&&(d.emp=!0),d.color=e.getCharacterColor().accent||n.color,e.projectiles.push(d),e.entities.push(d)}}e.screenShake=Math.max(e.screenShake,n.id===3?6:n.id===1?4:2);let c=[.015,.03,.015,.04,.025,.035,.02,.025],l=e.player.isAiming?.5:1;e.player.cameraPunch=Math.max(e.player.cameraPunch,(c[n.id]||.015)*l),e.gamepad?.vibrateLight?.()}function ci(e,t,n,r,i=0){let a=Math.cos(t),o=Math.sin(t),s=Gr(e.player,a,o,i,r,e.entities,e.map),c;if(s)c=s.dist,li(e,s.enemy,n,s.zone);else{let t=Hr(e.player,a,o,e.map,r);c=t,t<r&&e.spawnWallSparks(e.player.x+a*t,e.player.y+o*t)}if(e.tracers){let t=e.player.getWeaponDef?.();e.tracers.push({x1:e.player.x,y1:e.player.y,x2:e.player.x+a*c,y2:e.player.y+o*c,pitch:i,life:.06,maxLife:.06,color:{0:`255,210,80`,1:`255,180,80`,4:`255,160,40`,5:`120,220,255`,6:`100,255,120`}[t?.id]||`255,220,120`})}}function li(e,t,n,r=null){e.shotsHit++,e.achievementStats.totalShotsHit++;let i=r?.name||`body`,a=n*(r?.mult??1),o=i===`head`,{finalDamage:s,isCrit:c,shieldSpark:l}=Ir(a,t,e.player.critChance,e.player);l&&(e.glitchEffect=Math.max(e.glitchEffect,.08)),t.def.subBoss&&!t._ariaTriggered&&(t._ariaTriggered=!0,e.queueAriaMessage(`subBossEncounter`)),t.health-=s,t.hitTime=e.time,t.state=`pain`,t.painTimer=c||o?250:150;let u=e.audio.calculatePan(t.x,t.y,e.player.x,e.player.y,e.player.angle),d=Math.hypot(t.x-e.player.x,t.y-e.player.y);if(e.audio.enemyHit(u,d),e.audio.hitConfirm?.(u),o&&e.audio.enemyHit?.(u,d),e.hitMarker=c||o?.22:.15,e.hitMarkerCrit=c,e.hitMarkerHead=o,e.hitMarkerKill=t.health<=0,e._lastHitWasCrit=c||o,e._spawnHitImpact(t.x,t.y,t.def.color1,c||o),e.damageNumbers.push({x:t.x,y:t.y,value:Math.round(s),crit:c,zone:i,head:o,life:.8,vx:(Math.random()-.5)*30}),e.player.lifeSteal&&e.player.alive){let t=s*e.player.lifeSteal;e.player.health=Math.min(e.player.health+t,e.player.maxHealth)}if(e.player.splashDamage&&s>0){let n=Lr(e.entities,t,s,e.player.splashDamage,e.time);for(let t of n){e.player.score+=t.def.score,e.player.kills++,e.killedEnemies++,e.achievementStats.totalKills++;let n=e.audio.calculatePan(t.x,t.y,e.player.x,e.player.y,e.player.angle),r=Math.hypot(t.x-e.player.x,t.y-e.player.y);e.audio.enemyDeath(n,r),e.spawnDeathParticles(t.x,t.y,t.def.color1,t.def.color2),e.glitchEffect=.3,ui(e,t)}n.length>=2&&e.triggerAriaOnce(`multiKillSplash`,`multiKillSplash`)}if(t.health<=0){Rr(t,e.time),e.player.score+=t.def.score,e.player.kills++,e.killedEnemies++,e.achievementStats.totalKills++;let n=e.audio.calculatePan(t.x,t.y,e.player.x,e.player.y,e.player.angle),r=Math.hypot(t.x-e.player.x,t.y-e.player.y);e.audio.enemyDeath(n,r),e.spawnDeathParticles(t.x,t.y,t.def.color1,t.def.color2),e.glitchEffect=.3,ui(e,t),e.hitStopFrames=Math.max(e.hitStopFrames||0,c||o?5:3),e.gamepad?.vibrateMedium?.(),Br(t)&&e.mode===`campaign`&&e.campaign.handleBossKill()}}function ui(e,t){let n=e.killStreakSystem.onKill();if(t&&e.mode===`campaign`&&Math.random()<.18&&e.entities.push(new rn(t.x,t.y,`ammo`)),e.player.chronoEnergy=Math.min(e.player.maxChronoEnergy,e.player.chronoEnergy+n.chronoBonus),n.screenShake&&(e.screenShake=Math.max(e.screenShake,n.screenShake)),n.playAudio&&e.audio.roundComplete(),n.glitchEffect&&(e.glitchEffect=Math.max(e.glitchEffect,n.glitchEffect)),n.ariaCategory&&e.queueAriaMessage(n.ariaCategory),e.triggerAriaOnce(`firstKill`,`firstKill`),t?.def?.echoCloneOnDeath&&t.def.cloneCount){let n=t.def.cloneCount||1;for(let r=0;r<n;r++){let n=Math.random()*Math.PI*2,r=t.x+Math.cos(n)*.8,i=t.y+Math.sin(n)*.8;if(e.isPassable(Math.floor(r),Math.floor(i))){let t=new W(r,i,`glitchling`);t._isClone=!0,t.health=Math.max(6,Math.floor(t.health*.5)),t.maxHealth=t.health,e.entities.push(t),e.totalEnemies++}}}e.totalEnemies>0&&e.killedEnemies>=e.totalEnemies&&e.mode!==`tutorial`&&(e.slowMoTimer=1.5,e.timeScale=.25)}function di(e,t,n){if(!e.player.alive)return;let{actualDamage:r,dodged:i}=zr(t,e.player);if(i||r<=0)return;e.player.health-=r,e.player.hurtTime=e.time,n&&typeof n.x==`number`&&(e.player.lastDamageAngle=Math.atan2(n.y-e.player.y,n.x-e.player.x)),e.screenShake=Math.max(e.screenShake,4),e.audio.playerHit(),e.audio.playerGrunt?.(e.getVoiceProfile?.(),`hurt`),e.settings.haptics&&navigator.vibrate&&navigator.vibrate(50),e.gamepad?.vibrateMedium?.(),e.roundDamageTaken+=r;let a=e.player.health/e.player.maxHealth;if(a<=.1&&a>0?e.triggerAriaOnce(`critical`,`criticalHealth`):a<=.3&&a>.1&&e.triggerAriaOnce(`lowHp`,`lowHealth`),e.player.thorns>0&&n&&n.active&&n.state!==`dead`&&(n.health-=t*e.player.thorns,n.health<=0)){Rr(n,e.time),e.killedEnemies++,e.player.score+=n.def.score,e.player.kills++;let t=e.audio.calculatePan(n.x,n.y,e.player.x,e.player.y,e.player.angle),r=Math.hypot(n.x-e.player.x,n.y-e.player.y);e.audio.enemyDeath(t,r),e.spawnDeathParticles(n.x,n.y,n.def.color1,n.def.color2),e.glitchEffect=.3,ui(e,n)}e.player.health<=0&&(e.player.health=0,e.player.alive=!1,e.deathTimer=1.5,e.achievementStats.totalDeaths++,e.saveAchievements(),e.audio.playerGrunt?.(e.getVoiceProfile?.(),`death`),e.audio.playerDeath(),e.queueAriaMessage(`playerDeath`),e.mode===`arena`&&(e.queueAriaMessage(`arenaDefeat`),e.arenaRound>e.achievementStats.highestArenaRound&&e.queueAriaMessage(`arenaNewBest`)))}function fi(e,t,n,r){r===0?(e.fillStyle=`rgba(255,50,50,0.9)`,e.beginPath(),e.arc(t,n,3,0,Math.PI*2),e.fill(),e.fillStyle=`rgba(255,150,150,0.5)`,e.beginPath(),e.arc(t,n,6,0,Math.PI*2),e.fill()):r===1?(e.strokeStyle=`rgba(0,255,200,0.7)`,e.lineWidth=1.5,e.beginPath(),e.moveTo(t-10,n),e.lineTo(t-4,n),e.moveTo(t+4,n),e.lineTo(t+10,n),e.moveTo(t,n-10),e.lineTo(t,n-4),e.moveTo(t,n+4),e.lineTo(t,n+10),e.stroke(),e.fillStyle=`rgba(0,255,200,0.9)`,e.fillRect(t-1,n-1,2,2)):r===2?(e.strokeStyle=`rgba(255,100,100,0.6)`,e.lineWidth=1,e.beginPath(),e.arc(t,n,18,0,Math.PI*2),e.stroke(),e.beginPath(),e.moveTo(t-18,n),e.lineTo(t-5,n),e.moveTo(t+5,n),e.lineTo(t+18,n),e.moveTo(t,n-18),e.lineTo(t,n-5),e.moveTo(t,n+5),e.lineTo(t,n+18),e.stroke(),e.fillStyle=`rgba(255,80,80,0.8)`,e.beginPath(),e.arc(t,n,1.5,0,Math.PI*2),e.fill()):r===3?(e.strokeStyle=`rgba(255,255,255,0.6)`,e.lineWidth=1.5,e.beginPath(),e.arc(t,n,12,0,Math.PI*2),e.stroke(),e.fillStyle=`rgba(255,255,255,0.8)`,e.fillRect(t-1,n-1,2,2)):r===4?(e.fillStyle=`rgba(255,255,255,0.8)`,e.fillRect(t-1,n-1,3,3)):r===5&&(e.fillStyle=`rgba(255,255,255,0.12)`,e.fillRect(t,n,1,1))}var pi=null,mi=null;function hi(e,t,n){let r=document.createElement(`canvas`);r.width=1,r.height=n;let i=r.getContext(`2d`);return i.fillStyle=`rgba(0,0,0,${t})`,i.fillRect(0,0,1,1),e.createPattern(r,`repeat`)}function gi(e,t,n,r){r?(mi||(mi=hi(e,.04,3)),e.fillStyle=mi):(pi||(pi=hi(e,.03,4)),e.fillStyle=pi),e.fillRect(0,0,t,n)}function _i(e,t,n,r,i,a){let{health:o,maxHealth:s,alive:c,time:l,palette:u,helmet:d,visor:f}=a,p=u?u.dark:`#1a2a3a`,m=u?vi(u.dark,`#ffffff`,.25):`#334466`,h=u?vi(u.dark,`#000000`,.6):`#0a1520`,g=u?vi(u.dark,`#000000`,.4):`#112233`,_=u?vi(u.dark,`#000000`,.5):`#0f1f2f`,v=u?vi(u.dark,`#ffffff`,.12):`#2a3a4a`,y=u?vi(u.dark,`#ffffff`,.06):`#223344`,b=u?u.accent:`#00ddff`,x=u?vi(u.accent,`#ffffff`,.35):`#66ffff`,S=u?vi(u.accent,`#000000`,.2):`#00ccee`,C=u?vi(u.accent,`#000000`,.35):`#00aacc`,w=o/s,T=!c||o<=0,E=l%25132;e.fillStyle=`#0a0a18`,e.fillRect(t,n,r,i),e.strokeStyle=T?`rgba(255,0,0,0.6)`:`rgba(0,200,255,0.5)`,e.lineWidth=1,e.strokeRect(t,n,r,i);let D=t+r/2,O=n+i/2,k=r/90;if((T||w<=.9)&&(e.fillStyle=T?`#778877`:w>.7?`#cc9966`:w>.5?`#bb8855`:w>.3?`#aa7744`:`#8a5544`,e.beginPath(),e.ellipse(D,O+2*k,18*k,22*k,0,0,Math.PI*2),e.fill()),(T||w<=.1)&&(e.fillStyle=T?`#667766`:`#6a4444`,e.beginPath(),e.ellipse(D,O+2*k,18*k,22*k,0,0,Math.PI*2),e.fill(),e.fillStyle=T?`#445544`:`#553333`,e.beginPath(),e.ellipse(D-8*k,O-2*k,6*k,4*k,0,0,Math.PI*2),e.fill(),e.beginPath(),e.ellipse(D+8*k,O-2*k,6*k,4*k,0,0,Math.PI*2),e.fill(),e.strokeStyle=T?`#334433`:`#442222`,e.lineWidth=2*k,e.beginPath(),e.moveTo(D-12*k,O-2*k),e.lineTo(D-4*k,O-2*k),e.moveTo(D+4*k,O-2*k),e.lineTo(D+12*k,O-2*k),e.stroke(),e.fillStyle=`#2a2222`,e.beginPath(),e.ellipse(D,O+12*k,7*k,5*k,0,0,Math.PI),e.fill(),e.fillStyle=`#660000`,e.fillRect(D+5*k,O+13*k,2*k,6*k),e.fillStyle=T?`#556655`:`#553333`,e.fillRect(D-13*k,O-7*k,26*k,2*k),e.fillStyle=T?`#778877`:`#6a4444`,e.beginPath(),e.moveTo(D,O+1*k),e.lineTo(D+2*k,O+5*k),e.lineTo(D-2*k,O+5*k),e.fill(),e.strokeStyle=`#553333`,e.lineWidth=1*k,e.beginPath(),e.moveTo(D+3*k,O-5*k),e.lineTo(D+10*k,O-1*k),e.stroke(),e.fillStyle=p,e.fillRect(D-17*k,O-10*k,6*k,3*k),e.fillRect(D+11*k,O-9*k,5*k,3*k)),!T&&w>.5&&(e.fillStyle=p,e.beginPath(),e.ellipse(D,O-2*k,20*k,24*k,0,0,Math.PI*2),e.fill(),e.strokeStyle=m,e.lineWidth=2*k,e.beginPath(),e.arc(D,O-6*k,18*k,Math.PI+.3,-.3),e.stroke()),!T&&w>.9){e.fillStyle=h,e.fillRect(D-18*k,O-8*k,36*k,22*k),e.fillStyle=b,e.globalAlpha=.8+Math.sin(E/400)*.15,e.fillRect(D-16*k,O-6*k,32*k,10*k),e.globalAlpha=1,e.fillStyle=`rgba(0,0,0,0.15)`;for(let t=0;t<5;t++)e.fillRect(D-16*k,O-6*k+t*2*k,32*k,1*k);e.fillStyle=`rgba(255,255,255,0.35)`,e.fillRect(D-12*k,O-4*k,10*k,3*k),e.fillStyle=x,e.globalAlpha=.4+Math.sin(E/200)*.2,e.fillRect(D+8*k,O-4*k,2*k,2*k),e.fillRect(D+12*k,O-3*k,2*k,2*k),e.globalAlpha=1,e.fillStyle=p,e.fillRect(D-14*k,O+8*k,28*k,10*k),e.fillStyle=g,e.fillRect(D-8*k,O+10*k,16*k,4*k),e.fillStyle=h;for(let t=0;t<3;t++)e.fillRect(D-5*k+t*4*k,O+10*k,2*k,4*k);e.fillStyle=p,e.fillRect(D-16*k,O+18*k,32*k,6*k),e.fillStyle=_,e.fillRect(D-12*k,O+20*k,24*k,3*k),e.strokeStyle=`rgba(0,200,255,0.3)`,e.lineWidth=1,e.strokeRect(D-18*k,O-8*k,36*k,22*k)}else if(w>.8){e.fillStyle=h,e.fillRect(D-18*k,O-8*k,36*k,22*k),e.fillStyle=b,e.globalAlpha=.75+Math.sin(E/400)*.12,e.fillRect(D-16*k,O-6*k,32*k,10*k),e.globalAlpha=1,e.fillStyle=`rgba(0,0,0,0.15)`;for(let t=0;t<5;t++)e.fillRect(D-16*k,O-6*k+t*2*k,32*k,1*k);e.fillStyle=`rgba(255,255,255,0.3)`,e.fillRect(D-12*k,O-4*k,10*k,3*k),e.fillStyle=`rgba(40,20,10,0.45)`,e.beginPath(),e.ellipse(D+13*k,O-14*k,4*k,3*k,.3,0,Math.PI*2),e.fill(),e.strokeStyle=y,e.lineWidth=1*k,e.beginPath(),e.arc(D-10*k,O-16*k,3*k,.5,2.5),e.stroke(),e.fillStyle=p,e.fillRect(D-14*k,O+8*k,28*k,10*k),e.fillStyle=g,e.fillRect(D-8*k,O+10*k,16*k,4*k),e.fillStyle=h;for(let t=0;t<3;t++)e.fillRect(D-5*k+t*4*k,O+10*k,2*k,4*k);e.fillStyle=p,e.fillRect(D-16*k,O+18*k,32*k,6*k)}else if(w>.7){e.fillStyle=h,e.fillRect(D-18*k,O-8*k,36*k,22*k),e.fillStyle=S,e.globalAlpha=.65+Math.sin(E/350)*.1,e.fillRect(D-16*k,O-6*k,32*k,10*k),e.globalAlpha=1,e.fillStyle=`rgba(0,0,0,0.18)`;for(let t=0;t<5;t++)e.fillRect(D-16*k,O-6*k+t*2*k,32*k,1*k);e.fillStyle=`rgba(255,255,255,0.22)`,e.fillRect(D-12*k,O-4*k,8*k,3*k),e.strokeStyle=`#ff4466`,e.lineWidth=1.5*k,e.beginPath(),e.moveTo(D+4*k,O-6*k),e.lineTo(D+6*k,O-2*k),e.lineTo(D+10*k,O+2*k),e.stroke(),e.fillStyle=`#880000`,e.beginPath(),e.arc(D+5*k,O-6*k,1.5*k,0,Math.PI*2),e.fill(),e.fillStyle=`rgba(40,20,10,0.45)`,e.beginPath(),e.ellipse(D+12*k,O-14*k,4*k,3*k,.3,0,Math.PI*2),e.fill(),e.fillStyle=p,e.fillRect(D-14*k,O+8*k,28*k,10*k),e.fillStyle=g,e.fillRect(D-8*k,O+10*k,16*k,4*k),e.fillStyle=p,e.fillRect(D-16*k,O+18*k,32*k,6*k)}else if(w>.6){e.fillStyle=h,e.fillRect(D-18*k,O-8*k,36*k,22*k),e.fillStyle=C,e.globalAlpha=.55+Math.sin(E/250)*.12,e.fillRect(D-16*k,O-6*k,32*k,10*k),e.globalAlpha=1,e.fillStyle=`rgba(0,0,0,0.2)`;for(let t=0;t<5;t++)e.fillRect(D-16*k,O-6*k+t*2*k,32*k,1*k);e.strokeStyle=`#ff4466`,e.lineWidth=1.5*k,e.beginPath(),e.moveTo(D+2*k,O-6*k),e.lineTo(D+5*k,O-1*k),e.lineTo(D+9*k,O+3*k),e.moveTo(D+4*k,O-3*k),e.lineTo(D+10*k,O),e.lineTo(D+14*k,O+1*k),e.stroke(),e.fillStyle=`#ffffff`,e.globalAlpha=.4,e.beginPath(),e.ellipse(D+8*k,O-1*k,3*k,2*k,0,0,Math.PI*2),e.fill(),e.fillStyle=`#224488`,e.beginPath(),e.arc(D+8*k,O-1*k,1.5*k,0,Math.PI*2),e.fill(),e.globalAlpha=1,e.fillStyle=`#880000`,e.fillRect(D+5*k,O+1*k,2*k,6*k),e.fillStyle=`rgba(40,20,10,0.45)`,e.beginPath(),e.ellipse(D+12*k,O-13*k,4*k,3*k,.3,0,Math.PI*2),e.fill(),e.beginPath(),e.ellipse(D-8*k,O-15*k,3*k,2*k,-.2,0,Math.PI*2),e.fill(),e.fillStyle=p,e.fillRect(D-14*k,O+8*k,28*k,10*k),e.fillStyle=g,e.fillRect(D-8*k,O+10*k,16*k,4*k),e.fillStyle=p,e.fillRect(D-16*k,O+18*k,32*k,6*k)}else if(w>.5){e.fillStyle=h,e.fillRect(D-18*k,O-8*k,36*k,22*k),e.fillStyle=C,e.globalAlpha=.5+Math.sin(E/300)*.1,e.fillRect(D-16*k,O-6*k,14*k,10*k),e.globalAlpha=.2,e.fillRect(D+2*k,O-6*k,14*k,10*k),e.globalAlpha=1,e.fillStyle=`rgba(0,0,0,0.15)`;for(let t=0;t<3;t++)e.fillRect(D-16*k,O-6*k+t*3*k,14*k,1*k);e.strokeStyle=`#ff4466`,e.lineWidth=1.5*k,e.beginPath(),e.moveTo(D-2*k,O-6*k),e.lineTo(D+2*k,O),e.lineTo(D+6*k,O+4*k),e.moveTo(D,O-4*k),e.lineTo(D+8*k,O),e.lineTo(D+12*k,O+2*k),e.moveTo(D+3*k,O-6*k),e.lineTo(D+5*k,O-2*k),e.stroke(),e.fillStyle=`#ffffff`,e.beginPath(),e.ellipse(D+7*k,O-1*k,4*k,3*k,0,0,Math.PI*2),e.fill(),e.fillStyle=`#224488`,e.beginPath(),e.arc(D+7*k,O-1*k,2*k,0,Math.PI*2),e.fill(),e.fillStyle=`#000000`,e.beginPath(),e.arc(D+7*k,O-1*k,1*k,0,Math.PI*2),e.fill(),e.fillStyle=p,e.fillRect(D-14*k,O+8*k,28*k,10*k),e.fillStyle=g,e.fillRect(D-8*k,O+10*k,16*k,4*k),e.fillStyle=`#880000`,e.fillRect(D+3*k,O+2*k,2*k,8*k),e.fillStyle=`rgba(40,20,10,0.5)`,e.beginPath(),e.ellipse(D+12*k,O-12*k,5*k,4*k,.3,0,Math.PI*2),e.fill(),e.fillStyle=p,e.fillRect(D-16*k,O+18*k,32*k,6*k)}else if(w>.4){e.fillStyle=p,e.beginPath(),e.ellipse(D-2*k,O-2*k,19*k,23*k,0,Math.PI*.6,Math.PI*2.1),e.closePath(),e.fill(),e.strokeStyle=m,e.lineWidth=2*k,e.beginPath(),e.arc(D-2*k,O-6*k,17*k,Math.PI+.3,-.4),e.stroke(),e.fillStyle=h,e.fillRect(D-17*k,O-7*k,17*k,18*k),e.fillStyle=C,e.globalAlpha=.3+Math.sin(E/200)*.1,e.fillRect(D-15*k,O-5*k,14*k,7*k),e.globalAlpha=1,e.fillStyle=`rgba(0,0,0,0.2)`;for(let t=0;t<3;t++)e.fillRect(D-15*k,O-5*k+t*3*k,14*k,1*k);e.strokeStyle=`#ff4466`,e.lineWidth=1.5*k,e.beginPath(),e.moveTo(D-4*k,O-5*k),e.lineTo(D+1*k,O+2*k),e.moveTo(D-8*k,O-3*k),e.lineTo(D-3*k,O+3*k),e.moveTo(D-12*k,O),e.lineTo(D-7*k,O+4*k),e.stroke(),e.fillStyle=`#ffffff`,e.beginPath(),e.ellipse(D-8*k,O-1*k,4*k,3*k,0,0,Math.PI*2),e.fill(),e.fillStyle=`#224488`,e.beginPath(),e.arc(D-8*k,O-1*k,2*k,0,Math.PI*2),e.fill(),e.fillStyle=`#000000`,e.beginPath(),e.arc(D-8*k,O-1*k,1*k,0,Math.PI*2),e.fill(),e.fillStyle=`#887055`,e.beginPath(),e.ellipse(D+8*k,O-2*k,5*k,3.5*k,0,0,Math.PI*2),e.fill(),e.fillStyle=`#ffffff`,e.beginPath(),e.ellipse(D+8*k,O-1.5*k,3*k,2*k,0,0,Math.PI*2),e.fill(),e.fillStyle=`#224488`,e.beginPath(),e.arc(D+8*k,O-1.5*k,1.5*k,0,Math.PI*2),e.fill(),e.fillStyle=`#000000`,e.beginPath(),e.arc(D+8*k,O-1.5*k,.7*k,0,Math.PI*2),e.fill(),e.fillStyle=`#aa7744`,e.beginPath(),e.moveTo(D+2*k,O+2*k),e.lineTo(D+4*k,O+6*k),e.lineTo(D+1*k,O+6*k),e.fill(),e.strokeStyle=v,e.lineWidth=2*k,e.beginPath(),e.moveTo(D+1*k,O-20*k),e.lineTo(D+3*k,O-10*k),e.lineTo(D+1*k,O-2*k),e.lineTo(D+3*k,O+8*k),e.stroke(),e.fillStyle=`#880000`,e.fillRect(D+2*k,O+2*k,2*k,8*k),e.fillStyle=p,e.fillRect(D-14*k,O+8*k,16*k,10*k),e.fillStyle=p,e.fillRect(D-16*k,O+18*k,32*k,6*k)}else if(w>.3){e.fillStyle=p,e.beginPath(),e.moveTo(D-18*k,O-18*k),e.lineTo(D-8*k,O-20*k),e.lineTo(D-6*k,O-12*k),e.lineTo(D-16*k,O-10*k),e.closePath(),e.fill(),e.fillStyle=C,e.globalAlpha=.15+Math.sin(E/100)*.1,e.fillRect(D-16*k,O-16*k,6*k,3*k),e.globalAlpha=1,e.fillStyle=`#885533`,e.fillRect(D-14*k,O-8*k,28*k,3*k),e.fillStyle=`#ffddcc`,e.beginPath(),e.ellipse(D-8*k,O-2*k,5*k,3.5*k,0,0,Math.PI*2),e.fill(),e.strokeStyle=`#cc3333`,e.lineWidth=.5*k,e.beginPath(),e.moveTo(D-12*k,O-3*k),e.lineTo(D-9*k,O-2*k),e.moveTo(D-12*k,O-1*k),e.lineTo(D-10*k,O-1.5*k),e.stroke(),e.fillStyle=`#224488`,e.beginPath(),e.arc(D-8*k,O-2*k,2*k,0,Math.PI*2),e.fill(),e.fillStyle=`#000000`,e.beginPath(),e.arc(D-8*k,O-2*k,1*k,0,Math.PI*2),e.fill(),e.fillStyle=`#774455`,e.beginPath(),e.ellipse(D+8*k,O-2*k,6*k,4*k,0,0,Math.PI*2),e.fill(),e.fillStyle=`#ffddcc`,e.fillRect(D+5*k,O-2.5*k,6*k,1.5*k),e.fillStyle=`#224488`,e.fillRect(D+7*k,O-2*k,2*k,1*k),e.fillStyle=`#aa6633`,e.beginPath(),e.moveTo(D,O+1*k),e.lineTo(D+3*k,O+6*k),e.lineTo(D-2*k,O+6*k),e.fill(),e.fillStyle=`#990000`,e.fillRect(D,O+6*k,2*k,3*k),e.fillStyle=`#331111`,e.beginPath(),e.ellipse(D,O+12*k,8*k,3.5*k,0,0,Math.PI),e.fill(),e.fillStyle=`#ddccbb`;for(let t=0;t<6;t++)e.fillRect(D-6*k+t*2*k,O+10.5*k,1.5*k,2*k);e.fillStyle=`#331111`,e.fillRect(D+2*k,O+10.5*k,2*k,2*k),e.fillStyle=`rgba(60,40,30,0.3)`,e.fillRect(D-12*k,O+8*k,24*k,10*k),e.fillStyle=`#990000`,e.fillRect(D-14*k,O-6*k,2*k,10*k),e.fillRect(D+10*k,O-4*k,2*k,12*k),e.strokeStyle=`#990000`,e.lineWidth=1.5*k,e.beginPath(),e.moveTo(D+4*k,O-6*k),e.lineTo(D+12*k,O-2*k),e.stroke()}else if(w>.2){e.fillStyle=`#774422`,e.fillRect(D-14*k,O-8*k,28*k,3.5*k),e.fillStyle=`#ffccbb`,e.beginPath(),e.ellipse(D-8*k,O-2*k,4.5*k,3*k,0,0,Math.PI*2),e.fill(),e.strokeStyle=`#cc2222`,e.lineWidth=.5*k,e.beginPath(),e.moveTo(D-11*k,O-3*k),e.lineTo(D-9*k,O-2*k),e.moveTo(D-11*k,O-1*k),e.lineTo(D-9*k,O-1.5*k),e.stroke(),e.fillStyle=`#224488`,e.beginPath(),e.arc(D-8*k,O-2*k,1.8*k,0,Math.PI*2),e.fill(),e.fillStyle=`#000000`,e.beginPath(),e.arc(D-8*k,O-2*k,.8*k,0,Math.PI*2),e.fill(),e.fillStyle=`#664455`,e.beginPath(),e.ellipse(D+8*k,O-2*k,6*k,4.5*k,0,0,Math.PI*2),e.fill(),e.fillStyle=`#ffddcc`,e.fillRect(D+5*k,O-2.5*k,6*k,1*k),e.fillStyle=`#995533`,e.beginPath(),e.moveTo(D+1*k,O+1*k),e.lineTo(D+4*k,O+5*k),e.lineTo(D-1*k,O+6*k),e.fill(),e.fillStyle=`#990000`,e.fillRect(D+1*k,O+5*k,2*k,4*k),e.fillStyle=`#2a1111`,e.beginPath(),e.ellipse(D,O+12*k,7*k,3.5*k,0,0,Math.PI),e.fill(),e.fillStyle=`#ccbbaa`;for(let t=0;t<5;t++)e.fillRect(D-5*k+t*2.5*k,O+10.5*k,1.5*k,2*k);e.fillStyle=`rgba(80,30,50,0.35)`,e.beginPath(),e.ellipse(D-5*k,O-3*k,7*k,5*k,-.2,0,Math.PI*2),e.fill(),e.fillStyle=`rgba(60,20,40,0.25)`,e.beginPath(),e.ellipse(D+7*k,O+1*k,6*k,4*k,.2,0,Math.PI*2),e.fill(),e.fillStyle=`rgba(50,30,25,0.3)`,e.fillRect(D-12*k,O+7*k,24*k,11*k),e.fillStyle=`#880000`,e.fillRect(D-14*k,O-6*k,2*k,12*k),e.fillRect(D+10*k,O-5*k,2*k,14*k),e.fillRect(D-3*k,O+5*k,6*k,2*k),e.strokeStyle=`#880000`,e.lineWidth=1.5*k,e.beginPath(),e.moveTo(D+3*k,O-7*k),e.lineTo(D+12*k,O-2*k),e.stroke()}else w>.1&&(e.fillStyle=`#8a5544`,e.beginPath(),e.ellipse(D,O+2*k,18*k,22*k,0,0,Math.PI*2),e.fill(),e.fillStyle=`rgba(80,30,50,0.4)`,e.beginPath(),e.ellipse(D-6*k,O-4*k,8*k,6*k,-.2,0,Math.PI*2),e.fill(),e.fillStyle=`rgba(60,20,40,0.3)`,e.beginPath(),e.ellipse(D+6*k,O,7*k,5*k,.2,0,Math.PI*2),e.fill(),e.fillStyle=`#774422`,e.fillRect(D-14*k,O-8*k,28*k,3.5*k),e.fillStyle=`#ffccbb`,e.beginPath(),e.ellipse(D-8*k,O-2*k,4*k,2*k,0,0,Math.PI*2),e.fill(),e.strokeStyle=`#cc2222`,e.lineWidth=.5*k,e.beginPath(),e.moveTo(D-11*k,O-2.5*k),e.lineTo(D-9*k,O-2*k),e.moveTo(D-11*k,O-1*k),e.lineTo(D-9*k,O-1.5*k),e.stroke(),e.fillStyle=`#224488`,e.beginPath(),e.arc(D-8*k,O-2*k,1.5*k,0,Math.PI*2),e.fill(),e.fillStyle=`#000000`,e.beginPath(),e.arc(D-8*k,O-2*k,.7*k,0,Math.PI*2),e.fill(),e.fillStyle=`#664455`,e.beginPath(),e.ellipse(D+8*k,O-2*k,6*k,4.5*k,0,0,Math.PI*2),e.fill(),e.strokeStyle=`#553344`,e.lineWidth=1.5*k,e.beginPath(),e.moveTo(D+4*k,O-2*k),e.lineTo(D+12*k,O-2*k),e.stroke(),e.fillStyle=`#995533`,e.beginPath(),e.moveTo(D+1*k,O+1*k),e.lineTo(D+4*k,O+5*k),e.lineTo(D-1*k,O+6*k),e.fill(),e.fillStyle=`#990000`,e.fillRect(D+1*k,O+5*k,2*k,5*k),e.fillStyle=`#2a1111`,e.beginPath(),e.ellipse(D,O+12*k,7*k,4*k,0,0,Math.PI),e.fill(),e.fillStyle=`#ccbbaa`,e.fillRect(D-4*k,O+10.5*k,1.5*k,2*k),e.fillRect(D-1*k,O+10.5*k,1.5*k,2*k),e.fillRect(D+3*k,O+10.5*k,1.5*k,2*k),e.fillStyle=`#880000`,e.fillRect(D+5*k,O+13*k,2*k,5*k),e.fillRect(D-3*k,O+14*k,2*k,3*k),e.fillStyle=`#880000`,e.fillRect(D-15*k,O-6*k,2*k,14*k),e.fillRect(D+11*k,O-8*k,2*k,16*k),e.fillRect(D-4*k,O+5*k,8*k,2*k),e.strokeStyle=`#880000`,e.lineWidth=2*k,e.beginPath(),e.moveTo(D+3*k,O-8*k),e.lineTo(D+13*k,O-1*k),e.stroke(),e.beginPath(),e.moveTo(D-10*k,O+3*k),e.lineTo(D-4*k,O+8*k),e.stroke(),e.fillStyle=`rgba(40,25,20,0.35)`,e.fillRect(D-13*k,O+6*k,26*k,12*k));e.fillStyle=`#ffaa00`,e.globalAlpha=.5+Math.sin(l/500)*.2,e.beginPath(),e.arc(t+8*k,n+i-10*k,4*k,0,Math.PI*2),e.fill(),e.fillStyle=`#ffcc44`,e.beginPath(),e.arc(t+8*k,n+i-10*k,2*k,0,Math.PI*2),e.fill(),e.globalAlpha=1}function vi(e,t,n){let r=parseInt(e.slice(1,3),16),i=parseInt(e.slice(3,5),16),a=parseInt(e.slice(5,7),16),o=parseInt(t.slice(1,3),16),s=parseInt(t.slice(3,5),16),c=parseInt(t.slice(5,7),16),l=Math.round(r+(o-r)*n),u=Math.round(i+(s-i)*n),d=Math.round(a+(c-a)*n);return`#${l.toString(16).padStart(2,`0`)}${u.toString(16).padStart(2,`0`)}${d.toString(16).padStart(2,`0`)}`}function yi(e,t,n,r,i,{map:a,entities:o,player:s,chronoBombs:c,objectiveWaypoint:l}){if(!a)return;e.fillStyle=`rgba(0,0,0,0.7)`,e.fillRect(t,n,r,i),e.strokeStyle=`rgba(0,200,255,0.3)`,e.strokeRect(t,n,r,i);let u=Math.min(r/a.width,i/a.height),d=t+(r-a.width*u)/2,f=n+(i-a.height*u)/2;for(let t=0;t<a.height;t++)for(let n=0;n<a.width;n++){let r=a.grid[t][n];if(r>0){let i=h[r];i?e.fillStyle=`rgb(${i.r},${i.g},${i.b})`:e.fillStyle=`#444466`,e.fillRect(d+n*u,f+t*u,u,u)}}for(let t of o)t.active&&(t.type===`enemy`?(e.fillStyle=t.def.color1,e.fillRect(d+t.x*u-1.5,f+t.y*u-1.5,3,3)):t.type===`exit`?(e.fillStyle=`#00ff88`,e.fillRect(d+t.x*u-2,f+t.y*u-2,4,4)):t.type!==`projectile`&&(e.fillStyle=t.type===`health`?`#00ff44`:`#ffaa00`,e.fillRect(d+t.x*u-1,f+t.y*u-1,2,2)));let p=d+s.x*u,m=f+s.y*u;if(e.fillStyle=`#00ffcc`,e.fillRect(p-2,m-2,4,4),e.strokeStyle=`#00ffcc`,e.lineWidth=1,e.beginPath(),e.moveTo(p,m),e.lineTo(p+Math.cos(s.angle)*8,m+Math.sin(s.angle)*8),e.stroke(),c)for(let t of c){if(!t.active)continue;let n=d+t.x*u,r=f+t.y*u,i=t.fuseLife/t.fuseDuration;e.fillStyle=`rgba(255,170,0,${.4+.6*(.5+.5*Math.sin(i*Math.PI*6))})`,e.beginPath(),e.arc(n,r,t.radius*u*i,0,Math.PI*2),e.fill()}if(l){let t=d+l.x*u,n=f+l.y*u,r=performance.now(),i=r%1e3/1e3,a=.5+.5*Math.sin(r/800*Math.PI*2);e.fillStyle=`rgba(0,255,200,${.3+a*.7})`,e.beginPath(),e.arc(t,n,2+a*2,0,Math.PI*2),e.fill(),e.strokeStyle=`rgba(0,255,200,${1-i})`,e.lineWidth=1,e.beginPath(),e.arc(t,n,3+i*6,0,Math.PI*2),e.stroke()}}function bi(e,t,n,r,i,a,o){let s=o.isTouchDevice&&K(o.canvasHeight),c=typeof a==`number`?Math.min(1,Math.max(0,a)):1,l=o.shotsFired>0?Math.round(o.shotsHit/o.shotsFired*100):0,u=Math.round((performance.now()-o.roundStartTime)/1e3),d=Math.floor(u/60),f=u%60,p=`${d}:${String(f).padStart(2,`0`)}`,m=Math.round(o.killedEnemies*c),h=Math.round(l*c),g=Math.round(o.bestStreak*c),_=s?Math.min(300,t-40):380,v=s?80:130,y=t/2-_/2;e.shadowColor=r,e.shadowBlur=12,e.fillStyle=`rgba(0,0,0,0.6)`,e.beginPath(),e.roundRect(y,n,_,v,8),e.fill(),e.shadowBlur=0,e.strokeStyle=r,e.lineWidth=1.5,e.beginPath(),e.roundRect(y,n,_,v,8),e.stroke(),e.fillStyle=r,e.globalAlpha=.15,e.beginPath(),e.roundRect(y+1,n+1,_-2,3,[7,7,0,0]),e.fill(),e.globalAlpha=1,e.strokeStyle=`${r}33`,e.lineWidth=1,e.beginPath(),e.moveTo(t/2,n+12),e.lineTo(t/2,n+v-12),e.stroke(),e.beginPath(),e.moveTo(y+16,n+v/2),e.lineTo(y+_-16,n+v/2),e.stroke();let b=[{label:`KILLS`,value:`${m}/${o.totalEnemies}`},{label:`TIME`,value:p},{label:`ACCURACY`,value:`${h}%`},{label:`BEST STREAK`,value:`${g}x`}],x=_/2,S=v/2;e.textAlign=`center`;for(let t=0;t<b.length;t++){let a=t%2,o=Math.floor(t/2),c=y+a*x+x/2,l=n+o*S+18;e.fillStyle=i,e.globalAlpha=.6,e.font=`bold ${s?8:10}px monospace`,e.fillText(b[t].label,c,l),e.globalAlpha=1,e.fillStyle=r,e.font=`bold ${s?16:24}px monospace`,e.fillText(b[t].value,c,l+(s?18:26))}e.fillStyle=r,e.font=`bold ${s?12:14}px monospace`,e.fillText(`SCORE: ${o.score}`,t/2,n+v+(s?14:20))}var xi=new Map,Si=null,Ci=null;async function wi(){return Ci||(Si||(Si=fetch(`assets/manifest.json`).then(e=>e.ok?e.json():null).then(e=>(Ci=e||{sets:{}},Ci)).catch(()=>(Ci={sets:{}},Ci))),Si)}function Ti(e,t){let n=`${e}/${t}`;return xi.has(n)?xi.get(n):(xi.set(n,null),wi().then(r=>{let i=r.sets?.[e];if(!i)return;let a=i.find(e=>e.id===t);if(!a)return;let o=new Image;o.onload=()=>xi.set(n,o),o.onerror=()=>xi.set(n,null),o.src=a.src}),null)}var Ei=e=>Ti(`weapons`,e),Di=e=>Ti(`ui`,`upgrade-${e.toLowerCase()}`),Oi=e=>(e||``).toLowerCase().replace(/[^a-z0-9]+/g,`-`).replace(/(^-|-$)/g,``),ki=-1,Ai=-1,ji=-1,Mi=-1,Ni=-1,Pi=-1,Fi=-1,Ii=-1,Li=-1,Ri=-1;function zi(e){let t=e.player,n=e.weapons?.[t?.weaponIndex];(t.health!==ki||t.maxHealth!==Ai||(n?.ammo??-1)!==ji||(n?.maxAmmo??-1)!==Mi||(n?.id??-1)!==Ni||t.kills!==Pi||t.score!==Fi||e.arenaRound!==Ii||e.settings.hudScale!==Li||e.settings.hudStyle!==Ri)&&(ki=t.health,Ai=t.maxHealth,ji=n?.ammo??-1,Mi=n?.maxAmmo??-1,Ni=n?.id??-1,Pi=t.kills,Fi=t.score,Ii=e.arenaRound,Li=e.settings.hudScale,Ri=e.settings.hudStyle)}function Bi(e,t,n,r){let i=t.hitMarker;if(i<=0)return;let a=t.hitMarkerCrit||t.hitMarkerHead?.22:.15,o=Math.max(0,a-i),s=Math.min(1,o/.04),c=s*Math.min(1,i/.1),l=.6+.5*(1-(1-s)**3),u=t.hitMarkerKill,d=t.hitMarkerCrit,f=t.hitMarkerHead,p=u?`#ffffff`:f&&d?`#ff9a1f`:f?`#ff6a1f`:d?`#ffe14a`:`#ff3a3a`,m=d||f,h=(m?11:8)*l,g=(m?4:3)*l,_=m?2.6:2;e.save(),e.globalAlpha=c,e.translate(n,r),e.rotate(Math.PI/4),e.lineCap=`round`,e.shadowColor=p,e.shadowBlur=m?8:4,e.strokeStyle=p,e.lineWidth=_,e.beginPath();for(let[t,n]of[[1,0],[-1,0],[0,1],[0,-1]])e.moveTo(t*g,n*g),e.lineTo(t*h,n*h);if(e.stroke(),m&&(e.globalAlpha=c*.6,e.lineWidth=1.5,e.beginPath(),e.arc(0,0,h+4,0,Math.PI*2),e.setLineDash([3,3]),e.stroke(),e.setLineDash([])),u){let t=o/a;e.globalAlpha=c*(1-t),e.strokeStyle=`#ffffff`,e.lineWidth=2,e.beginPath(),e.arc(0,0,6+t*18,0,Math.PI*2),e.stroke()}e.restore()}function Vi(e,t,n,r,i){let a=i?18:16,o=i?14:12;t.crit?(e.font=`bold ${a}px monospace`,e.shadowColor=`#ffcc00`,e.shadowBlur=i?8:6,e.fillStyle=`#ffcc00`,e.fillText(t.value,n,r),e.shadowBlur=0,i&&(e.strokeStyle=`rgba(0,0,0,0.5)`,e.lineWidth=2,e.strokeText(t.value,n,r),e.fillText(t.value,n,r))):t.head?(e.font=`bold ${a}px monospace`,e.shadowColor=`#ff7a1f`,e.shadowBlur=i?8:6,e.fillStyle=`#ff7a1f`,e.fillText(t.value,n,r),e.shadowBlur=0,e.font=`bold ${i?10:9}px monospace`,e.fillStyle=`#ffaa44`,e.fillText(`HEAD!`,n,r-(i?16:13))):(e.font=`bold ${o}px monospace`,e.strokeStyle=`rgba(0,0,0,0.6)`,e.lineWidth=2,e.strokeText(t.value,n,r),e.fillStyle=`#ffffff`,e.fillText(t.value,n,r))}function Hi(e,t,n,r){let i=t.bossNameCard;if(!i)return;let a=t.time-i.time;if(a>=i.duration){t.bossNameCard=null;return}let o=a/i.duration,s=1,c=1;if(o<.18)s=o/.18,c=.4+.6*s;else if(o>.78){let e=(o-.78)/.22;s=1-e,c=1+e*.5}let l=r*.35,u=n/2;e.save(),e.globalAlpha=s,e.textAlign=`center`;let d=Math.min(n*.7,720)*c,f=e.createLinearGradient(u-d/2,0,u+d/2,0);f.addColorStop(0,`rgba(60,0,0,0)`),f.addColorStop(.5,`rgba(180,20,20,0.55)`),f.addColorStop(1,`rgba(60,0,0,0)`),e.fillStyle=f,e.fillRect(u-d/2,l-88/2,d,88);let p=l-6,m=Math.sin(a*.04)*2|0;e.font=`bold 44px monospace`,e.shadowColor=`#ff3a3a`,e.shadowBlur=16,e.fillStyle=`#ffe4e4`,e.fillText(i.title,u+m,p),e.shadowBlur=0,e.font=`bold 16px monospace`,e.fillStyle=`#ff8080`,e.fillText(i.subtitle,u,p+28),e.strokeStyle=`rgba(255,60,60,${s})`,e.lineWidth=1.5,e.beginPath(),e.moveTo(u-d/2,l-88/2),e.lineTo(u+d/2,l-88/2),e.moveTo(u-d/2,l+88/2),e.lineTo(u+d/2,l+88/2),e.stroke(),e.restore()}function Ui(e,t,n,r){if(!t.player?.isAiming)return;let i=t.time*.006,a=22+Math.sin(i)*1.5;e.save(),e.globalCompositeOperation=`lighter`,e.strokeStyle=`rgba(120,220,255,0.75)`,e.lineWidth=1.5,e.beginPath(),e.arc(n,r,a,0,Math.PI*2),e.stroke(),e.strokeStyle=`rgba(255,255,255,0.55)`,e.beginPath(),e.moveTo(n-a-7,r),e.lineTo(n-a+6,r),e.moveTo(n+a-6,r),e.lineTo(n+a+7,r),e.moveTo(n,r-a-7),e.lineTo(n,r-a+6),e.moveTo(n,r+a-6),e.lineTo(n,r+a+7),e.stroke(),e.font=`bold 10px monospace`,e.textAlign=`center`,e.fillStyle=`rgba(120,220,255,0.75)`,e.fillText(`ADS`,n,r+a+20),e.restore()}function Wi(e){return{map:e.map,entities:e.entities,player:e.player,chronoBombs:e._chronoBombs,objectiveWaypoint:e.objectiveWaypoint}}function Gi(e){let t=e.character||{};return{health:e.player.health,maxHealth:e.player.maxHealth,alive:e.player.alive,time:e.time,palette:g[t.colorIndex||0],helmet:w[t.helmetIndex||0],visor:a[t.visorIndex||0]}}function Ki(e){let t=e.hudCtx,n=e.hudW,r=e.hudH;if(t.clearRect(0,0,n,r),e.state!==`playing`&&e.state!==`paused`)return;if(zi(e),e._hudDisabledUntil&&e.time<e._hudDisabledUntil){t.save(),t.fillStyle=`rgba(0,0,0,0.85)`,t.fillRect(0,0,n,r),t.fillStyle=`#ff6666`,t.font=`bold 20px monospace`,t.textAlign=`center`,t.fillText(`SYSTEMS DISRUPTED`,n/2,r/2-12),t.font=`12px monospace`,t.fillStyle=`rgba(255,255,255,0.9)`,t.fillText(`HUD offline — temporary interference.`,n/2,r/2+10),t.restore();return}if(e.mode===`playtest`){t.save(),t.fillStyle=`rgba(0, 200, 255, 0.15)`,t.fillRect(0,0,n,32),t.fillStyle=`#00ccff`,t.font=`bold 14px monospace`,t.textAlign=`center`,t.textBaseline=`middle`;let r=e.killedEnemies>=e.totalEnemies&&e.totalEnemies>0?`PLAY TEST COMPLETE — Returning to builder...`:`PLAY TEST — ${e.killedEnemies}/${e.totalEnemies} killed — ESC to return`;t.fillText(r,n/2,16),t.restore()}let i=e.settings.hudScale/100,a=e.isTouchDevice&&K(r),o=a?Math.round(60*i):e.settings.hudStyle===1?Math.round(160*i):0;if(a){Yi(e,t,n,r,o,i);let a=Math.min(e.settings.minimapSize,Math.round(n*.18));yi(t,n-a-10,10,a,a,Wi(e));let{x:s,y:c}=hr(n,r,o,e.player);fi(t,s,c,e.settings.crosshair),Ui(t,e,s,c),Bi(t,e,s,c);for(let i of e.damageNumbers){let a=i.x-e.player.x,s=i.y-e.player.y,c=Math.atan2(s,a)-e.player.angle;for(;c<-Math.PI;)c+=Math.PI*2;for(;c>Math.PI;)c-=Math.PI*2;let l=lr(e.player,e.settings)*Math.PI/180;if(Math.abs(c)>l/2||Math.sqrt(a*a+s*s)<.1)continue;let u=.8-i.life,d=n/2+c/(l/2)*(n/2)+(i.vx||0)*u,f=u*90-u*u*60,p=(r-o)/2-f,m=Math.min(1,i.life/.3);t.save(),t.globalAlpha=m,t.textAlign=`center`,Vi(t,i,d,p,!1),t.restore()}if(e.killStreakSystem.renderFirstPerson(t,n,r,o),Hi(t,e,n,r),e.renderAchievementToast(t,n,r),e.mode===`arena`){let n=Math.ceil(e.arenaTimer),r=n<=10;t.fillStyle=`rgba(0,0,0,0.7)`,t.fillRect(10,10,100,50),t.strokeStyle=r?`rgba(255,34,0,0.6)`:`rgba(0,200,255,0.3)`,t.lineWidth=1,t.strokeRect(10,10,100,50),t.fillStyle=r?Math.floor(e.time/250)%2?`#ff2200`:`#ffaa00`:`#00ffcc`,t.font=`bold 28px monospace`,t.textAlign=`center`,t.fillText(`${n}s`,60,44),t.fillStyle=`rgba(255,255,255,0.5)`,t.font=`bold 10px monospace`,t.fillText(`TIME`,60,22)}if(e.mode===`campaign`&&e.roundStartTime){let n=Math.floor((performance.now()-e.roundStartTime)/1e3),r=Math.floor(n/60),i=n%60;t.fillStyle=`rgba(0,0,0,0.5)`,t.fillRect(10,10,70,20),t.fillStyle=`rgba(200,220,255,0.5)`,t.font=`11px monospace`,t.textAlign=`center`,t.fillText(`${r}:${i.toString().padStart(2,`0`)}`,45,24)}if(e.mode===`meltdown`){let i=e.meltdown.getHUD(),a=i.heat/100;t.fillStyle=`rgba(0,0,0,0.7)`,t.fillRect(10,10,140,55),t.strokeStyle=`rgba(255,${Math.floor(170-a*170)},0,0.5)`,t.lineWidth=1,t.strokeRect(10,10,140,55),t.font=`bold 10px monospace`,t.textAlign=`center`,t.fillStyle=`#ffaa00`,t.fillText(`DISTANCE`,80,22),t.font=`bold 22px monospace`,t.fillText(`${i.distance}m`,80,44),t.font=`9px monospace`,t.fillStyle=`rgba(200,200,200,0.6)`,t.fillText(`SCORE: ${i.score}`,80,58);let s=n-120-15;t.fillStyle=`rgba(0,0,0,0.7)`,t.fillRect(s-5,10,130,40),t.strokeStyle=`rgba(255,68,0,0.3)`,t.strokeRect(s-5,10,130,40),t.fillStyle=`rgba(60,20,0,0.6)`,t.fillRect(s,15,120,16),t.fillStyle=a<.5?`rgb(255, ${Math.floor(200-a*300)}, 0)`:`rgb(255, ${Math.floor(100-(a-.5)*200)}, 0)`,t.fillRect(s,15,120*a,16),t.font=`bold 9px monospace`,t.textAlign=`center`,t.fillStyle=a>.7?`#ff4400`:`#ffaa66`,t.fillText(`REACTOR: ${i.heat}%`,s+120/2,43),t.font=`8px monospace`,t.fillStyle=`rgba(150,200,255,0.5)`,t.textAlign=`right`,t.fillText(`${i.speed} m/s`,n-15,59);let c=e.meltdown.getHeatOverlay();if(c&&(t.fillStyle=c,t.fillRect(0,0,n,r-o)),e._meltdownAriaText){let i=Math.min(1,e._meltdownAriaTimer/.5);t.save(),t.globalAlpha=i,t.fillStyle=`rgba(0,0,0,0.6)`;let a=t.measureText(e._meltdownAriaText).width+40;t.fillRect(n/2-a/2,r*.2-15,a,30),t.font=`bold 13px monospace`,t.textAlign=`center`,t.fillStyle=`#00ccff`,t.fillText(e._meltdownAriaText,n/2,r*.2+3),t.restore()}}if(t.textAlign=`left`,e.mode===`arena`&&e.arenaClearTimer!=null){let i=Math.ceil(e.arenaClearTimer),a=.7+Math.sin(e.time*.005)*.3;t.fillStyle=`rgba(0,10,5,${.5*a})`,t.fillRect(0,(r-o)/2-36,n,72),t.fillStyle=`rgba(0,255,100,${a})`,t.font=`bold 28px monospace`,t.textAlign=`center`,t.fillText(`STAGE CLEARED!`,n/2,(r-o)/2-6),t.fillStyle=`rgba(200,230,255,0.8)`,t.font=`bold 14px monospace`,t.fillText(`Next round in ${i}s...`,n/2,(r-o)/2+18),t.textAlign=`left`}if(e.slowMoTimer>0){let i=Math.min(.35,e.slowMoTimer/1.5*.35);t.fillStyle=`rgba(0,20,60,${i*.4})`,t.fillRect(0,0,n,r-o);let a=t.createRadialGradient(n/2,(r-o)/2,n*.25,n/2,(r-o)/2,n*.7);a.addColorStop(0,`rgba(0,0,0,0)`),a.addColorStop(1,`rgba(0,0,0,${i})`),t.fillStyle=a,t.fillRect(0,0,n,r-o)}e.showFPS&&(t.fillStyle=`#ffcc00`,t.font=`bold 12px monospace`,t.textAlign=`left`,t.fillText(`FPS: ${e.fps}`,10,r-o-8)),e.renderAriaComms(t,n,r);return}if(e.settings.hudStyle===1){qi(e,t,n,r,o,i);return}if(e.settings.hudStyle===2){Xi(e,t,n,r,o,i);return}if(e.settings.hudStyle===3){Zi(e,t,n,r,o,i);return}let s=e.player.getWeaponDef(),c=e.player.health/e.player.maxHealth,l=c>.6?e.cbColor(`#00ff66`):c>.3?e.cbColor(`#ffaa00`):e.cbColor(`#ff2200`),u=(e,n,r,i,a=.55)=>{t.fillStyle=`rgba(0,0,0,${a})`,t.beginPath(),t.roundRect(e,n,r,i,6),t.fill()};{let n=12;if(e.settings.showScore){let r=`SCORE  ${e.player.score}`;t.font=`bold 14px monospace`;let i=t.measureText(r).width+20;u(12,n,i,28,.55),t.fillStyle=`#00ddff`,t.textAlign=`left`,t.fillText(r,22,n+19),n+=34}if(e.mode===`arena`){let r=Math.ceil(e.arenaTimer),i=r<=10,a=e.arenaClearTimer!=null,o=a?`CLEARED`:`ROUND ${e.arenaRound}`,s=`${r}s`,c=a?`#00ff66`:i?Math.floor(e.time/250)%2?`#ff2200`:`#ffaa00`:`#00ffcc`,l=``,d=0;if(e.roundStartTime){let n=Math.floor((performance.now()-e.roundStartTime)/1e3);l=`${Math.floor(n/60)}:${(n%60).toString().padStart(2,`0`)} elapsed`,t.font=`10px monospace`,d=t.measureText(l).width}t.font=`bold 12px monospace`;let f=t.measureText(o).width;t.font=`bold 26px monospace`;let p=t.measureText(s).width,m=f+(d?12+d:0),h=Math.max(m,p)+24;u(12,n,h,58,.6),t.fillStyle=a?`rgba(0,255,100,0.7)`:`rgba(255,255,255,0.5)`,t.font=`bold 12px monospace`,t.textAlign=`left`,t.fillText(o,22,n+16),l&&(t.fillStyle=`rgba(255,255,255,0.35)`,t.font=`10px monospace`,t.textAlign=`right`,t.fillText(l,12+h-10,n+16),t.textAlign=`left`),t.fillStyle=c,t.font=`bold 26px monospace`,t.fillText(s,22,n+46),n+=64}if(e.mode===`campaign`&&e.roundStartTime){let r=Math.floor((performance.now()-e.roundStartTime)/1e3),i=`${Math.floor(r/60)}:${(r%60).toString().padStart(2,`0`)}`;t.font=`bold 14px monospace`;let a=t.measureText(i).width;u(12,n,a+20,28,.45),t.fillStyle=`rgba(200,220,255,0.6)`,t.textAlign=`left`,t.fillText(i,22,n+19),n+=34}if(e.mode===`campaign`){let r=e.map.name||`Level ${e.campaignLevel+1}`;t.font=`bold 12px monospace`;let i=t.measureText(r).width;u(12,n,i+20,26,.4),t.fillStyle=`#aaddff`,t.textAlign=`left`,t.fillText(r,22,n+18),n+=34}let r=[`EASY`,`NORMAL`,`HARD`,`NIGHTMARE`],i=[`#44ff44`,`#00ccff`,`#ffaa00`,`#ff2200`],a=r[e.settings.difficulty];t.font=`bold 11px monospace`;let o=t.measureText(a).width;if(u(12,n,o+16,22,.4),t.fillStyle=i[e.settings.difficulty],t.textAlign=`left`,t.fillText(a,20,n+15),n+=28,e.mode===`campaign`&&e.ngPlusCycle>0){let r=e.ngPlusCycle>=3?`NG+3 FINAL`:`NG+${e.ngPlusCycle}`,i=e.ngPlusCycle>=3?`#ffcc00`:`#cc88ff`;t.font=`bold 11px monospace`;let a=t.measureText(r).width;u(12,n,a+16,22,.4),t.fillStyle=i,t.textAlign=`left`,t.fillText(r,20,n+15),n+=28}if(e.mode===`meltdown`){let r=e.meltdown.getHUD(),i=`${r.distance}m`,a=e.player._meltdownBraking;t.font=`bold 22px monospace`;let o=t.measureText(i).width,s=Math.max(o+24,140);u(12,n,s,a?52:36,.55),t.fillStyle=`#ffaa00`,t.font=`bold 11px monospace`,t.textAlign=`left`,t.fillText(`REACTOR RUN`,22,n+13),t.fillStyle=`#ffcc44`,t.font=`bold 22px monospace`,t.fillText(i,22,n+32),a&&(t.fillStyle=`#ff6644`,t.font=`bold 11px monospace`,t.fillText(`▼ BRAKING`,22,n+47)),n+=(a?52:36)+6;let c=`HEAT ${r.heat}%`;t.font=`bold 12px monospace`;let l=t.measureText(c).width;u(12,n,l+20,24,.45),t.fillStyle=r.heat>75?`#ff2200`:r.heat>50?`#ffaa00`:`#ff8844`,t.textAlign=`left`,t.fillText(c,22,n+16),n+=30}}if(e.settings.showKills){let r=`KILLS  ${e.killedEnemies} / ${e.totalEnemies}`;t.font=`bold 14px monospace`;let i=t.measureText(r).width+20,a=n-i-12;u(a,12,i,28,.55),t.fillStyle=`#ff8866`,t.textAlign=`left`,t.fillText(r,a+10,31)}{let r=e.entities.find(e=>e.type===`enemy`&&e.active&&e.health>0&&(e.enemyType===`boss`||e.enemyType===`boss_form2`||e.enemyType===`boss_form3`));if(r){let e=Math.min(400,n*.4),i=Math.floor(n/2-e/2),a=Math.max(0,r.health/r.maxHealth),o=r.def.form||1,s=r.def.name||`BOSS`,c=o===3?`#ff0044`:o===2?`#ff0066`:`#ff0088`;u(i-8,-4,e+16,42,.65),t.fillStyle=c,t.font=`bold 12px monospace`,t.textAlign=`center`,t.fillText(s,n/2,10),t.fillStyle=`rgba(255,255,255,0.08)`,t.beginPath(),t.roundRect(i,14,e,14,3),t.fill(),t.fillStyle=c,t.beginPath(),t.roundRect(i,14,e*a,14,3),t.fill();let l=t.createLinearGradient(i,14,i,28);l.addColorStop(0,`rgba(255,255,255,0.2)`),l.addColorStop(.5,`rgba(255,255,255,0)`),l.addColorStop(1,`rgba(0,0,0,0.1)`),t.fillStyle=l,t.beginPath(),t.roundRect(i,14,e*a,14,3),t.fill(),t.strokeStyle=c,t.lineWidth=1.5,t.beginPath(),t.roundRect(i,14,e,14,3),t.stroke(),t.fillStyle=`#ffffff`,t.font=`bold 11px monospace`,t.textAlign=`center`,t.fillText(`${Math.ceil(r.health)} / ${r.maxHealth}`,n/2,26)}}{let a=Math.round(32*i),o=Math.round(30*i),s=e.player.weapons.length,u=s*a+(s-1)*4,d=Math.floor(n/2-u/2),f=r-o-14,p=Math.max(u,260),m=Math.round(8*i),h=Math.floor(n/2-p/2),g=f-m-8,_=Math.round(5*i),v=g-_-3,y=e.player.stamina/e.player.maxStamina,b=e.player.chronoEnergy/e.player.maxChronoEnergy,x=b>.005||e.player.chronoActive,S=e.player.isSprinting||e.player.isDashing,C=e.player.chronoActive,w=Math.round(6*i),T=p,E=h,D=e.player.maxShield>0?v-w-6:g-w-6;{let n=x?D-w-3:D,r=e.player.isDashing?`#00ffff`:e.player.isSprinting?`#ffaa00`:y>.3?`#00ccff`:`#ff4400`;if(t.fillStyle=`rgba(0,0,0,0.4)`,t.beginPath(),t.roundRect(E,n,T,w,3),t.fill(),y>.005&&(t.fillStyle=r,t.beginPath(),t.roundRect(E,n,T*y,w,3),t.fill()),S&&(t.strokeStyle=r,t.lineWidth=1,t.beginPath(),t.roundRect(E,n,T,w,3),t.stroke()),y<.99||S){let i=e.player.isDashing?`DASH`:e.player.isSprinting?`SPRINT`:`STAM`,a=n+w-1;t.font=`bold 9px monospace`,t.fillStyle=S?r:`rgba(255,255,255,0.45)`,t.textAlign=`right`,t.fillText(i,E-7,a),t.textAlign=`left`,t.fillStyle=`rgba(255,255,255,0.4)`,t.fillText(`${Math.floor(y*100)}%`,E+T+7,a)}}if(x){let e=D,n=C?`#cc44ff`:b>=.15?`#9944ff`:`#664488`;t.fillStyle=`rgba(0,0,0,0.35)`,t.beginPath(),t.roundRect(E,e,T,w,3),t.fill(),b>.005&&(t.fillStyle=n,t.beginPath(),t.roundRect(E,e,T*b,w,3),t.fill()),C&&(t.strokeStyle=`#cc44ff`,t.lineWidth=1,t.beginPath(),t.roundRect(E,e,T,w,3),t.stroke());let r=e+w-1;t.font=`bold 9px monospace`,t.fillStyle=C?`#cc44ff`:`rgba(180,140,220,0.55)`,t.textAlign=`right`,t.fillText(`CHRONO`,E-7,r),t.textAlign=`left`,t.fillStyle=`rgba(180,140,220,0.45)`,t.fillText(`${Math.floor(b*100)}%`,E+T+7,r)}if(e.player.maxShield>0){let n=e.player.shield/e.player.maxShield,r=e.player.shield<e.player.maxShield;t.fillStyle=`rgba(0,0,0,0.4)`,t.beginPath(),t.roundRect(h,v,p,_,2),t.fill(),t.fillStyle=r?`#4488ff`:`#66aaff`,t.beginPath(),t.roundRect(h,v,p*n,_,2),t.fill(),r&&(t.fillStyle=`rgba(100,160,255,${.08+Math.sin(e.time*.006)*.04})`,t.beginPath(),t.roundRect(h,v,p*n,_,2),t.fill()),t.strokeStyle=`rgba(100,160,255,0.35)`,t.lineWidth=1,t.beginPath(),t.roundRect(h,v,p,_,2),t.stroke(),t.fillStyle=`#88bbff`,t.font=`bold 8px monospace`,t.textAlign=`center`,t.fillText(`SHIELD ${Math.ceil(e.player.shield)}`,h+p/2,v+_-0)}{t.fillStyle=`rgba(0,0,0,0.5)`,t.beginPath(),t.roundRect(h,g,p,m,3),t.fill(),t.fillStyle=l,t.beginPath(),t.roundRect(h,g,p*c,m,3),t.fill();let n=t.createLinearGradient(h,g,h,g+m);n.addColorStop(0,`rgba(255,255,255,0.18)`),n.addColorStop(.5,`rgba(255,255,255,0)`),n.addColorStop(1,`rgba(0,0,0,0.1)`),t.fillStyle=n,t.beginPath(),t.roundRect(h,g,p*c,m,3),t.fill(),t.strokeStyle=c<.25?`rgba(255,34,0,0.6)`:`rgba(255,255,255,0.15)`,t.lineWidth=1,t.beginPath(),t.roundRect(h,g,p,m,3),t.stroke();let r=g+m-1;t.font=`bold 10px monospace`,t.fillStyle=c<.25?`#ff6644`:`rgba(255,255,255,0.55)`,t.textAlign=`right`,t.fillText(`HP`,h-7,r),t.textAlign=`left`,t.fillStyle=`#ffffff`,t.fillText(`${Math.ceil(e.player.health)} / ${e.player.maxHealth}`,h+p+7,r)}if(e.settings.showWeapons){t.font=`bold ${Math.max(12,o-14)}px monospace`;for(let n=0;n<s;n++){let r=n===e.player.currentWeapon,i=d+n*(a+4);t.fillStyle=r?`rgba(0,200,255,0.35)`:`rgba(0,0,0,0.4)`,t.beginPath(),t.roundRect(i,f,a,o,4),t.fill(),t.strokeStyle=r?`#00ccff`:`rgba(255,255,255,0.12)`,t.lineWidth=r?2:1,t.beginPath(),t.roundRect(i,f,a,o,4),t.stroke();let s=e.player.weapons[n],c=s?Ei(Oi(s.name)):null;c?(t.save(),t.globalAlpha=r?1:.55,t.drawImage(c,i+3,f+3,a-6,o-6),t.restore(),t.fillStyle=r?`rgba(0,0,0,0.55)`:`rgba(0,0,0,0.4)`,t.fillRect(i+2,f+2,11,10),t.fillStyle=r?`#00eaff`:`rgba(255,255,255,0.5)`,t.font=`bold 8px monospace`,t.textAlign=`center`,t.fillText(`${n+1}`,i+7,f+10)):(t.fillStyle=r?`#ffffff`:`#555555`,t.textAlign=`center`,t.fillText(`${n+1}`,i+a/2,f+o/2+5))}}}{let i=n-12,a=r-14;t.textAlign=`right`,t.fillStyle=`#ffcc00`,t.font=e.scaledFont(38,`bold`),t.fillText(`${e.player.ammo}`,i,a-18),s&&(t.fillStyle=s.color,t.font=`bold 13px monospace`,t.fillText(s.name,i,a))}{let r=e.settings.minimapSize;e.isTouchDevice&&n<700&&(r=Math.min(r,Math.round(n*.28)));let i=e.settings.showKills?48:10;yi(t,n-r-10,i,r,r,Wi(e))}let{x:d,y:f}=hr(n,r,0,e.player);fi(t,d,f,e.settings.crosshair),Ui(t,e,d,f),Bi(t,e,d,f);for(let i of e.damageNumbers){let a=i.x-e.player.x,o=i.y-e.player.y,s=Math.atan2(o,a)-e.player.angle;for(;s<-Math.PI;)s+=Math.PI*2;for(;s>Math.PI;)s-=Math.PI*2;let c=lr(e.player,e.settings)*Math.PI/180;if(Math.abs(s)>c/2||Math.sqrt(a*a+o*o)<.1)continue;let l=n/2+s/(c/2)*(n/2),u=(.8-i.life)*60,d=r/2-u,f=Math.min(1,i.life/.3);t.save(),t.globalAlpha=f,t.textAlign=`center`,Vi(t,i,l,d,!0),t.restore()}if(e.killStreakSystem.renderThirdPerson(t,n,r),Hi(t,e,n,r),e.mode===`arena`&&e.arenaClearTimer!=null){let i=Math.ceil(e.arenaClearTimer),a=.7+Math.sin(e.time*.005)*.3;t.fillStyle=`rgba(0,10,5,${.5*a})`,t.fillRect(0,r/2-60,n,120),t.fillStyle=`rgba(0,255,100,${a})`,t.font=`bold 48px monospace`,t.textAlign=`center`,t.fillText(`STAGE CLEARED!`,n/2,r/2-8),t.fillStyle=`rgba(200,230,255,0.8)`,t.font=`bold 22px monospace`,t.fillText(`Next round in ${i}s...`,n/2,r/2+30),t.textAlign=`left`}if(e.slowMoTimer>0){let i=Math.min(.35,e.slowMoTimer/1.5*.35);t.fillStyle=`rgba(0,20,60,${i*.4})`,t.fillRect(0,0,n,r);let a=t.createRadialGradient(n/2,r/2,n*.25,n/2,r/2,n*.7);a.addColorStop(0,`rgba(0,0,0,0)`),a.addColorStop(1,`rgba(0,0,0,${i})`),t.fillStyle=a,t.fillRect(0,0,n,r)}e.renderAchievementToast(t,n,r),e._meltdownUpgradeChoices&&Ji(e,t,n,r),e.renderAriaComms(t,n,r)}function qi(e,t,n,r,i,a){e.player.getWeaponDef();let o=e.player.health/e.player.maxHealth,s=o>.6?e.cbColor(`#00ff66`):o>.3?e.cbColor(`#ffaa00`):e.cbColor(`#ff2200`),c=e.settings.staminaBarSize/100,l=e.player.stamina/e.player.maxStamina,u=e.player.chronoEnergy/e.player.maxChronoEnergy,d=u>.005||e.player.chronoActive,f=e.player.isSprinting||e.player.isDashing,p=e.player.chronoActive,m=Math.round(24*c),h=Math.round(520*c),g,_,v,y;d?(g=Math.round(h*.55),v=h-g-10,_=Math.floor(n/2-h/2),y=_+g+10):(g=h,_=Math.floor(n/2-g/2),v=0,y=0);let b=r-i-m-8,x=m,S=b;f&&(t.fillStyle=e.player.isDashing?`rgba(0,255,255,0.15)`:`rgba(255,170,0,0.12)`,t.beginPath(),t.roundRect(_-6,b-6,g+12,m+12,8),t.fill(),t.fillStyle=e.player.isDashing?`rgba(0,255,255,0.25)`:`rgba(255,170,0,0.2)`,t.beginPath(),t.roundRect(_-4,b-4,g+8,m+8,6),t.fill()),t.fillStyle=`rgba(5,5,15,0.8)`,t.beginPath(),t.roundRect(_-2,b-2,g+4,m+4,5),t.fill();let C=e.player.isDashing?`#00ffff`:e.player.isSprinting?`#ffaa00`:l>.3?`#00ccff`:`#ff4400`;if(t.fillStyle=`rgba(255,255,255,0.06)`,t.beginPath(),t.roundRect(_,b,g,m,4),t.fill(),l>.005){t.fillStyle=C,t.beginPath(),t.roundRect(_,b,g*l,m,4),t.fill();let e=t.createLinearGradient(_,b,_,b+m);e.addColorStop(0,`rgba(255,255,255,0.25)`),e.addColorStop(.5,`rgba(255,255,255,0)`),e.addColorStop(1,`rgba(0,0,0,0.15)`),t.fillStyle=e,t.beginPath(),t.roundRect(_,b,g*l,m,4),t.fill()}if(t.strokeStyle=f?C:`rgba(255,255,255,0.2)`,t.lineWidth=f?1.5:1,t.beginPath(),t.roundRect(_,b,g,m,4),t.stroke(),l<.99||f){let n=e.player.isDashing?`DASH`:e.player.isSprinting?`SPRINT`:`STAMINA`;t.fillStyle=f?C:`rgba(255,255,255,0.6)`,t.font=`bold 13px monospace`,t.textAlign=`center`,t.fillText(n,_+g*.25,b+m/2+5),t.fillStyle=`rgba(255,255,255,0.5)`,t.fillText(`${Math.floor(l*100)}%`,_+g*.75,b+m/2+5)}if(d){if(p&&(t.fillStyle=`rgba(180,0,255,0.15)`,t.beginPath(),t.roundRect(y-4,S-4,v+8,x+8,6),t.fill()),t.fillStyle=`rgba(5,5,15,0.7)`,t.beginPath(),t.roundRect(y-1,S-1,v+2,x+2,4),t.fill(),t.fillStyle=`rgba(255,255,255,0.04)`,t.beginPath(),t.roundRect(y,S,v,x,3),t.fill(),u>.005){t.fillStyle=p?`#cc44ff`:u>=.15?`#9944ff`:`#664488`,t.beginPath(),t.roundRect(y,S,v*u,x,3),t.fill();let e=t.createLinearGradient(y,S,y,S+x);e.addColorStop(0,`rgba(255,255,255,0.2)`),e.addColorStop(.5,`rgba(255,255,255,0)`),e.addColorStop(1,`rgba(0,0,0,0.1)`),t.fillStyle=e,t.beginPath(),t.roundRect(y,S,v*u,x,3),t.fill()}t.strokeStyle=p?`#cc44ff`:`rgba(150,100,200,0.3)`,t.lineWidth=p?1.5:1,t.beginPath(),t.roundRect(y,S,v,x,3),t.stroke();let e=p?`CHRONO SHIFT`:`CHRONO`;t.fillStyle=p?`#cc44ff`:`rgba(180,140,220,0.6)`,t.font=`bold 11px monospace`,t.textAlign=`center`,t.fillText(e,y+v*.3,S+x/2+4),t.fillStyle=`rgba(180,140,220,0.5)`,t.fillText(`${Math.floor(u*100)}%`,y+v*.75,S+x/2+4),t.fillStyle=`rgba(150,120,200,0.3)`,t.font=`bold 9px monospace`,t.fillText(`[HOLD Q]`,y+v-15,S+x/2+4)}t.fillStyle=`#333333`,t.fillRect(0,r-i,n,i),t.fillStyle=`#1a1a1a`,t.fillRect(4,r-i+4,n-8,i-8);let w=Math.round(180*a),T=Math.round(160*a),E=Math.floor(n/2-w/2),D=r-i,O=(e,n,r,i)=>{t.fillStyle=`#111111`,t.fillRect(e,n,r,i),t.strokeStyle=`#555555`,t.lineWidth=2,t.strokeRect(e,n,r,i),t.fillStyle=`#0a0a0a`,t.fillRect(e+4,n+4,r-8,i-8)},k=Math.floor(E*.4),A=r-i+12,j=i-24;O(14,A,k,j),t.fillStyle=`#ffcc00`,t.font=`bold 16px monospace`,t.textAlign=`center`,t.fillText(`AMMO`,14+k/2,A+22),t.fillStyle=`#ffaa00`,t.font=e.scaledFont(64,`bold`),t.fillText(`${e.player.ammo}`,14+k/2,A+j-24);let M=E-k-14*2.5,N=14+k+14/2;O(N,A,M,j),t.fillStyle=s,t.font=`bold 16px monospace`,t.textAlign=`center`,t.fillText(`HEALTH`,N+M/2,A+22),t.fillStyle=`#ffffff`,t.font=e.scaledFont(64,`bold`),t.fillText(`${Math.ceil(e.player.health)}%`,N+M/2,A+j-24),e.settings.showPortrait&&(_i(t,E,D,w,T,Gi(e)),t.strokeStyle=`#444444`,t.lineWidth=8,t.strokeRect(E-4,D-4,w+8,T+8),t.strokeStyle=`#111111`,t.lineWidth=4,t.strokeRect(E-2,D-2,w+4,T+4));let P=n-(E+w),F=Math.floor(P*.4)-14*1.5,ee=E+w+14;if(e.player.maxShield>0){O(ee,A,F,j),t.fillStyle=`#00ccff`,t.font=`bold 16px monospace`,t.textAlign=`center`,t.fillText(`SHIELD`,ee+F/2,A+22);let n=Math.ceil(e.player.shield/e.player.maxShield*100);t.fillStyle=`#ffffff`,t.font=e.scaledFont(64,`bold`),t.fillText(`${n}%`,ee+F/2,A+j-24)}let te=ee+F+14/2,ne=P-F-14*2.5;O(te,A,ne,j),t.fillStyle=`#ff5500`,t.font=`bold 16px monospace`,t.textAlign=`center`,t.fillText(`ARMS`,te+ne/2,A+22);let I=(ne-16)/4,re=(j-40)/2,ie=te+8,L=A+30;for(let n=0;n<8;n++){let r=n%4,i=Math.floor(n/4),a=ie+r*I,o=L+i*re,s=e.player.weapons[n]!==void 0,c=n===e.player.currentWeapon;if(c&&(t.fillStyle=`rgba(255,170,0,0.3)`,t.fillRect(a+2,o+2,I-4,re-4)),s){let r=e.player.weapons[n],i=Ei(Oi(r.name));i&&(t.save(),t.globalAlpha=c?1:.4,t.drawImage(i,a+4,o+4,I-8,re-8),t.restore())}t.fillStyle=c?`#ffffff`:s?`#ffaa00`:`#444444`,t.font=`bold 12px monospace`,t.textAlign=`left`,t.fillText(`${n+1}`,a+4,o+14)}if(e.settings.showKills&&(t.fillStyle=`#ff8866`,t.font=`bold 12px monospace`,t.textAlign=`left`,t.fillText(`KILLS: ${e.killedEnemies}`,14,r-i-8)),e.settings.showScore&&(t.fillStyle=`#00ddff`,t.font=`bold 12px monospace`,t.textAlign=`right`,t.fillText(`SCORE: ${e.player.score}`,n-14,r-i-8)),e.mode===`arena`){let n=Math.ceil(e.arenaTimer),r=n<=10,i=e.arenaClearTimer!=null;if(t.fillStyle=`rgba(0,0,0,0.7)`,t.fillRect(10,10,160,90),t.strokeStyle=r?`rgba(255,34,0,0.6)`:i?`rgba(0,255,100,0.5)`:`rgba(0,200,255,0.3)`,t.lineWidth=2,t.strokeRect(10,10,160,90),t.fillStyle=i?`#00ff66`:r?Math.floor(e.time/250)%2?`#ff2200`:`#ffaa00`:`#00ffcc`,t.font=`bold 44px monospace`,t.textAlign=`center`,t.fillText(`${n}s`,90,62),t.fillStyle=i?`rgba(0,255,100,0.7)`:`rgba(255,255,255,0.5)`,t.font=`bold 14px monospace`,t.fillText(i?`CLEARED!`:`TIME`,90,28),e.roundStartTime){let n=Math.floor((performance.now()-e.roundStartTime)/1e3),r=Math.floor(n/60),i=n%60;t.fillStyle=`rgba(255,255,255,0.3)`,t.font=`12px monospace`,t.fillText(`${r}:${i.toString().padStart(2,`0`)} elapsed`,90,82)}}if(e.mode===`campaign`&&e.roundStartTime){let n=Math.floor((performance.now()-e.roundStartTime)/1e3),r=Math.floor(n/60),i=n%60;t.fillStyle=`rgba(0,0,0,0.5)`,t.fillRect(10,10,90,24),t.fillStyle=`rgba(200,220,255,0.5)`,t.font=`12px monospace`,t.textAlign=`center`,t.fillText(`${r}:${i.toString().padStart(2,`0`)}`,55,27)}if(e.mode===`meltdown`){let a=e.meltdown.getHUD(),o=a.heat/100,s=n-120-15;t.fillStyle=`rgba(0,0,0,0.7)`,t.fillRect(s-5,10,130,40),t.strokeStyle=`rgba(255,68,0,0.3)`,t.strokeRect(s-5,10,130,40),t.fillStyle=`rgba(60,20,0,0.6)`,t.fillRect(s,15,120,16),t.fillStyle=o<.5?`rgb(255, ${Math.floor(200-o*300)}, 0)`:`rgb(255, ${Math.floor(100-(o-.5)*200)}, 0)`,t.fillRect(s,15,120*o,16),t.font=`bold 9px monospace`,t.textAlign=`center`,t.fillStyle=o>.7?`#ff4400`:`#ffaa66`,t.fillText(`REACTOR: ${a.heat}%`,s+120/2,43),t.font=`8px monospace`,t.fillStyle=`rgba(150,200,255,0.5)`,t.textAlign=`right`,t.fillText(`${a.speed} m/s`,n-15,59);let c=e.meltdown.getHeatOverlay();if(c&&(t.fillStyle=c,t.fillRect(0,0,n,r-i)),e._meltdownAriaText){let i=Math.min(1,e._meltdownAriaTimer/.5);t.save(),t.globalAlpha=i,t.fillStyle=`rgba(0,0,0,0.6)`;let a=t.measureText(e._meltdownAriaText).width+40;t.fillRect(n/2-a/2,r*.2-15,a,30),t.font=`bold 13px monospace`,t.textAlign=`center`,t.fillStyle=`#00ccff`,t.fillText(e._meltdownAriaText,n/2,r*.2+3),t.restore()}}{let r=e.entities.find(e=>e.type===`enemy`&&e.active&&e.health>0&&(e.enemyType===`boss`||e.enemyType===`boss_form2`||e.enemyType===`boss_form3`));if(r){let e=Math.min(400,n*.4),i=Math.floor(n/2-e/2),a=Math.max(0,r.health/r.maxHealth),o=r.def.form||1,s=r.def.name||`BOSS`,c=o===3?`#ff0044`:o===2?`#ff0066`:`#ff0088`;t.fillStyle=`rgba(0,0,0,0.65)`,t.fillRect(i-8,-4,e+16,42),t.strokeStyle=c,t.lineWidth=1,t.strokeRect(i-8,-4,e+16,42),t.fillStyle=c,t.font=`bold 12px monospace`,t.textAlign=`center`,t.fillText(s,n/2,10),t.fillStyle=`rgba(255,255,255,0.08)`,t.fillRect(i,14,e,14),t.fillStyle=c,t.fillRect(i,14,e*a,14);let l=t.createLinearGradient(i,14,i,28);l.addColorStop(0,`rgba(255,255,255,0.2)`),l.addColorStop(.5,`rgba(255,255,255,0)`),l.addColorStop(1,`rgba(0,0,0,0.1)`),t.fillStyle=l,t.fillRect(i,14,e*a,14),t.strokeStyle=c,t.lineWidth=1.5,t.strokeRect(i,14,e,14),t.fillStyle=`#ffffff`,t.font=`bold 11px monospace`,t.textAlign=`center`,t.fillText(`${Math.ceil(r.health)} / ${r.maxHealth}`,n/2,26)}}t.textAlign=`left`;let ae=e.settings.minimapSize;yi(t,n-ae-10,10,ae,ae,Wi(e));let{x:oe,y:se}=hr(n,r,i,e.player);fi(t,oe,se,e.settings.crosshair),Ui(t,e,oe,se),Bi(t,e,oe,se);for(let a of e.damageNumbers){let o=a.x-e.player.x,s=a.y-e.player.y,c=Math.atan2(s,o)-e.player.angle;for(;c<-Math.PI;)c+=Math.PI*2;for(;c>Math.PI;)c-=Math.PI*2;let l=lr(e.player,e.settings)*Math.PI/180;if(Math.abs(c)>l/2||Math.sqrt(o*o+s*s)<.1)continue;let u=.8-a.life,d=n/2+c/(l/2)*(n/2)+(a.vx||0)*u,f=u*90-u*u*60,p=(r-i)/2-f,m=Math.min(1,a.life/.3);t.save(),t.globalAlpha=m,t.textAlign=`center`,Vi(t,a,d,p,!0),t.restore()}if(e.killStreakSystem.renderFirstPerson(t,n,r,i),Hi(t,e,n,r),e.mode===`arena`&&e.arenaClearTimer!=null){let a=Math.ceil(e.arenaClearTimer),o=.7+Math.sin(e.time*.005)*.3;t.fillStyle=`rgba(0,10,5,${.5*o})`,t.fillRect(0,(r-i)/2-60,n,120),t.fillStyle=`rgba(0,255,100,${o})`,t.font=`bold 48px monospace`,t.textAlign=`center`,t.fillText(`STAGE CLEARED!`,n/2,(r-i)/2-8),t.fillStyle=`rgba(200,230,255,0.8)`,t.font=`bold 22px monospace`,t.fillText(`Next round in ${a}s...`,n/2,(r-i)/2+30),t.textAlign=`left`}if(e.slowMoTimer>0){let a=Math.min(.35,e.slowMoTimer/1.5*.35);t.fillStyle=`rgba(0,20,60,${a*.4})`,t.fillRect(0,0,n,r-i);let o=t.createRadialGradient(n/2,(r-i)/2,n*.25,n/2,(r-i)/2,n*.7);o.addColorStop(0,`rgba(0,0,0,0)`),o.addColorStop(1,`rgba(0,0,0,${a})`),t.fillStyle=o,t.fillRect(0,0,n,r-i)}e.showFPS&&(t.fillStyle=`#ffcc00`,t.font=`bold 12px monospace`,t.textAlign=`left`,t.fillText(`FPS: ${e.fps}`,10,r-i-8)),e.renderAchievementToast(t,n,r),e._meltdownUpgradeChoices&&Ji(e,t,n,r),e.renderAriaComms(t,n,r)}function Ji(e,t,n,r){let i=e._meltdownUpgradeChoices;if(!i||i.length===0)return;t.fillStyle=`rgba(0,0,0,0.65)`,t.fillRect(0,0,n,r),t.fillStyle=`#ffaa00`,t.font=`bold 28px monospace`,t.textAlign=`center`,t.fillText(`SYSTEM UPGRADE`,n/2,r*.22),t.fillStyle=`rgba(255,255,255,0.5)`,t.font=`14px monospace`,t.fillText(`Press 1, 2, or 3 to select — or use Arrow Keys + Enter`,n/2,r*.22+30);let a=Math.min(200,(n-80)/3),o=i.length*a+(i.length-1)*16,s=Math.floor(n/2-o/2),c=Math.floor(r/2-160/2);for(let n=0;n<i.length;n++){let r=i[n],o=s+n*(a+16),l=n===e._meltdownUpgradeSel;t.fillStyle=l?`rgba(0,200,255,0.2)`:`rgba(10,10,30,0.85)`,t.beginPath(),t.roundRect(o,c,a,160,8),t.fill(),t.strokeStyle=l?`#00ccff`:`rgba(255,255,255,0.2)`,t.lineWidth=l?2.5:1,t.beginPath(),t.roundRect(o,c,a,160,8),t.stroke(),t.fillStyle=l?`#00ccff`:`rgba(255,255,255,0.4)`,t.font=`bold 12px monospace`,t.textAlign=`left`,t.fillText(`[${n+1}]`,o+10,c+20),t.font=`32px serif`,t.textAlign=`center`,t.fillText(r.icon||`⚙`,o+a/2,c+52),t.fillStyle=l?`#ffffff`:`rgba(255,255,255,0.8)`,t.font=`bold 14px monospace`,t.textAlign=`center`,t.fillText(r.name,o+a/2,c+80),t.fillStyle=`rgba(200,220,255,0.6)`,t.font=`12px monospace`;let u=r.description||``,d=a-16,f=u.split(` `),p=``,m=c+100;for(let e of f){let n=p?p+` `+e:e;t.measureText(n).width>d?(t.fillText(p,o+a/2,m),p=e,m+=15):p=n}p&&t.fillText(p,o+a/2,m)}t.textAlign=`left`}function Yi(e,t,n,r,i,a){let o=e.player.getWeaponDef(),s=e.player.health/e.player.maxHealth,c=s>.6?e.cbColor(`#00ff66`):s>.3?e.cbColor(`#ffaa00`):e.cbColor(`#ff2200`),l=e.player.stamina/e.player.maxStamina,u=Math.round(8*a),d=Math.round(220*a),f=Math.floor(n/2-d/2),p=r-i-u-4,m=e.player.isSprinting||e.player.isDashing;t.fillStyle=`rgba(5,5,15,0.7)`,t.fillRect(f-1,p-1,d+2,u+2),l>.005&&(t.fillStyle=e.player.isDashing?`#00ffff`:e.player.isSprinting?`#ffaa00`:l>.3?`#00ccff`:`#ff4400`,t.fillRect(f,p,d*l,u)),t.strokeStyle=m?`#ffaa00`:`rgba(255,255,255,0.15)`,t.lineWidth=1,t.strokeRect(f,p,d,u);let h=e.player.chronoEnergy/e.player.maxChronoEnergy;if(h>.005||e.player.chronoActive){let r=Math.round(5*a),i=Math.round(140*a),o=Math.floor(n/2-i/2),s=p-r-3;t.fillStyle=`rgba(5,5,15,0.6)`,t.fillRect(o-1,s-1,i+2,r+2),h>.005&&(t.fillStyle=e.player.chronoActive?`#cc44ff`:`#9944ff`,t.fillRect(o,s,i*h,r)),t.strokeStyle=e.player.chronoActive?`#cc44ff`:`rgba(150,100,200,0.25)`,t.lineWidth=1,t.strokeRect(o,s,i,r)}t.fillStyle=`rgba(5,5,15,0.88)`,t.fillRect(0,r-i,n,i),t.strokeStyle=`rgba(0,200,255,0.25)`,t.lineWidth=1,t.beginPath(),t.moveTo(0,r-i),t.lineTo(n,r-i),t.stroke();let g=r-i/2,_=Math.round(n*.22);t.fillStyle=c,t.font=`bold 22px monospace`,t.textAlign=`left`,t.fillText(`${Math.ceil(e.player.health)}`,8,g+3);let v=_-8,y=g+10;if(t.fillStyle=`rgba(255,255,255,0.08)`,t.fillRect(8,y,v,6),t.fillStyle=c,t.fillRect(8,y,v*s,6),e.player.maxShield>0){let n=e.player.shield/e.player.maxShield,r=y+6+2;t.fillStyle=`rgba(255,255,255,0.05)`,t.fillRect(8,r,v,4),t.fillStyle=`#4488ff`,t.fillRect(8,r,v*n,4)}let b=_+16;if(t.fillStyle=`#ffcc00`,t.font=`bold 22px monospace`,t.textAlign=`center`,t.fillText(`${e.player.ammo}`,b+30,g+3),t.fillStyle=`rgba(255,204,0,0.5)`,t.font=`bold 8px monospace`,t.fillText(`AMMO`,b+30,g-12),o&&(t.fillStyle=o.color,t.font=`bold 10px monospace`,t.textAlign=`center`,t.fillText(o.name,n/2,g+14)),t.fillStyle=`rgba(0,200,255,0.5)`,t.font=`bold 9px monospace`,t.textAlign=`center`,t.fillText(`W${e.player.currentWeapon+1}`,n/2,g-12),e.settings.showKills){let r=n-8-110;t.fillStyle=`#ff8866`,t.font=`bold 16px monospace`,t.textAlign=`right`,t.fillText(`${e.killedEnemies}/${e.totalEnemies}`,r,g+2),t.fillStyle=`rgba(255,136,102,0.5)`,t.font=`bold 8px monospace`,t.fillText(`KILLS`,r,g-10)}if(e.settings.showScore){let r=n-8;t.fillStyle=`#00ddff`,t.font=`bold 16px monospace`,t.textAlign=`right`,t.fillText(`${e.player.score}`,r,g+2),t.fillStyle=`rgba(0,221,255,0.5)`,t.font=`bold 8px monospace`,t.fillText(`SCORE`,r,g-10)}e.mode===`arena`&&(t.fillStyle=`#ffaa00`,t.font=`bold 9px monospace`,t.textAlign=`right`,t.fillText(`R${e.arenaRound}`,n-8,g+14)),t.fillStyle=[`#44ff44`,`#00ccff`,`#ffaa00`,`#ff2200`][e.settings.difficulty],t.font=`bold 8px monospace`,t.textAlign=`left`,t.fillText([`EASY`,`NORM`,`HARD`,`NITE`][e.settings.difficulty],8,g-12)}function Xi(e,t,n,r,i,a){let o=e.player.getWeaponDef(),s=e.player.health/e.player.maxHealth,c=s>.6?e.cbColor(`#00ff66`):s>.3?e.cbColor(`#ffaa00`):e.cbColor(`#ff2200`),l=n/2,u=r-60;t.strokeStyle=`rgba(0,255,200,0.3)`,t.lineWidth=2,t.beginPath(),t.arc(l,u,180,Math.PI+.3,Math.PI*2-.3),t.stroke(),t.fillStyle=`rgba(0,10,20,0.6)`,t.beginPath(),t.moveTo(l-200,u),t.lineTo(l-300,u),t.lineTo(l-320,u+40),t.lineTo(l-200,u+40),t.fill(),t.fillStyle=c,t.font=`bold 24px monospace`,t.textAlign=`right`,t.fillText(`HP ${Math.ceil(e.player.health)}`,l-210,u+28),t.fillStyle=`rgba(0,10,20,0.6)`,t.beginPath(),t.moveTo(l+200,u),t.lineTo(l+300,u),t.lineTo(l+320,u+40),t.lineTo(l+200,u+40),t.fill(),t.fillStyle=`#ffcc00`,t.textAlign=`left`,t.fillText(`AMMO ${e.player.ammo}`,l+210,u+28),o&&(t.fillStyle=o.color,t.font=`bold 14px monospace`,t.textAlign=`center`,t.fillText(o.name.toUpperCase(),l,u-20))}function Zi(e,t,n,r,i,a){if(!e.settings.customHudLayout){t.fillStyle=`rgba(0,0,0,0.8)`,t.fillRect(n/2-200,r/2-50,400,100),t.fillStyle=`#ff4400`,t.font=`bold 18px monospace`,t.textAlign=`center`,t.fillText(`NO CUSTOM HUD CONFIGURED`,n/2,r/2-10),t.fillStyle=`#aaaaaa`,t.font=`14px monospace`,t.fillText(`Go to Settings > Edit Custom HUD`,n/2,r/2+20);return}let o=e.settings.customHudLayout;if(o.health){let i=o.health.x*n,a=o.health.y*r,s=e.player.health/e.player.maxHealth;t.fillStyle=s>.6?`#00ff66`:s>.3?`#ffaa00`:`#ff2200`,t.font=`bold 32px monospace`,t.textAlign=`center`,t.fillText(`${Math.ceil(e.player.health)}`,i,a),t.fillStyle=`#ffffff`,t.font=`12px monospace`,t.fillText(`HEALTH`,i,a+16)}if(o.ammo){let i=o.ammo.x*n,a=o.ammo.y*r;t.fillStyle=`#ffcc00`,t.font=`bold 32px monospace`,t.textAlign=`center`,t.fillText(`${e.player.ammo}`,i,a),t.fillStyle=`#ffffff`,t.font=`12px monospace`,t.fillText(`AMMO`,i,a+16)}if(o.shield&&e.player.maxShield>0){let i=o.shield.x*n,a=o.shield.y*r,s=Math.ceil(e.player.shield/e.player.maxShield*100);t.fillStyle=`#00ccff`,t.font=`bold 32px monospace`,t.textAlign=`center`,t.fillText(`${s}%`,i,a),t.fillStyle=`#ffffff`,t.font=`12px monospace`,t.fillText(`SHIELD`,i,a+16)}if(o.portrait&&e.settings.showPortrait){let i=o.portrait.x*n,a=o.portrait.y*r;_i(t,i-60,a-60,120,120,Gi(e))}if(o.weapons&&e.settings.showWeapons){let i=o.weapons.x*n,a=o.weapons.y*r,s=e.player.getWeaponDef();s&&(t.fillStyle=s.color,t.font=`bold 16px monospace`,t.textAlign=`center`,t.fillText(s.name.toUpperCase(),i,a))}}function Qi(e,t,n,r=0){let i=performance.now(),a=r,o=e.createRadialGradient(t/2,n/2,0,t/2,n/2,t*.7);o.addColorStop(0,`#0a0a2a`),o.addColorStop(.5,`#050515`),o.addColorStop(1,`#000005`),e.fillStyle=o,e.fillRect(0,0,t,n);let s=.5+.5*Math.sin(i*.002);e.save(),e.translate(t/2,n*.25),e.strokeStyle=`rgba(0, 200, 255, ${.06+s*.05})`,e.lineWidth=2;for(let t=0;t<3;t++){let n=40+t*18+Math.sin(i*.001+t)*4;e.beginPath(),e.arc(0,0,n,0,Math.PI*2),e.stroke()}e.restore();let c=n*.2,l=.85+.15*Math.sin(i*.003);e.save(),e.shadowColor=`#00ccff`,e.shadowBlur=16*l,e.fillStyle=`#00ccff`,e.font=`bold 32px monospace`,e.textAlign=`center`,e.fillText(`START CAMPAIGN`,t/2,c),e.shadowBlur=0,e.restore(),e.fillStyle=`rgba(170, 200, 220, 0.5)`,e.font=`14px monospace`,e.textAlign=`center`,e.fillText(`Would you like to run through training first?`,t/2,c+28);let u=[{label:`WITH TUTORIAL`,key:`[1]`,color:`#00ffcc`,desc:`Run station training before deploying`},{label:`SKIP TO CAMPAIGN`,key:`[2]`,color:`#ff8844`,desc:`Deploy directly to the mission`}],d=u.length*56+16,f=(t-380)/2,p=n*.38;e.fillStyle=`rgba(0, 5, 15, 0.75)`,e.beginPath(),e.roundRect(f-10,p-10,400,d+20,12),e.fill(),e.strokeStyle=`rgba(0, 200, 255, 0.12)`,e.lineWidth=1,e.beginPath(),e.roundRect(f-10,p-10,400,d+20,12),e.stroke();for(let t=0;t<u.length;t++){let n=u[t],r=p+8+t*56,o=t===a;o&&(e.fillStyle=`rgba(0, 200, 255, ${.06*(.6+.4*Math.sin(i*.004))})`,e.beginPath(),e.roundRect(f,r,380,50,6),e.fill(),e.fillStyle=n.color,e.fillRect(f,r+4,3,42),e.fillStyle=`#00ccff`,e.font=`bold 16px monospace`,e.textAlign=`left`,e.fillText(`▸`,f+12,r+26)),e.fillStyle=o?n.color:`rgba(255,255,255,0.45)`,e.font=`${o?`bold `:``}16px monospace`,e.textAlign=`left`,e.fillText(n.label,f+32,r+26),n.desc&&o&&(e.fillStyle=`rgba(170, 200, 220, 0.5)`,e.font=`11px monospace`,e.fillText(n.desc,f+32,r+42)),e.fillStyle=o?`rgba(255,255,255,0.5)`:`rgba(255,255,255,0.2)`,e.font=`11px monospace`,e.textAlign=`right`,e.fillText(n.key,f+380-8,r+26)}e.textAlign=`left`;let m=n*.06;e.fillStyle=`#000000`,e.fillRect(0,0,t,m),e.fillRect(0,n-m,t,m),e.fillStyle=`rgba(255,255,255,0.2)`,e.font=`11px monospace`,e.textAlign=`center`,e.fillText(`W/S to navigate  ·  ENTER to select  ·  ESC to go back`,t/2,n-m/2+4),e.textAlign=`left`}function $i(e,t,n,r){let{isTouchDevice:i,arenaRound:a,playerScore:o,upgradeLevels:s,upgradeSelection:c}=r,l=performance.now();e.fillStyle=`#020510`,e.fillRect(0,0,t,n),e.strokeStyle=`rgba(0,200,255,0.03)`,e.lineWidth=1;let u=l*.01%40;for(let r=-u;r<t;r+=40)e.beginPath(),e.moveTo(r,0),e.lineTo(r,n),e.stroke();for(let r=-u;r<n;r+=40)e.beginPath(),e.moveTo(0,r),e.lineTo(t,r),e.stroke();e.fillStyle=`rgba(0,255,200,0.12)`;for(let r=0;r<30;r++){let i=t*.5+Math.sin(l*3e-4+r*2.1)*t*.45,a=n*.5+Math.cos(l*4e-4+r*1.7)*n*.45,o=1+Math.sin(l*.002+r)*.5;e.beginPath(),e.arc(i,a,o,0,Math.PI*2),e.fill()}let d=e.createRadialGradient(t/2,n/2,n*.2,t/2,n/2,n*.8);d.addColorStop(0,`rgba(0,0,0,0)`),d.addColorStop(1,`rgba(0,0,10,0.6)`),e.fillStyle=d,e.fillRect(0,0,t,n);let f=i&&K(n),p=f?14:40;f||(e.strokeStyle=`rgba(0,255,200,0.3)`,e.lineWidth=1,e.beginPath(),e.moveTo(t/2-200,p+14),e.lineTo(t/2+200,p+14),e.stroke());let m=.85+.15*Math.sin(l*.003);e.save(),e.shadowColor=`#00ffcc`,e.shadowBlur=18*m,e.fillStyle=`#00ffcc`,e.font=`bold ${f?18:32}px monospace`,e.textAlign=`center`,e.fillText(`ROUND ${a-1} COMPLETE`,t/2,p),e.shadowBlur=0,e.restore(),e.fillStyle=`#ffcc00`,e.font=`bold ${f?13:18}px monospace`,e.textAlign=`center`,e.fillText(`\u2605  SCORE: ${o}  \u2605`,t/2,p+(f?20:34)),f||(e.strokeStyle=`rgba(0,200,255,0.15)`,e.beginPath(),e.moveTo(t*.15,p+52),e.lineTo(t*.85,p+52),e.stroke(),e.fillStyle=`rgba(170,200,255,0.6)`,e.font=`bold 14px monospace`,e.fillText(`◆  UPGRADES  ◆`,t/2,p+70));let h=Object.keys(b),g=yn(t,n,h.length,i),{startY:_,cardH:v,cardGap:y,colW:x,cols:S,leftX:C,rightX:w}=g;for(let t=0;t<h.length;t++){let n=h[t],r=b[n],i=s[n]||0,a=Math.floor(r.baseCost*r.costScale**+i),u=i>=r.maxLevel,d=c===t,p=o>=a,m=t%S,g=Math.floor(t/S),T=m===0?C:w,E=_+g*(v+y);e.fillStyle=d?`rgba(0,200,255,0.08)`:`rgba(10,15,30,0.6)`,e.beginPath(),e.roundRect(T,E,x,v,6),e.fill(),d?(e.strokeStyle=`rgba(0,255,200,${.3+(.5+.5*Math.sin(l*.005))*.3})`,e.lineWidth=1.5,e.beginPath(),e.roundRect(T,E,x,v,6),e.stroke(),e.fillStyle=u?`#44ff44`:`#00ffcc`,e.beginPath(),e.roundRect(T,E,3,v,[3,0,0,3]),e.fill()):(e.strokeStyle=`rgba(50,60,80,0.4)`,e.lineWidth=1,e.beginPath(),e.roundRect(T,E,x,v,6),e.stroke());let D=f?16:26,O=T+(f?6:10),k=E+(f?2:6),A=Di(n);A&&(e.save(),e.globalAlpha=d?1:.75,e.drawImage(A,O,k,D,D),e.restore());let j=(f?8:14)+D+(f?4:8);if(e.fillStyle=d?`#ffffff`:`#8888aa`,e.font=`${d?`bold `:``}${f?11:15}px monospace`,e.textAlign=`left`,e.fillText(r.name,T+j,E+(f?14:20)),f||(e.fillStyle=d?`rgba(170,200,220,0.7)`:`rgba(100,110,130,0.6)`,e.font=`11px monospace`,e.fillText(r.description,T+j,E+36)),e.textAlign=`right`,u){e.fillStyle=`rgba(0,255,100,0.15)`;let t=f?30:40,n=f?14:20;e.beginPath(),e.roundRect(T+x-t-12,E+(f?4:8),t,n,4),e.fill(),e.fillStyle=`#44ff44`,e.font=`bold ${f?9:12}px monospace`,e.fillText(`MAX`,T+x-(f?8:16),E+(f?14:22))}else e.fillStyle=p?`#ffcc00`:`#ff4455`,e.font=`bold ${f?11:14}px monospace`,e.fillText(`${a}`,T+x-(f?6:12),E+(f?14:22)),f||(e.fillStyle=`rgba(255,255,255,0.2)`,e.font=`9px monospace`,e.fillText(`COST`,T+x-12,E+12));let M=Math.min(r.maxLevel,10),N=x-(f?16:28),P=f?2:3,F=E+v-(f?6:12);if(e.fillStyle=`rgba(30,40,60,0.8)`,e.beginPath(),e.roundRect(T+(f?8:14),F,N,P,2),e.fill(),i>0){let t=N*i/M,n=e.createLinearGradient(T+(f?8:14),0,T+(f?8:14)+t,0);n.addColorStop(0,u?`#44ff44`:`#00ffcc`),n.addColorStop(1,u?`#22cc22`:`#0088aa`),e.fillStyle=n,e.beginPath(),e.roundRect(T+(f?8:14),F,t,P,2),e.fill()}e.textAlign=`right`,e.fillStyle=`rgba(150,170,190,0.4)`,e.font=`${f?7:9}px monospace`,e.fillText(`LV ${i}/${r.maxLevel}`,T+x-(f?6:12),F+3),e.textAlign=`left`}let T=g.contY,E=c===h.length,D=f?260:360,O=f?28:36;if(E){let n=.5+.5*Math.sin(l*.004);e.fillStyle=`rgba(0,255,200,${.06+n*.04})`,e.beginPath(),e.roundRect(t/2-D/2,T-O/2,D,O,8),e.fill(),e.strokeStyle=`rgba(0,255,200,${.3+n*.3})`,e.lineWidth=1,e.beginPath(),e.roundRect(t/2-D/2,T-O/2,D,O,8),e.stroke()}e.fillStyle=E?`#00ffcc`:`#556677`,e.font=`bold ${f?13:18}px monospace`,e.textAlign=`center`,e.fillText(E?`▶  CONTINUE  ▶`:`CONTINUE`,t/2,T+(f?3:5)),f||(e.fillStyle=`rgba(100,120,140,0.4)`,e.font=`11px monospace`,e.fillText(`W/S/A/D navigate  ·  ENTER select`,t/2,T+34)),gi(e,t,n),e.textAlign=`left`}var ea=`#00ffcc`,ta=`rgba(0, 5, 15, 0.7)`,na=`rgba(0, 5, 15, 0.75)`,ra=`rgba(0, 255, 200, 0.12)`,ia=`rgba(170, 200, 220, 0.6)`,aa=`rgba(255,255,255,0.2)`,oa=e=>`rgba(0, 255, 200, ${e})`;function sa(e,t,n,r,i){e.fillStyle=ta,e.fillRect(0,0,t,n),e.strokeStyle=`rgba(0,200,255,0.02)`,e.lineWidth=1;let a=i*.008%48;e.beginPath();for(let r=-a;r<t;r+=48)e.moveTo(r,0),e.lineTo(r,n);for(let r=-a;r<n;r+=48)e.moveTo(0,r),e.lineTo(t,r);e.stroke(),e.fillStyle=`rgba(0,255,200,0.1)`;for(let r=0;r<20;r++){let a=t*.5+Math.sin(i*25e-5+r*2.3)*t*.42,o=n*.5+Math.cos(i*3e-4+r*1.9)*n*.42,s=1+Math.sin(i*.002+r)*.5;e.beginPath(),e.arc(a,o,s,0,Math.PI*2),e.fill()}let o=e.createRadialGradient(t/2,n/2,n*.2,t/2,n/2,n*.8);o.addColorStop(0,`rgba(0,0,0,0)`),o.addColorStop(1,`rgba(0,0,10,0.5)`),e.fillStyle=o,e.fillRect(0,0,t,n);let s=.5+.5*Math.sin(i*.002);e.save(),e.translate(t/2,r),e.strokeStyle=oa(.08+s*.06),e.lineWidth=2;for(let t=0;t<3;t++){let n=50+t*22+Math.sin(i*.001+t)*4;e.beginPath(),e.arc(0,0,n,0,Math.PI*2),e.stroke()}e.restore()}function ca(e,t,n,r,i,a){let o=n*.14,s=.85+.15*Math.sin(a*.003);return e.save(),e.shadowColor=ea,e.shadowBlur=20*s,e.fillStyle=ea,e.font=`bold 36px monospace`,e.textAlign=`center`,e.textBaseline=`alphabetic`,e.fillText(r,t/2,o),e.restore(),i&&(e.fillStyle=ia,e.font=`13px monospace`,e.textAlign=`center`,e.fillText(i,t/2,o+24)),e.strokeStyle=`rgba(0, 255, 200, 0.3)`,e.lineWidth=1,e.beginPath(),e.moveTo(t/2-100,o+36),e.lineTo(t/2+100,o+36),e.stroke(),o}function la(e,t,n,r,i,a){let{menuW:o,itemH:s,menuH:c,mx:l,my:u}=bn(t,n,r.length);e.fillStyle=na,e.beginPath(),e.roundRect(l-10,u-10,o+20,c+20,12),e.fill(),e.strokeStyle=ra,e.lineWidth=1,e.beginPath(),e.roundRect(l-10,u-10,o+20,c+20,12),e.stroke();for(let t=0;t<r.length;t++){let n=r[t],c=u+8+t*s,d=t===i;d&&(e.fillStyle=`rgba(0, 255, 200, ${.06*(.6+.4*Math.sin(a*.004))})`,e.beginPath(),e.roundRect(l,c,o,s-6,6),e.fill(),e.fillStyle=n.color,e.fillRect(l,c+4,3,s-14),e.fillStyle=ea,e.font=`bold 16px monospace`,e.textAlign=`left`,e.fillText(`▸`,l+12,c+24)),e.fillStyle=d?n.color:`rgba(255,255,255,0.45)`,e.font=`${d?`bold `:``}16px monospace`,e.textAlign=`left`,e.fillText(n.label,l+32,c+24),n.desc&&d&&(e.fillStyle=`rgba(170, 200, 220, 0.5)`,e.font=`11px monospace`,e.fillText(n.desc,l+32,c+40)),e.fillStyle=d?`rgba(255,255,255,0.5)`:`rgba(255,255,255,0.2)`,e.font=`11px monospace`,e.textAlign=`right`,e.fillText(n.key,l+o-8,c+24)}e.textAlign=`left`}function ua(e,t,n,r){e.fillStyle=aa,e.font=`11px monospace`,e.textAlign=`center`,e.fillText(r,t/2,n-30),e.textAlign=`left`}function da(e){return[null,{title:`SYSTEMS ONLINE — LOOK AROUND`,hint:e?`ARIA: "Welcome to the Bureau, Cadet. Drag to look — get used to the augmented feed."`:`ARIA: "Welcome to the Bureau, Cadet. Move the mouse — get used to the augmented feed."`,color:`#00ccff`},{title:`MOVE — TEST THE SUIT`,hint:e?`ARIA: "Good. Use the stick to walk — head toward the door ahead."`:`ARIA: "Good. W A S D — walk it off, head toward the bulkhead ahead."`,color:`#00ccff`},{title:`BREACH — OPEN THE DOOR`,hint:e?`ARIA: "Sealed bulkhead. Face it and tap USE — override the lock."`:`ARIA: "Sealed bulkhead. Face it and press E — override the magnetic lock."`,color:`#ff8844`},{title:`ARM YOURSELF`,hint:`ARIA: "Weapon crate ahead. Walk over it — this is no longer a drill."`,color:`#ff6600`},{title:`CONFIRM TARGETING`,hint:e?`ARIA: "Tap FIRE. Confirm your targeting solution is live."`:`ARIA: "CLICK to fire. Confirm your targeting system is live."`,color:`#ff8844`},{title:`AIM DOWN SIGHTS — FOCUS FIRE`,hint:e?`ARIA: "Hold AIM to tighten the sight picture. Same reticle, cleaner shot."`:`ARIA: "Hold RIGHT MOUSE to aim down sights. Same reticle, cleaner shot."`,color:`#66eeff`},{title:`WEAPON SWITCH — GRAB THE SHOTGUN`,hint:e?`ARIA: "Second weapon on the range. Pick it up, then swipe to switch weapons."`:`ARIA: "Second weapon on the range. Pick it up, then scroll or press 1/2 to switch."`,color:`#ff6600`},{title:`SPRINT — MOVE FAST`,hint:e?`ARIA: "Fitness center ahead. Tap RUN to sprint — cover ground fast."`:`ARIA: "Fitness center ahead. Hold SHIFT to sprint — cover ground fast."`,color:`#ff44ff`},{title:`CROUCH — LOWER YOUR PROFILE`,hint:e?`ARIA: "Hold CROUCH. Smaller target, quieter movement."`:`ARIA: "Hold CTRL to crouch. Smaller target, quieter movement."`,color:`#66dd66`},{title:`SLIDE — STAY MOVING`,hint:e?`ARIA: "While running, tap CROUCH to slide through danger."`:`ARIA: "While sprinting, tap CTRL to slide through danger."`,color:`#66ff99`},{title:`PHASE DASH — BLINK FORWARD`,hint:e?`ARIA: "Double-tap a direction to phase-dash. Covers distance instantly."`:`ARIA: "Double-tap a movement key to phase-dash. Covers distance instantly."`,color:`#ff44ff`},{title:`CHRONO SHIFT — BEND TIME`,hint:e?`ARIA: "Time-dilation module is active. Hold SLOW. The next few seconds matter."`:`ARIA: "Time-dilation module is active. Hold Q. Keep holding while you fire."`,color:`#8844ff`},{title:`RESUPPLY — THE SUPERVISOR'S OFFICE`,hint:`SUPERVISOR (radio): "Cadet, grab what's on the desk. Health. Ammo. Take everything — the Bureau just went hot."`,color:`#44ff88`},{title:`⚡ ALERT — INTRUSION DETECTED`,hint:`SUPERVISOR: "Multiple sectors — breach — they're inside —" [STATIC] ARIA: "Signal lost. Combat arena, NOW."`,color:`#ff2244`},{title:`WAVE 1 — FIRST CONTACT`,hint:`ARIA: "Three drones in the arena. Cadet — this isn't a sim. Put them down."`,color:`#ff2244`},{title:`WAVE 2 — REINFORCEMENTS`,hint:`ARIA: "More contacts. Two henchmen and a drone. Stay sharp."`,color:`#ff2244`},{title:`SYSTEMS ONLINE — CALIBRATION COMPLETE`,hint:`ARIA: "Suit fully integrated. Proceeding to agent deployment array."`,color:`#00ffcc`}]}function fa(e,t,n,r){let i=Math.min(1,r/.5);e.save(),e.globalAlpha=i;let a=r/2*n,o=e.createLinearGradient(0,a-40,0,a+40);o.addColorStop(0,`rgba(0,255,200,0)`),o.addColorStop(.5,`rgba(0,255,200,0.08)`),o.addColorStop(1,`rgba(0,255,200,0)`),e.fillStyle=o,e.fillRect(0,0,t,n);let s=[{text:`NEURAL LINK.......... OK`,delay:.3},{text:`BIOMETRICS........... NOMINAL`,delay:.8},{text:`CADET ID: CONFIRMED`,delay:1.2},{text:`CHRONO MODULE........ STANDBY`,delay:1.6}];e.font=`bold 16px monospace`,e.textAlign=`center`;let c=n/2-40;for(let n=0;n<s.length;n++){let a=s[n];if(r<a.delay)continue;let o=Math.min(1,(r-a.delay)/.3),l=r-a.delay<.15?.4+Math.random()*.6:1;e.globalAlpha=i*o*l,e.fillStyle=ea,e.fillText(a.text,t/2,c+n*30)}e.restore()}function pa(e,t,n,r,i,a,o,s){let c=`bold 20px monospace`,l=`14px monospace`,u=Math.min(720,t-80);e.font=c;let d=e.measureText(r.title).width;e.font=l;let f=ma(e,r.hint,u-60),p=f.reduce((t,n)=>Math.max(t,e.measureText(n).width),0),m=Math.min(u,Math.max(d,p)+60),h=60+f.length*18,g=(t-m)/2;e.save(),e.globalAlpha=i*.92,e.shadowColor=`rgba(0,0,0,0.55)`,e.shadowBlur=12,e.shadowOffsetY=4,e.fillStyle=`rgba(0, 0, 0, 0.7)`,e.beginPath(),e.roundRect(g,60,m,h,10),e.fill(),e.shadowBlur=0,e.shadowOffsetY=0,e.strokeStyle=r.color,e.lineWidth=2,e.globalAlpha=i*a*.85,e.beginPath(),e.roundRect(g,60,m,h,10),e.stroke(),e.globalAlpha=i,o>0&&o<=s&&(e.fillStyle=`rgba(255,255,255,0.4)`,e.font=`bold 11px monospace`,e.textAlign=`left`,e.fillText(`${o}/${s}`,g+14,78)),e.save(),e.shadowColor=r.color,e.shadowBlur=6,e.fillStyle=r.color,e.font=c,e.textAlign=`center`,e.fillText(r.title,t/2,90),e.restore(),e.fillStyle=`rgba(255,255,255,0.82)`,e.font=l,e.textAlign=`center`;let _=114;for(let n of f)e.fillText(n,t/2,_),_+=18;e.restore()}function ma(e,t,n){let r=t.split(` `),i=[],a=``;for(let t of r){let r=a?a+` `+t:t;e.measureText(r).width>n&&a?(i.push(a),a=t):a=r}return a&&i.push(a),i}function ha(e,t,n,r){let{mode:i,isTouchDevice:a,tutorialStepTime:o,tutorialStep:s}=r;if(i!==`tutorial`)return;let c=performance.now(),l=(c-o)/1e3;if(s===0){fa(e,t,n,l);return}let u=da(a),d=u[s];d&&pa(e,t,n,d,Math.min(1,l/.4),.85+.15*Math.sin(c/300),s,u.length-1)}function ga(e,t,n,r=0){let i=performance.now();sa(e,t,n,n*.2,i),ca(e,t,n,`TRAINING COMPLETE`,`All systems nominal. What's your next move, agent?`,i),la(e,t,n,[{label:`CONTINUE TRAINING`,key:`[1]`,color:`#ffcc00`,desc:`Stay in the sandbox`},{label:`BEGIN CAMPAIGN`,key:`[2]`,color:`#00ccff`,desc:`Face the Paradox Lord`},{label:`CUSTOMIZE AGENT`,key:`[3]`,color:`#aa44ff`,desc:`Armor, colors, badges, loadout`},{label:`MAIN MENU`,key:`[ESC]`,color:`#666666`,desc:`Return to title screen`}],r,i),ua(e,t,n,`W/S to navigate  ·  ENTER to select`),gi(e,t,n),e.textAlign=`left`}var _a=`#00ffcc`,va=`rgba(0,255,200,0.15)`,ya=`rgba(0,10,24,0.7)`,ba=`rgba(0,0,0,0.88)`,xa=`rgba(0,200,255,0.12)`,Sa=`rgba(0,220,255,0.45)`,Ca=`rgba(0,200,255,0.05)`,wa=`rgba(255,255,255,0.04)`,Ta={Gameplay:`#00ffcc`,Display:`#00ccff`,Audio:`#00ff88`,Controls:`#ffcc00`,Accessibility:`#aaaacc`,HUD:`#44ffaa`,Mobile:`#ff88cc`};function Ea(e,t,n,r){e.save(),e.shadowColor=_a,e.shadowBlur=12,e.fillStyle=_a,e.font=`bold ${r?18:28}px monospace`,e.textAlign=`center`,e.fillText(`SETTINGS`,t/2,r?24:38),e.restore();let i=e.createLinearGradient(0,0,t,0);i.addColorStop(0,`rgba(0,255,200,0)`),i.addColorStop(.5,`rgba(0,255,200,0.30)`),i.addColorStop(1,`rgba(0,255,200,0)`),e.strokeStyle=i,e.lineWidth=1,e.beginPath(),e.moveTo(0,n),e.lineTo(t,n),e.stroke()}function Da(e,t,n,r,i,a,o,s,c,l){e.fillStyle=ya,e.fillRect(0,n,t,r-n),e.strokeStyle=`rgba(0,160,120,0.25)`,e.lineWidth=1,e.beginPath(),e.moveTo(t,n),e.lineTo(t,r),e.stroke();let u=a?28:38;for(let n=0;n<o.length;n++){let r=o[n],d=r===s,f=i+n*u,p=!d&&c>=0&&c<t&&l>=f-2&&l<f-2+u,m=Ta[r]||_a;d?(e.fillStyle=va,e.fillRect(0,f-2,t,u),e.save(),e.shadowColor=m,e.shadowBlur=6,e.fillStyle=m,e.fillRect(0,f-2,3,u),e.restore()):p&&(e.fillStyle=`rgba(0,220,170,0.07)`,e.fillRect(0,f-2,t,u)),e.fillStyle=d?m:p?`#88aacc`:`#445566`,e.font=`bold ${a?11:15}px monospace`,e.textAlign=`center`,e.fillText(r.toUpperCase(),t/2,f+(a?16:22))}}function Oa(e,t,n,r,i,a){let o=n-32;e.fillStyle=i>=0&&i<t&&a>=o-14&&a<o+10?_a:`#667788`,e.font=`bold ${r?12:14}px monospace`,e.textAlign=`center`,e.fillText(`< BACK`,t/2,o),e.save(),e.globalAlpha=.55,e.fillStyle=`#b0e0ff`,e.font=r?`9px monospace`:`11px monospace`,e.textAlign=`center`,e.fillText(`Q/E: Category`,t/2,n-54),e.restore()}function ka(e,t){let{def:n,item:r,selected:i,panelX:a,panelW:o,y:s,itemH:c,compact:l,labelSize:u,isRowHovered:d,settings:f,barW:p,barH:m,drawDivider:h}=t;i?(e.fillStyle=xa,e.fillRect(a,s-2,o,c),e.strokeStyle=Sa,e.lineWidth=1.5,e.strokeRect(a+.5,s-1.5,o-1,c-1),e.fillStyle=_a,e.fillRect(a,s-2,2,c)):d&&(e.fillStyle=Ca,e.fillRect(a,s-2,o,c)),h&&(e.strokeStyle=wa,e.lineWidth=1,e.beginPath(),e.moveTo(a+8,s-2),e.lineTo(a+o-8,s-2),e.stroke()),e.fillStyle=i?_a:d?`#aaddcc`:`#8888aa`,e.font=`bold ${u}px monospace`,e.textAlign=`left`,e.fillText(r.label,a+(l?8:14),s+(l?13:18)),e.textAlign=`right`,e.fillStyle=r.color||(i?`#ffffff`:d?`#ccccee`:`#aaaacc`),e.font=`bold ${u}px monospace`,i?(e.save(),e.shadowColor=r.color||_a,e.shadowBlur=4,e.fillText(`< ${r.value} >`,a+o-(l?8:14),s+(l?13:18)),e.restore()):e.fillText(`< ${r.value} >`,a+o-(l?8:14),s+(l?13:18)),n.widget===`crosshairPreview`?Aa(e,a+o/2,s+44,f):n.type===`slider`&&n.barColor&&ja(e,{def:n,settings:f,panelX:a,panelW:o,y:s,compact:l,barH:m,barW:p,selected:i})}function Aa(e,t,n,r){e.fillStyle=`rgba(30,30,50,0.8)`,e.fillRect(t-40,n-18,80,36),e.strokeStyle=`rgba(0,200,255,0.22)`,e.strokeRect(t-40,n-18,80,36),r.crosshair<5?fi(e,t,n,r.crosshair):(e.fillStyle=`rgba(255,255,255,0.3)`,e.font=`10px monospace`,e.textAlign=`center`,e.fillText(`(none)`,t,n+4),e.textAlign=`left`)}function ja(e,t){let{def:n,settings:r,panelX:i,panelW:a,y:o,compact:s,barH:c,barW:l,selected:u}=t,d=o+(s?20:28),f=r[n.key],p=(f-n.min)/(n.max-n.min),m=i+(s?8:14),h=Math.min(a-(s?16:28),l);e.fillStyle=`rgba(255,255,255,0.07)`,e.fillRect(m,d,h,c),e.fillStyle=n.barColor(f),e.fillRect(m,d,h*p,c),e.strokeStyle=`rgba(0,200,255,0.18)`,e.lineWidth=1,e.strokeRect(m,d,h,c);let g=m+h*p,_=s?4:5;e.save(),u&&(e.shadowColor=_a,e.shadowBlur=8),e.fillStyle=u?_a:`#88bbcc`,e.beginPath(),e.arc(g,d+c/2,_,0,Math.PI*2),e.fill(),e.restore()}function Ma(e,t,n,r,i){e.fillStyle=`#445566`,e.font=`13px monospace`,e.textAlign=`center`,e.fillText(`No settings in this category.`,t+n/2,r+(i-r)/2),e.textAlign=`left`}function Na(e,t,n,r){let{isTouchDevice:i,settingsCategory:a,settingsSelection:o,settings:s,mouseX:c,mouseY:l}=r,u=i&&K(n);e.fillStyle=ba,e.fillRect(0,0,t,n);let d=u?36:52,f=u?90:160,p=f+1,m=t-p-12,h=d+8,g=Math.min(m*.55,240);Ea(e,t,d,u),Da(e,f,d,n,h,u,mn(i,s),a,c,l),Oa(e,f,n,u,c,l);let _=pn(i,a,s),v=_.map(e=>gn(e,s));if(_.length===0)Ma(e,p,m,h,n);else{let t=h;for(let n=0;n<v.length;n++){let r=_[n],i=v[n],a=o===n,d=u?r.height.compact:r.height.normal,f=u?12:16,h=!a&&c>=p&&c<=p+m&&l>=t-2&&l<t-2+d;ka(e,{def:r,item:i,selected:a,panelX:p,panelW:m,y:t,itemH:d,compact:u,labelSize:f,isRowHovered:h,settings:s,barW:g,barH:6,drawDivider:n>0}),t+=d}}i||(e.fillStyle=`#5a6a7a`,e.font=`${u?10:13}px monospace`,e.textAlign=`center`,e.fillText(`Click to adjust  ·  Scroll to navigate  ·  Q/E category  ·  ESC back`,t/2,n-(u?6:10))),e.textAlign=`left`}var Pa=`#00ffcc`,Fa=`#00ccff`,Ia=e=>`rgba(255,170,0,${e})`,La=`rgba(0,200,255,0.12)`,Ra=`rgba(0,220,255,0.45)`,za=`rgba(200,100,0,0.15)`,Ba=`rgba(255,170,0,0.4)`,Va={KeyW:`W`,KeyA:`A`,KeyS:`S`,KeyD:`D`,KeyE:`E`,KeyF:`F`,KeyQ:`Q`,KeyR:`R`,KeyP:`P`,KeyC:`C`,Digit1:`1`,Digit2:`2`,Digit3:`3`,Digit4:`4`,Digit5:`5`,ShiftLeft:`L-Shift`,ShiftRight:`R-Shift`,ControlLeft:`L-Ctrl`,ControlRight:`R-Ctrl`,AltLeft:`L-Alt`,AltRight:`R-Alt`,Space:`Space`,Enter:`Enter`,Escape:`Escape`,Tab:`Tab`,ArrowUp:`Up`,ArrowDown:`Down`,ArrowLeft:`Left`,ArrowRight:`Right`,Backspace:`Backspace`},Ha={moveForward:`Move Forward`,moveBack:`Move Back`,moveLeft:`Strafe Left`,moveRight:`Strafe Right`,sprint:`Sprint`,interact:`Interact`,pause:`Pause`,crouch:`Crouch / Slide`,weapon1:`Weapon 1`,weapon2:`Weapon 2`,weapon3:`Weapon 3`,weapon4:`Weapon 4`,weapon5:`Weapon 5`,weapon6:`Weapon 6`,weapon7:`Weapon 7`,weapon8:`Weapon 8`,toggleFPS:`Toggle FPS`,chronoShift:`Chrono Shift (Slow Time)`};function Ua(e){return Va[e]||e.replace(`Key`,``).replace(`Digit`,``)}function Wa(e,t,n,r,i){let{keybinds:a}=i,o=e=>Ua(a[e]);e.save(),e.globalAlpha=r;let s=(t-300)/2,c=(n-270)/2;e.shadowColor=`rgba(0,0,0,0.6)`,e.shadowBlur=14,e.shadowOffsetY=4,e.fillStyle=`rgba(0,0,0,0.78)`,e.fillRect(s,c,300,270),e.shadowBlur=0,e.shadowOffsetY=0,e.strokeStyle=`rgba(0,200,255,0.35)`,e.lineWidth=1,e.strokeRect(s+.5,c+.5,299,269),e.save(),e.shadowColor=Fa,e.shadowBlur=8,e.fillStyle=Fa,e.font=`bold 14px monospace`,e.textAlign=`center`,e.fillText(`CONTROLS`,t/2,c+24),e.restore(),e.fillStyle=`#aabbcc`,e.font=`13px monospace`,e.textAlign=`left`;let l=s+30,u=o(`moveForward`),d=o(`moveBack`),f=[[`${u}/${o(`moveLeft`)}/${d}/${o(`moveRight`)}`,`Move`,`#aabbcc`],[`Mouse`,`Look`,`#aabbcc`],[`Click`,`Shoot`,`#aabbcc`],[`Right Click`,`Aim Down Sights`,`#66eeff`],[`${o(`weapon1`)}-${o(`weapon8`)}`,`Weapons`,`#aabbcc`],[`Scroll`,`Cycle Weapons`,`#aabbcc`],[`${o(`interact`)}`,`Interact/Open`,`#aabbcc`],[`${o(`sprint`)}`,`Sprint`,`#88ddff`],[`${o(`crouch`)}`,`Crouch`,`#88ddff`],[`${o(`sprint`)}+${o(`crouch`)}`,`Slide`,`#88ddff`],[`${u}×2`,`Dash (double-tap)`,`#88ddff`],[`${o(`pause`)}/P`,`Pause`,`#aabbcc`]],p=c+48;for(let[t,n,r]of f)e.fillStyle=r,e.textAlign=`right`,e.fillText(t,l+110,p),e.fillStyle=r,e.textAlign=`left`,e.fillText(`- ${n}`,l+110+6,p),p+=18;e.restore()}function Ga(e,t){e.save(),e.shadowColor=Pa,e.shadowBlur=14,e.fillStyle=Pa,e.font=`bold 30px monospace`,e.textAlign=`center`,e.fillText(`KEY BINDINGS`,t/2,60),e.restore();let n=e.createLinearGradient(0,0,t,0);n.addColorStop(0,`rgba(0,255,200,0)`),n.addColorStop(.5,`rgba(0,255,200,0.30)`),n.addColorStop(1,`rgba(0,255,200,0)`),e.strokeStyle=n,e.lineWidth=1,e.beginPath(),e.moveTo(0,76),e.lineTo(t,76),e.stroke()}function Ka(e,t,n,r,i,a,o=1){let s=i-4;if(a===`flash`)e.fillStyle=Ia(.3*o),e.fillRect(t,r-2,n,s),e.strokeStyle=Ia(.4*o),e.lineWidth=1,e.strokeRect(t+.5,r-1.5,n-1,s-1);else if(a===`rebinding`){let i=.5+.5*Math.sin(performance.now()*.008);e.fillStyle=`rgba(255,200,0,${.1+i*.06})`,e.fillRect(t,r-2,n,s),e.strokeStyle=`rgba(255,200,0,${.45+i*.25})`,e.lineWidth=1.5,e.strokeRect(t+.5,r-1.5,n-1,s-1)}else a===`selected`&&(e.fillStyle=La,e.fillRect(t,r-2,n,s),e.strokeStyle=Ra,e.lineWidth=1.5,e.strokeRect(t+.5,r-1.5,n-1,s-1),e.fillStyle=Pa,e.fillRect(t,r-2,2,s))}function qa(e,t){let{panelX:n,panelW:r,y:i,isRebinding:a,isSwapFlashed:o,selected:s,keyCode:c}=t;e.textAlign=`right`;let l=n+r-16;a?(e.fillStyle=Math.floor(performance.now()/380)%2?`#ffd23a`:`#ff8800`,e.font=`bold 15px monospace`,e.fillText(`▸ Press a key…  (ESC cancels)`,l,i+20)):(e.fillStyle=o?`#ffaa00`:s?`#ffffff`:`#aaaacc`,e.font=s?`bold 15px monospace`:`15px monospace`,s?(e.save(),e.shadowColor=Pa,e.shadowBlur=4,e.fillText(Ua(c),l,i+20),e.restore()):e.fillText(Ua(c),l,i+20))}function Ja(e,t,n,r){let{keybinds:i,controlsSelection:a,rebindingKey:o,keybindSwapFlash:s}=r;e.fillStyle=`rgba(0,0,0,0.88)`,e.fillRect(0,0,t,n),Ga(e,t);let c=Object.keys(i),l=t/2-240;for(let t=0;t<c.length;t++){let n=c[t],r=a===t,u=o===n,d=100+t*36,f=s&&s.action===n?performance.now()-s.time:1/0,p=f<1500;u?Ka(e,l,480,d,36,`rebinding`):p?Ka(e,l,480,d,36,`flash`,1-f/1500):r&&Ka(e,l,480,d,36,`selected`),e.fillStyle=r?Pa:`#8888aa`,e.font=`bold 15px monospace`,e.textAlign=`left`,e.fillText(Ha[n]||n,l+16,d+20),qa(e,{panelX:l,panelW:480,y:d,isRebinding:u,isSwapFlashed:p,selected:r,keyCode:i[n]})}let u=100+c.length*36+10,d=a===c.length;d&&(e.fillStyle=za,e.fillRect(l,u-2,480,32),e.strokeStyle=Ba,e.lineWidth=1.5,e.strokeRect(l+.5,u-1.5,479,31)),e.fillStyle=d?`#ffaa00`:`#886644`,e.font=`bold 15px monospace`,e.textAlign=`center`,d?(e.save(),e.shadowColor=`#ffaa00`,e.shadowBlur=6,e.fillText(`[ RESET TO DEFAULTS ]`,t/2,u+20),e.restore()):e.fillText(`[ RESET TO DEFAULTS ]`,t/2,u+20),e.fillStyle=`#5a6a7a`,e.font=`12px monospace`,e.textAlign=`center`;let f=o?`Press the new key… ESC to cancel · keys already in use will be swapped`:`W/S to navigate · ENTER to rebind · ESC to go back`;e.fillText(f,t/2,u+36+20),e.textAlign=`left`}function Ya(e,t,n,r,i){if(!r)return{expired:!1};if(r.life-=i,r.life<=0)return{expired:!0};let a=Math.min(1,r.life*2);e.save(),e.globalAlpha=a,e.fillStyle=`rgba(0,20,40,0.9)`,e.strokeStyle=`rgba(0,200,255,0.6)`,e.lineWidth=1;let o=Math.min(420,t*.8),s=t/2-o/2,c=n*.07;return e.beginPath(),e.roundRect(s,c,o,32,4),e.fill(),e.stroke(),e.fillStyle=`#00ccff`,e.font=`12px monospace`,e.textAlign=`center`,e.fillText(r.text,t/2,c+20),e.restore(),{expired:!1}}function Xa(e,t,n,r){let{time:i,isTouchDevice:a,mode:o,arenaRound:s,achievementStats:c,meltdown:l,deltaTime:u,shareToast:d,statsCardData:f}=r,p=a&&K(n);e.fillStyle=`rgba(30,0,0,0.94)`,e.fillRect(0,0,t,n);let m=.5+Math.sin(i*.003)*.2,h=e.createRadialGradient(t/2,n/2,n*.15,t/2,n/2,n*.7);h.addColorStop(0,`rgba(80,0,0,0)`),h.addColorStop(.5,`rgba(60,0,0,${m*.15})`),h.addColorStop(1,`rgba(40,0,0,${.4+m*.15})`),e.fillStyle=h,e.fillRect(0,0,t,n),e.fillStyle=`rgba(255,30,0,0.06)`;for(let r=0;r<12;r++){let a=t*(.1+(Math.sin(i*5e-4+r*1.7)+1)*.4),o=n*(.05+(Math.cos(i*7e-4+r*2.3)+1)*.45),s=20+Math.sin(r*3)*15;e.fillRect(a-s/2,o-1,s,2)}let g=p?24:42,_=p?n*.15:n/2-110,v=p?_+22:n/2-75,y=p?_+36:n/2-50;if(!p){let r=n/2-135,i=n/2-40;e.strokeStyle=`rgba(255,34,0,0.2)`,e.lineWidth=1,e.beginPath(),e.moveTo(t*.2,r),e.lineTo(t*.8,r),e.moveTo(t*.25,i),e.lineTo(t*.75,i),e.stroke()}e.shadowColor=`#ff2200`,e.shadowBlur=p?10:20,e.fillStyle=`#ff2200`,e.font=`bold ${g}px monospace`,e.textAlign=`center`,e.fillText(`TIMELINE COLLAPSED`,t/2,_),e.shadowBlur=0,e.fillStyle=`rgba(255,100,70,0.7)`,e.font=`${p?11:14}px monospace`,e.fillText(`Temporal integrity failed — reality unraveled`,t/2,v),bi(e,t,y,`#ff2200`,`#ff6644`,void 0,f),o===`arena`&&(e.fillStyle=`#ff8866`,e.font=`bold ${p?14:18}px monospace`,e.fillText(`Rounds Survived: ${s-1}`,t/2,p?n*.78:n/2+100),e.fillStyle=`rgba(255,136,102,0.6)`,e.font=`${p?10:12}px monospace`,e.fillText(`Personal Best: Round ${c.highestArenaRound} (Score: ${c.highestScore})`,t/2,p?n*.82:n/2+125));let b=t/2-354/2,x=n-70,S={btnBaseX:b,btnY:x,btnW:110,btnH:34,btnGap:12},C=[{label:`RESTART`,color:`#ff8844`,bg:`rgba(255,136,68,0.15)`},{label:`QUIT`,color:`#aaaaaa`,bg:`rgba(170,170,170,0.1)`},{label:`SHARE`,color:`#00ccff`,bg:`rgba(0,204,255,0.12)`}];for(let t=0;t<C.length;t++){let n=b+t*122;e.fillStyle=C[t].bg,e.fillRect(n,x,110,34),e.strokeStyle=C[t].color,e.lineWidth=1.5,e.strokeRect(n,x,110,34),e.fillStyle=C[t].color,e.font=`bold 13px monospace`,e.textAlign=`center`,e.fillText(C[t].label,n+110/2,x+22)}if(o===`meltdown`&&l){let r=l.getHUD(),a=p?n*.7:n/2+80;if(e.textAlign=`center`,e.fillStyle=`#ffaa00`,e.font=`bold ${p?16:22}px monospace`,e.fillText(`DISTANCE: ${r.distance}m`,t/2,a),e.fillStyle=`#ff8866`,e.font=`bold ${p?12:16}px monospace`,e.fillText(`SCORE: ${r.score}`,t/2,a+25),e.fillStyle=`rgba(200,200,200,0.6)`,e.font=`${p?10:12}px monospace`,e.fillText(`Time: ${r.time}s | Speed: ${r.speed} m/s`,t/2,a+45),l.highScores.length>0){let n=p?13:16,r=a+(p?62:70);l._lastRunWasNewRecord&&(e.fillStyle=`rgba(255,220,60,${.7+Math.sin(i*.01)*.3})`,e.font=`bold ${p?11:14}px monospace`,e.fillText(`★ NEW RECORD ★`,t/2,r-n)),e.fillStyle=`#00ccff`,e.font=`bold ${p?10:12}px monospace`,e.fillText(`── HIGH SCORES ──`,t/2,r);let o=l.highScores.slice(0,5);e.font=`${p?9:11}px monospace`,o.forEach((i,a)=>{let o=l._lastRunId&&i._runId===l._lastRunId,s=r+18+a*n;o&&(e.fillStyle=`rgba(255,200,80,0.15)`,e.fillRect(t/2-(p?140:180),s-10,p?280:360,n)),e.fillStyle=o?`rgba(255,220,120,1)`:`rgba(200,220,255,0.7)`;let c=i.score.toLocaleString(),u=i.distance.toLocaleString(),d=i.ironman?` ⚙`:``,f=o?` ◀`:``;e.fillText(`${a+1}. ${c} pts (${u}m)${d}${f}`,t/2,s)})}}let w=.4+Math.sin(i*.004)*.3;e.fillStyle=`rgba(170,170,170,${w})`,e.font=`${p?12:14}px monospace`;let T=a?`Tap to return to title`:`Press ENTER to return to title`;e.fillText(T,t/2,p?n*.88:n/2+130),e.fillStyle=`rgba(255,136,100,${w*.8})`,a||(e.fillText(`Press R to restart`,t/2,n/2+155),e.fillStyle=`rgba(0,200,255,${w*.7})`,e.fillText(`Press S to share score`,t/2,p?n*.93:n/2+175)),e.textAlign=`left`;let E=Ya(e,t,n,d,u);return gi(e,t,n,!0),{gameOverBtns:S,toastExpired:E.expired}}function Za(e,t,n,r){let{time:i,isTouchDevice:a,ngPlusCycle:o,mode:s,ngPlusPrompt:c,ngPlusPromptSel:l,deltaTime:u,shareToast:d,statsCardData:f}=r,p=a&&K(n);e.fillStyle=`rgba(0,6,20,0.95)`,e.fillRect(0,0,t,n);let m=.7+Math.sin(i*.003)*.3,h=e.createRadialGradient(t/2,n*.35,0,t/2,n*.35,n*.6);h.addColorStop(0,`rgba(0,255,200,${m*.08})`),h.addColorStop(.4,`rgba(0,180,255,${m*.04})`),h.addColorStop(1,`rgba(0,0,0,0)`),e.fillStyle=h,e.fillRect(0,0,t,n),e.globalAlpha=.15;for(let r=0;r<(p?10:20);r++){let a=t*(.1+r/20*.8),o=n-(i*.04+r*73)%n,s=8+Math.sin(r*2)*5;e.fillStyle=r%3==0?`#00ffcc`:r%3==1?`#ffcc00`:`#aaddff`,e.fillRect(a,o,1.5,s)}e.globalAlpha=1;let g=p?24:42,_=p?n*.12:n/2-75;p||(e.strokeStyle=`rgba(0,255,200,0.2)`,e.lineWidth=1,e.beginPath(),e.moveTo(t*.15,n/2-100),e.lineTo(t*.85,n/2-100),e.stroke()),e.shadowColor=`#00ffcc`,e.shadowBlur=p?12:25,e.fillStyle=o>=3?`#ffcc00`:`#00ffcc`,e.font=`bold ${g}px monospace`,e.textAlign=`center`;let v=o>=3?`THE LOOP IS BROKEN`:`TIMELINE RESTORED`;e.fillText(v,t/2,_),e.shadowBlur=0,e.fillStyle=`#ffcc00`,e.font=`bold ${p?12:18}px monospace`;let y=o>=3?`Every timeline. Every loop. You broke them all.`:`The Paradox Lord has been destroyed — for good.`;if(e.fillText(y,t/2,p?_+22:n/2-35),p||(e.fillStyle=`rgba(170,220,255,0.7)`,e.font=`16px monospace`,e.fillText(`Three forms. Three acts. One team.`,t/2,n/2-8),e.fillText(`The quantum continuum is stable once more.`,t/2,n/2+14),e.strokeStyle=`rgba(255,204,0,0.15)`,e.beginPath(),e.moveTo(t*.25,n/2+28),e.lineTo(t*.75,n/2+28),e.stroke()),o>0){e.fillStyle=`#cc88ff`,e.font=`bold ${p?10:14}px monospace`,e.textAlign=`center`;let n=o>=3?`FINAL TIMELINE — THE LOOP IS BROKEN`:`TIMELINE LOOP ${o}`;e.fillText(n,t/2,p?_-10:_-20)}bi(e,t,p?_+38:n/2+40,`#ffcc00`,`#aaddff`,void 0,f);let b=.4+Math.sin(i*.004)*.3;if(c&&s===`campaign`){let r=p?n*.78:n/2+170,i=[{label:`ENTER THE RIFT (NG+${o+1})`,desc:`Enemies grow stronger. You keep everything.`,color:`#cc88ff`},{label:`REST`,desc:`The timeline is safe. Return to title.`,color:`#aaddff`}],s=p?140:220,c=p?44:56,u=p?12:20,d=i.length*s+(i.length-1)*u,f=t/2-d/2;for(let t=0;t<i.length;t++){let n=f+t*(s+u),a=r,o=l===t;e.fillStyle=o?`rgba(100,60,180,0.35)`:`rgba(30,30,50,0.5)`,e.strokeStyle=o?i[t].color:`rgba(100,100,140,0.3)`,e.lineWidth=o?2:1,e.beginPath(),e.roundRect(n,a,s,c,6),e.fill(),e.stroke(),e.fillStyle=o?i[t].color:`rgba(170,170,190,0.8)`,e.font=`bold ${p?10:13}px monospace`,e.textAlign=`center`,e.fillText(i[t].label,n+s/2,a+(p?16:22)),e.fillStyle=o?`rgba(200,200,220,0.7)`:`rgba(140,140,160,0.5)`,e.font=`${p?8:10}px monospace`,e.fillText(i[t].desc,n+s/2,a+(p?32:40))}e.fillStyle=`rgba(170,170,170,${b})`,e.font=`${p?10:12}px monospace`,e.textAlign=`center`;let m=a?`Tap a choice`:`Arrow keys to choose, ENTER to confirm`;e.fillText(m,t/2,r+c+(p?14:22))}else{e.fillStyle=`rgba(170,170,170,${b})`,e.font=`${p?12:14}px monospace`,e.textAlign=`center`;let r=a?`Tap to return to title`:`Press ENTER to return to title`;e.fillText(r,t/2,p?n*.9:n/2+215),a||(e.fillStyle=`rgba(0,200,255,${b*.7})`,e.font=`${p?11:13}px monospace`,e.fillText(`Press S to share score`,t/2,p?n*.94:n/2+235))}e.textAlign=`left`;let x=Ya(e,t,n,d,u);return gi(e,t,n),{toastExpired:x.expired}}function Qa(e,t,n,r){let{time:i,isTouchDevice:a,levelCompleteTime:o,playerSecretsFound:s,statsCardData:c}=r,l=a&&K(n),u=Math.max(0,(performance.now()-(o||0))/1e3);e.fillStyle=`rgba(0,4,18,0.94)`,e.fillRect(0,0,t,n);let d=.6+Math.sin(i*.004)*.3,f=e.createRadialGradient(t/2,n*.35,0,t/2,n*.35,n*.5);f.addColorStop(0,`rgba(0,255,200,${d*.06})`),f.addColorStop(1,`rgba(0,0,0,0)`),e.fillStyle=f,e.fillRect(0,0,t,n),e.globalAlpha=Math.min(.2,u*.15);for(let r=0;r<(l?12:24);r++){let a=t*(.05+r/24*.9),o=n-(i*.05+r*61)%n,s=6+Math.sin(r*3)*4;e.fillStyle=r%3==0?`#00ffcc`:r%3==1?`#00aaff`:`#aaffdd`,e.fillRect(a,o,1.5,s)}e.globalAlpha=1;let p=e=>e<0?0:e>1?1:e*e*(3-2*e),m=p(u/.4),h=p((u-.3)/.4),g=p((u-.6)/.3),_=p((u-1)/.3),v=Math.min(1,(u-.3)/.8),y=l?n*.12:n/2-100,b=(1-m)*-30;if(!l&&m>0&&(e.globalAlpha=m,e.strokeStyle=`rgba(0,255,200,0.2)`,e.lineWidth=1,e.beginPath(),e.moveTo(t*.2,n/2-130+b),e.lineTo(t*.8,n/2-130+b),e.stroke(),e.globalAlpha=1),m>0&&(e.globalAlpha=m,e.shadowColor=`#00ffcc`,e.shadowBlur=l?8:15,e.fillStyle=`#00ffcc`,e.font=`bold ${l?22:36}px monospace`,e.textAlign=`center`,e.fillText(`LEVEL COMPLETE`,t/2,y+b),e.shadowBlur=0,e.globalAlpha=1),!l&&m>0&&(e.globalAlpha=m,e.strokeStyle=`rgba(0,255,200,0.15)`,e.beginPath(),e.moveTo(t*.25,n/2-75+b),e.lineTo(t*.75,n/2-75+b),e.stroke(),e.globalAlpha=1),h>0&&(e.globalAlpha=h,bi(e,t,l?y+18:n/2-55,`#00ffcc`,`#aaddff`,v,c),e.globalAlpha=1),g>0){e.globalAlpha=g,e.fillStyle=`#aaddff`,e.font=`${l?12:16}px monospace`,e.textAlign=`center`;let r=Math.round((s||0)*Math.min(1,v));e.fillText(`Secrets: ${r}`,t/2,l?n*.75:n/2+80),e.globalAlpha=1}if(_>0){e.fillStyle=`rgba(170,170,170,${_*(.4+Math.sin(i*.004)*.3)})`,e.font=`${l?12:14}px monospace`,e.textAlign=`center`;let r=a?`Tap to continue`:`Press ENTER to continue`;e.fillText(r,t/2,l?n*.88:n/2+110)}e.textAlign=`left`,gi(e,t,n)}function $a(e,t,n,r){let{time:i,isTouchDevice:a}=r;e.fillStyle=`rgba(0,0,0,${.72*(.85+Math.sin(i*.004)*.1)})`,e.fillRect(0,0,t,n);let o=Math.min(520,t*.88),s=t/2-o/2,c=n/2-280/2;e.fillStyle=`rgba(0,10,20,0.96)`,e.beginPath(),e.roundRect(s,c,o,280,8),e.fill(),e.strokeStyle=`rgba(0,200,255,0.4)`,e.lineWidth=1.5,e.stroke(),e.textAlign=`center`,e.fillStyle=`#00ccff`,e.shadowColor=`#00ccff`,e.shadowBlur=10,e.font=`bold 18px monospace`,e.fillText(`MAP BUILDER`,t/2,c+36),e.shadowBlur=0,e.fillStyle=`rgba(0,200,255,0.3)`,e.fillRect(s+20,c+46,o-40,1);let l=[{key:`WASD / Arrow Keys`,action:`Move camera`},{key:`Left Click`,action:`Place tile`},{key:`Right Click`,action:`Erase tile`},{key:`1 – 9`,action:`Select tile type`},{key:`E`,action:`Place / move player start`},{key:`P`,action:`Play-test your map`},{key:`Ctrl+S`,action:`Save map`},{key:`Ctrl+Shift+S`,action:`Share map URL`}];e.font=`12px monospace`;let u=c+68;l.forEach((n,r)=>{let i=u+r*24;e.textAlign=`right`,e.fillStyle=`#00ccff`,e.fillText(n.key,t/2-12,i),e.textAlign=`left`,e.fillStyle=`#aabbcc`,e.fillText(n.action,t/2+12,i)});let d=.5+Math.sin(i*.006)*.4;e.textAlign=`center`,e.fillStyle=`rgba(170,170,170,${d})`,e.font=`12px monospace`,e.fillText(a?`Tap anywhere to start`:`Press any key to start`,t/2,c+280-18)}var eo=[{name:`NAME`,shortLabel:`NAME`,data:null,key:null},{name:`COLOR`,shortLabel:`CLR`,data:g,key:`colorIndex`},{name:`FACE`,shortLabel:`FACE`,data:E,key:`skinToneIndex`},{name:`HAIR`,shortLabel:`HAIR`,data:o,key:`hairIndex`},{name:`EYES`,shortLabel:`EYES`,data:f,key:`eyeIndex`},{name:`ARMOR`,shortLabel:`ARMR`,data:u,key:`armorIndex`},{name:`HELMET`,shortLabel:`HELM`,data:w,key:`helmetIndex`},{name:`VISOR`,shortLabel:`VSR`,data:a,key:`visorIndex`},{name:`SHOULDER`,shortLabel:`SHLD`,data:c,key:`shoulderIndex`},{name:`BADGE`,shortLabel:`BDGE`,data:y,key:`badgeIndex`},{name:`SKIN`,shortLabel:`SKIN`,data:T,key:`weaponSkinIndex`},{name:`LOADOUT`,shortLabel:`LOAD`,data:D,key:`loadoutIndex`},{name:`ORIGIN`,shortLabel:`ORGN`,data:d,key:`backstoryIndex`},{name:`VOICE`,shortLabel:`VOX`,data:i,key:`voiceIndex`}];function to(e,t,n){let r=n?34:44,i=n?4:8,a=eo.length,o=Math.max(n?28:42,Math.min(n?46:86,Math.floor((e-50-(a-1)*i)/a))),s=a*o+(a-1)*i,c=(e-s)/2,l=r+22,u=l+28+(n?12:20),d=n?Math.min(e*.45,180):200,f=n?Math.min(e*.4,140):200,p=n?0:200,m=n?8:20,h=d+f+(n?0:p+m)+m,g=(e-h)/2,_=n?32:36,v=n?t-u-80:999;return{titleY:r,tabGap:i,tabW:o,tabH:28,totalTabW:s,tabX0:c,tabY:l,contentY:u,listW:d,previewW:f,infoW:p,contentGap:m,totalContentW:h,contentX:g,itemH:_,availH:v,maxBySpace:Math.max(3,Math.floor((v-16)/_))}}function no(e,t,n,r,i,s,l,u,d,p,m,h,g,_,v,y){let b=p||1,x=m||w[0],S=h||a[0],C=g||c[0],T=_||E[0],D=v||o[0],O=y||f[0],k=u*.001,A=Math.sin(u*.002)*2,j=Math.sin(u*.0012)*2.5;e.save(),e.translate(t,n+A),e.scale(b,b),e.save(),e.globalAlpha=.15+.08*Math.sin(u*.002),e.strokeStyle=r.accent,e.lineWidth=2,e.beginPath(),e.ellipse(0,55,44,12,0,0,Math.PI*2),e.stroke(),e.restore(),e.save(),e.globalAlpha=.06,e.fillStyle=r.accent,e.beginPath(),e.ellipse(0,55,38,10,0,0,Math.PI*2),e.fill(),e.restore(),e.save(),e.globalAlpha=.1,e.strokeStyle=r.accent,e.lineWidth=.5;for(let t=-3;t<=3;t++){let n=t*10,r=Math.sqrt(Math.max(0,1444-n*n));e.beginPath(),e.moveTo(n,55-r*10/38),e.lineTo(n,55+r*10/38),e.stroke()}e.restore(),e.save(),e.globalAlpha=.25,e.strokeStyle=r.accent,e.lineWidth=1.5;for(let t=0;t<8;t++){let n=k+t*Math.PI/4,r=Math.cos(n)*36,i=55+Math.sin(n)*9.5,a=Math.cos(n)*42,o=55+Math.sin(n)*11;e.beginPath(),e.moveTo(r,i),e.lineTo(a,o),e.stroke()}if(e.restore(),e.fillStyle=`rgba(0,0,0,0.3)`,e.beginPath(),e.ellipse(0,55,30,8,0,0,Math.PI*2),e.fill(),e.fillStyle=r.dark,e.fillRect(-14,70/2-5,10,25),e.fillRect(4,70/2-5,10,25),e.fillStyle=r.primary,e.beginPath(),e.roundRect(-16,51,14,8,2),e.fill(),e.beginPath(),e.roundRect(2,51,14,8,2),e.fill(),e.fillStyle=r.accent+`44`,e.fillRect(-15,57,12,2),e.fillRect(3,57,12,2),e.fillStyle=r.primary+`88`,e.beginPath(),e.ellipse(-9,37,6,4,0,0,Math.PI*2),e.fill(),e.beginPath(),e.ellipse(9,37,6,4,0,0,Math.PI*2),e.fill(),e.fillStyle=r.primary,e.beginPath(),e.roundRect(-52/2,-70/2,52,70,6),e.fill(),i.id===`recon`){e.save(),e.beginPath(),e.roundRect(-52/2,-70/2,52,70,6),e.clip(),e.strokeStyle=r.accent+`44`,e.lineWidth=1;for(let t=-3;t<5;t++)e.beginPath(),e.moveTo(-52/2+t*12,-70/2),e.lineTo(-52/2+t*12+70,70/2),e.stroke();e.restore()}else i.id===`heavy`?(e.fillStyle=r.dark,e.fillRect(-52/2-6,-70/2-2,64,14),e.fillRect(-52/2-4,-25,12,8),e.fillRect(52/2-8,-25,12,8)):i.id===`stealth`?(e.fillStyle=`rgba(0,0,0,0.3)`,e.fillRect(-23,-32,46,64),e.strokeStyle=r.accent+`33`,e.lineWidth=.5,e.beginPath(),e.moveTo(0,-70/2),e.lineTo(0,70/2),e.stroke()):i.id===`tech`&&(e.fillStyle=r.dark,e.fillRect(-22,8,14,10),e.fillRect(52/2-18,8,14,10),e.fillStyle=r.accent+`66`,e.fillRect(-20,10,4,6),e.fillRect(52/2-10,10,4,6));if(e.fillStyle=r.accent,e.globalAlpha=.35+.15*Math.sin(u*.004),e.fillRect(-2,-27,4,54),e.globalAlpha=1,e.fillStyle=r.dark,e.fillRect(-24,70/2-10,48,6),e.fillStyle=r.accent+`88`,e.beginPath(),e.arc(0,70/2-7,4,0,Math.PI*2),e.fill(),e.save(),e.globalAlpha=.15+.1*Math.sin(u*.005),e.fillStyle=r.accent,e.beginPath(),e.arc(0,-10,10,0,Math.PI*2),e.fill(),e.restore(),e.fillStyle=r.dark,e.fillRect(-10,-70/2-6,20,8),e.fillStyle=r.primary,x.id===`wide`?(e.beginPath(),e.ellipse(0,-63,22,17,0,0,Math.PI*2),e.fill()):x.id===`angular`?(e.beginPath(),e.moveTo(-18,-53),e.lineTo(-14,-77),e.lineTo(14,-77),e.lineTo(18,-53),e.lineTo(10,-47),e.lineTo(-10,-47),e.closePath(),e.fill()):x.id===`mohawk`?(e.beginPath(),e.arc(0,-63,18,0,Math.PI*2),e.fill(),e.fillStyle=r.dark,e.beginPath(),e.moveTo(-2,-81),e.lineTo(2,-85),e.lineTo(2,-61),e.lineTo(-2,-61),e.closePath(),e.fill(),e.fillStyle=r.accent+`aa`,e.fillRect(-1,-83,2,20)):x.id===`crested`?(e.beginPath(),e.arc(0,-63,18,0,Math.PI*2),e.fill(),e.fillStyle=r.accent,e.beginPath(),e.moveTo(0,-81),e.lineTo(20,-67),e.lineTo(16,-61),e.lineTo(0,-67),e.closePath(),e.fill()):(e.beginPath(),e.arc(0,-63,18,0,Math.PI*2),e.fill()),S.id!==`fullface`){if(e.fillStyle=T.color,e.beginPath(),e.ellipse(0,-60,12,11,0,0,Math.PI*2),e.fill(),e.fillStyle=T.shadow,e.globalAlpha=.35,e.beginPath(),e.ellipse(0,-55,10,5,0,0,Math.PI),e.fill(),e.globalAlpha=1,D.id!==`none`)if(e.fillStyle=D.color,D.id===`coil`)for(let t=-2;t<=2;t++)e.beginPath(),e.arc(t*5,-71+t%2*2,4,0,Math.PI*2),e.fill();else D.id===`braid`?(e.beginPath(),e.ellipse(-8,-68,7,4,-.4,0,Math.PI*2),e.fill(),e.beginPath(),e.ellipse(-14,-55,3,12,-.25,0,Math.PI*2),e.fill()):(e.beginPath(),e.ellipse(0,-71,D.id===`buzz`?10:13,D.id===`white`?5:7,0,Math.PI,Math.PI*2),e.fill());e.fillStyle=O.color,e.shadowColor=O.color,e.shadowBlur=5,e.fillRect(-6,-62,3,2),e.fillRect(3,-62,3,2),e.shadowBlur=0}if(e.fillStyle=r.accent,S.id===`slit`)e.globalAlpha=.75+.2*Math.sin(u*.003),e.fillRect(-12,-64,24,3),e.globalAlpha=1;else if(S.id===`fullface`)e.globalAlpha=.7+.15*Math.sin(u*.003),e.beginPath(),e.ellipse(0,-63,15,14,0,0,Math.PI*2),e.fill(),e.globalAlpha=1,e.fillStyle=`#ffffff`,e.globalAlpha=.25,e.beginPath(),e.ellipse(-6,-68,4,2,-.4,0,Math.PI*2),e.fill(),e.globalAlpha=1;else if(S.id===`split`)e.globalAlpha=.7+.2*Math.sin(u*.003),e.beginPath(),e.ellipse(-7,-61,5,4,0,0,Math.PI*2),e.fill(),e.beginPath(),e.ellipse(7,-61,5,4,0,0,Math.PI*2),e.fill(),e.globalAlpha=1;else if(S.id===`glow`){let t=.5+.5*Math.sin(u*.006);e.shadowColor=r.accent,e.shadowBlur=8+4*t,e.globalAlpha=.85+.15*t,e.fillRect(-13,-63,26,4),e.shadowBlur=0,e.globalAlpha=1}else e.globalAlpha=.6+.2*Math.sin(u*.003),e.beginPath(),e.ellipse(0,-61,14,7,0,0,Math.PI),e.fill(),e.globalAlpha=1,e.fillStyle=`#ffffff`,e.globalAlpha=.4,e.beginPath(),e.ellipse(-5,-64,4,2,-.3,0,Math.PI*2),e.fill(),e.globalAlpha=1;if(e.fillStyle=r.primary,e.fillRect(-52/2-10,-27,10,40),e.fillRect(52/2,-27,10,40),e.fillStyle=T.color,e.fillRect(-52/2-8,11,8,8),e.fillRect(28,11,8,8),C.id===`pads`?(e.fillStyle=r.primary,e.beginPath(),e.ellipse(-31,-31,10,7,0,0,Math.PI*2),e.fill(),e.beginPath(),e.ellipse(31,-31,10,7,0,0,Math.PI*2),e.fill(),e.strokeStyle=r.accent+`66`,e.lineWidth=1,e.beginPath(),e.ellipse(-31,-31,10,7,0,0,Math.PI*2),e.stroke(),e.beginPath(),e.ellipse(31,-31,10,7,0,0,Math.PI*2),e.stroke()):C.id===`spikes`?(e.fillStyle=r.dark,e.beginPath(),e.moveTo(-41,-27),e.lineTo(-43,-39),e.lineTo(-35,-33),e.lineTo(-37,-41),e.lineTo(-29,-35),e.lineTo(-27,-27),e.closePath(),e.fill(),e.beginPath(),e.moveTo(41,-27),e.lineTo(43,-39),e.lineTo(35,-33),e.lineTo(37,-41),e.lineTo(29,-35),e.lineTo(27,-27),e.closePath(),e.fill()):C.id===`pauldrons`?(e.fillStyle=r.dark,e.beginPath(),e.moveTo(-43,-39),e.lineTo(-27,-37),e.lineTo(-25,-21),e.lineTo(-41,-21),e.closePath(),e.fill(),e.beginPath(),e.moveTo(43,-39),e.lineTo(27,-37),e.lineTo(25,-21),e.lineTo(41,-21),e.closePath(),e.fill(),e.fillStyle=r.accent+`aa`,e.fillRect(-41,-37,14,2),e.fillRect(27,-37,14,2)):C.id===`armored`&&(e.fillStyle=r.primary,e.fillRect(-42,-37,14,14),e.fillRect(28,-37,14,14),e.fillStyle=r.dark,e.fillRect(-42,-37,14,3),e.fillRect(28,-37,14,3),e.fillStyle=r.accent+`88`,e.fillRect(-40,-33,2,8),e.fillRect(38,-33,2,8)),s.icon){let t={shield:`◆`,skull:`☠`,clock:`⏰`,star:`★`,bolt:`⚡`,eye:`◉`,rift:`×`},n=.6+.4*Math.sin(u*.004);e.fillStyle=`rgba(0,0,0,0.4)`,e.beginPath(),e.arc(-7,-22,14,0,Math.PI*2),e.fill();let i=e.createRadialGradient(-11,-26,1,-8,-23,12);i.addColorStop(0,r.dark),i.addColorStop(.7,`${r.dark}cc`),i.addColorStop(1,`rgba(0,0,0,0.6)`),e.fillStyle=i,e.beginPath(),e.arc(-8,-23,12,0,Math.PI*2),e.fill(),e.strokeStyle=r.accent,e.lineWidth=1.5,e.globalAlpha=n,e.beginPath(),e.arc(-8,-23,12,0,Math.PI*2),e.stroke(),e.strokeStyle=r.accent+`33`,e.lineWidth=.5,e.globalAlpha=.6,e.beginPath(),e.arc(-8,-23,9,0,Math.PI*2),e.stroke(),e.globalAlpha=.25,e.fillStyle=`#ffffff`,e.beginPath(),e.ellipse(-11,-27,4,2.5,-.4,0,Math.PI*2),e.fill(),e.globalAlpha=1,e.fillStyle=r.accent,e.font=`bold 18px monospace`,e.textAlign=`center`,e.fillText(t[s.icon]||`✦`,-8,-17),e.textAlign=`left`}let M=-5+j*.25;if(e.fillStyle={default:`#556677`,carbon:`#222222`,chrome:`#aabbcc`,ember:`#aa4400`,frost:`#4488bb`,toxic:`#339933`}[l.id]||`#556677`,e.fillRect(32,M,6,30),e.fillStyle=r.accent,e.globalAlpha=.6+.3*Math.sin(u*.006),e.fillRect(33,M-4,4,6),e.globalAlpha=1,d){if(d.id===`gunslinger`){e.fillStyle=`#664422`,e.fillRect(-52/2-4,4,6,14),e.fillRect(52/2-2,4,6,14),e.strokeStyle=r.accent+`44`,e.lineWidth=1;for(let t=0;t<3;t++){let n=-15+t*18;e.beginPath(),e.moveTo(44,n),e.lineTo(54+t*4,n),e.stroke()}}else if(d.id===`enforcer`)e.fillStyle=r.dark,e.fillRect(-52/2-14,-31,14,12),e.fillRect(52/2,-31,14,12),e.strokeStyle=r.primary,e.lineWidth=3,e.beginPath(),e.roundRect(-52/2-2,-70/2-2,56,74,8),e.stroke();else if(d.id===`phantom`){e.globalAlpha=.12,e.fillStyle=r.accent;let t=8+Math.sin(u*.003)*3;e.beginPath(),e.roundRect(-52/2+t,-70/2,52,70,6),e.fill(),e.globalAlpha=1;for(let t=0;t<4;t++){let n=40+t*8,i=Math.sin(u*.004+t)*10;e.fillStyle=r.accent,e.globalAlpha=.3-t*.06,e.beginPath(),e.arc(n,i,2,0,Math.PI*2),e.fill()}e.globalAlpha=1}}e.strokeStyle=r.accent+`22`,e.lineWidth=1;for(let t=0;t<2;t++)e.beginPath(),e.arc(0,0,60+t*12,k+t,k+t+Math.PI*1.2),e.stroke();e.restore()}function ro(e,t,n,r,s,l){let p=performance.now(),m=r,h=s,_=g[h.colorIndex],v=E[h.skinToneIndex||0],b=o[h.hairIndex||0],x=f[h.eyeIndex||0],S=u[h.armorIndex],C=y[h.badgeIndex],O=T[h.weaponSkinIndex],k=D[h.loadoutIndex];d[h.backstoryIndex||0],i[h.voiceIndex||0];let A=w[h.helmetIndex||0],j=a[h.visorIndex||0],M=c[h.shoulderIndex||0],N=eo;e.fillStyle=`#000a14`,e.fillRect(0,0,t,n),e.strokeStyle=`rgba(0, 255, 200, 0.03)`,e.lineWidth=1;for(let r=0;r<t;r+=40)e.beginPath(),e.moveTo(r,0),e.lineTo(r,n),e.stroke();for(let r=0;r<n;r+=40)e.beginPath(),e.moveTo(0,r),e.lineTo(t,r),e.stroke();let P=l&&t<700,F=to(t,n,P),ee=P?12:24;e.save();for(let r=0;r<ee;r++){let i=r*137.508,a=(i*7.3+p*.008*(.3+r%3*.2))%t,o=(i*13.7+p*.006*(.2+r%4*.15))%n,s=1+r%3;e.globalAlpha=.06+.04*Math.sin(p*.002+r),e.fillStyle=r%2==0?_.accent:_.primary,e.beginPath(),e.arc(a,o,s,0,Math.PI*2),e.fill()}e.restore();let te=.85+.15*Math.sin(p*.003);e.save(),e.shadowColor=_.accent,e.shadowBlur=16*te,e.fillStyle=_.accent,e.font=`bold ${P?20:28}px monospace`,e.textAlign=`center`,e.fillText(`AGENT CUSTOMIZATION`,t/2,F.titleY),e.shadowBlur=0,e.restore(),e.strokeStyle=`${_.primary}55`,e.lineWidth=1,e.beginPath(),e.moveTo(t/2-120,F.titleY+10),e.lineTo(t/2+120,F.titleY+10),e.stroke();let ne=P?N.map(e=>e.shortLabel):N.map(e=>e.name);for(let t=0;t<N.length;t++){let n=F.tabX0+t*(F.tabW+F.tabGap),r=t===m;e.fillStyle=r?`${_.primary}44`:`rgba(255,255,255,0.04)`,e.beginPath(),e.roundRect(n,F.tabY,F.tabW,F.tabH,4),e.fill(),r&&(e.save(),e.shadowColor=_.accent,e.shadowBlur=8,e.strokeStyle=_.accent,e.lineWidth=1.5,e.beginPath(),e.roundRect(n,F.tabY,F.tabW,F.tabH,4),e.stroke(),e.restore()),e.fillStyle=r?_.accent:`rgba(255,255,255,0.35)`,e.font=`${r?`bold `:``}${P?9:11}px monospace`,e.textAlign=`center`,e.fillText(ne[t],n+F.tabW/2,F.tabY+18)}if(m===0){let r=P?Math.min(320,t-40):320,i=P?44:50,a=t/2-r/2,o=F.contentY+(P?20:40);e.fillStyle=_.accent,e.font=`bold 14px monospace`,e.textAlign=`center`,e.fillText(`AGENT CALLSIGN`,t/2,o-12),e.fillStyle=`rgba(0, 5, 15, 0.8)`,e.beginPath(),e.roundRect(a,o,r,i,6),e.fill();let s=Math.sin(p*.005)>0;e.strokeStyle=s?_.accent:`${_.accent}88`,e.lineWidth=2,e.beginPath(),e.roundRect(a,o,r,i,6),e.stroke();let c=h.name||``,l=s?`▌`:``;e.fillStyle=`#ffffff`,e.font=`bold 22px monospace`,e.textAlign=`center`,e.fillText(c+l,t/2,o+33),e.fillStyle=`rgba(255,255,255,0.3)`,e.font=`11px monospace`,e.fillText(`Type your name (max 16 chars) · Backspace to delete`,t/2,o+i+20);let u=t/2,d=P?o+i+Math.min(100,(n-o-i-80)/2):o+i+160;no(e,u,d,_,S,C,O,p,k,P?1:1.5,A,j,M,v,b,x);let f=h.name||`Agent`;e.font=`bold 14px monospace`;let m=d+(P?70:100),g=e.measureText(f).width+24,y=u-g/2,w=m-22+4;e.fillStyle=`rgba(0, 5, 15, 0.8)`,e.beginPath(),e.roundRect(y,w,g,22,3),e.fill(),e.strokeStyle=_.accent+`66`,e.lineWidth=1,e.shadowColor=_.accent,e.shadowBlur=6,e.beginPath(),e.roundRect(y,w,g,22,3),e.stroke(),e.shadowBlur=0,e.fillStyle=_.accent,e.textAlign=`center`,e.fillText(f,u,m),P||(e.fillStyle=`rgba(180,200,220,0.45)`,e.font=`11px monospace`,e.textAlign=`center`,e.fillText(`Click or TAB/←/→ = category  ·  ENTER = save  ·  ESC = cancel`,t/2,n-20),e.textAlign=`left`);return}let I=N[m],re=I.data,ie=h[I.key],L=F.contentX,ae=Math.min(re.length,P?F.maxBySpace:8),oe=ae*F.itemH+16;e.fillStyle=`rgba(0, 5, 15, 0.7)`,e.beginPath(),e.roundRect(L,F.contentY,F.listW,oe,8),e.fill(),e.strokeStyle=`rgba(0, 255, 200, 0.08)`,e.lineWidth=1,e.beginPath(),e.roundRect(L,F.contentY,F.listW,oe,8),e.stroke();let se=0;ie>=ae&&(se=ie-ae+1);for(let t=0;t<ae;t++){let n=t+se;if(n>=re.length)break;let r=re[n],i=F.contentY+8+t*F.itemH,a=n===ie;if(a){let t=.6+.4*Math.sin(p*.004);e.fillStyle=`${_.primary}${Math.round(15*t).toString(16).padStart(2,`0`)}`,e.beginPath(),e.roundRect(L+4,i,F.listW-8,F.itemH-4,4),e.fill(),e.fillStyle=_.accent,e.fillRect(L+4,i+6,3,F.itemH-16)}let o=r.primary||r.color;(I.key===`colorIndex`||I.key===`skinToneIndex`||I.key===`hairIndex`||I.key===`eyeIndex`)&&o&&(e.fillStyle=o,e.beginPath(),e.roundRect(L+14,i+8,18,18,3),e.fill(),(r.accent||r.shadow)&&(e.fillStyle=r.accent||r.shadow,e.beginPath(),e.roundRect(L+18,i+12,10,10,2),e.fill()));let s=I.key===`colorIndex`||I.key===`skinToneIndex`||I.key===`hairIndex`||I.key===`eyeIndex`?L+40:L+16;e.fillStyle=a?`#ffffff`:`rgba(255,255,255,0.45)`,e.font=`${a?`bold `:``}12px monospace`,e.textAlign=`left`,e.fillText(r.name,s,i+22),I.key===`loadoutIndex`&&r.unlocked===!1&&(e.fillStyle=`rgba(255,100,100,0.6)`,e.font=`10px monospace`,e.fillText(`🔒`,L+F.listW-28,i+22))}let ce=F.contentX+F.listW+F.contentGap,le=ce+F.previewW/2,ue=oe;e.fillStyle=`rgba(0, 5, 15, 0.6)`,e.beginPath(),e.roundRect(ce,F.contentY,F.previewW,ue,8),e.fill(),e.strokeStyle=`${_.primary}33`,e.lineWidth=1,e.beginPath(),e.roundRect(ce,F.contentY,F.previewW,ue,8),e.stroke(),no(e,le,F.contentY+ue/2,_,S,C,O,p,k,1.3,A,j,M,v,b,x),e.save(),e.globalAlpha=.03,e.fillStyle=_.accent;for(let t=0;t<ue;t+=3)e.fillRect(ce,F.contentY+t,F.previewW,1);let de=F.contentY+p*.03%ue;e.globalAlpha=.06,e.fillStyle=_.accent,e.fillRect(ce,de,F.previewW,4),e.restore();let R=ce+F.previewW+F.contentGap,z=re[ie];if(!P){if(e.fillStyle=`rgba(0, 5, 15, 0.6)`,e.beginPath(),e.roundRect(R,F.contentY,F.infoW,ue,8),e.fill(),e.strokeStyle=`rgba(0, 255, 200, 0.08)`,e.lineWidth=1,e.beginPath(),e.roundRect(R,F.contentY,F.infoW,ue,8),e.stroke(),e.fillStyle=_.accent,e.font=`bold 13px monospace`,e.textAlign=`left`,e.fillText(z.name,R+12,F.contentY+28),I.key===`armorIndex`&&z.tier){let t=R+12,n=F.contentY+38,r=[`#6a8cff`,`#ffcc44`,`#ff4488`],i=[`STARTER`,`MID`,`ELITE`];for(let i=0;i<3;i++)e.fillStyle=i<z.tier?r[z.tier-1]:`rgba(80,90,110,0.4)`,e.beginPath(),e.arc(t+4+i*12,n,3,0,Math.PI*2),e.fill();e.fillStyle=r[z.tier-1],e.font=`bold 9px monospace`,e.fillText(i[z.tier-1],t+44,n+3),e.font=`bold 13px monospace`}if(z.desc){e.fillStyle=`rgba(200, 220, 240, 0.6)`,e.font=`11px monospace`;let t=z.desc.split(` `),n=``,r=F.contentY+50;for(let i of t){let t=n+(n?` `:``)+i;e.measureText(t).width>F.infoW-24?(e.fillText(n,R+12,r),n=i,r+=16):n=t}n&&e.fillText(n,R+12,r)}if(I.key===`backstoryIndex`&&z.perk&&(e.fillStyle=`rgba(0,255,200,0.18)`,e.beginPath(),e.roundRect(R+12,F.contentY+116,F.infoW-24,34,6),e.fill(),e.fillStyle=_.accent,e.font=`bold 10px monospace`,e.fillText(`ORIGIN PERK`,R+20,F.contentY+130),e.fillStyle=`rgba(255,255,255,0.8)`,e.font=`11px monospace`,e.fillText(z.perk,R+20,F.contentY+145)),I.key===`voiceIndex`){let t=F.contentY+120;e.strokeStyle=_.accent+`88`,e.lineWidth=1.5,e.beginPath();for(let n=0;n<F.infoW-28;n++){let r=R+14+n,i=t+Math.sin(n*.18+p*.012)*(6+z.pitch*3);n===0?e.moveTo(r,i):e.lineTo(r,i)}e.stroke(),e.fillStyle=`rgba(255,255,255,0.45)`,e.font=`10px monospace`,e.fillText(`VOICE PRINT`,R+12,t+24)}if(I.key===`loadoutIndex`&&k.bonuses){let t=F.contentY+90,n=k.bonuses,r=F.infoW-24,i=(n,i,a,o)=>{e.fillStyle=`rgba(170, 200, 220, 0.5)`,e.font=`10px monospace`,e.fillText(n,R+12,t),t+=14,e.fillStyle=`rgba(255,255,255,0.06)`,e.beginPath(),e.roundRect(R+12,t,r,10,3),e.fill();let s=Math.min(1,Math.max(0,i/a))*r;e.fillStyle=o,e.globalAlpha=.7+.15*Math.sin(p*.004),e.beginPath(),e.roundRect(R+12,t,s,10,3),e.fill(),e.globalAlpha=1,e.fillStyle=`#ffffff`,e.font=`bold 8px monospace`,e.fillText(`${i}`,R+14+s+4,t+8),t+=20};n.fireRateMultiplier!=null&&i(`FIRE RATE`,n.fireRateMultiplier*100,120,_.accent),n.maxHealth!=null&&i(`MAX HEALTH`,n.maxHealth,150,`#44cc88`),n.moveSpeed!=null&&i(`MOVE SPEED`,5+n.moveSpeed,7,`#ffaa44`),n.maxStamina!=null&&i(`MAX STAMINA`,n.maxStamina,150,`#4488ff`),k.unlocked===!1&&(e.fillStyle=`rgba(255, 100, 100, 0.7)`,e.font=`bold 12px monospace`,e.fillText(`LOCKED`,R+12,t+10))}if(I.key===`colorIndex`){let t=F.contentY+80;e.fillStyle=`rgba(170, 200, 220, 0.4)`,e.font=`10px monospace`,e.fillText(`PRIMARY`,R+12,t),e.fillStyle=_.primary,e.fillRect(R+12,t+4,40,16),t+=30,e.fillStyle=`rgba(170, 200, 220, 0.4)`,e.font=`10px monospace`,e.fillText(`ACCENT`,R+12,t),e.fillStyle=_.accent,e.fillRect(R+12,t+4,40,16),t+=30,e.fillStyle=`rgba(170, 200, 220, 0.4)`,e.font=`10px monospace`,e.fillText(`DARK`,R+12,t),e.fillStyle=_.dark,e.fillRect(R+12,t+4,40,16)}}let fe=h.name||`Agent`;e.font=`bold 12px monospace`;let pe=F.contentY+ue-12,me=e.measureText(fe).width+20,he=le-me/2,ge=pe-20+4;e.fillStyle=`rgba(0, 5, 15, 0.8)`,e.beginPath(),e.roundRect(he,ge,me,20,3),e.fill(),e.strokeStyle=_.accent+`66`,e.lineWidth=1,e.shadowColor=_.accent,e.shadowBlur=6,e.beginPath(),e.roundRect(he,ge,me,20,3),e.stroke(),e.shadowBlur=0,e.fillStyle=_.accent,e.textAlign=`center`,e.fillText(fe,le,pe),P||(e.fillStyle=`rgba(180,200,220,0.45)`,e.font=`11px monospace`,e.textAlign=`center`,e.fillText(`Click or TAB/A/D = category  ·  Click or W/S = select  ·  ENTER = save  ·  ESC = cancel`,t/2,n-20),e.textAlign=`left`)}var io=class{constructor(e=2){this.cells=new Map,this.cellSize=e,this.invCellSize=1/e}clear(){this.cells.clear()}_key(e,t){let n=e+1e3,r=t+1e3;return(n+r)*(n+r+1)/2+r}insert(e){let t=Math.floor(e.x*this.invCellSize),n=Math.floor(e.y*this.invCellSize),r=this._key(t,n),i=this.cells.get(r);i?i.push(e):this.cells.set(r,[e])}insertAll(e){for(let t of e)t.active&&this.insert(t)}query(e,t,n){let r=Math.floor((e-n)*this.invCellSize),i=Math.floor((e+n)*this.invCellSize),a=Math.floor((t-n)*this.invCellSize),o=Math.floor((t+n)*this.invCellSize),s=[];for(let e=r;e<=i;e++)for(let t=a;t<=o;t++){let n=this.cells.get(this._key(e,t));if(n)for(let e of n)e.active&&s.push(e)}return s}get size(){return this.cells.size}};function ao(){if(typeof window>`u`)return!1;let e=typeof navigator<`u`&&navigator.maxTouchPoints>0||`ontouchstart`in window,t=typeof window.matchMedia==`function`&&window.matchMedia(`(pointer: coarse)`).matches;return e&&t}var oo={title:[`modeSelect`,`playing`,`builder`,`cutscene`,`tutorial`,`characterCreate`,`settings`,`achievements`,`stats`],modeSelect:[`title`,`playing`,`builder`,`cutscene`,`tutorial`,`campaignPrompt`,`characterCreate`,`settings`],playing:[`paused`,`settings`,`controls`,`upgrade`,`gameOver`,`victory`,`levelComplete`,`cutscene`,`campaignPrompt`,`tutorialComplete`,`builder`],paused:[`playing`,`settings`,`controls`,`title`,`modeSelect`],settings:[`paused`,`playing`,`title`,`modeSelect`,`controls`],controls:[`settings`,`paused`,`playing`,`title`],upgrade:[`playing`],gameOver:[`title`,`modeSelect`,`playing`,`cutscene`,`characterCreate`],builder:[`title`,`modeSelect`,`playing`,`settings`,`paused`],victory:[`title`,`modeSelect`,`playing`,`cutscene`,`levelComplete`,`characterCreate`],levelComplete:[`playing`,`title`,`modeSelect`,`cutscene`,`upgrade`,`campaignPrompt`,`victory`],tutorial:[`playing`,`paused`,`settings`,`tutorialComplete`,`title`],cutscene:[`playing`,`title`,`modeSelect`,`gameOver`,`victory`,`campaignPrompt`,`tutorial`,`characterCreate`],campaignPrompt:[`playing`,`title`,`modeSelect`,`cutscene`],tutorialComplete:[`title`,`modeSelect`,`playing`],characterCreate:[`title`,`modeSelect`,`playing`,`cutscene`,`gameOver`,`victory`],achievements:[`title`,`modeSelect`],stats:[`title`,`modeSelect`]},so=class{constructor(e){this._state=e,this._prev=null,this._pausedFrom=null,this._onChange=null}get current(){return this._state}get previous(){return this._prev}get pausedFrom(){return this._pausedFrom}transition(e){this._state!==e&&(oo[this._state]?.includes(e)||console.warn(`[StateManager] Unexpected transition:`,this._state,`→`,e),this._prev=this._state,this._state=e,this._onChange&&this._onChange(e,this._prev))}pause(e){this._pausedFrom=e??this._state,this.transition(`paused`)}resume(){let e=this._pausedFrom??`playing`;this._pausedFrom=null,this.transition(e)}isIn(...e){return e.includes(this._state)}wasIn(...e){return e.includes(this._prev)}onChange(e){this._onChange=e}static isValidTransition(e,t){return oo[e]?.includes(t)??!1}},co=class{constructor(e){this.game=e,this.level=0,this.act=1,this.missedWeapons=[],this.ngPlusCycle=0,this.ngPlusPrompt=!1,this.ngPlusPromptSel=0,this.promptSelection=0}save(){let e=this.game;Un(this.level,this.act,this.ngPlusCycle,e.player,e.settings.difficulty,e.map.grid,e.entities,e.killedEnemies)}load(){let e=this.game,t=Wn();if(!t)return!1;if(e.mode=`campaign`,this.level=t.level,this.act=t.act||1,this.ngPlusCycle=t.ngPlusCycle||0,e.settings.difficulty=t.difficulty??e.settings.difficulty,e.player.reset(),this.loadLevel(this.level),e.player.deserialize(t),t.playerX!==void 0&&(e.player.x=t.playerX,e.player.y=t.playerY,e.player.angle=t.playerAngle,e.player.aimOffsetX=t.aimOffsetX||0,e.player.aimOffsetY=t.aimOffsetY??t.playerPitch??0),t.mapGrid&&(e.map.grid=t.mapGrid),t.entityStates&&t.entityStates.length===e.entities.length){for(let n=0;n<t.entityStates.length;n++){let r=t.entityStates[n],i=e.entities[n];r.type===i.type&&(i.active=r.active,r.type===`enemy`&&i.type===`enemy`&&(i.health=r.health,i.x=r.x,i.y=r.y,i.state=r.state))}e.killedEnemies=t.killedEnemies??0}return!0}clearSave(){Gn()}start(){let e=this.game;e.mode=`campaign`,this.level=0,this.act=1,this.ngPlusCycle=0,this.ngPlusPrompt=!1,e.achievementStats.totalGamesPlayed++,this.missedWeapons=[],e.player.reset(),e.applyLoadoutBonuses(),(()=>{let t=`cc_seen_intro_memory_01`,n=`cc_seen_intro_flipbook`,r=()=>{Jn(t)?this.loadLevel(0):(Yn(t),e.startCutscene(`intro_memory_01`,()=>{this.loadLevel(0)}))},i=()=>{e.cutsceneEngine.hasScript(`clocking_in`)?e.startCutscene(`clocking_in`,()=>{e.ariaEnabled=!0,e.queueAriaMessage(`campaignStart`),e.startCutscene(`intro`,()=>{r()})}):e.startCutscene(`intro`,()=>{r()})};!Jn(n)&&e.cutsceneEngine.hasScript(`intro_flipbook`)?e.startCutscene(`intro_flipbook`,()=>{Yn(n),i()}):i()})()}loadLevel(e){let t=this.game;if(e>=v.length){t.state=J.VICTORY,t.audio.stopMusic(),t.audio.roundComplete(),this.clearSave(),t.unlockPointer();return}let n=v[e];t.map=structuredClone(n),t.player.x=n.playerStart.x,t.player.y=n.playerStart.y,t.player.angle=n.playerStart.dir,t.player.alive=!0,t.entities=[],t.dustMotes=null,t.projectiles=[],t._chronoBombs=[];let r=t.getDifficultyMultipliers(),{entities:i,exitEntity:a}=Or(n,this.act,this.ngPlusCycle,r);t.entities.push(...i),t.exitEntity=a||null,this.missedWeapons&&this.missedWeapons.length>0&&t.entities.push(...kr(this.missedWeapons,t.player.weapons,n.playerStart.x,n.playerStart.y)),t.killedEnemies=0,t.totalEnemies=t.entities.filter(e=>e.type===`enemy`).length,t.killStreakSystem.reset(),t.shotsFired=0,t.shotsHit=0,t.slowMoTimer=0,t.timeScale=1,t.ariaCombatTimer=0,t.squadComms&&t.squadComms.setContext(this.act,this.level),t.ariaComms&&typeof t.ariaComms.setNarrativeContext==`function`&&t.ariaComms.setNarrativeContext({act:this.act,ngPlusCycle:this.ngPlusCycle||0}),this._applyActEnemyRoster();let o=t.entities.some(e=>e.type===`enemy`&&(e.enemyType===`boss`||e.enemyType===`boss_form2`||e.enemyType===`boss_form3`));if(o){let e=this.act;e===2?t.queueAriaMessage(`bossForm2`):e===3?t.queueAriaMessage(`bossForm3`):t.queueAriaMessage(`bossEncounter`),t.squadComms&&typeof t.squadComms.onBossPhase==`function`&&setTimeout(()=>t.squadComms.onBossPhase(e),2e3),t.slowMoTimer=2.5,t.timeScale=.4,t.glitchEffect=Math.max(t.glitchEffect,.8);let n={1:{title:`PARADOX LORD`,subtitle:`FIRST INCURSION`},2:{title:`PARADOX LORD`,subtitle:`SECOND INCURSION`},3:{title:`PARADOX LORD`,subtitle:`FINAL INCURSION`}};t.bossNameCard={...n[e]||n[1],time:t.time,duration:3500}}else t.squadComms&&this.act>=2&&setTimeout(()=>t.squadComms.onCombatStart(),1500);this.act===3&&(this.level===0&&t.queueAriaMessage?setTimeout(()=>t.queueAriaMessage(`encryptedChannelReveal`),3e3):this.level===1&&t.queueAriaMessage&&setTimeout(()=>t.queueAriaMessage(`analystLMReveal`),3e3)),this.ngPlusCycle>=1&&this.level===0&&t.queueAriaMessage&&setTimeout(()=>t.queueAriaMessage(`ngPlusDeadSquad`),5e3),t.state=J.PLAYING,t.roundStartTime=performance.now(),t.renderer.applyActPalette(this.act),o?t.audio.startTrack(`boss`):t.audio.startTrack(`campaign`,130),t.audio.startAmbient(`industrial`),this.save(),t.lockPointer()}nextLevel(){let e=this.game;this.missedWeapons??(this.missedWeapons=[]);for(let t of e.entities)t.type===`weapon`&&t.active&&t.weaponId!=null&&(this.missedWeapons.includes(t.weaponId)||this.missedWeapons.push(t.weaponId));if(this.missedWeapons=this.missedWeapons.filter(t=>!e.player.weapons.includes(t)),this.level++,e.achievementStats.totalCampaignLevels++,e.saveAchievements(),this.level>=v.length){this.loadLevel(this.level);return}let t={easy:999,normal:30,hard:10,nightmare:0}[e.settings.difficulty]??30;t>=999?e.player.health=e.player.maxHealth:e.player.health=Math.min(e.player.health+t,e.player.maxHealth),e.player.ammo=Math.min(e.player.ammo+20,999);let n={1:{1:`security_briefing`,2:`research_briefing`,3:`containment_briefing`,4:`server_briefing`,5:`reactor_briefing`,6:`voss_lab_briefing`,7:`nexus_briefing`,8:`paradox_core_briefing`},2:{1:`act2_level2`,2:`act2_level3`,3:`act2_level4`,4:`act2_level5`,5:`act2_level6`,6:`voss_confrontation`,7:`act2_level8`,8:`act2_level9`},3:{1:`act3_level2`,2:`act3_boss`,3:`act3_level4`,4:`act3_level5`,5:`act3_level6`,6:`origin_panels`,7:`act3_level8`,8:`act3_level9`}}[this.act]?.[this.level];n&&e.cutsceneEngine.hasScript(n)?e.startCutscene(n,()=>{this.loadLevel(this.level),this.save()}):(this.loadLevel(this.level),this.save())}handleBossKill(){let e=this.game;e.achievementStats.bossKilled=!0,e.checkAchievements(),t(`boss_kill`,{mode:`campaign`,form:this.act,time_seconds:Math.floor((performance.now()-e.roundStartTime)/1e3)}),this.act===1?(e.audio.stopMusic(),e.startCutscene(`false_victory`,()=>{this.act=2,this.level=0,e.player.health=e.player.maxHealth,e.player.ammo=Math.min(e.player.ammo+50,999);let t=()=>{e.startCutscene(`act2_intro`,()=>{this.loadLevel(0),this.save()})};e.cutsceneEngine.hasScript(`act2_transition_fb`)?e.startCutscene(`act2_transition_fb`,t):t()})):this.act===2?(e.audio.stopMusic(),e.startCutscene(`act2_victory`,()=>{this.act=3,this.level=0,e.player.health=e.player.maxHealth,e.player.ammo=Math.min(e.player.ammo+50,999);let t=()=>{e.startCutscene(`lyra_reveal`,()=>{e.startCutscene(`act3_intro`,()=>{this.loadLevel(0),this.save()})})};e.cutsceneEngine.hasScript(`act3_transition_fb`)?e.startCutscene(`act3_transition_fb`,t):t()})):(e.achievementStats.campaignComplete=!0,e.checkAchievements(),e.audio.stopMusic(),Xn(this.ngPlusCycle),this.ngPlusCycle>=3?e.startCutscene(`true_victory`,()=>{e.startCutscene(`ng_plus_true_ending`,()=>{e.state=J.VICTORY,e.audio.roundComplete(),this.clearSave(),e.unlockPointer()})}):e.startCutscene(`true_victory`,()=>{e.state=J.VICTORY,this.ngPlusPrompt=!0,this.ngPlusPromptSel=0,e.audio.roundComplete(),e.unlockPointer()}))}startNgPlus(){let e=this.game;this.ngPlusCycle++,this.ngPlusPrompt=!1,this.act=1,this.level=0,this.missedWeapons=[],e.player.health=e.player.maxHealth,e.player.shield=e.player.maxShield||0,e.player.ammo=Math.min(e.player.ammo+100,999),e.player.alive=!0;let t=`ng_plus_cycle_${this.ngPlusCycle}`,n=e.cutsceneEngine.hasScript(t),r=()=>{this.loadLevel(0),this.save(),e.lockPointer()};e.audio.stopMusic(),n?e.startCutscene(t,r):e.startCutscene(`ng_plus_intro`,r)}_applyActEnemyRoster(){Pr(this.game.entities,this.act,this.game.getDifficultyMultipliers())}showPrompt(){this.game.state=J.CAMPAIGN_PROMPT,this.promptSelection=0}executePromptChoice(e){let t=this.game,n=()=>{e===0?t.startTutorial():this.start()},r=!1;try{r=localStorage.getItem(`cc_seen_creator_intro`)===`1`}catch{}if(r){n();return}t.creatorCategory=0,t._creatorSaveCallback=()=>n(),t.state=J.CHARACTER_CREATE}},lo=class{constructor(e){this.game=e,this.step=0,this.stepTime=0,this.startAngle=0,this.cumulativeAngle=0,this.prevAngle=0,this.startX=0,this.startY=0,this.sprintTime=0,this.sprintDone=!1,this.pickedUp=!1,this.weaponPickedUp=!1,this.weaponSwapped=!1,this.secondWeaponPickedUp=!1,this.doorOpened=!1,this.dashed=!1,this.crouched=!1,this.slid=!1,this.fired=!1,this.chronoUsed=!1,this.wave1Spawned=!1,this.wave2Spawned=!1,this.sandboxInit=!1,this.menuSelection=1,this.originPlayed=!1,this.showCompletionMenu=!1,this.alarmPlayed=!1}start(){let e=this.game;return e.mode=`tutorial`,e.player.reset(),e.cutsceneEngine?(this._begin(),Promise.resolve()):e._ensureCutsceneEngine().then(()=>this._begin())}_begin(){let e=this.game;e.cutsceneEngine.hasScript(`clocking_in`)?e.startCutscene(`clocking_in`,()=>{e.ariaEnabled=!0,this.initLevel()}):this.initLevel()}initLevel(){let e=this.game;e.map=structuredClone(l),e.player.x=l.playerStart.x,e.player.y=l.playerStart.y,e.player.angle=l.playerStart.dir,e.player.alive=!0,e.player.weapons=[],e.player.currentWeapon=-1,e.entities=[],e.dustMotes=null,e.projectiles=[];for(let t of l.pickups)e.entities.push(new rn(t.x,t.y,t.type,t));if(l.props)for(let t of l.props){let n=Fr(t.x,t.y,l.grid,l.width,l.height);n&&e.entities.push(new an(n.x+.5,n.y+.5,t.type))}e.killedEnemies=0,e.totalEnemies=0,e.exitEntity=null,this.step=0,this.stepTime=performance.now(),this.startAngle=e.player.angle,this.cumulativeAngle=0,this.prevAngle=e.player.angle,this.startX=e.player.x,this.startY=e.player.y,this.sprintTime=0,this.sprintDone=!1,this.pickedUp=!1,this.weaponPickedUp=!1,this.weaponSwapped=!1,this.secondWeaponPickedUp=!1,this.doorOpened=!1,this.dashed=!1,this.crouched=!1,this.slid=!1,this.fired=!1,this.chronoUsed=!1,this.wave1Spawned=!1,this.wave2Spawned=!1,this.sandboxInit=!1,this.menuSelection=1,this.originPlayed=!1,this.showCompletionMenu=!1,this.alarmPlayed=!1,e.state=J.PLAYING,e.roundStartTime=performance.now()+99999,e.audio.startTrack(`campaign`,130),e.audio.startAmbient(`industrial`),e.lockPointer()}advanceStep(){let e=this.game;this.step++,this.stepTime=performance.now(),e.audio.menuConfirm();let t=l.doors,n={4:t.door2,8:t.door3,12:t.door4,13:t.door6,14:t.door5}[this.step];if(n)for(let t of n)e.map.grid[t.y][t.x]=0;this.sprintTime=0,this.sprintDone=!1,this.dashed=!1,this.crouched=!1,this.slid=!1,this.fired=!1,this.weaponSwapped=!1,this.doorOpened=!1,this.chronoUsed=!1,this.pickedUp=!1}update(e){let t=this.game,n=t.player,r=performance.now(),i=(r-this.stepTime)/1e3;for(let e of t.entities)!e.active&&e._respawnAt&&r>=e._respawnAt&&(e.active=!0,e._respawnAt=0);switch(t.objectiveWaypoint=null,this.step){case 0:i>2.4&&this.advanceStep();break;case 1:{let e=n.angle-this.prevAngle;for(;e>Math.PI;)e-=Math.PI*2;for(;e<-Math.PI;)e+=Math.PI*2;this.cumulativeAngle+=Math.abs(e),this.prevAngle=n.angle,this.cumulativeAngle>2&&this.advanceStep()}break;case 2:t.objectiveWaypoint={x:25.5,y:41.5};{let e=n.x-this.startX,t=n.y-this.startY;Math.sqrt(e*e+t*t)>2.5&&this.advanceStep()}break;case 3:t.objectiveWaypoint={x:25.5,y:41.5},this.doorOpened&&this.advanceStep();break;case 4:t.objectiveWaypoint={x:38.5,y:42.5},this.weaponPickedUp&&this.advanceStep();break;case 5:t.objectiveWaypoint={x:50,y:42.5},i>.1&&this.fired&&this.advanceStep();break;case 6:n.isAiming&&this.advanceStep();break;case 7:t.objectiveWaypoint={x:43.5,y:42.5},this.secondWeaponPickedUp&&this.weaponSwapped&&this.advanceStep();break;case 8:t.objectiveWaypoint={x:14,y:20.5},n.isSprinting&&(this.sprintTime+=e),this.sprintTime>.5&&this.advanceStep();break;case 9:t.objectiveWaypoint={x:14,y:19.5},this.crouched&&this.advanceStep();break;case 10:t.objectiveWaypoint={x:14,y:18.5},this.slid&&this.advanceStep();break;case 11:t.objectiveWaypoint={x:14,y:18},this.dashed&&this.advanceStep();break;case 12:t.objectiveWaypoint={x:44.5,y:21.5},i>.1&&this.chronoUsed&&this.advanceStep();break;case 13:t.objectiveWaypoint={x:44.5,y:21.5},this.pickedUp&&this.advanceStep();break;case 14:this.alarmPlayed||(this.alarmPlayed=!0,t.audio.alarmKlaxon(),t.screenShake=3),i>2.5&&this.advanceStep();break;case 15:if(!this.wave1Spawned){this.wave1Spawned=!0;for(let e of[{x:20.5,y:5.5},{x:39.5,y:5.5},{x:29.5,y:4.5}]){let n=new W(e.x,e.y,`drone`);n.health=15,n.maxHealth=15,n.def={...n.def,damage:3,speed:n.def.speed*.5},t.entities.push(n)}t.totalEnemies=3,t.killedEnemies=0}t.objectiveWaypoint={x:29.5,y:6.5},t.killedEnemies>=3&&this.advanceStep();break;case 16:if(!this.wave2Spawned){this.wave2Spawned=!0;for(let e of[{x:15.5,y:7.5,type:`henchman`},{x:44.5,y:7.5,type:`henchman`},{x:29.5,y:4.5,type:`drone`}]){let n=new W(e.x,e.y,e.type);e.type===`henchman`?(n.health=25,n.maxHealth=25,n.def={...n.def,damage:5,speed:n.def.speed*.6}):(n.health=15,n.maxHealth=15,n.def={...n.def,damage:3,speed:n.def.speed*.5}),t.entities.push(n)}t.totalEnemies=3,t.killedEnemies=0}t.objectiveWaypoint={x:29.5,y:6.5},t.killedEnemies>=3&&this.advanceStep();break;case 17:i>2&&!this.originPlayed&&(t.achievementStats.tutorialComplete=!0,t.checkAchievements(),this.originPlayed=!0,t.audio.stopMusic(),this.advanceStep());break;case 18:this.sandboxInit||(this.sandboxInit=!0,this.spawnDummies(),this.showCompletionMenu=!0,t.state=J.TUTORIAL_COMPLETE,t.unlockPointer()),t.entities.filter(e=>e.type===`enemy`&&e.active&&e.state!==`dead`).length===0&&this.sandboxInit&&this.spawnDummies();break}}spawnDummies(){let e=this.game;e.entities=e.entities.filter(e=>e.type!==`enemy`||e.active&&e.state!==`dead`);for(let t of[{x:20.5,y:6.5},{x:39.5,y:6.5},{x:29.5,y:4.5}]){let n=new W(t.x,t.y,`drone`);n.health=20,n.maxHealth=20,n.speed=0,n.def={...n.def,damage:0,speed:0,sightRange:0},n.state=`idle`,e.entities.push(n)}e.totalEnemies=3,e.killedEnemies=0}executeMenuChoice(e){let t=this.game;switch(t.unlockPointer(),t.audio.stopMusic(),t.mode=null,e){case 0:t.startCampaign();break;case 1:t.startArena();break;case 2:t.startTutorial();break;default:t.state=J.TITLE,t.audio.stopMusic(),t.audio.startTrack(`menu`),t.audio.startAmbient(`menu`);break}}executeCompletionChoice(e){let t=this.game;switch(this.showCompletionMenu=!1,e){case 0:this.step=18,this.stepTime=performance.now(),this.sandboxInit=!1,t.state=J.PLAYING,t.audio.startTrack(`campaign`,130),t.audio.startAmbient(`industrial`),t.lockPointer();break;case 1:t.unlockPointer(),t.startCampaign();break;case 2:t.creatorReturnState=J.TUTORIAL_COMPLETE,t.state=J.CHARACTER_CREATE;break;default:t.unlockPointer(),t.mode=null,t.state=J.TITLE,t.audio.stopMusic(),t.audio.startTrack(`menu`),t.audio.startAmbient(`menu`);break}}shouldShow(){let e=this.game;return e.alwaysShowTutorial?!0:!e.achievementStats.tutorialComplete}},J={TITLE:`title`,MODE_SELECT:`modeSelect`,PLAYING:`playing`,PAUSED:`paused`,SETTINGS:`settings`,CONTROLS:`controls`,UPGRADE:`upgrade`,GAME_OVER:`gameOver`,BUILDER:`builder`,VICTORY:`victory`,LEVEL_COMPLETE:`levelComplete`,TUTORIAL:`tutorial`,CUTSCENE:`cutscene`,CAMPAIGN_PROMPT:`campaignPrompt`,TUTORIAL_COMPLETE:`tutorialComplete`,CHARACTER_CREATE:`characterCreate`,ACHIEVEMENTS:`achievements`,STATS:`stats`,HUD_EDITOR:`hudEditor`};function uo(e,t,n){if(!(e.state===J.TITLE||e.state===J.MODE_SELECT)){if(e.state===J.BUILDER){if(t===`Escape`){let t=performance.now();if(t-e.lastEscTime<200)return;e.lastEscTime=t,e.pauseGame(J.BUILDER)}return}if(e.state===J.CAMPAIGN_PROMPT){if(t===`ArrowUp`||t===`KeyW`){e.campaignPromptSelection=(e.campaignPromptSelection-1+2)%2,e.audio.menuSelect();return}if(t===`ArrowDown`||t===`KeyS`){e.campaignPromptSelection=(e.campaignPromptSelection+1)%2,e.audio.menuSelect();return}if(t===`Enter`||t===`Space`){e.audio.menuConfirm(),e.executeCampaignPromptChoice(e.campaignPromptSelection);return}if(t===`Digit1`){e.audio.menuConfirm(),e.executeCampaignPromptChoice(0);return}if(t===`Digit2`){e.audio.menuConfirm(),e.executeCampaignPromptChoice(1);return}if(t===`Escape`){e.audio.menuConfirm(),e.state=J.MODE_SELECT;return}return}if(e.state===J.TUTORIAL_COMPLETE){if(t===`ArrowUp`||t===`KeyW`){e.tutorialMenuSelection=(e.tutorialMenuSelection-1+4)%4,e.audio.menuSelect();return}if(t===`ArrowDown`||t===`KeyS`){e.tutorialMenuSelection=(e.tutorialMenuSelection+1)%4,e.audio.menuSelect();return}if(t===`Enter`||t===`Space`){e.audio.menuConfirm(),e.executeTutorialCompletionChoice(e.tutorialMenuSelection);return}if(t===`Digit1`){e.audio.menuConfirm(),e.executeTutorialCompletionChoice(0);return}if(t===`Digit2`){e.audio.menuConfirm(),e.executeTutorialCompletionChoice(1);return}if(t===`Digit3`){e.audio.menuConfirm(),e.executeTutorialCompletionChoice(2);return}if(t===`Escape`){e.audio.menuConfirm(),e.executeTutorialCompletionChoice(3);return}return}if(e.state===J.CHARACTER_CREATE){let r=eo.length;if(e.creatorCategory===0){if(t===`Enter`||t===`Space`){e.audio.menuConfirm(),e._exitCreator(!0);return}if(t===`Escape`){let t=performance.now();if(t-e.lastEscTime<200)return;e.lastEscTime=t,e._creatorExitTime=t,e.audio.menuConfirm(),e._exitCreator(!1);return}if(t===`Tab`){e.keys.ShiftLeft||e.keys.ShiftRight?e.creatorCategory=(e.creatorCategory-1+r)%r:e.creatorCategory=(e.creatorCategory+1)%r,e.audio.menuSelect();return}if(t===`ArrowRight`){e.creatorCategory=(e.creatorCategory+1)%r,e.audio.menuSelect();return}if(t===`ArrowLeft`){e.creatorCategory=(e.creatorCategory-1+r)%r,e.audio.menuSelect();return}if(t===`Backspace`){e.character.name.length>0&&(e.character.name=e.character.name.slice(0,-1));return}n?.key&&n.key.length===1&&e.character.name.length<16&&(e.character.name+=n.key);return}let i=eo[e.creatorCategory],a=i.data.length;if(t===`Tab`){e.keys.ShiftLeft||e.keys.ShiftRight?e.creatorCategory=(e.creatorCategory-1+r)%r:e.creatorCategory=(e.creatorCategory+1)%r,e.audio.menuSelect();return}if(t===`ArrowRight`||t===`KeyD`){e.creatorCategory=(e.creatorCategory+1)%r,e.audio.menuSelect();return}if(t===`ArrowLeft`||t===`KeyA`){e.creatorCategory=(e.creatorCategory-1+r)%r,e.audio.menuSelect();return}if(t===`ArrowUp`||t===`KeyW`){let t=(e.character[i.key]-1+a)%a;if(i.name===`LOADOUT`)for(let e=0;e<a&&i.data[t].unlocked===!1;e++)t=(t-1+a)%a;e.character[i.key]=t,e.audio.menuSelect();return}if(t===`ArrowDown`||t===`KeyS`){let t=(e.character[i.key]+1)%a;if(i.name===`LOADOUT`)for(let e=0;e<a&&i.data[t].unlocked===!1;e++)t=(t+1)%a;e.character[i.key]=t,e.audio.menuSelect();return}if(t===`Enter`||t===`Space`){e.audio.menuConfirm(),e._exitCreator(!0);return}if(t===`Escape`){let t=performance.now();if(t-e.lastEscTime<200)return;e.lastEscTime=t,e._creatorExitTime=t,e.audio.menuConfirm(),e._exitCreator(!1);return}return}if(e.state===J.PLAYING){if(e.mode===`tutorial`&&e.tutorialStep===18){if(t===`Escape`||t===`KeyQ`){e.audio.menuConfirm(),e.executeTutorialMenuChoice(3);return}if(t===`KeyC`){e.audio.menuConfirm(),e.executeTutorialCompletionChoice(1);return}}if(e.mode===`tutorial`&&e.tutorialStep<18&&t===`Escape`){let t=performance.now();if(t-e.lastEscTime<200)return;e.lastEscTime=t,e.pauseGame(J.PLAYING);return}if(e._meltdownUpgradeChoices){let n=e._meltdownUpgradeChoices;if(t===`Digit1`&&n.length>0){e.meltdown.selectUpgrade(0),e._meltdownUpgradeChoices=null,e.audio.menuConfirm();return}if(t===`Digit2`&&n.length>1){e.meltdown.selectUpgrade(1),e._meltdownUpgradeChoices=null,e.audio.menuConfirm();return}if(t===`Digit3`&&n.length>2){e.meltdown.selectUpgrade(2),e._meltdownUpgradeChoices=null,e.audio.menuConfirm();return}if(t===`ArrowLeft`||t===`ArrowUp`){e._meltdownUpgradeSel=Math.max(0,e._meltdownUpgradeSel-1),e.audio.menuNav();return}if(t===`ArrowRight`||t===`ArrowDown`){e._meltdownUpgradeSel=Math.min(n.length-1,e._meltdownUpgradeSel+1),e.audio.menuNav();return}if(t===`Enter`||t===`Space`){e.meltdown.selectUpgrade(e._meltdownUpgradeSel),e._meltdownUpgradeChoices=null,e.audio.menuConfirm();return}return}let n=e.player.currentWeapon,r=[e.keybinds.weapon1,e.keybinds.weapon2,e.keybinds.weapon3,e.keybinds.weapon4,e.keybinds.weapon5,e.keybinds.weapon6,e.keybinds.weapon7,e.keybinds.weapon8].indexOf(t);if(r!==-1&&e.player.weapons.length>r&&(e.player.currentWeapon=r),e.player.currentWeapon!==n&&(e.triggerAriaOnce(`weaponSwitch`,`weaponSwitch`),e.mode===`tutorial`&&(e.tutorialWeaponSwapped=!0)),t===e.keybinds.interact&&e.interact(),t===`KeyQ`&&e.mode===`meltdown`&&e.meltdown.alive){let t=e.meltdown.useAbility();t&&(t.type===`dash`&&(e.meltdown.speed+=t.speedBoost),e.audio.menuConfirm())}if(t===e.keybinds.pause||t===`KeyP`){let t=performance.now();if(t-e.lastEscTime<200)return;e.lastEscTime=t,e.pauseGame(J.PLAYING)}t===e.keybinds.toggleFPS&&(e.showFPS=!e.showFPS,e.settings.showPerformanceOverlay=e.showFPS,e.saveSettings());return}if(e.state===J.PAUSED){if(t===`Escape`||t===`Enter`||t===`KeyP`){let t=performance.now();if(t-e.lastEscTime<200)return;e.lastEscTime=t,e.showAriaLog=!1,e.resumeGame(),e.triggerAriaOnce(`pauseResume`,`pauseResume`)}if(t===`KeyQ`){if(e.mode===`playtest`){e.exitBuilderPlayTest();return}e.builder&&e.pausedFromState===J.BUILDER&&(e.builder.saveMap(),e.builder.stop()),e.pausedFromState===J.BUILDER&&(e.mode=null,e.exitEntity=null,e.entities=[],e.projectiles=[]),e.state=J.TITLE,e.audio.stopMusic(),e.audio.startTrack(`menu`),e.audio.startAmbient(`menu`)}(t===`KeyS`||t===`Tab`)&&(e.settingsSelection=0,e.state=J.SETTINGS),t===`KeyC`&&(e.controlsSelection=0,e.state=J.CONTROLS),t===`KeyA`&&(e.achievementsScroll=0,e.state=J.ACHIEVEMENTS),t===`KeyT`&&(e.state=J.STATS),t===`KeyL`&&(e.showAriaLog=!e.showAriaLog,e.ariaLogScroll=0),e.showAriaLog&&((t===`KeyW`||t===`ArrowUp`)&&(e.ariaLogScroll=Math.min(e.ariaLogScroll+1,Math.max(0,e.ariaMessageLog.length-5))),(t===`KeyS`||t===`ArrowDown`)&&(e.ariaLogScroll=Math.max(0,e.ariaLogScroll-1))),t===`KeyF`&&e.mode===`campaign`&&(e.saveCampaign(),e.pauseSaveFlash=performance.now());return}if(e.state===J.SETTINGS){let n=mn(e.isTouchDevice),r=n.indexOf(e.settingsCategory),i=pn(e.isTouchDevice,e.settingsCategory),a=i.length;if(t===`KeyQ`){e.settingsCategory=n[(r-1+n.length)%n.length],e.settingsSelection=0,e.audio.menuSelect();return}if(t===`KeyE`){e.settingsCategory=n[(r+1)%n.length],e.settingsSelection=0,e.audio.menuSelect();return}if(t===`ArrowUp`||t===`KeyW`){e.settingsSelection=(e.settingsSelection-1+a)%a,e.audio.menuSelect();return}if(t===`ArrowDown`||t===`KeyS`){e.settingsSelection=(e.settingsSelection+1)%a,e.audio.menuSelect();return}let o=t===`ArrowLeft`||t===`KeyA`?-1:+(t===`ArrowRight`||t===`KeyD`||t===`Enter`||t===`Space`);if(o!==0){let t=i[e.settingsSelection];t&&hn(e.settings,t,o)&&(t.onChange&&t.onChange(e),e.saveSettings(),e.audio.menuConfirm());return}if(t===`Escape`){let t=performance.now();if(t-e.lastEscTime<200)return;e.lastEscTime=t,e.saveSettings(),e.state=J.PAUSED}return}if(e.state===J.CONTROLS){if(e.rebindingKey)return;let n=Object.keys(e.keybinds),r=n.length+1;if((t===`ArrowUp`||t===`KeyW`)&&(e.controlsSelection=(e.controlsSelection-1+r)%r,e.audio.menuSelect()),(t===`ArrowDown`||t===`KeyS`)&&(e.controlsSelection=(e.controlsSelection+1)%r,e.audio.menuSelect()),(t===`Enter`||t===`Space`)&&(e.controlsSelection<n.length?(e.rebindingKey=n[e.controlsSelection],e.audio.menuConfirm()):(Object.assign(e.keybinds,Ce),e.saveSettings(),e.audio.menuConfirm())),t===`Escape`){let t=performance.now();if(t-e.lastEscTime<200)return;e.lastEscTime=t,e.saveSettings(),e.state=J.PAUSED}return}if(e.state===J.ACHIEVEMENTS){if(t===`Escape`||t===`KeyA`){let t=performance.now();if(t-e.lastEscTime<200)return;e.lastEscTime=t,e.state=J.PAUSED}(t===`ArrowUp`||t===`KeyW`)&&(e.achievementsScroll=Math.max(0,(e.achievementsScroll||0)-1)),(t===`ArrowDown`||t===`KeyS`)&&(e.achievementsScroll=(e.achievementsScroll||0)+1);return}if(e.state===J.STATS){if(t===`Escape`){let t=performance.now();if(t-e.lastEscTime<200)return;e.lastEscTime=t,e._statsReturnToMenu?(e._statsReturnToMenu=!1,e.state=J.MODE_SELECT):e.state=J.PAUSED}return}if(e.state===J.UPGRADE){let n=Object.keys(b),r=Math.ceil(n.length/2),i=e.upgradeSelection,a=i===n.length;if(t===`ArrowUp`||t===`KeyW`){if(a)e.upgradeSelection=(r-1)*2;else{let t=i%2,r=Math.floor(i/2);r>0?e.upgradeSelection=(r-1)*2+t:e.upgradeSelection=n.length}e.audio.menuSelect()}if(t===`ArrowDown`||t===`KeyS`){if(a)e.upgradeSelection=0;else{let t=i%2,a=Math.floor(i/2);a<r-1&&(a+1)*2+t<n.length?e.upgradeSelection=(a+1)*2+t:e.upgradeSelection=n.length}e.audio.menuSelect()}(t===`ArrowLeft`||t===`KeyA`)&&(a||i%2>0&&(e.upgradeSelection=i-1,e.audio.menuSelect())),(t===`ArrowRight`||t===`KeyD`)&&(a||i%2<1&&i+1<n.length&&(e.upgradeSelection=i+1,e.audio.menuSelect())),(t===`Enter`||t===`Space`)&&(e.upgradeSelection===n.length?(e.audio.menuConfirm(),e.startArenaRound()):e.buyUpgrade(n[e.upgradeSelection]));return}if(e.state===J.GAME_OVER||e.state===J.VICTORY){if(e.state===J.VICTORY&&e.ngPlusPrompt){if(t===`ArrowLeft`||t===`ArrowUp`)e.ngPlusPromptSel=0,e.audio.menuNav();else if(t===`ArrowRight`||t===`ArrowDown`)e.ngPlusPromptSel=1,e.audio.menuNav();else if(t===`Enter`||t===`Space`){if(e.transitioning)return;e.audio.menuConfirm(),e.ngPlusPromptSel===0?e.fadeTransition(()=>e.startNgPlus()):e.fadeTransition(()=>{e.ngPlusPrompt=!1,e.clearCampaignSave(),e.state=J.TITLE,e.audio.stopMusic(),e.audio.startTrack(`menu`),e.audio.startAmbient(`menu`)})}t===`KeyS`&&e._shareCurrentResult();return}if(t===`Enter`||t===`Space`){if(e.transitioning)return;e.audio.menuConfirm(),e.fadeTransition(()=>{e.state=J.TITLE,e.audio.stopMusic(),e.audio.startTrack(`menu`),e.audio.startAmbient(`menu`)})}if(t===`KeyR`&&e.state===J.GAME_OVER){if(e.transitioning)return;e.audio.menuConfirm(),e.fadeTransition(()=>{e.mode===`arena`?e.startArena():e.mode===`meltdown`?e.startMeltdown():e.mode===`campaign`&&e.startCampaign()})}t===`KeyS`&&e._shareCurrentResult();return}if(e.state===J.LEVEL_COMPLETE){if(t===`Enter`||t===`Space`){if(e.transitioning)return;e.audio.menuConfirm(),e.fadeTransition(()=>e.nextCampaignLevel())}return}if(e.state===J.CUTSCENE){if((t===`Enter`||t===`Space`)&&e.advanceCutsceneFrame(),t===`Escape`){let t=performance.now();if(t-e.lastEscTime<200)return;e.lastEscTime=t,e.endCutscene()}return}}}var fo=20,po=15,mo=3e3,ho=8e3,go=50,_o=2e3,vo=[],yo=[],bo=0,xo=0,So=0,Co=0,wo=!1;function Y(e,t){return e+Math.random()*(t-e)}function To(e,t,n){e.x=Math.random()*t,e.y=Math.random()*n,e.vx=Y(-8,8),e.vy=Y(-12,4),e.size=Y(1,2.5),e.alpha=Y(.15,.45),e.flicker=Math.random()*Math.PI*2,e.flickerSpeed=Y(2,6)}function Eo(e,t,n){e.x=Math.random()*t,e.y=n+Y(0,40),e.vy=Y(-25,-10),e.size=Y(1,3),e.alpha=Y(.2,.55),e.drift=Y(-6,6)}function Do(){if(!wo){wo=!0,vo=Array(fo);for(let e=0;e<fo;e++)vo[e]={x:0,y:0,vx:0,vy:0,size:1,alpha:.3,flicker:0,flickerSpeed:3};yo=Array(po);for(let e=0;e<po;e++)yo[e]={x:0,y:0,vy:-15,size:2,alpha:.3,drift:0}}}function Oo(e,t,n,r){if(wo||Do(),r.settings?.effectsQuality===0||(r.quality?.particleMultiplier??1)<.3)return;let i=r.campaign?.act||1,a=r.time||0,o=r.deltaTime||0;i===1?Ao(e,t,n,a,o):i===2?Mo(e,t,n,a,o):i===3&&(No(e,t,n,a),Po(e,t,n,a))}var ko=!1;function Ao(e,t,n,r,i){if(!ko){for(let e=0;e<fo;e++)To(vo[e],t,n);ko=!0}e.save();for(let r=0;r<fo;r++){let a=vo[r];a.x+=a.vx*i,a.y+=a.vy*i,a.flicker+=a.flickerSpeed*i,a.x<-4?a.x=t+2:a.x>t+4&&(a.x=-2),a.y<-4?a.y=n+2:a.y>n+4&&(a.y=-2);let o=.5+.5*Math.sin(a.flicker),s=a.alpha*o;if(s<.03)continue;let c=175+r%5*6;e.globalAlpha=s,e.fillStyle=`hsl(${c}, 90%, 65%)`,e.beginPath(),e.arc(a.x,a.y,a.size,0,Math.PI*2),e.fill()}e.restore()}var jo=!1;function Mo(e,t,n,r,i){if(!jo){for(let e=0;e<po;e++)Eo(yo[e],t,n);jo=!0}e.save();for(let a=0;a<po;a++){let o=yo[a];o.y+=o.vy*i,o.x+=o.drift*i,o.y<-10&&Eo(o,t,n);let s=.7+.3*Math.sin(r*.003+a*1.7),c=o.alpha*s;if(c<.03)continue;let l=25+a%4*8;e.globalAlpha=c,e.fillStyle=`hsl(${l}, 95%, 58%)`,e.beginPath(),e.arc(o.x,o.y,o.size,0,Math.PI*2),e.fill(),o.size>1.5&&(e.globalAlpha=c*.25,e.beginPath(),e.arc(o.x,o.y,o.size*2.5,0,Math.PI*2),e.fill())}e.restore()}function No(e,t,n,r){if(r>=bo&&(So=Y(t*.1,t*.9),Co=Y(n*.1,n*.9),xo=r+go,bo=r+Y(mo,ho)),r<xo){let t=1-(1-(xo-r)/go);e.save(),e.globalAlpha=.35*t;let n=Y(40,90),i=Y(0,Math.PI*2),a=So+Math.cos(i)*n,o=Co+Math.sin(i)*n;e.strokeStyle=`rgba(255, 255, 255, ${.8*t})`,e.lineWidth=2,e.shadowColor=`rgba(220, 40, 60, 0.6)`,e.shadowBlur=18,e.beginPath(),e.moveTo(So,Co);let s=(So+a)/2+Y(-12,12),c=(Co+o)/2+Y(-12,12);e.lineTo(s,c),e.lineTo(a,o),e.stroke();let l=i+Y(-.8,.8),u=n*.4;e.strokeStyle=`rgba(220, 60, 80, ${.5*t})`,e.lineWidth=1,e.beginPath(),e.moveTo(s,c),e.lineTo(s+Math.cos(l)*u,c+Math.sin(l)*u),e.stroke(),e.restore()}}function Po(e,t,n,r){let i=r%_o/_o,a=Math.sin(i*Math.PI)*.08;if(a<.005)return;e.save(),e.globalAlpha=a;let o=e.createLinearGradient(0,0,60,0);o.addColorStop(0,`rgba(180, 20, 30, 1)`),o.addColorStop(1,`rgba(180, 20, 30, 0)`),e.fillStyle=o,e.fillRect(0,0,60,n);let s=e.createLinearGradient(t,0,t-60,0);s.addColorStop(0,`rgba(180, 20, 30, 1)`),s.addColorStop(1,`rgba(180, 20, 30, 0)`),e.fillStyle=s,e.fillRect(t-60,0,60,n);let c=e.createLinearGradient(0,0,0,35);c.addColorStop(0,`rgba(180, 20, 30, 1)`),c.addColorStop(1,`rgba(180, 20, 30, 0)`),e.fillStyle=c,e.fillRect(0,0,t,35);let l=e.createLinearGradient(0,n,0,n-35);l.addColorStop(0,`rgba(180, 20, 30, 1)`),l.addColorStop(1,`rgba(180, 20, 30, 0)`),e.fillStyle=l,e.fillRect(0,n-35,t,35),e.restore()}function Fo(e){let t=e.renderer.ctx,n=e.renderer.width,r=e.renderer.height;if(e.state===J.TITLE||e.state===J.MODE_SELECT)return;if(e.state===J.CUTSCENE){e.hudCtx.clearRect(0,0,e.hudW,e.hudH),e.renderCutscene(t,n,r);return}if(e.state===J.CAMPAIGN_PROMPT){e.hudCtx.clearRect(0,0,e.hudW,e.hudH),e.renderCampaignPrompt(t,n,r);return}if(e.state===J.TUTORIAL_COMPLETE){e.hudCtx.clearRect(0,0,e.hudW,e.hudH),e.renderTutorialCompletionMenu(t,n,r);return}if(e.state===J.CHARACTER_CREATE){e.hudCtx.clearRect(0,0,e.hudW,e.hudH),e.renderCharacterCreator(t,n,r);return}if(e.state===J.STATS&&e._statsReturnToMenu){e.hudCtx.clearRect(0,0,e.hudW,e.hudH),e.renderStatsScreen(t,n,r);return}if(e.state===J.BUILDER){e.hudCtx.clearRect(0,0,e.hudW,e.hudH),e.builder.render(t,n,r,e.time),e._builderOnboardingDismissed||e._renderBuilderOnboarding(t,n,r);return}if(e.state===J.PAUSED&&e.pausedFromState===J.BUILDER){e.builder.render(t,n,r,e.time);let i=e.hudCtx,a=e.hudW,o=e.hudH;i.clearRect(0,0,a,o),e.renderPauseScreen(i,a,o);return}let i=0,a=0;if(e.settings.screenShake&&e.screenShake>.5){let t=Math.min(1,e.screenShake/14),n=t*t*14,r=e.time*.001;i=Math.sin(r*47.3)*n*.85,a=Math.sin(r*61.7)*n*.5-t*n*.45,e._shakeRoll=Math.sin(r*38.1)*t*t*.012}else e._shakeRoll=0;if(e.settings.weaponBob&&(e.player.isSprinting||e.player.isDashing)){let t=e.player.isDashing?6:3,n=e.player.weaponBob*1.1;i+=Math.sin(n)*t,a+=Math.sin(n*2)*t*.4}t.save(),t.translate(i,a),e._shakeRoll&&(t.translate(n/2,r/2),t.rotate(e._shakeRoll),t.translate(-n/2,-r/2));let o=e.player.cameraTilt||0;Math.abs(o)>.001&&(t.translate(n/2,r/2),t.rotate(o),t.translate(-n/2,-r/2));let s=!!e.showFPS,c=s?performance.now():0,l=e.player,u=(l.cameraPunch||0)*-r*.12,d=(l.isSliding?40:l.isCrouching?28:0)+u;dr(l,e.deltaTime);let f=lr(l,e.settings),p=Math.tan(f*.5*Math.PI/180),m=e.quality&&!e.quality.enableFloorTexture;e.map?.grid?(e.renderer.lights=e.lights||null,e.renderer.renderScene(e.player,e.map,e.entities,e.time,f,e.settings.viewMode,m,d)):(t.fillStyle=`#020610`,t.fillRect(0,0,n,r)),(e.quality?.particleMultiplier??1)>=.5&&e.dustMotes&&e.dustMotes.length>0&&e.renderer.renderParticles(e.player,e.dustMotes,e.time,p),e.tracers&&e.tracers.length>0&&e.renderer.renderTracers(e.player,e.tracers,p),t.restore(),s&&(e.profiler.currentPhases.raycast=performance.now()-c);let h=e.campaign?.act||1;if(e.map?.grid){let e=(r>>1)+d-40/2,i=h===2?`20,10,4`:h===3?`22,4,8`:`8,18,30`,a=t.createLinearGradient(0,e,0,e+40);a.addColorStop(0,`transparent`),a.addColorStop(.5,`rgba(${i},0.12)`),a.addColorStop(1,`transparent`),t.fillStyle=a,t.fillRect(0,e,n,40)}let g=s?performance.now():0;if(!e.quality||e.quality.enableVignette){if(!e._vignetteCanvas||e._vignetteW!==n||e._vignetteH!==r){e._vignetteCanvas=document.createElement(`canvas`),e._vignetteCanvas.width=n,e._vignetteCanvas.height=r;let t=e._vignetteCanvas.getContext(`2d`),i=t.createRadialGradient(n/2,r/2,r*.35,n/2,r/2,r*.9);i.addColorStop(0,`transparent`),i.addColorStop(1,`rgba(0,0,10,0.35)`),t.fillStyle=i,t.fillRect(0,0,n,r),e._vignetteW=n,e._vignetteH=r}t.drawImage(e._vignetteCanvas,0,0)}s&&(e.profiler.currentPhases.vignette=performance.now()-g);let _=s?performance.now():0;e.settings.viewMode===0&&e.drawWeapon(t,n,r),e.settings.viewMode===1&&e.drawThirdPersonModel(t,n,r),s&&(e.profiler.currentPhases.weapon=performance.now()-_),(e.quality?.particleMultiplier??1)>=.3&&Oo(t,n,r,e);let v=s?performance.now():0,y=e.renderer.glRenderer,b=e.settings.postProcessing!==!1;if(y&&b&&e.renderer.useWebGL){let i={1:[0,.157,.235],2:[.157,.098,0],3:[.157,0,.039]},a=i[h]||i[1];Lt(t,n,r,{time:e.time,muzzleFlashTime:e._muzzleFlashTime,muzzleFlashColor:e._muzzleFlashColor,player:e.player,glitchEffect:e.glitchEffect,canvas:e.canvas,postProcessing:e.settings.postProcessing,audio:e.audio,enableBloom:!1,enableChromaticAberration:!1,enableFilmGrain:!1,act:h});try{y.renderPostFXFromCanvas(e.canvas,e.time,e.settings.enableBloom!==!1,e.settings.enableChromaticAberration!==!1,e.settings.enableFilmGrain!==!1,a),t.drawImage(y.canvas,0,0)}catch{}}else Lt(t,n,r,{time:e.time,muzzleFlashTime:e._muzzleFlashTime,muzzleFlashColor:e._muzzleFlashColor,player:e.player,glitchEffect:e.glitchEffect,canvas:e.canvas,postProcessing:e.settings.postProcessing,audio:e.audio,enableBloom:e.settings.enableBloom,enableChromaticAberration:e.settings.enableChromaticAberration,enableFilmGrain:e.settings.enableFilmGrain,act:h});s&&(e.profiler.currentPhases.effects=performance.now()-v);let x=s?performance.now():0;e.renderHUD(),e.mode===`tutorial`&&e.renderTutorialOverlay(t,n,r),s&&(e.profiler.currentPhases.hud=performance.now()-x);let S=s?performance.now():0,C=e.hudCtx,w=e.hudW,T=e.hudH;e.state===J.PAUSED&&e.renderPauseScreen(C,w,T),e.state===J.SETTINGS&&e.renderSettingsScreen(C,w,T),e.state===J.HUD_EDITOR&&e.hudEditor.render(C,w,T),e.state===J.CONTROLS&&e.renderControlsScreen(C,w,T),e.state===J.ACHIEVEMENTS&&e.renderAchievementsScreen(C,w,T),e.state===J.STATS&&e.renderStatsScreen(C,w,T),e.state===J.UPGRADE&&e.renderUpgradeScreen(C,w,T),e.state===J.GAME_OVER&&e.renderGameOver(C,w,T),e.state===J.VICTORY&&e.renderVictory(C,w,T),e.state===J.LEVEL_COMPLETE&&e.renderLevelComplete(C,w,T),s&&(e.profiler.currentPhases.overlays=performance.now()-S)}function Io(e,t){let n=e.canvas.getBoundingClientRect(),r=e.canvas.width/n.width,i=e.canvas.height/n.height,a=(t.clientX-n.left)*r,o=(t.clientY-n.top)*i,s=e.canvas.width,c=e.canvas.height,l=e.isTouchDevice&&s<700,u=eo,d=to(s,c,l);if(o>=d.tabY&&o<=d.tabY+d.tabH)for(let t=0;t<u.length;t++){let n=d.tabX0+t*(d.tabW+d.tabGap);if(a>=n&&a<=n+d.tabW){e.creatorCategory=t,e.audio.menuSelect();return}}let f=e.creatorCategory;if(f===0)return;let p=u[f],m=p.data;if(!m)return;let h=Math.min(m.length,l?d.maxBySpace:8),g=e.character[p.key],_=0;if(g>=h&&(_=g-h+1),a>=d.contentX&&a<=d.contentX+d.listW)for(let t=0;t<h;t++){let n=t+_;if(n>=m.length)break;let r=d.contentY+8+t*d.itemH;if(o>=r&&o<=r+d.itemH){if(p.name===`LOADOUT`&&m[n].unlocked===!1)return;e.character[p.key]=n;return}}}function Lo(e,t){if(e.transitioning)return;let n=e.canvas.getBoundingClientRect(),r=(t.clientX-n.left)*(e.canvas.width/n.width),i=(t.clientY-n.top)*(e.canvas.height/n.height),a=e.canvas.width,o=e.canvas.height,s=e.isTouchDevice&&K(o);if(e.ngPlusPrompt&&e.mode===`campaign`){let t=s?o*.78:o/2+170,n=s?140:220,c=s?44:56,l=s?12:20,u=2*n+l,d=a/2-u/2;if(i>=t&&i<=t+c)for(let t=0;t<2;t++){let i=d+t*(n+l);if(r>=i&&r<=i+n){e.audio.menuConfirm(),t===0?e.fadeTransition(()=>e.startNgPlus()):e.fadeTransition(()=>{e.ngPlusPrompt=!1,e.clearCampaignSave(),e.state=J.TITLE,e.audio.stopMusic(),e.audio.startTrack(`menu`),e.audio.startAmbient(`menu`)});return}}return}e.audio.menuConfirm(),e.fadeTransition(()=>{e.state=J.TITLE,e.audio.stopMusic(),e.audio.startTrack(`menu`),e.audio.startAmbient(`menu`)})}function Ro(e,t){let n=e.canvas.getBoundingClientRect(),r=(t.clientX-n.left)*(e.canvas.width/n.width),i=(t.clientY-n.top)*(e.canvas.height/n.height),a=e.canvas.width,o=e.canvas.height,s=e.isTouchDevice&&K(o),c=s?36:52,l=s?90:160,u=l+1,d=a-u-12,f=c+8,p=s?28:38,m=Math.min(d*.55,240),h=mn(e.isTouchDevice,e.settings),g=pn(e.isTouchDevice,e.settingsCategory,e.settings);if(r<l&&i>c){let t=o-32;if(i>=t-14&&i<t+10){e.handleKeyPress(`Escape`);return}let n=Math.floor((i-f)/p);n>=0&&n<h.length&&(e.settingsCategory=h[n],e.settingsSelection=0,e.audio.menuSelect());return}if(r>=u&&r<=u+d&&i>=f){let t=f;for(let n=0;n<g.length;n++){let a=g[n],o=s?a.height.compact:a.height.normal;if(i>=t&&i<t+o){if(e.settingsSelection=n,a.type===`slider`&&a.barColor){let n=t+(s?20:28),o=u+(s?8:14),c=Math.min(d-(s?16:28),m);if(i>=n-4&&i<=n+6+4&&r>=o&&r<=o+c){let t=Math.max(0,Math.min(1,(r-o)/c)),n=a.min+t*(a.max-a.min);n=Math.round(n/a.step)*a.step,n=Math.max(a.min,Math.min(a.max,n)),a.round!=null&&(n=Math.round(n*10**a.round)/10**a.round),e.settings[a.key]=n,a.onChange&&a.onChange(e),e.saveSettings(),e.audio.menuConfirm();return}}if(a.type===`action`){a.onClick&&(a.onClick(e),e.audio.menuConfirm());return}r<u+d/2?e.handleKeyPress(`ArrowLeft`):e.handleKeyPress(`ArrowRight`);return}t+=o}i>t&&e.handleKeyPress(`Escape`)}}function zo(e,t){if(e.transitioning)return;let n=e.canvas.getBoundingClientRect(),r=t.clientX-n.left,i=t.clientY-n.top,a=e._gameOverBtns;if(!a)return;let{btnBaseX:o,btnY:s,btnW:c,btnH:l,btnGap:u}=a;if(i>=s&&i<=s+l)for(let t=0;t<3;t++){let n=o+t*(c+u);if(r>=n&&r<=n+c){t===0?(e.audio.menuConfirm(),e.fadeTransition(()=>{e.mode===`arena`?e.startArena():e.mode===`meltdown`?e.startMeltdown():e.mode===`campaign`&&e.startCampaign()})):t===1?(e.audio.menuConfirm(),e.fadeTransition(()=>{e.state=J.TITLE,e.audio.stopMusic(),e.audio.startTrack(`menu`),e.audio.startAmbient(`menu`)})):t===2&&e._shareCurrentResult();return}}}var Bo={ammo:{x:.1,y:.8},health:{x:.3,y:.8},shield:{x:.7,y:.8},weapons:{x:.9,y:.8},portrait:{x:.5,y:.8}},Vo=class{constructor(e){this.game=e,this.layout=null,this.dragging=null,this.dragOffsetX=0,this.dragOffsetY=0}start(){this.game.state=J.HUD_EDITOR;try{let e=localStorage.getItem(`cc_custom_hud`);e?this.layout=JSON.parse(e):this.layout=structuredClone(Bo)}catch{this.layout=structuredClone(Bo)}this.game.settings.customHudLayout=this.layout}save(){localStorage.setItem(`cc_custom_hud`,JSON.stringify(this.layout)),this.game.settings.customHudLayout=this.layout}stop(){this.save(),this.game.state=J.SETTINGS,this.dragging=null}update(e,t,n,r){let i=this.game.canvas.width,a=this.game.canvas.height;if(!r&&this.dragging&&(this.dragging=null,this.save()),this.dragging){let e=(t-this.dragOffsetX)/i,r=(n-this.dragOffsetY)/a;this.layout[this.dragging].x=Math.max(0,Math.min(1,e)),this.layout[this.dragging].y=Math.max(0,Math.min(1,r))}else if(r)for(let[e,r]of Object.entries(this.layout)){let o=r.x*i,s=r.y*a,c=t-o,l=n-s;if(Math.sqrt(c*c+l*l)<50){this.dragging=e,this.dragOffsetX=c,this.dragOffsetY=l;break}}}render(e,t,n){e.fillStyle=`rgba(0,0,0,0.4)`,e.fillRect(0,0,t,n),e.fillStyle=`#ffffff`,e.font=`bold 24px monospace`,e.textAlign=`center`,e.fillText(`HUD EDITOR`,t/2,40),e.font=`14px monospace`,e.fillStyle=`#aaaaaa`,e.fillText(`Drag elements to position. Press ESC to save and return.`,t/2,64);for(let[r,i]of Object.entries(this.layout)){let a=i.x*t,o=i.y*n,s=this.dragging===r;e.strokeStyle=s?`#00ffcc`:`rgba(255,255,255,0.4)`,e.lineWidth=s?3:1,e.beginPath(),e.arc(a,o,40,0,Math.PI*2),e.stroke(),e.fillStyle=s?`#00ffcc`:`rgba(255,255,255,0.8)`,e.font=`bold 12px monospace`,e.textAlign=`center`,e.fillText(r.toUpperCase(),a,o+4)}}};function Ho(e){jn(e.settings),e.input.saveKeybinds()}function Uo(e){Mn(e.settings)}function Wo(e){In(e.character)}function Go(e){Ln(e.character)}function Ko(e){e.achievementSystem.save()}function qo(e){e.achievementSystem.load()}function Jo(e){Bn(e.arenaRound,e.player,e.upgradeLevels,e.settings.difficulty)}function Yo(e){let t=Vn();return t?(e.mode=`arena`,e.arenaRound=t.round,e.player.reset(),e.player.deserialize(t),e.upgradeLevels=t.upgradeLevels||{},e.settings.difficulty=t.difficulty??e.settings.difficulty,e.startArenaRound(),!0):!1}function Xo(){Hn()}function Zo(e){e.campaign.save()}function Qo(e){return e.campaign.load()}function $o(e){e.campaign.clearSave()}function es(e){e.campaign.startNgPlus()}function ts(...e){return Nn(...e)}function ns(...e){return Pn(...e)}function rs(...e){return Fn(...e)}function is(...e){return Kn(...e)}function as(...e){return qn(...e)}var os=`modulepreload`,ss=function(e){return`/clockwork_carnage/`+e},cs={},ls=function(e,t,n){let r=Promise.resolve();if(t&&t.length>0){let e=document.getElementsByTagName(`link`),i=document.querySelector(`meta[property=csp-nonce]`),a=i?.nonce||i?.getAttribute(`nonce`);function o(e){return Promise.all(e.map(e=>Promise.resolve(e).then(e=>({status:`fulfilled`,value:e}),e=>({status:`rejected`,reason:e}))))}r=o(t.map(t=>{if(t=ss(t,n),t in cs)return;cs[t]=!0;let r=t.endsWith(`.css`),i=r?`[rel="stylesheet"]`:``;if(n)for(let n=e.length-1;n>=0;n--){let i=e[n];if(i.href===t&&(!r||i.rel===`stylesheet`))return}else if(document.querySelector(`link[href="${t}"]${i}`))return;let o=document.createElement(`link`);if(o.rel=r?`stylesheet`:os,r||(o.as=`script`),o.crossOrigin=``,o.href=t,a&&o.setAttribute(`nonce`,a),document.head.appendChild(o),r)return new Promise((e,n)=>{o.addEventListener(`load`,e),o.addEventListener(`error`,()=>n(Error(`Unable to preload CSS for ${t}`)))})}))}function i(e){let t=new Event(`vite:preloadError`,{cancelable:!0});if(t.payload=e,window.dispatchEvent(t),!t.defaultPrevented)throw e}return r.then(t=>{for(let e of t||[])e.status===`rejected`&&i(e.reason);return e().catch(i)})},us=`0.8.1`,ds=null,fs=null,ps=null,ms=new Map;function hs(e,t){try{t()}catch{performance.now(),ms.get(e)}}var gs=class{constructor(e,t){this.canvas=e,this.hudCanvas=t,this.hudCtx=t.getContext(`2d`),this.dpr=1,this.hudW=t.width,this.hudH=t.height,this.renderer=new It(e,0),this.audio=new Zt,this.cutsceneEngine=null,this.player=new nn,this.entities=[],this.entityGrid=new io(2),this.dustMotes=null,this.projectiles=[],this._chronoBombs=[],this.map=null,this._stateManager=new so(J.TITLE),this.assetEditor=new se(this),this.mode=null,this.meltdown=null,this.time=0,this.deltaTime=0,this.lastFrameTime=0,this.arenaTimer=60,this.arenaRound=1,this.particleSystem=null,this.killStreakSystem=new wn(this),this.ariaComms=new Tn(this),this.squadComms=new On(this),this.achievementSystem=new Qn(this),this.tutorial=new lo(this),this.campaign=new co(this),this.hudEditor=new Vo(this),this.isTouchDevice=ao(),this.menuSelection=0,this.upgradeSelection=0,this.upgradeLevels={},this._meltdownUpgradeChoices=null,this._meltdownUpgradeSel=0,this._builderOnboardingDismissed=!1,this.transitioning=!1,this.transitionAlpha=0,this._transitionCallback=null,this._transitionDir=0,this._transitionSpeed=2.5,this.screenShake=0,this.hitStopFrames=0,this.killedEnemies=0,this.totalEnemies=0,this.fps=0,this.frameCount=0,this.fpsTime=0,this.showFPS=!1,this.profiler=new ln,this.glitchEffect=0,this.hitMarker=0,this.damageNumbers=[],this.tracers=[],this.lights=[],Object.defineProperties(this,{killStreak:{get(){return this.killStreakSystem.streak},set(e){this.killStreakSystem.streak=e}},killStreakTimer:{get(){return this.killStreakSystem.timer},set(e){this.killStreakSystem.timer=e}},killStreakDisplay:{get(){return this.killStreakSystem.display},set(e){this.killStreakSystem.display=e}},bestStreak:{get(){return this.killStreakSystem.best},set(e){this.killStreakSystem.best=e}}}),this.timeScale=1,this.slowMoTimer=0,this.shotsFired=0,this.shotsHit=0,this.exitEntity=null,this.weaponAnimFrame=0,this.weaponAnimTime=0,this.roundStartTime=0,this.deathTimer=0,this.pauseSaveFlash=0,this.settings={crosshair:0,difficulty:1,cutsceneAutoAdvance:!1,minimapSize:200,musicVolume:80,sfxVolume:80,sensitivity:1,fov:70,viewMode:0,invertX:!1,invertY:!1,fontScale:100,colorblind:0,visualStyle:0,hudStyle:0,hudScale:100,staminaBarSize:100,showPortrait:!0,showWeapons:!0,showKills:!0,showScore:!0,touchSensitivity:2,haptics:!0,autoFire:!1,swipeWeapons:!0,graphicsPreset:0,frameTarget:0,batterySaver:!1,renderScale:100,effectsQuality:2,postProcessing:!0,floorTexture:!0,screenShake:!0,weaponBob:!0,showPerformanceOverlay:!1,enableBloom:!0,enableChromaticAberration:!0,enableFilmGrain:!0,shadowQuality:2,lightingQuality:2,renderMode:0,gamepadEnabled:!0,gamepadLookSensitivity:2.5,gamepadDeadzone:.15,gamepadRumble:!0},this.settingsSelection=0,this.settingsCategory=`Gameplay`,this.lastEscTime=0,this._settingsMouseX=-1,this._settingsMouseY=-1,document.addEventListener(`mousemove`,e=>{if(this.state!==J.SETTINGS){this.canvas.style.cursor===`pointer`&&(this.canvas.style.cursor=``);return}let t=this.canvas.getBoundingClientRect(),n=(e.clientX-t.left)*(this.canvas.width/t.width),r=(e.clientY-t.top)*(this.canvas.height/t.height);this._settingsMouseX=n,this._settingsMouseY=r;let i=this.isTouchDevice&&K(this.canvas.height),a=i?36:52,o=i?90:160,s=n<o&&r>a,c=n>=o+1&&r>a+8;this.canvas.style.cursor=s||c?`pointer`:``}),window.addEventListener(`hashchange`,()=>this._handleHashChange()),this._handleHashChange(),this.input=new we({canvas:this.canvas,onKeyDown:(e,t)=>this._inputKeyDown(e,t),onKeyUp:e=>{},onDashTrigger:e=>this.triggerDash(e),onMouseDown:e=>this._inputMouseDown(e),onMouseUp:e=>{e.button===0&&(this.player.isFiring=!1),e.button===2&&(this.player.isAiming=!1)},onWheel:e=>this._inputWheel(e),onLockChange:(e,t)=>this._inputLockChange(e,t),getState:()=>this.state,playingState:J.PLAYING}),this.keys=this.input.keys,this.mouse=this.input.mouse,this.keybinds=this.input.keybinds,this.gamepad=new De,this._gamepadPrevKeys=new Set,this._lastGamepadMove={x:0,y:0},this.applyGamepadSettings(),this._prevCrouchKey=!1,this.playerUpdateSystem=new _r,this.aiSystem=new vr,this.controlsSelection=0,this.rebindingKey=null,this.builder=null,this._builderOpts={renderer:this.renderer,audio:this.audio,settings:this.settings,keybinds:this.keybinds,canvas:this.canvas},this.alwaysShowTutorial=!1,this._vignetteCanvas=null,this._vignetteW=0,this._vignetteH=0,this._scanlinePattern=null,this._scanlinePatternDense=null,Object.defineProperties(this,{unlockedAchievements:{get(){return this.achievementSystem.unlockedAchievements},set(e){this.achievementSystem.unlockedAchievements=e}},achievementQueue:{get(){return this.achievementSystem.achievementQueue},set(e){this.achievementSystem.achievementQueue=e}},achievementToast:{get(){return this.achievementSystem.achievementToast},set(e){this.achievementSystem.achievementToast=e}},achievementIcons:{get(){return this.achievementSystem.achievementIcons},set(e){this.achievementSystem.achievementIcons=e}},achievementStats:{get(){return this.achievementSystem.achievementStats},set(e){this.achievementSystem.achievementStats=e}},roundDamageTaken:{get(){return this.achievementSystem.roundDamageTaken},set(e){this.achievementSystem.roundDamageTaken=e}},achievementsScroll:{get(){return this.achievementSystem.achievementsScroll},set(e){this.achievementSystem.achievementsScroll=e}}}),Object.defineProperties(this,{ariaQueue:{get(){return this.ariaComms.queue},set(e){this.ariaComms.queue=e}},ariaMessage:{get(){return this.ariaComms.message},set(e){this.ariaComms.message=e}},ariaTriggered:{get(){return this.ariaComms.triggered},set(e){this.ariaComms.triggered=e}},ariaEnabled:{get(){return this.ariaComms.enabled},set(e){this.ariaComms.enabled=e}},ariaIdleTimer:{get(){return this.ariaComms.idleTimer},set(e){this.ariaComms.idleTimer=e}},ariaIdleThreshold:{get(){return this.ariaComms.idleThreshold},set(e){this.ariaComms.idleThreshold=e}},ariaCombatTimer:{get(){return this.ariaComms.combatTimer},set(e){this.ariaComms.combatTimer=e}},ariaMessageLog:{get(){return this.ariaComms.messageLog},set(e){this.ariaComms.messageLog=e}},showAriaLog:{get(){return this.ariaComms.showLog},set(e){this.ariaComms.showLog=e}},ariaLogScroll:{get(){return this.ariaComms.logScroll},set(e){this.ariaComms.logScroll=e}}}),this.character={...p},this.creatorCategory=0,this.creatorCategoryCount=eo.length,this.creatorReturnState=null,this._creatorSaveCallback=null,this.setupInput(),this.isTouchDevice&&(this.settings.fov=100,this.settings.hudScale=75),this.loadSettings(),this._applyMobileMigration(),this.applyGamepadSettings(),this.applyPerformanceSettings(),this.loadDevFlags(),this.showFPS=!!this.settings.showPerformanceOverlay,this.loadAchievements(),this.loadCharacter(),this.renderer.applyVisualStyle(this.settings.visualStyle)}get state(){return this._stateManager.current}set state(e){this._stateManager.transition(e)}get pausedFromState(){return this._stateManager.pausedFrom}get campaignLevel(){return this.campaign.level}set campaignLevel(e){this.campaign.level=e}get campaignAct(){return this.campaign.act}set campaignAct(e){this.campaign.act=e}get ngPlusCycle(){return this.campaign.ngPlusCycle}set ngPlusCycle(e){this.campaign.ngPlusCycle=e}get ngPlusPrompt(){return this.campaign.ngPlusPrompt}set ngPlusPrompt(e){this.campaign.ngPlusPrompt=e}get ngPlusPromptSel(){return this.campaign.ngPlusPromptSel}set ngPlusPromptSel(e){this.campaign.ngPlusPromptSel=e}get campaignMissedWeapons(){return this.campaign.missedWeapons}set campaignMissedWeapons(e){this.campaign.missedWeapons=e}get campaignPromptSelection(){return this.campaign.promptSelection}set campaignPromptSelection(e){this.campaign.promptSelection=e}get tutorialStep(){return this.tutorial.step}set tutorialStep(e){this.tutorial.step=e}get tutorialStepTime(){return this.tutorial.stepTime}set tutorialStepTime(e){this.tutorial.stepTime=e}get tutorialMenuSelection(){return this.tutorial.menuSelection}set tutorialMenuSelection(e){this.tutorial.menuSelection=e}get tutorialShowCompletionMenu(){return this.tutorial.showCompletionMenu}set tutorialShowCompletionMenu(e){this.tutorial.showCompletionMenu=e}get tutorialPickedUp(){return this.tutorial.pickedUp}set tutorialPickedUp(e){this.tutorial.pickedUp=e}get tutorialWeaponPickedUp(){return this.tutorial.weaponPickedUp}set tutorialWeaponPickedUp(e){this.tutorial.weaponPickedUp=e}get tutorialWeaponSwapped(){return this.tutorial.weaponSwapped}set tutorialWeaponSwapped(e){this.tutorial.weaponSwapped=e}get tutorialSecondWeaponPickedUp(){return this.tutorial.secondWeaponPickedUp}set tutorialSecondWeaponPickedUp(e){this.tutorial.secondWeaponPickedUp=e}get tutorialDoorOpened(){return this.tutorial.doorOpened}set tutorialDoorOpened(e){this.tutorial.doorOpened=e}get tutorialDashed(){return this.tutorial.dashed}set tutorialDashed(e){this.tutorial.dashed=e}get tutorialCrouched(){return this.tutorial.crouched}set tutorialCrouched(e){this.tutorial.crouched=e}get tutorialSlid(){return this.tutorial.slid}set tutorialSlid(e){this.tutorial.slid=e}get tutorialFired(){return this.tutorial.fired}set tutorialFired(e){this.tutorial.fired=e}get tutorialChronoUsed(){return this.tutorial.chronoUsed}set tutorialChronoUsed(e){this.tutorial.chronoUsed=e}set pausedFromState(e){this._stateManager._pausedFrom=e}pauseGame(e){this.player.isAiming=!1,this.player.isFiring=!1,this._stateManager.pause(e??this.state),this.unlockPointer()}resumeGame(){this._stateManager.resume(),this.lockPointer()}lockPointer(){this.isTouchDevice||e(this.canvas)}unlockPointer(){this.isTouchDevice||n()}scaledFont(e,t=``){let n=Math.round(e*(this.settings.fontScale/100));return`${t?t+` `:``}${n}px monospace`}cbColor(e){let t=this.settings.colorblind;if(!t)return e;let n=e.toLowerCase();if(t===1||t===2){if(n===`#ff2200`||n===`#ff4400`||n===`#ff4444`||n===`#ff0000`)return`#ff8800`;if(n===`#00ff66`||n===`#44ff44`||n===`#00ff00`||n===`#00cc44`)return`#00ccff`;if(n===`#ff8866`)return`#ffbb44`}if(t===3){if(n===`#00ccff`||n===`#00ddff`||n===`#00ffcc`)return`#ff88cc`;if(n===`#ffcc00`||n===`#ffaa00`)return`#ff8844`}return e}setupInput(){this.input.loadKeybinds()}_inputKeyDown(e,t){if(!(this.state===J.BUILDER&&(!this._builderOnboardingDismissed&&(this._builderOnboardingDismissed=!0,t.code!==`Escape`)||this.builder&&this.builder.handleKeyDown(t)))){if(this.state===J.CONTROLS&&this.rebindingKey){if(t.preventDefault(),t.code!==`Escape`){let{swappedAction:e}=this.input.rebind(this.rebindingKey,t.code);e&&(this._keybindSwapFlash={action:e,time:performance.now()}),this.saveSettings()}this.rebindingKey=null;return}if(t.code===`Tab`&&this.state===J.CHARACTER_CREATE&&(t.preventDefault(),this.closeCharacterCreator()),t.code===`Escape`&&this.state===J.HUD_EDITOR){t.preventDefault(),this.hudEditor.stop();return}t.code===`Escape`&&(this.state===J.MODE_SELECT||this.state===J.TUTORIAL_COMPLETE)&&performance.now()-(this._creatorExitTime||0)<100&&t.stopImmediatePropagation(),this.handleKeyPress(t.code,t)}}_inputMouseDown(e){if(this.state===J.CUTSCENE&&e.button===0){this.advanceCutsceneFrame();return}if(this.state!==J.SETTINGS){if(this.state===J.HUD_EDITOR){let e=this.canvas.getBoundingClientRect();this.settings.quality?.stableScale||this.settings.quality?.renderScale;let t=(this.mouse.x-e.left)*(this.canvas.width/e.width),n=(this.mouse.y-e.top)*(this.canvas.height/e.height);this.hudEditor.update(this.deltaTime,t,n,this.input.isDown(`interact`)||this.mouse.down);return}if(this.state===J.CHARACTER_CREATE&&e.button===0){this._handleCreatorClick(e);return}if(this.state===J.GAME_OVER&&e.button===0){this._handleGameOverClick(e);return}if(this.state===J.VICTORY&&e.button===0){this._handleVictoryClick(e);return}if(this.state===J.LEVEL_COMPLETE&&e.button===0){if(this.transitioning)return;this.audio.menuConfirm(),this.fadeTransition(()=>this.nextCampaignLevel());return}if(this.state===J.BUILDER){if(!this._builderOnboardingDismissed){this._builderOnboardingDismissed=!0;return}if(this.builder&&!this.mouse.locked&&!this.builder.overhead){this.lockPointer();return}this.builder?.handleMouseDown(e.button);return}e.button===0?(this.state===J.PLAYING&&(this.player.isFiring=!0),!this.mouse.locked&&this.state===J.PLAYING&&this.lockPointer()):e.button===2&&this.state===J.PLAYING&&(this.player.isAiming=!0,this.mouse.locked||this.lockPointer())}}_inputWheel(e){if(this.state===J.SETTINGS){let t=pn(this.isTouchDevice,this.settingsCategory,this.settings);if(!t.length)return;let n=e>0?1:-1;this.settingsSelection=(this.settingsSelection+n+t.length)%t.length,this.audio.menuSelect();return}if(this.state!==J.PLAYING)return;let t=this.player.weapons.length;if(t<=1)return;let n=e>0?1:-1;this.player.currentWeapon=(this.player.currentWeapon+n+t)%t}_inputLockChange(e,t){this.isTouchDevice||t&&!e&&this.state===J.PLAYING&&(this.player.isAiming=!1,this.player.isFiring=!1,performance.now()-this.lastEscTime>200&&this.pauseGame(J.PLAYING))}handleKeyPress(e,t){uo(this,e,t)}_setGamepadKey(e,t,n){t&&(n.add(e),this._gamepadPrevKeys.has(e)||this.handleKeyPress(e,{code:e,key:e})),this.keys[e]=!!t}_updateGamepadInput(e){if(!this.gamepad||!this.settings.gamepadEnabled)return;let t=this.gamepad.poll();if(!t.connected)return;let n=new Set,r=t.moveX,i=t.moveY;if(this._lastGamepadMove=Math.abs(r)>.05||Math.abs(i)>.05?{x:r,y:i}:this._lastGamepadMove,this._setGamepadKey(this.keybinds.moveForward,i<-.25,n),this._setGamepadKey(this.keybinds.moveBack,i>.25,n),this._setGamepadKey(this.keybinds.moveLeft,r<-.25,n),this._setGamepadKey(this.keybinds.moveRight,r>.25,n),this._setGamepadKey(this.keybinds.sprint,t.sprint,n),this._setGamepadKey(this.keybinds.crouch,t.reload,n),this._setGamepadKey(this.keybinds.chronoShift,t.chronoShift,n),this.state===J.TITLE&&t.justPressed.interact&&document.dispatchEvent(new KeyboardEvent(`keydown`,{code:`GamepadStart`,bubbles:!0})),this.state===J.MODE_SELECT&&(t.justPressed.dpadUp&&document.dispatchEvent(new KeyboardEvent(`keydown`,{code:`ArrowUp`,bubbles:!0})),t.justPressed.dpadDown&&document.dispatchEvent(new KeyboardEvent(`keydown`,{code:`ArrowDown`,bubbles:!0})),t.justPressed.interact&&document.dispatchEvent(new KeyboardEvent(`keydown`,{code:`Enter`,bubbles:!0})),(t.justPressed.pause||t.justPressed.dash)&&document.getElementById(`btnBack`)?.click()),this.state===J.PLAYING){if(this.player.isFiring=t.shoot,this.player.isAiming=t.aim,(t.aim||t.shoot||t.lookX||t.lookY)&&(this.lastInputWasGamepad=!0),t.lookX||t.lookY){let n=420*e;this.mouse.dx+=t.lookX*n,this.mouse.dy+=t.lookY*n}if(t.justPressed.dash){let e=Math.cos(this.player.angle),t=Math.sin(this.player.angle),n=this._lastGamepadMove.x||0,r=this._lastGamepadMove.y||-1,i=e*-r+t*n,a=t*-r-e*n;this.triggerDash(this.keybinds.moveForward,i,a),this.gamepad.vibrateLight()}t.justPressed.interact&&this.interact(),(t.justPressed.weaponNext||t.justPressed.dpadRight)&&this._inputWheel(1),(t.justPressed.weaponPrev||t.justPressed.dpadLeft)&&this._inputWheel(-1),t.justPressed.pause&&this.handleKeyPress(this.keybinds.pause)}else t.justPressed.dpadUp&&this.handleKeyPress(`ArrowUp`),t.justPressed.dpadDown&&this.handleKeyPress(`ArrowDown`),t.justPressed.dpadLeft&&this.handleKeyPress(`ArrowLeft`),t.justPressed.dpadRight&&this.handleKeyPress(`ArrowRight`),t.justPressed.interact&&this.handleKeyPress(`Enter`),(t.justPressed.pause||t.justPressed.dash)&&this.handleKeyPress(`Escape`),t.justPressed.weaponPrev&&this.handleKeyPress(`KeyQ`),t.justPressed.weaponNext&&this.handleKeyPress(`KeyE`);for(let e of this._gamepadPrevKeys)n.has(e)||(this.keys[e]=!1);this._gamepadPrevKeys=n}applyAudioSettings(){this.audio.setMusicVolume(this.settings.musicVolume/100),this.audio.setSfxVolume(this.settings.sfxVolume/100)}saveSettings(){Ho(this)}loadSettings(){Uo(this)}applyGamepadSettings(){this.gamepad&&this.gamepad.updateSettings({enabled:this.settings.gamepadEnabled,deadzone:this.settings.gamepadDeadzone,lookSensitivity:this.settings.gamepadLookSensitivity,vibrationEnabled:this.settings.gamepadRumble,invertLookY:this.settings.invertY})}applyPerformanceSettings(){if(!this.quality)return;let e=this.quality.renderScale,t=[`auto`,`ultra-low`,`low`,`medium`,`high`,`ultra`,`custom`][this.settings.graphicsPreset]||`auto`,n={"ultra-low":.15,low:.3,medium:.5,high:.8,ultra:1},r=[55,30,60,90,120];this.quality.targetFPS=this.settings.batterySaver?30:r[this.settings.frameTarget]||55,this.quality.maxScale=this.settings.batterySaver?Math.min(this.quality.maxScale,.7):1,t===`auto`?(this.quality.useAuto(),this.settings.batterySaver&&this.quality.renderScale>this.quality.maxScale&&(this.quality.renderScale=this.quality.stableScale=this.quality.maxScale)):t!==`custom`&&this.quality.applyPreset(t);let i=[.3,.6,1][this.settings.effectsQuality]??1;if(t===`auto`){let e=this.quality.renderScale,t=e<.6,n=e<.8;this.quality.particleMultiplier=(t?.3:n?.5:1)*i*(this.settings.batterySaver?.6:1),this.quality.drawDistance=t?10:n?14:20,this.quality.enableScanlines=this.settings.postProcessing&&!n,this.quality.enableVignette=this.settings.postProcessing&&!t,this.quality.enableFloorTexture=this.settings.floorTexture&&!t}else{let e=t===`custom`,r=t===`custom`?1:n[t]??1;this.quality.applyCustom({renderScale:Math.min(e?this.settings.renderScale/100:this.quality.renderScale,this.quality.maxScale),particleMultiplier:r*i*(this.settings.batterySaver?.6:1),enableVignette:this.settings.postProcessing&&!this.settings.batterySaver,enableScanlines:this.settings.postProcessing&&!this.settings.batterySaver,enableFloorTexture:this.settings.floorTexture})}this.settings.batterySaver&&(this.settings.enableBloom=!1,this.settings.enableChromaticAberration=!1),this.quality.stableScale=this.quality.renderScale,Math.abs(e-this.quality.renderScale)>.001&&window.dispatchEvent(new CustomEvent(`cc-quality-change`))}_applyMobileMigration(){ts(this.isTouchDevice,this.settings,()=>this.saveSettings())}loadDevFlags(){this.alwaysShowTutorial=ns()}saveCharacter(){Wo(this)}loadCharacter(){Go(this)}setAlwaysTutorial(e){this.alwaysShowTutorial=e,rs(e)}saveAchievements(){Ko(this)}loadAchievements(){qo(this)}unlockAchievement(e){this.achievementSystem.unlockAchievement(e)}checkAchievements(){this.achievementSystem.checkAchievements(this.player.score)}updateAchievementToast(e){this.achievementSystem.updateToast(e).playSound&&this.audio.pickup()}renderAchievementToast(e,t,n){this.achievementSystem.renderToast(e,t,n)}queueAriaMessage(e){this.ariaComms.queueMessage(e,this.arenaRound)}triggerAriaOnce(e,t){this.ariaComms.triggerOnce(e,t,this.arenaRound)}updateAriaComms(e){this.ariaComms.update(e,this.state===J.PLAYING),this.squadComms.update(e)}renderAriaComms(e,t,n){this.ariaComms.renderMessage(e,t,n,this.character.name,this.isTouchDevice)}saveArena(){Jo(this)}loadArena(){return Yo(this)}clearArenaSave(){Xo(this)}saveCampaign(){Zo(this)}loadCampaignSave(){return Qo(this)}clearCampaignSave(){$o(this)}startNgPlus(){es(this)}hasSave(){return is()}getSaveInfo(){return as()}getAssetMetadata(e){if(e===`enemies`)return m;if(e===`weapons`){let e={};return s.forEach(t=>e[t.name]=t),e}return{}}getAssetConfig(e,t){return e===`enemies`?m[t]:e===`weapons`?s.find(e=>e.name===t):null}updateAssetLive(e,t,n,r){let i=this.getAssetConfig(e,t);i&&(i[n]=r)}getDifficultyMultipliers(){return Cr(this.settings.difficulty)}startArena(){this.mode=`arena`,this.arenaRound=1,this.achievementStats.totalGamesPlayed++,this.player.reset(),this.applyLoadoutBonuses(),this.upgradeLevels={},this.ariaEnabled=!0,this.ariaTriggered={},this.queueAriaMessage(`arenaStart`),this.queueAriaMessage(`arenaIntro`),this.startArenaRound()}async _ensureMeltdown(){this.meltdown||(ps||(ps=(await ls(async()=>{let{MeltdownMode:e}=await import(`./meltdown-CqTeYrFb.js`);return{MeltdownMode:e}},[])).MeltdownMode),this.meltdown=new ps)}startMeltdown(e=`agent`,t=!1){return this.meltdown?(this._enterMeltdown(e,t),Promise.resolve()):this._ensureMeltdown().then(()=>this._enterMeltdown(e,t))}_enterMeltdown(e,t){this.mode=`meltdown`,this.achievementStats.totalGamesPlayed++,this.player.reset(),this.applyLoadoutBonuses(),this.ariaEnabled=!0,this.ariaTriggered={};let n=this.meltdown.start(e,t);this.map=n,this._meltdownUpgradeChoices=null,this._meltdownUpgradeSel=0,this.player.x=n.playerStart.x,this.player.y=n.playerStart.y,this.player.angle=n.playerStart.dir,this.player.alive=!0,fr(),this.meltdownLockAngle=!0,this.entities=[],this.dustMotes=null,this.projectiles=[],this._chronoBombs=[];let r=this.getDifficultyMultipliers();this.entities.push(...Ar(n.enemySpawns,r)),this.entities.push(...jr(n.pickupSpawns)),this.totalEnemies=n.enemySpawns.length,this.killedEnemies=0,this.roundStartTime=performance.now(),this.state=J.PLAYING,this.audio.startTrack(`meltdown`),this.audio.startAmbient(`meltdown`),this.lockPointer()}startArenaRound(){let e=(this.arenaRound-1)%x.length;this.map=structuredClone(x[e]),this.player.x=this.map.playerStart.x,this.player.y=this.map.playerStart.y,this.player.angle=this.map.playerStart.dir,this.player.alive=!0,fr(),this.arenaTimer=60,this.arenaClearTimer=null,this.entities=[],this.dustMotes=null,this.projectiles=[],this._chronoBombs=[];let t=this.getDifficultyMultipliers();this.arenaTimer=Math.max(30,60+t.timerBonus);let n=new yr(yr.arenaSeed(this.arenaRound,this.settings.difficulty)),r=Dr(this.map.enemySpawns,this.player.x,this.player.y,this.map.grid,n);this.entities.push(...Tr(this.arenaRound,r,t,n)),this.entities.push(...Er(this.map.pickups,this.arenaRound,this.map)),this.killedEnemies=0,this.totalEnemies=this.entities.filter(e=>e.type===`enemy`).length,this.roundDamageTaken=0,this.killStreakSystem.reset(),this.shotsFired=0,this.shotsHit=0,this.slowMoTimer=0,this.timeScale=1,this.ariaCombatTimer=0,this.state=J.PLAYING,this.roundStartTime=performance.now(),this.audio.startTrack(`arena`,140+this.arenaRound*5),this.audio.startAmbient(`arena`),this.arenaRound===5?this.triggerAriaOnce(`arenaRound5_comm`,`arenaRound5`):this.arenaRound===10&&this.triggerAriaOnce(`arenaRound10_comm`,`arenaRound10`),this.lockPointer()}startCampaign(){this.campaign.start()}showCampaignPrompt(){this.campaign.showPrompt()}executeCampaignPromptChoice(e){this.campaign.executePromptChoice(e)}renderCampaignPrompt(e,t,n){Qi(e,t,n,this.campaignPromptSelection||0)}startTutorial(){return this.tutorial.start()}initTutorialLevel(){this.tutorial.initLevel()}advanceTutorialStep(){this.tutorial.advanceStep()}updateTutorial(e){this.tutorial.update(e)}spawnTrainingDummies(){this.tutorial.spawnDummies()}executeTutorialMenuChoice(e){this.tutorial.executeMenuChoice(e)}executeTutorialCompletionChoice(e){this.tutorial.executeCompletionChoice(e)}shouldShowTutorial(){return this.tutorial.shouldShow()}renderTutorialOverlay(e,t,n){ha(e,t,n,{mode:this.mode,isTouchDevice:this.isTouchDevice,tutorialStepTime:this.tutorialStepTime,tutorialStep:this.tutorialStep})}renderTutorialCompletionMenu(e,t,n){ga(e,t,n,this.tutorialMenuSelection||0)}_makeScanlinePattern(e,t,n){}_drawScanlines(e,t,n,r){gi(e,t,n,r)}applyLoadoutBonuses(){let e=D[this.character.loadoutIndex];if(!e||!e.bonuses)return;let t=e.bonuses;t.fireRateMultiplier!=null&&(this.player.fireRateMultiplier=t.fireRateMultiplier),t.maxHealth!=null&&(this.player.maxHealth=t.maxHealth,this.player.health=t.maxHealth),t.moveSpeed!=null&&(this.player.moveSpeed=3.5+t.moveSpeed),t.maxStamina!=null&&(this.player.maxStamina=t.maxStamina,this.player.stamina=t.maxStamina),e.startWeapons&&(this.player.weapons=[...e.startWeapons]),e.id===`phantom`?(this.player.maxChronoEnergy=120,this.player.dashStaminaCost=15):e.id===`enforcer`?(this.player.maxChronoEnergy=80,this.player.damageMultiplier=1.15):e.id===`gunslinger`&&(this.player.maxChronoEnergy=100);let n=d[this.character.backstoryIndex||0]?.bonuses||{};n.maxHealthAdd&&(this.player.maxHealth+=n.maxHealthAdd,this.player.health=Math.min(this.player.maxHealth,this.player.health+n.maxHealthAdd)),n.maxChronoEnergyAdd&&(this.player.maxChronoEnergy+=n.maxChronoEnergyAdd),n.dashCostAdd&&(this.player.dashStaminaCost=Math.max(8,this.player.dashStaminaCost+n.dashCostAdd)),n.armorAdd&&(this.player.armor=Math.max(this.player.armor,n.armorAdd))}getCharacterColor(){return g[this.character.colorIndex]||g[0]}getWeaponSkin(){return T[this.character.weaponSkinIndex]||T[0]}getVoiceProfile(){return i[this.character.voiceIndex||0]||i[0]}renderCharacterCreator(e,t,n){ro(e,t,n,this.creatorCategory,this.character,this.isTouchDevice)}_exitCreator(e){if(e?(this.saveCharacter(),t(`character_create`,{loadout_class:this.character.loadoutClass||`default`})):this.loadCharacter(),this._creatorSaveCallback){let t=this._creatorSaveCallback;this._creatorSaveCallback=null,t(e)}else this.state=this.creatorReturnState||J.TUTORIAL_COMPLETE}_handleCreatorClick(e){Io(this,e)}_renderCharacterPreview(e,t,n,r,i,a,o,s,c,l){no(e,t,n,r,i,a,o,s,c,l)}async _ensureCutsceneEngine(){this.cutsceneEngine||(ds||(ds=(await ls(async()=>{let{CutsceneEngine:e}=await import(`./cutscene-ONmpINYQ.js`);return{CutsceneEngine:e}},__vite__mapDeps([0,1]))).CutsceneEngine),this.cutsceneEngine=new ds({audio:this.audio,getKeys:()=>this.keys,getTouchControls:()=>this.touchControls,isTouchDevice:ao(),getPlayerName:()=>this.character.name||`Agent`,getSettings:()=>this.settings}))}startCutscene(e,t){return this.cutsceneEngine?(this._enterCutscene(e,t),Promise.resolve()):this._ensureCutsceneEngine().then(()=>this._enterCutscene(e,t))}_enterCutscene(e,t){this.cutsceneEngine.start(e,t)&&(this.state=J.CUTSCENE)}preloadLazyModes(){return Promise.all([this._ensureMeltdown(),this._ensureBuilder(),this._ensureCutsceneEngine()])}advanceCutsceneFrame(){this.cutsceneEngine?.advance()}endCutscene(){this.cutsceneEngine?.end()}fadeTransition(e){this.transitioning||(this.transitioning=!0,this.transitionAlpha=0,this._transitionDir=1,this._transitionCallback=e)}_tickTransition(e){this.transitioning&&(this.transitionAlpha+=this._transitionDir*this._transitionSpeed*e,this._transitionDir===1&&this.transitionAlpha>=1?(this.transitionAlpha=1,this._transitionCallback&&(this._transitionCallback(),this._transitionCallback=null),this._transitionDir=-1):this._transitionDir===-1&&this.transitionAlpha<=0&&(this.transitionAlpha=0,this.transitioning=!1,this._transitionDir=0))}_renderTransitionOverlay(e,t,n){!this.transitioning||this.transitionAlpha<=0||(e.fillStyle=`rgba(0,0,0,${this.transitionAlpha})`,e.fillRect(0,0,t,n))}updateCutscene(){this.cutsceneEngine?.update(),!this.cutsceneEngine?.isActive&&this.state===J.CUTSCENE&&(this.state=J.TITLE,this.audio.startTrack(`menu`),this.audio.startAmbient(`menu`))}renderCutscene(e,t,n){this.cutsceneEngine?.render(e,t,n)}loadCampaignLevel(e){this.campaign.loadLevel(e)}_applyActEnemyRoster(){this.campaign._applyActEnemyRoster()}nextCampaignLevel(){this.campaign.nextLevel()}interact(){let e=Math.cos(this.player.angle),t=Math.sin(this.player.angle);for(let n=.5;n<=1.5;n+=.25){let r=Math.floor(this.player.x+e*n),i=Math.floor(this.player.y+t*n);if(r<0||i<0||r>=this.map.width||i>=this.map.height||r===Math.floor(this.player.x)&&i===Math.floor(this.player.y))continue;let a=this.map.grid[i][r];if(a===5){this.map.grid[i][r]=0,this.audio.doorOpen(),this.mode===`tutorial`&&(this.tutorialDoorOpened=!0);return}else if(a===6){this.map.grid[i][r]=0,this.player.secretsFound++,this.achievementStats.totalSecretsFound++,this.player.score+=500,this.audio.secretFound(),this.queueAriaMessage(`secretFound`);return}}}buyUpgrade(e){let t=b[e],n=this.upgradeLevels[e]||0;if(n>=t.maxLevel)return;let r=Math.floor(t.baseCost*t.costScale**+n);this.player.score>=r&&(this.player.score-=r,this.upgradeLevels[e]=n+1,t.apply(this.player),this.achievementStats.upgradesBought++,this.checkAchievements(),this.audio.pickup(),this.queueAriaMessage(`upgradeChosen`))}fireWeapon(){si(this)}_onEnemyKill(e){ui(this,e)}hitscan(e,t,n){ci(this,e,t,n)}damageEnemy(e,t,n){li(this,e,t,n)}damagePlayer(e,t){if(this.mode===`meltdown`&&this.meltdown?.isInvulnerable())return;let n=this.player.health;if(di(this,e,t),this.squadComms&&this.player.alive&&this.player.maxHealth>0){let e=n/this.player.maxHealth,t=this.player.health/this.player.maxHealth;e>.3&&t<=.3&&this.squadComms.onLowHealth()}}update(e){let n=(e-this.lastFrameTime)/1e3;if(this.deltaTime=Math.min(.033,n),this.achievementStats.totalTimePlayed+=n,this.lastFrameTime=e,this.time=(this.time||0)+this.deltaTime*1e3,this.wallTime=e,this._updateGamepadInput(this.deltaTime),this.slowMoTimer>0?(this.slowMoTimer-=this.deltaTime,this.timeScale=.25,this.slowMoTimer<=0&&(this.slowMoTimer=0,this.timeScale=this.player.chronoActive?.3:1)):this.player.chronoActive?(this.player.chronoEnergy-=33*this.deltaTime,this.timeScale=.3,this.player.chronoEnergy<=0&&(this.player.chronoEnergy=0,this.player.chronoActive=!1,this.timeScale=1)):this.timeScale!==1&&this.slowMoTimer<=0&&(this.timeScale=1),this.audio.setTimeScale?.(this.timeScale),this.audio.updateDucking?.(this.deltaTime),this.frameCount++,e-this.fpsTime>1e3&&(this.fps=this.frameCount,this.frameCount=0,this.fpsTime=e),this._tickTransition(this.deltaTime),this.state===J.CUTSCENE){this.updateCutscene();return}if(this.state===J.BUILDER){this.builder.feedKeys(this.keys),this.builder.feedMouse(this.mouse.dx,this.mouse.dy,this.mouse.locked),this.mouse.dx=0,this.mouse.dy=0,this.builder.update(this.deltaTime);return}if(this.state===J.HUD_EDITOR){let e=this.canvas.getBoundingClientRect(),t=(this.mouse.x-e.left)*(this.canvas.width/e.width),n=(this.mouse.y-e.top)*(this.canvas.height/e.height);this.hudEditor.update(this.deltaTime,t,n,this.input.isDown(`interact`)||this.mouse.down);return}if(this.state!==J.PLAYING)return;if(this.hitStopFrames>0){this.hitStopFrames--;return}if(this.keys.ShiftLeft&&this.keys.KeyU&&(this.keys.KeyU=!1,this.assetEditor.toggle()),this.assetEditor.active)return;if(!this.player.alive){if(this.deathTimer>0&&(this.deathTimer-=this.deltaTime,this.deathTimer<=0)){if(this.mode===`playtest`){this.exitBuilderPlayTest();return}this.checkAchievements(),this.state=J.GAME_OVER,this.audio.stopMusic(),t(`player_death`,{mode:this.mode,round:this.arenaRound,cause:`health`,time_seconds:Math.floor((performance.now()-this.roundStartTime)/1e3)}),this.mode===`arena`&&this.clearArenaSave(),this.unlockPointer()}return}let r=this.deltaTime*this.timeScale,i=!!this.keys[this.keybinds.chronoShift];if(i&&!this.player.chronoActive&&this.player.chronoEnergy>=15?(this.player.chronoActive=!0,this.mode===`tutorial`&&(this.tutorialChronoUsed=!0)):this.player.chronoActive&&!i&&(this.player.chronoActive=!1,this.timeScale=1),!this.player.chronoActive&&this.player.chronoEnergy<this.player.maxChronoEnergy&&(this.player.chronoEnergy=Math.min(this.player.maxChronoEnergy,this.player.chronoEnergy+5*this.deltaTime)),hs(`KillStreak`,()=>this.killStreakSystem.update(this.deltaTime)),this.mode===`arena`){let e=this.arenaTimer;if(this.arenaTimer-=r,this.arenaTimer<=10&&this.arenaTimer>0&&Math.floor(e)!==Math.floor(this.arenaTimer)&&this.audio.timerWarning(),this.totalEnemies>0&&this.killedEnemies>=this.totalEnemies&&!this.arenaClearTimer&&(this.arenaClearTimer=5),this.arenaClearTimer&&(this.arenaClearTimer-=r,this.arenaClearTimer<=0&&(this.arenaClearTimer=null,this.arenaTimer=0)),this.arenaTimer<=0){this.arenaTimer=0,this.arenaRound++,this.player.score+=1e3+this.killedEnemies*50,t(`round_complete`,{mode:`arena`,round:this.arenaRound-1,kills:this.killedEnemies,time_seconds:60}),this.achievementStats.highestArenaRound=Math.max(this.achievementStats.highestArenaRound,this.arenaRound-1),this.roundDamageTaken===0&&(this.achievementStats.flawlessRounds++,this.queueAriaMessage(`noHitRound`)),this.checkAchievements(),this.audio.stopMusic(),this.audio.roundComplete(),this.state=J.UPGRADE,this.upgradeSelection=0,this.arenaClearTimer=null,this.saveArena(),this.unlockPointer(),(this.shotsFired>0?this.shotsHit/this.shotsFired*100:0)>=75&&this.shotsFired>=10&&this.queueAriaMessage(`highAccuracy`),this.queueAriaMessage(`roundComplete`),this.arenaRound-1==5&&this.queueAriaMessage(`arenaRound5`),this.arenaRound-1==10&&this.queueAriaMessage(`arenaRound10`),this.ariaTriggered={};return}}if(this.mode===`playtest`&&this.totalEnemies>0&&this.killedEnemies>=this.totalEnemies&&this.slowMoTimer<=0&&(this._playtestEndTimer||(this._playtestEndTimer=2),this._playtestEndTimer-=this.deltaTime,this._playtestEndTimer<=0)){this._playtestEndTimer=null,this.exitBuilderPlayTest();return}this.mode===`tutorial`&&this.updateTutorial(r),this.player.regenRate>0&&(this.player.health=Math.min(this.player.maxHealth,this.player.health+this.player.regenRate*r)),this.player.maxShield>0&&this.player.shield<this.player.maxShield&&(this.player.shield=Math.min(this.player.maxShield,this.player.shield+2*r));let a=this.showFPS?performance.now():0;if(this.updatePlayer(r),this.mode===`meltdown`&&this.meltdown.alive){let e=Math.PI/2,t=Math.PI/3,n=this.player.angle;for(;n-e>Math.PI;)n-=Math.PI*2;for(;n-e<-Math.PI;)n+=Math.PI*2;n>e+t&&(n=e+t),n<e-t&&(n=e-t),this.player.angle=n;let i=this.meltdown.update(r,this.player.x,this.player.y);this.player.damageMultiplier=this.meltdown.effectiveDamage();let a=this.keybinds,o=this.keys[a.moveBack]||this.keys.ArrowDown,s=i.moveY;if(o&&s>0){let e=15*r;this.player.stamina>0?(this.player.stamina=Math.max(0,this.player.stamina-e),s*=.5,this.player._meltdownBraking=!0):this.player._meltdownBraking=!1}else this.player._meltdownBraking=!1;let c=this.player.y+s;this.meltdown.abilityActive&&this.meltdown.hero.ability===`phase`||this.isPassable(Math.floor(this.player.x),Math.floor(c+.2))?this.player.y=c:this.player.health-=5*r;for(let e of i.events)if(e.type===`heatWarning`?this.audio.meltdownSpeedUp():e.type===`milestone`?this.audio.meltdownCollect():e.type===`abilityEnd`&&this.audio.meltdownHit(),e.type===`upgradeScreen`&&(this._meltdownUpgradeChoices=e.choices,this._meltdownUpgradeSel=0,this.audio.meltdownCollect()),e.type===`extend`){let{enemySpawns:e,pickupSpawns:t}=this.meltdown.extend(25),n=this.getDifficultyMultipliers();for(let t of e){let e=m[t.type]||m.drone,r=new W(t.x,t.y,t.type);r.health=e.health*n.healthMul,r.maxHealth=r.health,r.speed=e.speed*n.speedMul,r.damage=(e.damage||10)*n.damageMul,r.aiType=e.aiType||`patrol`;let[i,a]=br(e.baseColor||`#ff0000`,e.darkColor||`#880000`,r.enemyType);r.baseColor=i,r.darkColor=a,this.entities.push(r)}for(let e of t)this.entities.push(new rn(e.x,e.y,e.type,{weaponId:e.weaponId}));this.map.height=this.meltdown.map.height}let l=this.player.y-40;this.entities=this.entities.filter(e=>e.y>l||e.y>this.player.y),i.hazardDmg>0&&(this.player.health-=i.hazardDmg,this.screenShake<2&&(this.screenShake=2)),i.ariaMsg&&(this._meltdownAriaText=i.ariaMsg,this._meltdownAriaTimer=4),this._meltdownAriaTimer>0&&(this._meltdownAriaTimer-=r,this._meltdownAriaTimer<=0&&(this._meltdownAriaText=null)),i.healAmount>0&&(this.player.health=Math.min(this.player.maxHealth,this.player.health+i.healAmount)),this.player.health<=0&&(this.meltdown.onFatalHit()?(this.player.health=1,this.screenShake=Math.max(this.screenShake,10)):(this.player.health=0,this.player.alive=!1,this.audio.meltdownDeath(),this.meltdown.onDeath(),this.deathTimer=1.5))}if(this.player.isFiring&&this.fireWeapon(),this.weaponAnimFrame>0&&this.time-this.weaponAnimTime>80&&(this.weaponAnimFrame++,this.weaponAnimTime=this.time,this.weaponAnimFrame>3&&(this.weaponAnimFrame=0)),this.player.weaponKick*=tr(.85,this.deltaTime),this.player.weaponKick<.01&&(this.player.weaponKick=0),this.player.cameraPunch*=tr(.78,this.deltaTime),Math.abs(this.player.cameraPunch)<.001&&(this.player.cameraPunch=0),a&&(this.profiler.currentPhases.player=performance.now()-a),this.entities.length>30){let e=0;for(let t=0;t<this.entities.length;t++){let n=this.entities[t];(n.active||n.deathTime!=null&&this.time-n.deathTime<2e3)&&(this.entities[e++]=n)}this.entities.length=e}this.entityGrid.clear(),this.entityGrid.insertAll(this.entities);let o=this.showFPS?performance.now():0;hs(`AI`,()=>this.updateEnemies(r)),o&&(this.profiler.currentPhases.enemies=performance.now()-o);let s=this.showFPS?performance.now():0;hs(`Projectiles`,()=>this.updateProjectiles(r)),s&&(this.profiler.currentPhases.projectiles=performance.now()-s);let c=this.showFPS?performance.now():0;this.checkPickups(),c&&(this.profiler.currentPhases.pickups=performance.now()-c);let l=this.showFPS?performance.now():0;if(this.mode===`campaign`&&this.exitEntity&&this.exitEntity.active){let e=this.player.x-this.exitEntity.x,t=this.player.y-this.exitEntity.y;e*e+t*t<1&&(this.state=J.LEVEL_COMPLETE,this._levelCompleteTime=performance.now(),this.audio.stopMusic(),this.audio.roundComplete(),this.unlockPointer(),this.queueAriaMessage(`levelComplete`))}if(this.mode===`playtest`&&this.exitEntity&&this.exitEntity.active){let e=this.player.x-this.exitEntity.x,t=this.player.y-this.exitEntity.y;e*e+t*t<1&&(this._playtestEndTimer||(this._playtestEndTimer=1.5))}this.screenShake*=tr(.9,this.deltaTime),this.screenShake<.1&&(this.screenShake=0),hs(`Particles`,()=>this.updateParticles(r)),this.glitchEffect*=tr(.95,this.deltaTime),this.glitchEffect<.01&&(this.glitchEffect=0),this.hitMarker>0&&(this.hitMarker-=r,this.hitMarker<0&&(this.hitMarker=0));for(let e=this.damageNumbers.length-1;e>=0;e--)this.damageNumbers[e].life-=r,this.damageNumbers[e].life<=0&&(this.damageNumbers[e]=this.damageNumbers[this.damageNumbers.length-1],this.damageNumbers.pop());for(let e=this.tracers.length-1;e>=0;e--)this.tracers[e].life-=r,this.tracers[e].life<=0&&(this.tracers[e]=this.tracers[this.tracers.length-1],this.tracers.pop());for(let e=this.lights.length-1;e>=0;e--){let t=this.lights[e];t.life-=r,t.life<=0?(this.lights[e]=this.lights[this.lights.length-1],this.lights.pop()):t.intensity=t.baseIntensity*(t.life/t.maxLife)}hs(`Achievements`,()=>{this.checkAchievements(),this.updateAchievementToast(r)}),this.updateAriaComms(r),l&&(this.profiler.currentPhases.misc=performance.now()-l)}triggerDash(e,t,n){if(t!==void 0&&n!==void 0){let e=Math.hypot(t,n);e>1e-6&&(t/=e,n/=e)}this.playerUpdateSystem.triggerDash({player:this.player,keybinds:this.keybinds},e,t,n)&&(this.mode===`tutorial`&&(this.tutorialDashed=!0),this.achievementStats.totalDashes++,this.triggerAriaOnce(`dash`,`dashUsed`),this.audio.dashSound?.())}updatePlayer(e){this.player._drawDistance=this.quality?.drawDistance;let t=this.playerUpdateSystem.update({player:this.player,keys:this.keys,keybinds:this.keybinds,mouse:this.mouse,settings:this.settings,mode:this.mode,map:this.map,audio:this.audio,voiceProfile:this.getVoiceProfile(),noclip:!!this._noclip},e);t&&(t.tutorialSlid&&(this.tutorialSlid=!0),t.tutorialCrouched&&(this.tutorialCrouched=!0)),ur(this.player,e)}isPassable(e,t){return q(this.map,e,t)}_spawnHitImpact(e,t,n,r){this.player.particles||(this.player.particles=[]),Be(this.player.particles,e,t,n,r,this.quality?.particleMultiplier??1)}_spawnMuzzleFlash(e){this.player.particles||(this.player.particles=[]),Ve(this.player.particles,this.player,e,this.quality?.particleMultiplier??1);let t={2:[80,220,255],7:[80,220,255],3:[255,160,40],6:[100,255,120]}[e.id]||[255,200,90],n=this.player.x+Math.cos(this.player.angle)*.6,r=this.player.y+Math.sin(this.player.angle)*.6;ze(this.lights,n,r,t,4.5,1.4,.08)}spawnDeathParticles(e,t,n,r){this.player.particles||(this.player.particles=[]),He(this.player.particles,e,t,n,r,this.quality?.particleMultiplier??1)}spawnWallSparks(e,t){this.player.particles||(this.player.particles=[]),Ue(this.player.particles,e,t,this.quality?.particleMultiplier??1)}spawnPickupBurst(e,t,n){this.player.particles||(this.player.particles=[]),je(this.player.particles,e,t,n,this.quality?.particleMultiplier??1)}updateParticles(e){this.dustMotes=Fe(this.player.particles,e,this.timeScale,this.dustMotes,this.player,{enableDust:(this.quality?.particleMultiplier??1)>=.5})}updateEnemies(e){let t=this.aiSystem.update({entities:this.entities,player:this.player,map:this.map,time:this.time,timeScale:this.timeScale,projectiles:this.projectiles,chronoBombs:this._chronoBombs,damageNumbers:this.damageNumbers,audio:this.audio},e);for(let e of t.damagePlayerCalls)this.damagePlayer(e.damage,e.attacker);this.screenShake=Math.max(this.screenShake,t.screenShake),t.hudDisabledUntil!=null&&(this._hudDisabledUntil=t.hudDisabledUntil);for(let e of t.ariaMessages)this.queueAriaMessage(e);this.totalEnemies+=t.totalEnemiesAdded,this._chronoBombs=this._chronoBombs.filter(e=>e.active)}hasLineOfSight(e,t,n,r){return $n(this.map,e,t,n,r)}updateProjectiles(e){oi({projectiles:this.projectiles,entities:this.entities,entityGrid:this.entityGrid,map:this.map,player:this.player,time:this.time,audio:this.audio,spawnWallSparks:(e,t)=>this.spawnWallSparks(e,t),damageEnemy:(e,t,n)=>this.damageEnemy(e,t,n),damagePlayer:e=>this.damagePlayer(e),lights:this.lights},e)}checkPickups(){let e=this.entityGrid.query(this.player.x,this.player.y,1);for(let t of e){if(t.type===`enemy`||t.type===`exit`||t.type===`projectile`||!t.active)continue;let e=this.player.x-t.x,n=this.player.y-t.y;if(!(e*e+n*n>1)&&!(this.mode===`tutorial`&&this.tutorialStep<13&&(t.type===`health`||t.type===`ammo`)))if(t.type===`health`){if(this.player.health>=this.player.maxHealth&&this.mode!==`tutorial`)continue;this.player.health=Math.min(this.player.maxHealth,this.player.health+25),t.active=!1,this.spawnPickupBurst(t.x,t.y,`health`),this.audio.pickup(),this.triggerAriaOnce(`healthPickup`,`healthPickup`),this.mode===`tutorial`&&this.tutorialStep===13&&(this.tutorialPickedUp=!0),this.mode===`tutorial`&&(t._respawnAt=performance.now()+8e3)}else t.type===`ammo`?(this.player.ammo=Math.min(999,this.player.ammo+20),t.active=!1,this.spawnPickupBurst(t.x,t.y,`ammo`),this.audio.pickup(),this.mode===`tutorial`&&this.tutorialStep===13&&(this.tutorialPickedUp=!0),this.mode===`tutorial`&&(t._respawnAt=performance.now()+8e3)):t.type===`weapon`?(this.player.weapons.includes(t.weaponId)||(this.player.weapons.push(t.weaponId),this.player.currentWeapon=this.player.weapons.length-1,this.audio.pickup(),this.queueAriaMessage(`weaponPickup`)),this.player.ammo=Math.min(999,this.player.ammo+30),t.active=!1,this.spawnPickupBurst(t.x,t.y,`weapon`),Ne(this.player.particles,t.x,t.y,{count:8,r:50,g:200,b:255}),this.mode===`tutorial`&&(this.tutorialWeaponPickedUp&&(this.tutorialSecondWeaponPickedUp=!0),this.tutorialWeaponPickedUp=!0,t._respawnAt=performance.now()+8e3)):(t.type===`damage2x`||t.type===`invuln`)&&this.mode===`meltdown`&&(this.meltdown.onExoticPickup(t.type),t.active=!1,this.spawnPickupBurst(t.x,t.y,t.type===`damage2x`?`weapon`:`health`),this.audio.pickup(),Ne(this.player.particles,t.x,t.y,{count:14,r:(t.type,255),g:t.type===`damage2x`?80:220,b:t.type===`damage2x`?40:120}))}}render(){Fo(this)}drawThirdPersonModel(e,t,n){let r=Math.sin(this.player.weaponBob)*3,i=Math.abs(Math.cos(this.player.weaponBob))*4,a=t/2+r,o=n-160+i,s=2.8;e.save(),e.translate(a,o),e.scale(s,s),e.fillStyle=`rgba(30, 60, 90, 0.7)`,e.beginPath(),e.moveTo(-10,-20),e.quadraticCurveTo(-14,0,-12+Math.sin(this.time/200)*2,20),e.lineTo(12+Math.sin(this.time/250)*2,20),e.quadraticCurveTo(14,0,10,-20),e.closePath(),e.fill(),e.fillStyle=`#3a4a5a`,e.fillRect(-8,-22,16,24),e.fillStyle=`#4a5a6a`,e.fillRect(-12,-22,5,8),e.fillRect(7,-22,5,8),e.fillStyle=`#2a3a4a`,e.beginPath(),e.arc(0,-28,7,0,Math.PI*2),e.fill(),e.fillStyle=`rgba(0, 200, 255, 0.3)`,e.beginPath(),e.arc(0,-28,7.5,-.3,.3),e.fill(),e.fillStyle=`#3a4a5a`,e.fillRect(-14,-14,4,14),e.fillRect(10,-14,4,14),e.fillStyle=`#555`,e.fillRect(-2,-18,4,-12),e.fillStyle=`#00ccff`,e.fillRect(-1,-30,2,2),e.fillStyle=`#2a3a4a`,e.fillRect(-6,2,5,16),e.fillRect(1,2,5,16),e.fillStyle=`#1a2a3a`,e.fillRect(-7,16,6,4),e.fillRect(1,16,6,4),e.restore()}drawWeapon(e,t,n){let r=g[this.character.colorIndex],i=this.player.getWeaponDef();Oe(e,t,n,{wep:i,energyColor:r?r.accent:i?.color,isAiming:this.player.isAiming,isSprinting:this.player.isSprinting,isDashing:this.player.isDashing,weaponBob:this.settings.weaponBob?this.player.weaponBob:0,weaponKick:this.player.weaponKick,weaponSwayX:this.settings.weaponBob?this.player.weaponSwayX:0,weaponSwayY:this.settings.weaponBob?this.player.weaponSwayY:0,skinTone:(E[this.character.skinToneIndex]||E[0])?.color,weaponAnimFrame:this.weaponAnimFrame,time:this.time,lastFireTime:this.player.lastFireTime||0,isTouchDevice:this.isTouchDevice,hudStyle:this.settings.hudStyle,drawGlow:O})}renderHUD(){Ki(this)}drawPortrait(e,t,n,r,i){_i(e,t,n,r,i,{health:this.player.health,maxHealth:this.player.maxHealth,alive:this.player.alive,time:this.time})}drawCrosshairAt(e,t,n){fi(e,t,n,this.settings.crosshair)}drawMinimap(e,t,n,r,i){yi(e,t,n,r,i,{map:this.map,entities:this.entities,player:this.player,chronoBombs:this._chronoBombs,objectiveWaypoint:this.objectiveWaypoint})}drawControlsOverlay(e,t,n,r){Wa(e,t,n,r,{keybinds:this.keybinds,mode:this.mode})}renderPauseScreen(e,t,n){let r=this.isTouchDevice&&K(n);if(e.fillStyle=`rgba(0,0,0,0.7)`,e.fillRect(0,0,t,n),this.showAriaLog){this.renderAriaLog(e,t,n);return}e.fillStyle=`#00ffcc`,e.font=`bold ${r?24:36}px monospace`,e.textAlign=`center`,e.fillText(`PAUSED`,t/2,r?n*.2:n/2-100),e.font=`${r?11:14}px monospace`,e.fillStyle=`#aaaacc`,e.textAlign=`center`;let i=this.mode===`campaign`?`  |  F to save`:``;this.isTouchDevice||e.fillText(`ESC / P to resume  |  S settings  |  A achievements  |  T stats  |  L ARIA log  |  Q quit`+i,t/2,n/2+110),this.pauseSaveFlash&&performance.now()-this.pauseSaveFlash<1500&&(e.fillStyle=`rgba(0, 255, 100, ${(1-(performance.now()-this.pauseSaveFlash)/1500).toFixed(2)})`,e.font=`bold ${r?13:16}px monospace`,e.fillText(`GAME SAVED`,t/2,r?n*.7:n/2+140)),e.textAlign=`left`}renderAriaLog(e,t,n){this.ariaComms.renderLog(e,t,n,this.character.name)}renderSettingsScreen(e,t,n){Na(e,t,n,{isTouchDevice:this.isTouchDevice,settingsCategory:this.settingsCategory,settingsSelection:this.settingsSelection,settings:this.settings,mouseX:this._settingsMouseX,mouseY:this._settingsMouseY})}renderControlsScreen(e,t,n){Ja(e,t,n,{keybinds:this.keybinds,controlsSelection:this.controlsSelection,rebindingKey:this.rebindingKey,keybindSwapFlash:this._keybindSwapFlash})}formatKeyCode(e){return Ua(e)}renderAchievementsScreen(e,t,n){this.achievementSystem.renderScreen(e,t,n)}renderStatsScreen(e,t,n){this.achievementSystem.renderStats(e,t,n)}renderUpgradeScreen(e,t,n){$i(e,t,n,{isTouchDevice:this.isTouchDevice,arenaRound:this.arenaRound,playerScore:this.player.score,upgradeLevels:this.upgradeLevels,upgradeSelection:this.upgradeSelection})}renderGameOver(e,t,n){let r=Xa(e,t,n,{time:this.time,isTouchDevice:this.isTouchDevice,mode:this.mode,arenaRound:this.arenaRound,achievementStats:this.achievementStats,meltdown:this.meltdown,deltaTime:this.deltaTime,shareToast:this._shareToast,statsCardData:this._statsCardData()});this._gameOverBtns=r.gameOverBtns,r.toastExpired&&(this._shareToast=null)}_shareScore(){this._shareCurrentResult()}_renderShareToast(e,t,n){Ya(e,t,n,this._shareToast,this.deltaTime).expired&&(this._shareToast=null)}_renderBuilderOnboarding(e,t,n){$a(e,t,n,{time:this.time,isTouchDevice:this.isTouchDevice})}renderVictory(e,t,n){Za(e,t,n,{time:this.time,isTouchDevice:this.isTouchDevice,ngPlusCycle:this.ngPlusCycle,mode:this.mode,ngPlusPrompt:this.ngPlusPrompt,ngPlusPromptSel:this.ngPlusPromptSel,deltaTime:this.deltaTime,shareToast:this._shareToast,statsCardData:this._statsCardData()}).toastExpired&&(this._shareToast=null)}renderLevelComplete(e,t,n){Qa(e,t,n,{time:this.time,isTouchDevice:this.isTouchDevice,levelCompleteTime:this._levelCompleteTime,playerSecretsFound:this.player.secretsFound,statsCardData:this._statsCardData()})}_renderStatsCard(e,t,n,r,i,a){bi(e,t,n,r,i,a,this._statsCardData())}_statsCardData(){return{isTouchDevice:this.isTouchDevice,canvasHeight:this.hudH,shotsFired:this.shotsFired,shotsHit:this.shotsHit,roundStartTime:this.roundStartTime,killedEnemies:this.killedEnemies,totalEnemies:this.totalEnemies,bestStreak:this.bestStreak,score:this.player.score}}async _ensureBuilder(){this.builder||(fs||(fs=(await ls(async()=>{let{BuilderMode:e}=await import(`./builder-U-bd2uYW.js`);return{BuilderMode:e}},__vite__mapDeps([2,3,1]))).BuilderMode),this.builder=new fs(this._builderOpts),this.builder.onShareMap=()=>this._shareBuilderMap())}startBuilder(){return this.builder?(this._enterBuilder(),Promise.resolve()):this._ensureBuilder().then(()=>this._enterBuilder())}_enterBuilder(){this.mode=`builder`,this.builder.start(),this.builder.onPlayTest=()=>this.startBuilderPlayTest(),this.map=this.builder.map,this.entities=[],this.dustMotes=null,this.state=J.BUILDER}startBuilderPlayTest(){this._builderSnapshot={playerX:this.builder.player.x,playerY:this.builder.player.y,playerAngle:this.builder.player.angle},this.map=this.builder.map,(!this.map.heightMap||this.map.heightMap.length!==this.map.height)&&this.builder.syncGrid(),this.entities=[],this.dustMotes=null,this.projectiles=[];let e=this.builder.player.x,t=this.builder.player.y;this.player=new nn(e,t),this.player.health=100,this.player.maxHealth=100,this.player.ammo=50,this.player.angle=this.builder.player.angle,this.player.weapons=[0,1],this.player.currentWeapon=0;let n=0;if(this.map.enemySpawns&&this.map.enemySpawns.length>0)for(let e of this.map.enemySpawns){let t=new W(e.x+.5,e.y+.5,e.enemy||`drone`);this.entities.push(t),n++}else{let r=[`drone`,`phantom`,`beast`];for(let i=0;i<200&&n<8;i++){let i=1.5+Math.random()*(this.map.width-3),a=1.5+Math.random()*(this.map.height-3),o=Math.floor(i),s=Math.floor(a);if(o>=0&&s>=0&&o<this.map.width&&s<this.map.height&&this.map.grid[s][o]===0&&Math.sqrt((i-e)**2+(a-t)**2)>3){let e=r[n%r.length],t=new W(i,a,e);this.entities.push(t),n++}}}if(this.map.entities&&this.map.entities.length>0)for(let e of this.map.entities)this.entities.push(new rn(e.x,e.y,e.type,{weaponId:e.weaponId}));this.map.exit?(this.exitEntity={x:this.map.exit.x,y:this.map.exit.y,type:`exit`,active:!0},this.entities.push(this.exitEntity)):this.exitEntity=null,this.killedEnemies=0,this.totalEnemies=n,this.killStreakSystem.reset(),this.shotsFired=0,this.shotsHit=0,this.slowMoTimer=0,this.timeScale=1,this.mode=`playtest`,this.state=J.PLAYING,this.roundStartTime=performance.now(),this.audio.startTrack(`campaign`,140),this.audio.startAmbient(`industrial`),this.lockPointer()}exitBuilderPlayTest(){this.audio.stopMusic(),this._playtestEndTimer=null,this.state=J.BUILDER,this.mode=`builder`,this.map=this.builder.map,this.entities=[],this.dustMotes=null,this.projectiles=[],this.hudCtx.clearRect(0,0,this.hudW,this.hudH),this._builderSnapshot&&(this.builder.player.x=this._builderSnapshot.playerX,this.builder.player.y=this._builderSnapshot.playerY,this.builder.player.angle=this._builderSnapshot.playerAngle,this._builderSnapshot=null),setTimeout(()=>this.lockPointer(),120)}_handleHashChange(){let e=window.location.hash.substring(1);if(e)try{let t=this._decodeShareURL(e);t.mode===`arena`?this._showSharedScore(t):t.mode===`builder`&&this._loadSharedMap(t.map)}catch(e){console.warn(`Invalid share URL:`,e)}}_encodeShareURL(e){return btoa(JSON.stringify(e))}_decodeShareURL(e){return JSON.parse(atob(e))}_showSharedScore(e){this.killedEnemies=e.kills||0,this.totalEnemies=e.total||0,this.arenaRound=(e.round||0)+1,this.player.score=e.score||0,this.state=J.GAME_OVER,this._sharedScoreView=!0}async _loadSharedMap(e){!Array.isArray(e)||e.length===0||!Array.isArray(e[0])||(await this.startBuilder(),this.builder.importMapData({name:`Shared Map`,width:e[0].length,height:e.length,grid:e}),this.map=this.builder.map)}_handleVictoryClick(e){Lo(this,e)}_handleSettingsClick(e){Ro(this,e)}_handleGameOverClick(e){zo(this,e)}_shareCurrentResult(){let e=null;if(this.mode===`campaign`&&this.state===J.VICTORY?e={mode:`campaign`,act:this.campaignAct||3,score:this.player.score,kills:this.killedEnemies||0}:this.mode===`meltdown`?e={mode:`meltdown`,distance:Math.floor(this.meltdown.distance||0),score:Math.floor(this.meltdown.score||0),heat:Math.floor(this.meltdown.heat||0),hero:this.meltdown.hero?.id||`default`,kills:this.killedEnemies||0}:this.mode===`campaign`&&this.state===J.GAME_OVER?e={mode:`campaign`,act:this.campaignAct||1,level:this.campaignLevel||0,score:this.player.score,kills:this.killedEnemies||0}:this.mode===`arena`||this.state===J.GAME_OVER?e={mode:`arena`,score:this.player.score,round:(this.arenaRound||1)-1,kills:this.killedEnemies||0,total:this.totalEnemies||0}:this.state===J.BUILDER&&(e={mode:`builder`,map:this.builder.map.grid}),e){let n=this._encodeShareURL(e),r=`${window.location.origin}${window.location.pathname}#${n}`;navigator.clipboard.writeText(r).then(()=>{this.audio.menuConfirm(),this._shareToast={text:e.mode===`builder`?`Map link copied!`:e.mode===`meltdown`?`Meltdown score copied! (${e.distance}m)`:e.mode===`campaign`?`Campaign victory copied! (${e.kills} kills)`:`Score link copied!`,life:2.5},(e.mode===`arena`||e.mode===`meltdown`||e.mode===`campaign`)&&t(`share_score`,{mode:e.mode,score:e.score,round:e.round,distance:e.distance})}).catch(()=>{this._shareToast={text:r,life:4}})}}_shareBuilderMap(){let e={mode:`builder`,map:this.builder?.map?.grid};if(!Array.isArray(e.map)||e.map.length===0)return;let t=this._encodeShareURL(e),n=`${window.location.origin}${window.location.pathname}#${t}`;navigator.clipboard.writeText(n).then(()=>{this.audio.menuConfirm(),this.builder.saveFlash=Math.max(this.builder.saveFlash,2),this._shareToast={text:`Map link copied!`,life:2.5}}).catch(()=>{this._shareToast={text:n,life:4}})}},_s=class e{static init(t){if(!ao())return null;let n=new e(t);return n.setup(),n}constructor(e){this.game=e,this.joyTouch=null,this.joyOrigin={x:0,y:0},this.joyPos={x:0,y:0},this.joyActive=!1,this.joyRadius=window.innerHeight<420?45:60,this.lookTouch=null,this.lookOrigin={x:0,y:0},this.lookLast={x:0,y:0},this.lookActive=!1,this.lookTapTime=0,this.fireTouch=null,this.aimTouch=null,this.zones={},this.safeArea={top:0,right:0,bottom:0,left:0},this.canvas=null,this.ctx=null,this.activeButtons=new Set,this.sprintToggleActive=!1,this.chronoTouch=null,this.crouchTouch=null,this.cutsceneHoldTouch=null,this.cutsceneHoldStart=0,this.lastTapTime=0,this.lastTapZone=null;let t=!1;try{t=!!localStorage.getItem(`cc_touch_tutorial_done`)}catch{}this.showTutorial=!t,this.tutorialDismissed=!1,this.canFullscreen=typeof document.documentElement.requestFullscreen==`function`||typeof document.documentElement.webkitRequestFullscreen==`function`,this.isStandalone=window.navigator.standalone===!0||window.matchMedia(`(display-mode: standalone)`).matches}setup(){this.canvas=document.createElement(`canvas`),this.canvas.id=`touchCanvas`,this.canvas.style.cssText=`position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:20;pointer-events:none;`,document.body.appendChild(this.canvas),this.touchLayer=document.createElement(`div`),this.touchLayer.id=`touchLayer`,this.touchLayer.style.cssText=`position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:15;touch-action:none;`,document.body.appendChild(this.touchLayer),this.resize(),this._onResize=()=>this.resize(),this._onTouchStart=e=>this.onTouchStart(e),this._onTouchMove=e=>this.onTouchMove(e),this._onTouchEnd=e=>this.onTouchEnd(e),window.addEventListener(`resize`,this._onResize),this.touchLayer.addEventListener(`touchstart`,this._onTouchStart,{passive:!1}),this.touchLayer.addEventListener(`touchmove`,this._onTouchMove,{passive:!1}),this.touchLayer.addEventListener(`touchend`,this._onTouchEnd,{passive:!1}),this.touchLayer.addEventListener(`touchcancel`,this._onTouchEnd,{passive:!1}),this.game.mouse.locked=!0,document.body.style.cursor=`none`}destroy(){window.removeEventListener(`resize`,this._onResize),this.touchLayer.removeEventListener(`touchstart`,this._onTouchStart),this.touchLayer.removeEventListener(`touchmove`,this._onTouchMove),this.touchLayer.removeEventListener(`touchend`,this._onTouchEnd),this.touchLayer.removeEventListener(`touchcancel`,this._onTouchEnd),this.canvas.remove(),this.touchLayer.remove()}resize(){let e=Math.min(window.devicePixelRatio||1,2),t=window.innerWidth,n=window.innerHeight;this.canvas.style.width=t+`px`,this.canvas.style.height=n+`px`,this.canvas.width=Math.round(t*e),this.canvas.height=Math.round(n*e),this.ctx.setTransform(e,0,0,e,0,0),this._updateSafeArea();let r=this.safeArea,i=n<420;this.joyRadius=i?45:60;let a=i?Math.max(40,Math.min(46,t*.07)):Math.max(44,Math.min(56,t*.09)),o=(i?10:14)+r.right,s=(i?8:14)+r.bottom;this.zones={w:t,h:n,btnSize:a,isCompactPhone:i,joyCenter:{x:Math.max(80,60+r.left),y:i?n-90-r.bottom:n-140-r.bottom},fireBtn:{x:t-o-a*1.6,y:i?n-s-a*1:n-s-a*1.3,r:a},aimBtn:{x:t-o-a*1.6,y:i?n-s-a*2.65:n-s-a*2.95,r:a*.55},dashBtn:{x:t-o-a*.5,y:i?n-s-a*2.5:n-s-a*3.2,r:a*.65},interactBtn:{x:t-o-a*2.9,y:i?n-s-a*2.5:n-s-a*3.2,r:a*.65},sprintBtn:{x:Math.max(60,42+r.left),y:i?n-170-r.bottom:n-260-r.bottom,r:a*.55},chronoBtn:{x:Math.max(60,42+r.left),y:i?n-240-r.bottom:n-350-r.bottom,r:a*.6},crouchBtn:{x:Math.max(60,42+r.left)+a*.9,y:i?n-200-r.bottom:n-290-r.bottom,r:a*.45},weaponBtn:{x:t-o-a*3.2,y:i?n-s-a*1:n-s-a*1.3,r:a*.55},pauseBtn:{x:t-50-r.right,y:(i?28:40)+r.top,r:i?22:26},fullscreenBtn:{x:t-110-r.right,y:(i?28:40)+r.top,r:i?22:26},midX:t*.28}}_updateSafeArea(){try{let e=getComputedStyle(document.documentElement),t=t=>parseInt(e.getPropertyValue(t),10)||0;this.safeArea={top:t(`--sat`),right:t(`--sar`),bottom:t(`--sab`),left:t(`--sal`)}}catch{}}hitTest(e,t){let n=this.zones,r=.85;return this.dist(e,t,n.fireBtn.x,n.fireBtn.y)<n.fireBtn.r*r?`fire`:this.dist(e,t,n.aimBtn.x,n.aimBtn.y)<n.aimBtn.r*r?`aim`:this.dist(e,t,n.dashBtn.x,n.dashBtn.y)<n.dashBtn.r*r?`dash`:this.dist(e,t,n.interactBtn.x,n.interactBtn.y)<n.interactBtn.r*r?`interact`:this.dist(e,t,n.chronoBtn.x,n.chronoBtn.y)<n.chronoBtn.r*r?`chrono`:this.dist(e,t,n.sprintBtn.x,n.sprintBtn.y)<n.sprintBtn.r*r?`sprint`:this.dist(e,t,n.crouchBtn.x,n.crouchBtn.y)<n.crouchBtn.r*r?`crouch`:this.dist(e,t,n.weaponBtn.x,n.weaponBtn.y)<n.weaponBtn.r*r?`weapon`:this.dist(e,t,n.pauseBtn.x,n.pauseBtn.y)<n.pauseBtn.r*r?`pause`:this.canFullscreen&&!this.isStandalone&&this.dist(e,t,n.fullscreenBtn.x,n.fullscreenBtn.y)<n.fullscreenBtn.r?`fullscreen`:e<n.midX?`joy`:`look`}dist(e,t,n,r){return Math.sqrt((e-n)**2+(t-r)**2)}onTouchStart(e){e.preventDefault();let t=this.game;if(this.showTutorial&&!this.tutorialDismissed&&t.state===`playing`){this.tutorialDismissed=!0;try{localStorage.setItem(`cc_touch_tutorial_done`,`1`)}catch{}return}if(t.state===`cutscene`){e.changedTouches.length>0&&(this.cutsceneHoldTouch=e.changedTouches[0].identifier,this.cutsceneHoldStart=performance.now(),t.advanceCutsceneFrame());return}if(t.state===`tutorialComplete`){e.changedTouches.length>0&&this.handleTutorialCompleteTap(e.changedTouches[0]);return}if(t.state===`campaignPrompt`||t.state===`gameOver`||t.state===`victory`||t.state===`levelComplete`){e.changedTouches.length>0&&t.handleKeyPress(`Enter`);return}if(t.state===`paused`){e.changedTouches.length>0&&this.handlePauseTap(e.changedTouches[0]);return}if(t.state===`settings`){e.changedTouches.length>0&&this.handleSettingsTap(e.changedTouches[0]);return}if(t.state===`upgrade`){e.changedTouches.length>0&&this.handleUpgradeTap(e.changedTouches[0]);return}if(t.state===`controls`){e.changedTouches.length>0&&this.handleControlsTap(e.changedTouches[0]);return}if(t.state===`characterCreate`){if(e.changedTouches.length>0){let n=e.changedTouches[0],r=this.zones.w,i=this.zones.h,a=this._creatorButtonBounds(r,i);if(n.clientX>=a.saveX&&n.clientX<=a.saveX+a.btnW&&n.clientY>=a.btnY&&n.clientY<=a.btnY+a.btnH){t.audio.menuConfirm(),t._exitCreator(!0);return}if(n.clientX>=a.cancelX&&n.clientX<=a.cancelX+a.btnW&&n.clientY>=a.btnY&&n.clientY<=a.btnY+a.btnH){t.audio.menuConfirm(),t._exitCreator(!1);return}if(n.clientY>40&&n.clientY<110){let e=t.creatorCategoryCount||6;if(n.clientX<60){t.creatorCategory=(t.creatorCategory-1+e)%e,t.audio.menuSelect();return}if(n.clientX>r-60){t.creatorCategory=(t.creatorCategory+1)%e,t.audio.menuSelect();return}}t._handleCreatorClick({clientX:n.clientX,clientY:n.clientY})}return}for(let n of e.changedTouches){let e=n.clientX,r=n.clientY,i=this.hitTest(e,r);if(i===`joy`&&this.joyTouch===null){this.joyTouch=n.identifier,this.joyOrigin={x:e,y:r},this.joyPos={x:e,y:r},this.joyActive=!0;let i=performance.now();this.lastTapZone===`joy`&&i-this.lastTapTime<250?(this.activeButtons.add(`dash`),this.triggerDirectionalDash(t,!0),this.lastTapTime=0):(this.lastTapTime=i,this.lastTapZone=`joy`)}else if(i===`look`&&this.lookTouch===null)this.lookTouch=n.identifier,this.lookOrigin={x:e,y:r},this.lookLast={x:e,y:r},this.lookActive=!0,this.lookTapTime=performance.now();else if(i===`fire`&&this.fireTouch===null)this.fireTouch=n.identifier,t.player.isFiring=!0,this.activeButtons.add(`fire`),t.settings.haptics&&navigator.vibrate&&navigator.vibrate(15);else if(i===`aim`&&this.aimTouch===null)this.aimTouch=n.identifier,t.player.isAiming=!0,this.activeButtons.add(`aim`),t.settings.haptics&&navigator.vibrate&&navigator.vibrate(10);else if(i===`dash`)this.activeButtons.add(`dash`),this.triggerDirectionalDash(t,!0);else if(i===`interact`)this.activeButtons.add(`interact`),t.interact();else if(i===`chrono`&&this.chronoTouch===null)this.activeButtons.add(`chrono`),this.chronoTouch=n.identifier,t.keys[t.keybinds.chronoShift]=!0;else if(i===`crouch`&&this.crouchTouch===null)this.activeButtons.add(`crouch`),this.crouchTouch=n.identifier,t.keys[t.keybinds.crouch]=!0,t.settings.haptics&&navigator.vibrate&&navigator.vibrate(10);else if(i===`sprint`)this.sprintToggleActive=!this.sprintToggleActive,this.activeButtons.add(`sprint`),t.keys[t.keybinds.sprint]=this.sprintToggleActive;else if(i===`weapon`){this.activeButtons.add(`weapon`);let e=t.player;e.weapons.length>1&&(e.currentWeapon=(e.currentWeapon+1)%e.weapons.length,t.triggerAriaOnce(`weaponSwitch`,`weaponSwitch`),t.mode===`tutorial`&&(t.tutorialWeaponSwapped=!0),t.settings.haptics&&navigator.vibrate&&navigator.vibrate(25))}else i===`fullscreen`?this.toggleFullscreen():i===`pause`&&(this.activeButtons.add(`pause`),t.handleKeyPress(`Escape`))}}onTouchMove(e){e.preventDefault();for(let t of e.changedTouches)if(t.identifier===this.joyTouch)this.joyPos.x=t.clientX,this.joyPos.y=t.clientY,this.updateJoystickKeys();else if(t.identifier===this.lookTouch){let e=t.clientX-this.lookLast.x,n=t.clientY-this.lookLast.y,r=Number(this.game.settings.touchSensitivity);Number.isFinite(r)||(r=1.5);let i=Math.min(3,Math.max(.5,r));if(this.game.mouse.dx+=e*i,this.game.mouse.dy+=n*i,this.game.settings.autoFire){let e=t.clientX-this.lookOrigin.x,n=t.clientY-this.lookOrigin.y;Math.sqrt(e*e+n*n)>20?this.game.player.isFiring||(this.game.player.isFiring=!0,this.activeButtons.add(`fire`),this.game.settings.haptics&&navigator.vibrate&&navigator.vibrate(10)):this.game.player.isFiring&&this.fireTouch===null&&(this.game.player.isFiring=!1,this.activeButtons.delete(`fire`))}this.lookLast.x=t.clientX,this.lookLast.y=t.clientY}}onTouchEnd(e){if(e.preventDefault(),this.cutsceneHoldTouch!==null){for(let t of e.changedTouches)if(t.identifier===this.cutsceneHoldTouch){this.cutsceneHoldTouch=null;break}}for(let t of e.changedTouches)if(t.identifier===this.joyTouch)this.joyTouch=null,this.joyActive=!1,this.clearMovementKeys();else if(t.identifier===this.lookTouch){if(this.game.settings.swipeWeapons){let e=performance.now()-this.lookTapTime,n=t.clientX-this.lookOrigin.x,r=t.clientY-this.lookOrigin.y;if(e<300&&Math.abs(n)>50&&Math.abs(n)>Math.abs(r)*1.5){let e=this.game.player;e.weapons.length>1&&(n>0?e.currentWeapon=(e.currentWeapon+1)%e.weapons.length:e.currentWeapon=(e.currentWeapon-1+e.weapons.length)%e.weapons.length,this.game.triggerAriaOnce(`weaponSwitch`,`weaponSwitch`),this.game.mode===`tutorial`&&(this.game.tutorialWeaponSwapped=!0),this.game.settings.haptics&&navigator.vibrate&&navigator.vibrate(25))}}this.game.settings.autoFire&&this.game.player.isFiring&&this.fireTouch===null&&(this.game.player.isFiring=!1,this.activeButtons.delete(`fire`)),this.lookTouch=null,this.lookActive=!1}else t.identifier===this.fireTouch?(this.fireTouch=null,this.game.player.isFiring=!1,this.activeButtons.delete(`fire`)):t.identifier===this.aimTouch?(this.aimTouch=null,this.game.player.isAiming=!1,this.activeButtons.delete(`aim`)):t.identifier===this.chronoTouch?(this.chronoTouch=null,this.game.keys[this.game.keybinds.chronoShift]=!1,this.activeButtons.delete(`chrono`)):t.identifier===this.crouchTouch&&(this.crouchTouch=null,this.game.keys[this.game.keybinds.crouch]=!1,this.activeButtons.delete(`crouch`));this.activeButtons.delete(`dash`),this.activeButtons.delete(`interact`),this.activeButtons.delete(`pause`),this.activeButtons.delete(`sprint`),this.activeButtons.delete(`weapon`)}updateJoystickKeys(){let e=this.joyPos.x-this.joyOrigin.x,t=this.joyPos.y-this.joyOrigin.y,n=this.game.keybinds;this.game.keys[n.moveForward]=t<-15,this.game.keys[n.moveBack]=t>15,this.game.keys[n.moveLeft]=e<-15,this.game.keys[n.moveRight]=e>15;let r=Math.sqrt(e*e+t*t);this.game.keys[n.sprint]=this.sprintToggleActive||r>this.joyRadius*1.2}clearMovementKeys(){let e=this.game.keybinds;this.game.keys[e.moveForward]=!1,this.game.keys[e.moveBack]=!1,this.game.keys[e.moveLeft]=!1,this.game.keys[e.moveRight]=!1,this.game.keys[e.sprint]=this.sprintToggleActive}handlePauseTap(e){let t=this.zones.w,n=this.zones.h,r=e.clientX,i=e.clientY,a=_n(t,n,this.game.mode);for(let e of a.buttons)if(r>=e.x&&r<=e.x+e.w&&i>=e.y&&i<=e.y+e.h){e.index===0?this.game.handleKeyPress(`Escape`):e.index===1?this.game.handleKeyPress(`KeyS`):e.index===2?this.game.handleKeyPress(`KeyC`):e.index===3&&this.game.handleKeyPress(`KeyQ`);return}if(a.saveBtn){let e=a.saveBtn;r>=e.x&&r<=e.x+e.w&&i>=e.y&&i<=e.y+e.h&&this.game.handleKeyPress(`KeyF`)}}handleTutorialCompleteTap(e){let t=this.game,n=this.zones.w,r=this.zones.h,i=e.clientX,a=e.clientY,o=bn(n,r,4);for(let e=0;e<4;e++){let n=o.my+8+e*o.itemH;if(i>=o.mx&&i<=o.mx+o.menuW&&a>=n&&a<=n+o.itemH-6){t.tutorialMenuSelection=e,t.audio.menuConfirm(),t.executeTutorialCompletionChoice(e);return}}}triggerDirectionalDash(e,t=!1){let n=e.keybinds,r=e.keys[n.moveForward],i=e.keys[n.moveBack],a=e.keys[n.moveLeft],o=e.keys[n.moveRight];if(r||i||a||o){let t=Math.cos(e.player.angle),n=Math.sin(e.player.angle),s=0,c=0;r&&(s+=t,c+=n),i&&(s-=t,c-=n),a&&(s+=n,c-=t),o&&(s-=n,c+=t);let l=Math.sqrt(s*s+c*c);l>0?(s/=l,c/=l,e.triggerDash(null,s,c)):e.triggerDash(e.keybinds.moveForward)}else t&&e.triggerDash(e.keybinds.moveForward)}handleSettingsTap(e){let t=this.game,n=t.hudCanvas,r=n.width/window.innerWidth,i=n.height/window.innerHeight,a=n.width,o=n.height,s=e.clientX*r,c=e.clientY*i,{headerH:l,sideW:u,panelX:d,panelW:f,contentTop:p,catItemH:m,itemHeights:h}=vn(a,o,t.settingsSelection,t.isTouchDevice,t.settingsCategory);if(s<u&&c>l){let e=mn(t.isTouchDevice),n=Math.floor((c-p)/m);n>=0&&n<e.length&&(t.settingsCategory=e[n],t.settingsSelection=0,t.audio.menuSelect());return}let g=p;for(let e=0;e<h.length;e++){if(c>=g&&c<=g+h[e]&&s>=d&&s<=d+f){t.settingsSelection=e,s<d+f/2?t.handleKeyPress(`ArrowLeft`):t.handleKeyPress(`ArrowRight`);return}g+=h[e]}c>g&&t.handleKeyPress(`Escape`)}handleUpgradeTap(e){let t=this.game.hudW,n=this.game.hudH,r=t/window.innerWidth,i=n/window.innerHeight,a=e.clientX*r,o=e.clientY*i,s=this.game,c=Object.keys(b),l=yn(t,n,c.length,this.game.isTouchDevice);if(o>=l.contY-18&&o<=l.contY+18){s.upgradeSelection=c.length,s.handleKeyPress(`Enter`);return}for(let e=0;e<c.length;e++){let t=e%l.cols,n=Math.floor(e/l.cols),r=t===0?l.leftX:l.rightX,i=l.startY+n*(l.cardH+l.cardGap);if(a>=r&&a<=r+l.colW&&o>=i&&o<=i+l.cardH){s.upgradeSelection=e,s.handleKeyPress(`Enter`);return}}}handleControlsTap(e){let t=this.game.hudW,n=t/window.innerWidth,r=this.game.hudH/window.innerHeight,i=e.clientX*n,a=e.clientY*r,o=this.game;if(o.rebindingKey)return;let s=Object.keys(o.keybinds),c=t/2-240;for(let e=0;e<s.length;e++){let t=100+e*36;if(i>=c&&i<=c+480&&a>=t-2&&a<=t+36-6){o.controlsSelection=e,o.handleKeyPress(`Enter`);return}}let l=100+s.length*36+10;if(i>=c&&i<=c+480&&a>=l-2&&a<=l+36-6){o.controlsSelection=s.length,o.handleKeyPress(`Enter`);return}o.handleKeyPress(`Escape`)}render(){let e=this.ctx||(this.ctx=this.canvas.getContext(`2d`)),t=this.zones;e.clearRect(0,0,t.w,t.h);let n=this.game.state;if(n===`paused`){this.renderPauseButtons(e);return}if(n===`settings`){this.renderSettingsHint(e);return}if(n===`characterCreate`){this.renderCreatorOverlay(e);return}if(n!==`playing`)return;if(this.showTutorial&&!this.tutorialDismissed){this.renderTouchTutorial(e);return}e.globalAlpha=.35,this._lookHintStart||(this._lookHintStart=performance.now());let r=(performance.now()-this._lookHintStart)/1e3;if(r<6&&(e.globalAlpha=r<5?.12:.12*(6-r),e.fillStyle=`#00ccff`,e.font=`14px monospace`,e.textAlign=`center`,e.textBaseline=`middle`,e.fillText(`↔ DRAG TO LOOK ↔`,t.w*.55,t.h*.35),e.globalAlpha=.35),this.joyActive){let t=this.joyOrigin;e.beginPath(),e.arc(t.x,t.y,this.joyRadius,0,Math.PI*2),e.strokeStyle=`#00ccff`,e.lineWidth=2,e.stroke();let n=this.joyPos.x-t.x,r=this.joyPos.y-t.y,i=Math.sqrt(n*n+r*r),a=Math.min(i,this.joyRadius),o=t.x,s=t.y;i>0&&(o=t.x+n/i*a,s=t.y+r/i*a),e.beginPath(),e.arc(o,s,22,0,Math.PI*2),e.fillStyle=`#00ccff`,e.fill()}else{let n=t.joyCenter;e.globalAlpha=.15,e.beginPath(),e.arc(n.x,n.y,this.joyRadius,0,Math.PI*2),e.strokeStyle=`#00ccff`,e.lineWidth=2,e.stroke(),e.beginPath(),e.arc(n.x,n.y,22,0,Math.PI*2),e.fillStyle=`#00ccff`,e.fill(),e.globalAlpha=.35}this.drawButton(e,t.fireBtn.x,t.fireBtn.y,t.fireBtn.r,`FIRE`,this.activeButtons.has(`fire`)?`#ff4444`:`#ff6644`),this.drawButton(e,t.aimBtn.x,t.aimBtn.y,t.aimBtn.r,`AIM`,this.game.player?.isAiming?`#66eeff`:`#337799`),this.drawButton(e,t.dashBtn.x,t.dashBtn.y,t.dashBtn.r,`DASH`,this.activeButtons.has(`dash`)?`#44ffff`:`#00cccc`),this.drawButton(e,t.interactBtn.x,t.interactBtn.y,t.interactBtn.r,`USE`,this.activeButtons.has(`interact`)?`#44ff44`:`#00cc44`);let i=this.game.player&&this.game.player.chronoActive;this.drawButton(e,t.chronoBtn.x,t.chronoBtn.y,t.chronoBtn.r,`SLOW`,i?`#cc44ff`:this.activeButtons.has(`chrono`)?`#aa44dd`:`#9944ff`),this.drawButton(e,t.crouchBtn.x,t.crouchBtn.y,t.crouchBtn.r,`CROUCH`,this.activeButtons.has(`crouch`)?`#66dd66`:`#558855`),this.drawButton(e,t.sprintBtn.x,t.sprintBtn.y,t.sprintBtn.r,this.sprintToggleActive?`RUN`:`WALK`,this.sprintToggleActive?`#ffaa00`:`#887744`);{let n=this.game.player;if(n){let r=s[n.weapons[n.currentWeapon]],i=r?r.name.split(` `)[0].toUpperCase():`W1`;this.drawButton(e,t.weaponBtn.x,t.weaponBtn.y,t.weaponBtn.r,i,this.activeButtons.has(`weapon`)?`#ffdd44`:`#aa8833`)}}if(this.drawButton(e,t.pauseBtn.x,t.pauseBtn.y,t.pauseBtn.r,`II`,this.activeButtons.has(`pause`)?`#ffdd44`:`rgba(200,200,200,0.5)`),this.canFullscreen&&!this.isStandalone){let n=!!(document.fullscreenElement||document.webkitFullscreenElement);e.beginPath(),e.arc(t.fullscreenBtn.x,t.fullscreenBtn.y,t.fullscreenBtn.r,0,Math.PI*2),e.fillStyle=n?`rgba(0,255,200,0.35)`:`rgba(255,255,255,0.3)`,e.fill(),e.fillStyle=`#fff`,e.font=`bold 14px monospace`,e.fillText(n?`⊡`:`⊞`,t.fullscreenBtn.x,t.fullscreenBtn.y)}e.globalAlpha=1}renderTouchTutorial(e){let t=this.zones.w,n=this.zones.h,r=this.zones.isCompactPhone;e.fillStyle=`rgba(0, 0, 0, 0.85)`,e.fillRect(0,0,t,n),e.textAlign=`center`,e.textBaseline=`middle`,e.fillStyle=`#00ffcc`,e.font=`bold ${r?18:24}px monospace`,e.fillText(`TOUCH CONTROLS`,t/2,r?24:50);let i=r?42:80,a=r?n-80:n-160;e.fillStyle=`rgba(0, 200, 255, 0.2)`,e.fillRect(0,i,t*.4,a),e.fillStyle=`#00ccff`,e.font=`bold ${r?13:16}px monospace`,e.fillText(`MOVE`,t*.2,n/2-(r?24:40)),e.fillStyle=`#aabbcc`,e.font=`${r?11:14}px monospace`,e.fillText(`Touch to place stick`,t*.2,n/2-(r?8:15)),r||e.fillText(`Push far to sprint`,t*.2,n/2+5),e.fillStyle=`rgba(0, 200, 255, 0.1)`,e.fillRect(t*.4,i,t*.6,a),e.fillStyle=`#00ccff`,e.font=`bold ${r?13:16}px monospace`,e.fillText(`LOOK`,t*.7,n/2-(r?24:40)),e.fillStyle=`#aabbcc`,e.font=`${r?11:14}px monospace`,e.fillText(`Drag to aim`,t*.7,n/2-(r?8:15));let o=r?11:14,s=r?16:25,c=r?n-80:n-145,l=[{label:`FIRE`,desc:`Big button`,color:`#ff6644`},{label:`DASH`,desc:`Top-right`,color:`#00cccc`},{label:`USE`,desc:`Top-left`,color:`#00cc44`},{label:`SLOW`,desc:`Time slow`,color:`#9944ff`},{label:`RUN/WALK`,desc:`Sprint toggle`,color:`#ffaa00`}];for(let n=0;n<l.length;n++)e.fillStyle=l[n].color,e.font=`bold ${o}px monospace`,e.fillText(`${l[n].label} — ${l[n].desc}`,t/2,c+n*s);e.fillStyle=`rgba(255, 255, 255, ${.5+.3*Math.sin(performance.now()/400)})`,e.font=`bold ${r?13:16}px monospace`,e.fillText(`TAP ANYWHERE TO START`,t/2,n-(r?12:30))}renderCreatorOverlay(e){let t=this.zones.w,n=this.zones.h,{btnH:r,btnW:i,btnY:a,saveX:o,cancelX:s}=this._creatorButtonBounds(t,n);e.globalAlpha=.9,e.textAlign=`center`,e.textBaseline=`middle`,e.fillStyle=`rgba(0, 180, 80, 0.5)`,e.beginPath(),e.roundRect(o,a,i,r,8),e.fill(),e.strokeStyle=`#00cc66`,e.lineWidth=2,e.beginPath(),e.roundRect(o,a,i,r,8),e.stroke(),e.fillStyle=`#fff`,e.font=`bold 16px monospace`,e.fillText(`✓ SAVE`,o+i/2,a+r/2),e.fillStyle=`rgba(180, 40, 40, 0.4)`,e.beginPath(),e.roundRect(s,a,i,r,8),e.fill(),e.strokeStyle=`#cc3333`,e.lineWidth=2,e.beginPath(),e.roundRect(s,a,i,r,8),e.stroke(),e.fillStyle=`#fff`,e.font=`bold 16px monospace`,e.fillText(`✗ BACK`,s+i/2,a+r/2),e.font=`bold 36px monospace`,e.fillStyle=`rgba(0, 255, 200, 0.6)`,e.fillText(`◀`,30,72),e.fillText(`▶`,t-30,72),e.font=`11px monospace`,e.fillStyle=`rgba(255,255,255,0.35)`,e.fillText(`Tap tabs · ◀ ▶ to switch · Tap items to select`,t/2,a-12),e.globalAlpha=1}_creatorButtonBounds(e,t){let n=this.safeArea,r=Math.min(140,Math.max(110,e*.18));return{btnH:52,btnW:r,gap:16,btnY:t-52-16-n.bottom,saveX:e/2+16/2,cancelX:e/2-16/2-r}}renderPauseButtons(e){let t=this.zones.w,n=this.zones.h,r=_n(t,n,this.game.mode);e.globalAlpha=.7;for(let t of r.buttons){let n=t.x,r=t.y,i=t.w,a=t.h;e.fillStyle=t.color,e.strokeStyle=`#fff`,e.lineWidth=2,e.beginPath(),e.roundRect(n,r,i,a,8),e.fill(),e.stroke(),e.fillStyle=`#fff`,e.font=`bold 13px monospace`,e.textAlign=`center`,e.textBaseline=`middle`,e.fillText(t.label,n+i/2,r+a/2)}if(r.saveBtn){let t=r.saveBtn;e.fillStyle=`#00aa44`,e.beginPath(),e.roundRect(t.x,t.y,t.w,t.h,8),e.fill(),e.stroke(),e.fillStyle=`#fff`,e.fillText(`SAVE`,t.x+t.w/2,t.y+t.h/2)}e.globalAlpha=1}renderSettingsHint(e){let t=this.zones.w,n=this.zones.h;e.globalAlpha=.6;let r=(t-120)/2,i=n-60;e.fillStyle=`#556677`,e.strokeStyle=`#aabbcc`,e.lineWidth=2,e.beginPath(),e.roundRect(r,i,120,44,8),e.fill(),e.stroke(),e.fillStyle=`#fff`,e.font=`bold 14px monospace`,e.textAlign=`center`,e.textBaseline=`middle`,e.fillText(`< BACK`,r+120/2,i+44/2),e.fillStyle=`#8899aa`,e.font=`12px monospace`,e.fillText(`Tap setting to change  ·  Left = decrease  ·  Right = increase`,t/2,i-12),e.globalAlpha=1}toggleFullscreen(){if(!this.canFullscreen||this.isStandalone)return;let e=document.fullscreenElement||document.webkitFullscreenElement,t;if(e)t=document.exitFullscreen?document.exitFullscreen():document.webkitExitFullscreen?document.webkitExitFullscreen():void 0;else{let e=document.documentElement;t=e.requestFullscreen?e.requestFullscreen():e.webkitRequestFullscreen?e.webkitRequestFullscreen():void 0}t&&typeof t.catch==`function`&&t.catch(()=>{})}drawButton(e,t,n,r,i,a){e.beginPath(),e.arc(t,n,r,0,Math.PI*2),e.fillStyle=a,e.fill(),e.strokeStyle=`#fff`,e.lineWidth=2,e.stroke(),e.fillStyle=`#fff`,e.font=`bold ${Math.max(12,r*.45)}px monospace`,e.textAlign=`center`,e.textBaseline=`middle`,e.fillText(i,t,n)}},vs={ultra:{renderScale:1,particleMultiplier:1,drawDistance:20,enableScanlines:!0,enableVignette:!0,enableFloorTexture:!0,enableBloom:!0,enableChromaticAberration:!0,enableFilmGrain:!0},high:{renderScale:.85,particleMultiplier:.8,drawDistance:18,enableScanlines:!0,enableVignette:!0,enableFloorTexture:!0,enableBloom:!0,enableChromaticAberration:!0,enableFilmGrain:!0},medium:{renderScale:.7,particleMultiplier:.5,drawDistance:14,enableScanlines:!1,enableVignette:!0,enableFloorTexture:!0,enableBloom:!1,enableChromaticAberration:!1,enableFilmGrain:!0},low:{renderScale:.5,particleMultiplier:.3,drawDistance:10,enableScanlines:!1,enableVignette:!1,enableFloorTexture:!1,enableBloom:!1,enableChromaticAberration:!1,enableFilmGrain:!1},"ultra-low":{renderScale:.35,particleMultiplier:.15,drawDistance:8,enableScanlines:!1,enableVignette:!1,enableFloorTexture:!1,enableBloom:!1,enableChromaticAberration:!1,enableFilmGrain:!1}},ys=class{constructor(e){this.targetFPS=e?.targetFPS??55,this.minScale=e?.minScale??.35,this.maxScale=e?.maxScale??1,this.renderScale=this.maxScale,this.stableScale=this.renderScale,this.history=[],this.historySize=90,this.adjustInterval=1500,this.lastAdjust=0,this.lastResize=0,this.particleMultiplier=1,this.drawDistance=20,this.enableScanlines=!0,this.enableVignette=!0,this.enableFloorTexture=!0,this.auto=!0}recordFPS(e){this.history.push(e),this.history.length>this.historySize&&this.history.shift()}get averageFPS(){if(this.history.length===0)return 60;let e=0;for(let t of this.history)e+=t;return e/this.history.length}adjust(e){if(!this.auto||e-this.lastAdjust<this.adjustInterval||(this.lastAdjust=e,this.history.length<this.historySize))return!1;let t=this.averageFPS,n=this.renderScale;return t<this.targetFPS-10?this.renderScale*=.93:t<this.targetFPS-5?this.renderScale*=.98:t>this.targetFPS+5&&this.renderScale<this.maxScale&&(this.renderScale*=1.01),this.renderScale=er(this.renderScale,this.minScale,this.maxScale),this.renderScale<.6?(this.enableScanlines=!1,this.enableVignette=!1,this.particleMultiplier=.3,this.drawDistance=10,this.enableFloorTexture=!1):this.renderScale<.8?(this.enableScanlines=!1,this.enableVignette=!0,this.particleMultiplier=.5,this.drawDistance=14,this.enableFloorTexture=!0):(this.enableScanlines=!0,this.enableVignette=!0,this.particleMultiplier=1,this.drawDistance=20,this.enableFloorTexture=!0),Math.abs(this.renderScale-n)<=.04||e-this.lastResize<2e3?!1:(this.lastResize=e,!0)}applyPreset(e){let t=vs[e];t&&(this.auto=!1,this.renderScale=t.renderScale,this.stableScale=t.renderScale,this.particleMultiplier=t.particleMultiplier,this.drawDistance=t.drawDistance,this.enableScanlines=t.enableScanlines,this.enableVignette=t.enableVignette,this.enableFloorTexture=t.enableFloorTexture)}applyCustom({renderScale:e,particleMultiplier:t,drawDistance:n,enableScanlines:r,enableVignette:i,enableFloorTexture:a}){this.auto=!1,e!=null&&(this.renderScale=this.stableScale=er(e,this.minScale,this.maxScale)),t!=null&&(this.particleMultiplier=er(t,0,1)),n!=null&&(this.drawDistance=n),r!=null&&(this.enableScanlines=!!r),i!=null&&(this.enableVignette=!!i),a!=null&&(this.enableFloorTexture=!!a)}useAuto(){this.auto=!0}},bs=ao(),xs=new URLSearchParams(window.location.search).has(`debug`),X=document.getElementById(`gameCanvas`),Ss=document.getElementById(`hudCanvas`),Cs=document.getElementById(`titleScreen`),ws=document.getElementById(`modeSelect`),Ts=document.getElementById(`btnContinueCampaign`),Es=document.getElementById(`continueCampaignDesc`),Ds=document.getElementById(`btnContinueArena`),Os=document.getElementById(`continueArenaDesc`),Z=new gs(X,Ss),ks=new ys({targetFPS:55,minScale:Z.isTouchDevice?.35:.5,maxScale:1});Z.quality=ks,Z.applyPerformanceSettings(),r();var As=document.getElementById(`versionLabel`);if(As&&(As.textContent=`v${us}`),bs){let e=Cs.querySelector(`.start-prompt`);e&&(e.textContent=`[ TAP TO START ]`)}function js(){let e=Math.min(window.devicePixelRatio||1,2),t=window.innerWidth,n=window.innerHeight,r=t,i=n;if(Z.isTouchDevice){let e=1280;if(r>e||i>e){let t=e/Math.max(r,i);r=Math.round(r*t),i=Math.round(i*t)}}Z.dpr=e,Z.hudW=t,Z.hudH=n,Ss.style.width=t+`px`,Ss.style.height=n+`px`,Ss.width=Math.round(t*e),Ss.height=Math.round(n*e),Z.hudCtx.setTransform(e,0,0,e,0,0);let a=ks.stableScale??ks.renderScale;X.style.width=t+`px`,X.style.height=n+`px`;let o=Math.round(r*a),s=Math.round(i*a);X.width=o,X.height=s,Z.renderer&&Z.renderer.resize(o,s)}window.addEventListener(`resize`,js),window.addEventListener(`cc-quality-change`,js),js();function Q(){Cs.classList.add(`hidden`),ws.classList.add(`hidden`),X.style.display=`block`,Ss.style.display=`block`}function Ms(){let e=Z.getSaveInfo(),t=e.find(e=>e.mode===`campaign`),n=e.find(e=>e.mode===`arena`);t?(Ts.classList.remove(`hidden`),Es.textContent=`Level ${t.level} (${t.score} pts)`):Ts.classList.add(`hidden`),n?(Ds.classList.remove(`hidden`),Os.textContent=`Round ${n.round} (${n.score} pts)`):Ds.classList.add(`hidden`)}function Ns(){Cs.classList.add(`hidden`),ws.classList.remove(`hidden`),Ms(),Z.state=J.MODE_SELECT,window.dispatchEvent(new Event(`cc:first-interaction`)),requestAnimationFrame(()=>document.getElementById(`btnCampaign`)?.focus())}function Ps(){Z.audio.init(),Z.audio.resume(),Z.applyAudioSettings()}document.getElementById(`btnArena`).addEventListener(`click`,()=>{Ps(),Z.audio.menuConfirm(),Q(),t(`mode_start`,{mode:`arena`}),Z.startArena()});async function Fs(e){let t=`cc_seen_intro_flipbook`;if(Z.save?.hasSeenIntroMemory?.(t)??(()=>{try{return localStorage.getItem(t)===`1`}catch{return!1}})())return e();Q(),await Z.startCutscene(`intro_flipbook`,()=>{try{localStorage.setItem(t,`1`)}catch{}e()})}function Is(e){let t=`cc_seen_creator_intro`,n=!1;try{n=localStorage.getItem(t)===`1`}catch{}if(n)return e();Q(),Z.creatorCategory=0,Z._creatorSaveCallback=n=>{if(n)try{localStorage.setItem(t,`1`)}catch{}e()},Z.state=J.CHARACTER_CREATE}document.getElementById(`btnCampaign`).addEventListener(`click`,()=>{Ps(),Z.audio.menuConfirm(),Q(),t(`mode_start`,{mode:`campaign`}),Is(()=>{Fs(()=>{Z.shouldShowTutorial()?Z.showCampaignPrompt():Z.startCampaign()})})}),document.getElementById(`btnTutorial`).addEventListener(`click`,()=>{Ps(),Z.audio.menuConfirm(),Q(),t(`mode_start`,{mode:`tutorial`}),Z.startTutorial()}),document.getElementById(`btnBuilder`).addEventListener(`click`,()=>{Ps(),Z.audio.menuConfirm(),Q(),t(`mode_start`,{mode:`builder`}),Z.startBuilder()}),document.getElementById(`btnMeltdown`).addEventListener(`click`,()=>{Ps(),Z.audio.menuConfirm(),Q(),t(`mode_start`,{mode:`meltdown`}),Z.startMeltdown()}),document.getElementById(`btnCustomize`).addEventListener(`click`,()=>{Ps(),Z.audio.menuConfirm(),Q(),t(`mode_start`,{mode:`creator`}),Z.creatorReturnState=J.MODE_SELECT,Z.state=J.CHARACTER_CREATE}),document.getElementById(`btnStats`).addEventListener(`click`,()=>{Ps(),Z.audio.menuConfirm(),Q(),Z.state=J.STATS,Z._statsReturnToMenu=!0}),window.ccDevTutorial=e=>{Z.setAlwaysTutorial(e!==!1),console.log(`[CC DEV] Always-show-tutorial: ${Z.alwaysShowTutorial?`ON`:`OFF`}`)},document.getElementById(`btnBack`).addEventListener(`click`,()=>{Z.audio.menuSelect(),ws.classList.add(`hidden`),Cs.classList.remove(`hidden`),Z.state=J.TITLE});var $=document.getElementById(`btnFullscreen`),Ls=typeof document.documentElement.requestFullscreen==`function`||typeof document.documentElement.webkitRequestFullscreen==`function`,Rs=window.navigator.standalone===!0||window.matchMedia(`(display-mode: standalone)`).matches;if($)if(!Ls)if(Rs)$.style.display=`none`;else if(bs&&/iP(hone|ad|od)/.test(navigator.userAgent)){let e=navigator.userAgent;/Safari/.test(e)&&!/CriOS|FxiOS|OPiOS|EdgiOS|DuckDuckGo|brave/i.test(e)&&/Apple/.test(navigator.vendor)?($.textContent=`📲 ADD TO HOME SCREEN`,$.setAttribute(`aria-label`,`Add to Home Screen`),$.title=`Tap Share → Add to Home Screen for fullscreen mode`,$.addEventListener(`click`,()=>{alert(`To play fullscreen on this device:

1. Tap the Share button (↑) in Safari
2. Select "Add to Home Screen"
3. Open Clockwork Carnage from your home screen

The game will run in fullscreen mode!`)})):($.textContent=`📲 OPEN IN SAFARI`,$.setAttribute(`aria-label`,`Open in Safari to add to Home Screen`),$.title=`Open in Safari to add as home screen app`,$.addEventListener(`click`,()=>{alert(`To play fullscreen on this device:

1. Open this page in Safari
2. Tap the Share button (↑)
3. Select "Add to Home Screen"
4. Open Clockwork Carnage from your home screen

Note: Only Safari supports home screen apps on iOS.`)}))}else $.style.display=`none`;else if(Rs)$.style.display=`none`;else{$.addEventListener(`click`,async()=>{try{if(document.fullscreenElement||document.webkitFullscreenElement){let e=document.exitFullscreen||document.webkitExitFullscreen;e&&await e.call(document)}else{let e=document.documentElement,t=e.requestFullscreen||e.webkitRequestFullscreen;t&&await t.call(e)}}catch{}});let e=()=>{$.textContent=document.fullscreenElement||document.webkitFullscreenElement?`⛶ EXIT FULLSCREEN`:`⛶ FULLSCREEN`};document.addEventListener(`fullscreenchange`,e),document.addEventListener(`webkitfullscreenchange`,e),e()}Ts.addEventListener(`click`,()=>{Ps(),Z.audio.menuConfirm(),Z.loadCampaignSave()?Q():Ms()}),Ds.addEventListener(`click`,()=>{Ps(),Z.audio.menuConfirm(),Z.loadArena()?Q():Ms()}),Cs.addEventListener(`click`,()=>{Ps(),Z.audio.menuConfirm(),Ns()}),document.addEventListener(`keydown`,e=>{if(Z.state===J.TITLE&&(e.code===`Enter`||e.code===`Space`||e.code===`GamepadStart`)){Ps(),Z.audio.menuConfirm(),Ns();return}if(Z.state===J.MODE_SELECT){if(e.code===`Digit1`)document.getElementById(`btnCampaign`).click();else if(e.code===`Digit2`)document.getElementById(`btnMeltdown`).click();else if(e.code===`Digit3`)document.getElementById(`btnArena`).click();else if(e.code===`Digit4`)document.getElementById(`btnTutorial`).click();else if(e.code===`Digit5`)document.getElementById(`btnBuilder`).click();else if(e.code===`Digit6`)document.getElementById(`btnCustomize`).click();else if(e.code===`Digit7`)document.getElementById(`btnStats`).click();else if(e.code===`Escape`)document.getElementById(`btnBack`).click();else if(e.code===`ArrowUp`||e.code===`ArrowDown`||e.code===`KeyW`||e.code===`KeyS`){let t=Array.from(ws.querySelectorAll(`.mode-btn:not(.hidden)`));if(t.length===0)return;let n=t.indexOf(document.activeElement),r=e.code===`ArrowUp`||e.code===`KeyW`?-1:1,i;i=n===-1?r===1?0:t.length-1:(n+r+t.length)%t.length,t[i].focus(),Z.audio.menuSelect()}else if(e.code===`Enter`||e.code===`Space`){let e=document.activeElement;e&&e.classList.contains(`mode-btn`)&&e.click()}}(Z.state===J.GAME_OVER||Z.state===J.VICTORY)&&(e.code===`Enter`||e.code===`Space`)&&(Cs.classList.remove(`hidden`),ws.classList.add(`hidden`))});var zs=null,Bs=0,Vs=0,Hs=0;function Us(e){try{let t=xs||Z.showFPS?performance.now():0;Z.update(e);let n=Z.settings.batterySaver?30:[0,30,60,90,120][Z.settings.frameTarget]||0;if(!(!n||!Hs||e-Hs>=1e3/n)){requestAnimationFrame(Us);return}Hs=e;let r=t?performance.now()-t:Z.deltaTime*1e3;Z.state!==zs&&(zs=Z.state,Z.state===J.TITLE?(Cs.classList.remove(`hidden`),ws.classList.add(`hidden`),X.style.display=`none`,Ss.style.display=`none`):Z.state===J.MODE_SELECT?(Cs.classList.add(`hidden`),ws.classList.remove(`hidden`),Ms(),X.style.display=`none`,Ss.style.display=`none`):(Cs.classList.add(`hidden`),ws.classList.add(`hidden`),X.style.display=`block`,Ss.style.display=`block`));let i=0;if(Z.state!==J.TITLE&&Z.state!==J.MODE_SELECT){let e=xs||Z.showFPS?performance.now():0;if(Z.render(),i=e?performance.now()-e:0,Z.transitioning&&Z.transitionAlpha>0){let e=Z.hudCtx;Z._renderTransitionOverlay(e,Z.hudW,Z.hudH);let t=Z.renderer.ctx;Z._renderTransitionOverlay(t,X.width,X.height)}}(xs||Z.showFPS)&&Z.profiler.recordFrame(r,i,Z.entities.length);let a=Vs?e-Vs:1e3/60;if(Vs=e,ks.recordFPS(1e3/Math.max(a,1)),ks.adjust(e)&&(Z.applyPerformanceSettings(),ks.stableScale=ks.renderScale,js()),Z.showFPS){let e=Z.hudCtx;Z.profiler.render(e,4,4,220,280)}Ws&&Ws.render(),Bs=0}catch(e){if(Bs++,console.error(`[Clockwork Carnage] Frame error (${Bs}):`,e),Bs>=60){console.error(`[Clockwork Carnage] Too many consecutive errors, halting game loop.`);return}}requestAnimationFrame(Us)}if(requestAnimationFrame(Us),window.addEventListener(`beforeunload`,()=>{Z.state===J.PLAYING&&Z.mode===`arena`&&Z.saveArena(),Z.state===J.PLAYING&&Z.mode===`campaign`&&Z.saveCampaign()}),window.__ccBeforeUnloadRegistered=!0,window.ccProfiler=()=>Z.profiler.getSnapshot(),xs){let e=`${location.origin}/clockwork_carnage/js/testing/`,t=`${e}harness.js`,n=`${e}debug-bridge.js`,r=`${e}telemetry.js`;ls(()=>import(t).then(e=>{window.ccTest=e.createTestRunner(Z)}),[]).catch(()=>{}),ls(()=>import(n).then(e=>{window.ccDebug=e.createDebugBridge(Z)}),[]).catch(()=>{}),ls(()=>import(r).then(e=>{window._ccTelemetryModule=e,window.ccTelemetry=e.createTelemetry(Z)}),[]).catch(()=>{})}var Ws=_s.init(Z);Ws&&(Z.touchControls=Ws);var Gs=document.createElement(`template`);Gs.innerHTML=`
<style>
  :host {
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
  svg {
    width: 100%;
    height: 100%;
  }
</style>
<svg viewBox="0 0 700 400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="glow-strong">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <radialGradient id="riftGlow" cx="50%" cy="52%" r="45%">
      <stop offset="0%" stop-color="#8844ff" stop-opacity="0.18" />
      <stop offset="40%" stop-color="#00ccff" stop-opacity="0.07" />
      <stop offset="100%" stop-color="#020210" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="groundGlow" cx="50%" cy="100%" r="60%">
      <stop offset="0%" stop-color="#2a0a44" stop-opacity="0.5" />
      <stop offset="100%" stop-color="#020210" stop-opacity="0" />
    </radialGradient>
    <pattern id="scanlines" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="2" fill="rgba(0,0,0,0.15)" />
    </pattern>
    <pattern id="circuitGrid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0 L0 0 0 40" fill="none" stroke="rgba(0,200,255,0.03)" stroke-width="0.5"/>
    </pattern>
    <linearGradient id="stationMetal" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#182b38" />
      <stop offset="0.45" stop-color="#071018" />
      <stop offset="1" stop-color="#02050a" />
    </linearGradient>
    <linearGradient id="cyanRail" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#00ffd5" stop-opacity="0" />
      <stop offset="0.5" stop-color="#00ffd5" stop-opacity="0.85" />
      <stop offset="1" stop-color="#00ffd5" stop-opacity="0" />
    </linearGradient>
  </defs>

  <!-- Deep space background -->
  <rect width="700" height="400" fill="#020210" />

  <!-- Ground atmospheric glow -->
  <rect width="700" height="400" fill="url(#groundGlow)" />

  <!-- Circuit grid overlay (very subtle) -->
  <rect width="700" height="400" fill="url(#circuitGrid)" opacity="0.8" />

  <!-- Central temporal rift glow -->
  <rect width="700" height="400" fill="url(#riftGlow)" />

  <!-- Chronos Station silhouette: layered hangar plates and orbital gantry -->
  <g opacity="0.92">
    <path d="M40 330 C130 285 250 270 350 276 C470 284 590 286 668 330 L668 400 L40 400 Z" fill="url(#stationMetal)" />
    <path d="M72 344 C170 318 270 306 355 310 C456 314 555 318 630 346" fill="none" stroke="#25495a" stroke-width="18" opacity="0.55" />
    <path d="M92 340 C186 322 270 316 350 318 C445 320 535 324 612 342" fill="none" stroke="url(#cyanRail)" stroke-width="2.5" filter="url(#glow)" />
    <g opacity="0.45" stroke="#77ddff" stroke-width="0.8">
      <path d="M130 336 L170 304 L228 318 L272 296 L344 318 L424 298 L480 320 L548 304 L604 336" fill="none" />
      <path d="M168 345 L168 390 M250 326 L250 398 M350 318 L350 400 M452 326 L452 398 M548 344 L548 390" />
    </g>
    <g filter="url(#glow)" opacity="0.7">
      <rect x="124" y="350" width="32" height="3" fill="#00ffcc" />
      <rect x="222" y="336" width="46" height="3" fill="#00ccff" />
      <rect x="320" y="326" width="58" height="3" fill="#b366ff" />
      <rect x="444" y="338" width="42" height="3" fill="#00ffcc" />
      <rect x="542" y="354" width="34" height="3" fill="#ff44aa" />
    </g>
  </g>

  <!-- Temporal rift rings -->
  <g filter="url(#glow)" opacity="0.55">
    <circle cx="350" cy="210" r="140" fill="none" stroke="#8844ff" stroke-width="0.8">
      <animate attributeName="r" values="140;148;140" dur="4s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.55;0.3;0.55" dur="4s" repeatCount="indefinite" />
    </circle>
    <circle cx="350" cy="210" r="105" fill="none" stroke="#00ccff" stroke-width="0.6">
      <animate attributeName="r" values="105;112;105" dur="5.5s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.5;0.25;0.5" dur="5.5s" repeatCount="indefinite" />
    </circle>
    <circle cx="350" cy="210" r="68" fill="none" stroke="#ff44aa" stroke-width="0.5">
      <animate attributeName="r" values="68;74;68" dur="3s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.4;0.15;0.4" dur="3s" repeatCount="indefinite" />
    </circle>
  </g>

  <!-- Background Stars -->
  <g opacity="0.6">
    <circle cx="50" cy="30" r="1" fill="#ffffff">
      <animate attributeName="opacity" values="0.3;1;0.3" dur="2.1s" repeatCount="indefinite" />
    </circle>
    <circle cx="150" cy="80" r="0.8" fill="#aaddff">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="1.7s" repeatCount="indefinite" />
    </circle>
    <circle cx="600" cy="50" r="1.2" fill="#ffffff">
      <animate attributeName="opacity" values="0.2;0.9;0.2" dur="2.8s" repeatCount="indefinite" />
    </circle>
    <circle cx="520" cy="120" r="0.7" fill="#ccddff">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.9s" repeatCount="indefinite" />
    </circle>
    <circle cx="80" cy="350" r="1" fill="#ffffff">
      <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2.3s" repeatCount="indefinite" />
    </circle>
    <circle cx="650" cy="340" r="0.9" fill="#aaddff">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
    </circle>
    <circle cx="200" cy="360" r="1.1" fill="#ffffff">
      <animate attributeName="opacity" values="0.2;0.7;0.2" dur="3.1s" repeatCount="indefinite" />
    </circle>
    <circle cx="400" cy="20" r="0.6" fill="#ccddff">
      <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
    </circle>
    <circle cx="300" cy="370" r="0.8" fill="#ffffff">
      <animate attributeName="opacity" values="0.3;0.9;0.3" dur="1.8s" repeatCount="indefinite" />
    </circle>
    <circle cx="550" cy="380" r="1" fill="#aaddff">
      <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2.6s" repeatCount="indefinite" />
    </circle>
    <!-- Extra stars for depth -->
    <circle cx="470" cy="290" r="0.7" fill="#ffffff">
      <animate attributeName="opacity" values="0.2;0.8;0.2" dur="3.4s" repeatCount="indefinite" />
    </circle>
    <circle cx="60" cy="150" r="0.9" fill="#ccddff">
      <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2.2s" repeatCount="indefinite" />
    </circle>
    <circle cx="640" cy="200" r="0.6" fill="#ffffff">
      <animate attributeName="opacity" values="0.3;1;0.3" dur="1.6s" repeatCount="indefinite" />
    </circle>
    <circle cx="120" cy="280" r="1" fill="#aaddff">
      <animate attributeName="opacity" values="0.2;0.7;0.2" dur="2.9s" repeatCount="indefinite" />
    </circle>
  </g>

  <!-- Glitch Lines -->
  <g opacity="0.75">
    <rect x="0" y="95" width="700" height="1.5" fill="#00ffcc">
      <animate attributeName="y" values="95;97;95;200;95" dur="4s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;0.9;0;0.9;0" dur="4s" repeatCount="indefinite" />
    </rect>
    <rect x="0" y="250" width="700" height="1" fill="#ff0088">
      <animate attributeName="y" values="250;248;310;250" dur="3s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;0.2;0;0.15;0" dur="3s" repeatCount="indefinite" />
    </rect>
    <rect x="100" y="180" width="500" height="0.5" fill="#ffffff">
      <animate attributeName="y" values="180;182;100;180" dur="5s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;0.1;0;0.2;0" dur="5s" repeatCount="indefinite" />
    </rect>
  </g>

  <!-- Floating temporal particles -->
  <g filter="url(#glow)">
    <circle cx="300" cy="180" r="1.5" fill="#00ffcc">
      <animate attributeName="cx" values="300;280;310;300" dur="5s" repeatCount="indefinite" />
      <animate attributeName="cy" values="180;160;170;180" dur="5s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;0.8;0;0.6;0" dur="5s" repeatCount="indefinite" />
    </circle>
    <circle cx="400" cy="210" r="1" fill="#ff4466">
      <animate attributeName="cx" values="400;420;390;400" dur="4s" repeatCount="indefinite" />
      <animate attributeName="cy" values="210;190;220;210" dur="4s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;0.7;0;0.5;0" dur="4s" repeatCount="indefinite" />
    </circle>
    <circle cx="340" cy="230" r="1.2" fill="#ffaa00">
      <animate attributeName="cx" values="340;360;330;340" dur="6s" repeatCount="indefinite" />
      <animate attributeName="cy" values="230;210;240;230" dur="6s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.3;0.9;0.3" dur="6s" repeatCount="indefinite" />
    </circle>
    <circle cx="370" cy="160" r="0.8" fill="#8866ff">
      <animate attributeName="cx" values="370;380;360;370" dur="3.5s" repeatCount="indefinite" />
      <animate attributeName="cy" values="160;150;170;160" dur="3.5s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;0.6;0;0.4;0" dur="3.5s" repeatCount="indefinite" />
    </circle>
    <!-- Extra temporal sparks -->
    <circle cx="220" cy="240" r="0.9" fill="#00ccff">
      <animate attributeName="cx" values="220;230;215;220" dur="7s" repeatCount="indefinite" />
      <animate attributeName="cy" values="240;225;248;240" dur="7s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;0.5;0;0.3;0" dur="7s" repeatCount="indefinite" />
    </circle>
    <circle cx="480" cy="260" r="1.1" fill="#aa44ff">
      <animate attributeName="cx" values="480;495;470;480" dur="4.5s" repeatCount="indefinite" />
      <animate attributeName="cy" values="260;245;270;260" dur="4.5s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;0.65;0;0.4;0" dur="4.5s" repeatCount="indefinite" />
    </circle>
  </g>

  <!-- Scanline overlay -->
  <rect width="700" height="400" fill="url(#scanlines)" opacity="0.5" />
</svg>
`;var Ks=class extends HTMLElement{constructor(){super(),this.attachShadow({mode:`open`}),this.shadowRoot.appendChild(Gs.content.cloneNode(!0))}};customElements.define(`title-background`,Ks);var qs=document.createElement(`template`);qs.innerHTML=`
  <style>
    :host {
      display: block;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
    svg {
      width: 100%;
      height: 100%;
    }
  </style>
  <svg viewBox="0 0 700 400" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
      <filter id="bigGlow">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
      <radialGradient id="portalGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#00ffcc" stop-opacity="0.6">
          <animate attributeName="stop-opacity" values="0.6;0.9;0.6" dur="3s" repeatCount="indefinite" />
        </stop>
        <stop offset="50%" stop-color="#4400ff" stop-opacity="0.3">
          <animate attributeName="stop-opacity" values="0.3;0.5;0.3" dur="4s" repeatCount="indefinite" />
        </stop>
        <stop offset="100%" stop-color="#ff0088" stop-opacity="0" />
      </radialGradient>
      <radialGradient id="clockFace" cx="50%" cy="50%" r="48%">
        <stop offset="0%" stop-color="#1a1a3a" />
        <stop offset="80%" stop-color="#0a0a20" />
        <stop offset="100%" stop-color="#050510" />
      </radialGradient>
    </defs>
  <!-- Portal -->
  <!-- Outer portal corona -->
  <ellipse
    cx="350"
    cy="195"
    rx="170"
    ry="170"
    fill="none"
    stroke="#ff0088"
    stroke-width="2"
    opacity="0.15"
    filter="url(#bigGlow)"
  >
    <animate
      attributeName="rx"
      values="165;175;165"
      dur="5s"
      repeatCount="indefinite"
    />
    <animate
      attributeName="ry"
      values="165;175;165"
      dur="5s"
      repeatCount="indefinite"
    />
    <animate
      attributeName="opacity"
      values="0.1;0.25;0.1"
      dur="5s"
      repeatCount="indefinite"
    />
  </ellipse>

  <!-- Portal Glow -->
  <ellipse
    cx="350"
    cy="195"
    rx="140"
    ry="140"
    fill="url(#portalGlow)"
    filter="url(#bigGlow)"
  >
    <animate
      attributeName="rx"
      values="130;148;130"
      dur="4s"
      repeatCount="indefinite"
    />
    <animate
      attributeName="ry"
      values="130;148;130"
      dur="4s"
      repeatCount="indefinite"
    />
  </ellipse>

  <!-- Portal Core -->
  <ellipse
    cx="350"
    cy="195"
    rx="85"
    ry="85"
    fill="#00ffcc"
    opacity="0.06"
    filter="url(#bigGlow)"
  >
    <animate
      attributeName="rx"
      values="80;92;80"
      dur="3s"
      repeatCount="indefinite"
    />
    <animate
      attributeName="ry"
      values="80;92;80"
      dur="3s"
      repeatCount="indefinite"
    />
    <animate
      attributeName="opacity"
      values="0.04;0.1;0.04"
      dur="3s"
      repeatCount="indefinite"
    />
  </ellipse>

  <!-- Fracture Lines -->
  <g opacity="0.4" filter="url(#glow)">
    <line
      x1="350"
      y1="195"
      x2="200"
      y2="80"
      stroke="#00ffcc"
      stroke-width="0.8"
      opacity="0.3"
    >
      <animate
        attributeName="opacity"
        values="0.1;0.5;0.1"
        dur="2.5s"
        repeatCount="indefinite"
      />
    </line>
    <line
      x1="350"
      y1="195"
      x2="500"
      y2="70"
      stroke="#4400ff"
      stroke-width="0.6"
      opacity="0.25"
    >
      <animate
        attributeName="opacity"
        values="0.05;0.4;0.05"
        dur="3.2s"
        repeatCount="indefinite"
      />
    </line>
    <line
      x1="350"
      y1="195"
      x2="180"
      y2="320"
      stroke="#ff0088"
      stroke-width="0.7"
      opacity="0.2"
    >
      <animate
        attributeName="opacity"
        values="0.1;0.35;0.1"
        dur="2.8s"
        repeatCount="indefinite"
      />
    </line>
    <line
      x1="350"
      y1="195"
      x2="530"
      y2="310"
      stroke="#00ffcc"
      stroke-width="0.5"
      opacity="0.2"
    >
      <animate
        attributeName="opacity"
        values="0.05;0.3;0.05"
        dur="3.5s"
        repeatCount="indefinite"
      />
    </line>
    <line
      x1="350"
      y1="195"
      x2="140"
      y2="195"
      stroke="#8866ff"
      stroke-width="0.6"
      opacity="0.2"
    >
      <animate
        attributeName="opacity"
        values="0.1;0.4;0.1"
        dur="2.1s"
        repeatCount="indefinite"
      />
    </line>
    <line
      x1="350"
      y1="195"
      x2="560"
      y2="180"
      stroke="#ff4466"
      stroke-width="0.5"
      opacity="0.2"
    >
      <animate
        attributeName="opacity"
        values="0.05;0.35;0.05"
        dur="2.9s"
        repeatCount="indefinite"
      />
    </line>
  </g>

  <!-- Energy Rings -->
  <g filter="url(#glow)">
    <ellipse
      cx="350"
      cy="195"
      rx="120"
      ry="120"
      fill="none"
      stroke="#00ffcc"
      stroke-width="1"
      opacity="0.4"
    >
      <animate
        attributeName="rx"
        values="115;128;115"
        dur="3s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="ry"
        values="115;128;115"
        dur="3s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="opacity"
        values="0.3;0.6;0.3"
        dur="3s"
        repeatCount="indefinite"
      />
      <animateTransform
        attributeName="transform"
        type="rotate"
        values="0 350 195;360 350 195"
        dur="20s"
        repeatCount="indefinite"
      />
    </ellipse>
    <ellipse
      cx="350"
      cy="195"
      rx="160"
      ry="100"
      fill="none"
      stroke="#4400ff"
      stroke-width="0.8"
      opacity="0.35"
      stroke-dasharray="8,12"
    >
      <animateTransform
        attributeName="transform"
        type="rotate"
        values="0 350 195;-360 350 195"
        dur="25s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="opacity"
        values="0.25;0.5;0.25"
        dur="4s"
        repeatCount="indefinite"
      />
    </ellipse>
    <ellipse
      cx="350"
      cy="195"
      rx="100"
      ry="155"
      fill="none"
      stroke="#ff0088"
      stroke-width="0.6"
      opacity="0.3"
      stroke-dasharray="4,16"
    >
      <animateTransform
        attributeName="transform"
        type="rotate"
        values="0 350 195;360 350 195"
        dur="30s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="opacity"
        values="0.2;0.4;0.2"
        dur="3.5s"
        repeatCount="indefinite"
      />
    </ellipse>
    <!-- Ring Pulse -->
    <circle
      cx="350"
      cy="195"
      r="75"
      fill="none"
      stroke="#00ffcc"
      stroke-width="0.5"
      opacity="0"
    >
      <animate
        attributeName="r"
        values="75;160"
        dur="3s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="opacity"
        values="0.4;0"
        dur="3s"
        repeatCount="indefinite"
      />
    </circle>
    <circle
      cx="350"
      cy="195"
      r="75"
      fill="none"
      stroke="#ff0088"
      stroke-width="0.4"
      opacity="0"
    >
      <animate
        attributeName="r"
        values="75;160"
        dur="3s"
        begin="1.5s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="opacity"
        values="0.3;0"
        dur="3s"
        begin="1.5s"
        repeatCount="indefinite"
      />
    </circle>
  </g>

  <!-- Broken Clock -->
  <g filter="url(#glow)">
    <!-- Clock body -->
    <circle
      cx="350"
      cy="195"
      r="70"
      fill="url(#clockFace)"
      stroke="#334466"
      stroke-width="2"
    />
    <circle
      cx="350"
      cy="195"
      r="68"
      fill="none"
      stroke="#00aacc"
      stroke-width="0.5"
      opacity="0.4"
    />

    <!-- Hour markers -->
    <g stroke="#446688" stroke-width="2" opacity="0.7">
      <line x1="350" y1="130" x2="350" y2="140" />
      <line x1="350" y1="250" x2="350" y2="260" />
      <line x1="283" y1="195" x2="293" y2="195" />
      <line x1="407" y1="195" x2="417" y2="195" />
      <!-- Diagonal markers -->
      <line x1="315" y1="143" x2="320" y2="151" opacity="0.5" />
      <line x1="385" y1="143" x2="380" y2="151" opacity="0.5" />
      <line x1="315" y1="247" x2="320" y2="239" opacity="0.5" />
      <line x1="385" y1="247" x2="380" y2="239" opacity="0.5" />
    </g>

    <!-- Clock Hands -->
    <!-- Hour Hand -->
    <line
      x1="350"
      y1="195"
      x2="350"
      y2="155"
      stroke="#00ffcc"
      stroke-width="2.5"
      stroke-linecap="round"
      filter="url(#glow)"
    >
      <animateTransform
        attributeName="transform"
        type="rotate"
        values="0 350 195;30 350 195;25 350 195;30 350 195;0 350 195"
        dur="8s"
        repeatCount="indefinite"
      />
    </line>
    <!-- Minute Hand -->
    <line
      x1="350"
      y1="195"
      x2="390"
      y2="175"
      stroke="#ff4466"
      stroke-width="1.8"
      stroke-linecap="round"
      filter="url(#glow)"
    >
      <animateTransform
        attributeName="transform"
        type="rotate"
        values="0 350 195;360 350 195;340 350 195;720 350 195"
        dur="6s"
        repeatCount="indefinite"
      />
    </line>
    <!-- Second Hand -->
    <line
      x1="350"
      y1="195"
      x2="350"
      y2="140"
      stroke="#ffaa00"
      stroke-width="0.8"
      stroke-linecap="round"
      opacity="0.7"
    >
      <animateTransform
        attributeName="transform"
        type="rotate"
        values="0 350 195;180 350 195;90 350 195;360 350 195;270 350 195;360 350 195"
        dur="3s"
        repeatCount="indefinite"
      />
    </line>

    <!-- Center pin -->
    <circle cx="350" cy="195" r="4" fill="#00ffcc" filter="url(#glow)">
      <animate
        attributeName="r"
        values="3;5;3"
        dur="2s"
        repeatCount="indefinite"
      />
    </circle>

    <!-- Crack in the Clock Face -->
    <g opacity="0.8">
      <!-- Main Crack (Top-Right Diagonal) -->
      <line
        x1="355"
        y1="180"
        x2="375"
        y2="155"
        stroke="#00ddcc"
        stroke-width="1.5"
      />
      <line
        x1="375"
        y1="155"
        x2="390"
        y2="140"
        stroke="#00ddcc"
        stroke-width="1.2"
      />
      <line
        x1="390"
        y1="140"
        x2="395"
        y2="132"
        stroke="#00ddcc"
        stroke-width="0.8"
      />
      <!-- Branch Right -->
      <line
        x1="375"
        y1="155"
        x2="395"
        y2="152"
        stroke="#00ddcc"
        stroke-width="1"
      />
      <line
        x1="395"
        y1="152"
        x2="408"
        y2="158"
        stroke="#00ddcc"
        stroke-width="0.7"
      />
      <!-- Branch Upper Left -->
      <line
        x1="375"
        y1="155"
        x2="365"
        y2="140"
        stroke="#00ddcc"
        stroke-width="0.8"
      />
      <!-- Bottom Left Crack -->
      <line
        x1="355"
        y1="180"
        x2="340"
        y2="200"
        stroke="#00ddcc"
        stroke-width="1.3"
      />
      <line
        x1="340"
        y1="200"
        x2="330"
        y2="218"
        stroke="#00ddcc"
        stroke-width="1"
      />
      <line
        x1="330"
        y1="218"
        x2="325"
        y2="230"
        stroke="#00ddcc"
        stroke-width="0.7"
      />
      <!-- Branch Lower Left -->
      <line
        x1="340"
        y1="200"
        x2="325"
        y2="195"
        stroke="#00ddcc"
        stroke-width="0.8"
      />
      <!-- Branch Lower Right -->
      <line
        x1="340"
        y1="200"
        x2="350"
        y2="215"
        stroke="#00ddcc"
        stroke-width="0.7"
      />
      <!-- Small Crack - Center Right -->
      <line
        x1="355"
        y1="180"
        x2="368"
        y2="185"
        stroke="#00ddcc"
        stroke-width="0.9"
      />
      <line
        x1="368"
        y1="185"
        x2="380"
        y2="192"
        stroke="#00ddcc"
        stroke-width="0.6"
      />
      <!-- Small Crack - Center Left -->
      <line
        x1="355"
        y1="180"
        x2="342"
        y2="172"
        stroke="#00ddcc"
        stroke-width="0.7"
      />

      <!-- Glow Effect -->
      <line
        x1="355"
        y1="180"
        x2="375"
        y2="155"
        stroke="#00ffdd"
        stroke-width="4"
        opacity="0.25"
        filter="url(#bigGlow)"
      >
        <animate
          attributeName="opacity"
          values="0.15;0.4;0.15"
          dur="1.5s"
          repeatCount="indefinite"
        />
      </line>
      <line
        x1="355"
        y1="180"
        x2="340"
        y2="200"
        stroke="#00ffdd"
        stroke-width="4"
        opacity="0.2"
        filter="url(#bigGlow)"
      >
        <animate
          attributeName="opacity"
          values="0.1;0.35;0.1"
          dur="1.8s"
          repeatCount="indefinite"
        />
      </line>
      <!-- Energy Leak -->
      <circle
        cx="355"
        cy="180"
        r="5"
        fill="#00ffcc"
        opacity="0.12"
        filter="url(#bigGlow)"
      >
        <animate
          attributeName="r"
          values="4;8;4"
          dur="2s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.08;0.2;0.08"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>
    </g>
  </g>
  </svg>
`;var Js=class extends HTMLElement{constructor(){super(),this.attachShadow({mode:`open`}),this.shadowRoot.appendChild(qs.content.cloneNode(!0))}};customElements.define(`title-clock`,Js);var Ys=document.createElement(`template`);Ys.innerHTML=`
  <style>
    :host {
      display: block;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
    svg {
      width: 100%;
      height: 100%;
    }
  </style>
  <svg viewBox="0 0 700 400" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <g
      transform="translate(115, 10) scale(3.0)"
      opacity="0.95"
      filter="url(#glow)"
    >
    <!-- Cape -->
    <!-- Left -->
    <path
      d="M0,34 Q-4,40 -8,54 Q-12,70 -14,90 Q-13,100 -10,105 Q-6,108 -3,100 Q-1,88 0,72 Z"
      fill="#8b1a1a"
      opacity="0.7"
    >
      <animate
        attributeName="d"
        values="M0,34 Q-4,40 -8,54 Q-12,70 -14,90 Q-13,100 -10,105 Q-6,108 -3,100 Q-1,88 0,72 Z;M0,34 Q-6,42 -10,56 Q-15,74 -17,94 Q-16,104 -12,107 Q-8,110 -4,102 Q-2,90 0,72 Z;M0,34 Q-4,40 -8,54 Q-12,70 -14,90 Q-13,100 -10,105 Q-6,108 -3,100 Q-1,88 0,72 Z"
        dur="3.5s"
        repeatCount="indefinite"
      />
    </path>
    <!-- Center -->
    <path
      d="M-2,32 Q-6,36 -8,44 Q-10,56 -10,72 Q-8,90 -6,102 L30,102 Q32,90 34,72 Q34,56 32,44 Q30,36 26,32 Z"
      fill="#7a1515"
      opacity="0.55"
    >
      <animate
        attributeName="d"
        values="M-2,32 Q-6,36 -8,44 Q-10,56 -10,72 Q-8,90 -6,102 L30,102 Q32,90 34,72 Q34,56 32,44 Q30,36 26,32 Z;M-2,32 Q-7,37 -9,46 Q-12,58 -12,74 Q-10,92 -8,105 L30,105 Q32,92 36,74 Q36,58 33,46 Q31,37 26,32 Z;M-2,32 Q-6,36 -8,44 Q-10,56 -10,72 Q-8,90 -6,102 L30,102 Q32,90 34,72 Q34,56 32,44 Q30,36 26,32 Z"
        dur="3.5s"
        repeatCount="indefinite"
      />
    </path>
    <!-- Right -->
    <path
      d="M24,34 Q28,40 32,54 Q36,70 38,90 Q37,100 34,105 Q30,108 27,100 Q25,88 24,72 Z"
      fill="#8b1a1a"
      opacity="0.7"
    >
      <animate
        attributeName="d"
        values="M24,34 Q28,40 32,54 Q36,70 38,90 Q37,100 34,105 Q30,108 27,100 Q25,88 24,72 Z;M24,34 Q30,42 35,56 Q40,74 42,94 Q41,104 37,107 Q33,110 29,102 Q26,90 24,72 Z;M24,34 Q28,40 32,54 Q36,70 38,90 Q37,100 34,105 Q30,108 27,100 Q25,88 24,72 Z"
        dur="3.5s"
        repeatCount="indefinite"
      />
    </path>
    <!-- Collar -->
    <path
      d="M-2,30 Q-4,26 -3,22 Q0,20 4,22 L4,32"
      fill="#9b2020"
      stroke="#cc3030"
      stroke-width="0.4"
      opacity="0.8"
    />
    <path
      d="M26,30 Q28,26 27,22 Q24,20 20,22 L20,32"
      fill="#9b2020"
      stroke="#cc3030"
      stroke-width="0.4"
      opacity="0.8"
    />
    <!-- Fold Lines -->
    <path
      d="M4,36 Q2,56 0,80 Q-2,96 -4,102"
      fill="none"
      stroke="#a82020"
      stroke-width="0.5"
      opacity="0.5"
    />
    <path
      d="M20,36 Q22,56 24,80 Q26,96 28,102"
      fill="none"
      stroke="#a82020"
      stroke-width="0.5"
      opacity="0.5"
    />
    <path
      d="M12,34 Q12,60 12,85 Q12,96 12,102"
      fill="none"
      stroke="#6b1212"
      stroke-width="0.4"
      opacity="0.35"
    />

    <!-- Torso -->
    <path
      d="M-4,36 Q-9,40 -9,52 Q-8,68 -2,76 L26,76 Q32,68 33,52 Q33,40 28,36 Z"
      fill="#1a2a3a"
    />
    <!-- Chest Plate -->
    <path d="M2,38 Q0,44 1,54 L23,54 Q24,44 22,38 Z" fill="#243d50" />
    <!-- Pecs -->
    <path
      d="M5,40 Q12,46 12,53"
      fill="none"
      stroke="#334466"
      stroke-width="0.8"
      opacity="0.5"
    />
    <path
      d="M19,40 Q12,46 12,53"
      fill="none"
      stroke="#334466"
      stroke-width="0.8"
      opacity="0.5"
    />
    <!-- Plate Center Line -->
    <line
      x1="12"
      y1="38"
      x2="12"
      y2="54"
      stroke="#0d1a28"
      stroke-width="0.7"
      opacity="0.6"
    />
    <!-- Abs -->
    <line
      x1="12"
      y1="56"
      x2="12"
      y2="74"
      stroke="#0d1a28"
      stroke-width="0.7"
      opacity="0.5"
    />
    <line
      x1="5"
      y1="59"
      x2="19"
      y2="59"
      stroke="#0d1a28"
      stroke-width="0.5"
      opacity="0.35"
    />
    <line
      x1="6"
      y1="64"
      x2="18"
      y2="64"
      stroke="#0d1a28"
      stroke-width="0.5"
      opacity="0.35"
    />
    <line
      x1="6"
      y1="69"
      x2="18"
      y2="69"
      stroke="#0d1a28"
      stroke-width="0.5"
      opacity="0.35"
    />

    <!-- Shoulders -->
    <path
      d="M-8,31 Q-15,33 -15,42 Q-13,49 -6,47 Q-2,43 -2,36 Z"
      fill="#243d50"
      stroke="#334466"
      stroke-width="0.5"
    />
    <path
      d="M32,31 Q39,33 39,42 Q37,49 30,47 Q26,43 26,36 Z"
      fill="#243d50"
      stroke="#334466"
      stroke-width="0.5"
    />
    <!-- Pauldron edge highlights -->
    <path
      d="M-13,35 Q-14,40 -11,45"
      fill="none"
      stroke="#446688"
      stroke-width="0.5"
      opacity="0.4"
    />
    <path
      d="M37,35 Q38,40 35,45"
      fill="none"
      stroke="#446688"
      stroke-width="0.5"
      opacity="0.4"
    />

    <!-- Helmet -->
    <!-- Shell -->
    <path
      d="M-1,16 Q-5,12 -4,3 Q-2,-3 12,-5 Q26,-3 28,3 Q29,12 25,16 Q25,26 24,30 L22,32 Q12,34 2,32 L0,30 Q-1,26 -1,16 Z"
      fill="#1a2a3a"
    />
    <!-- Top Ridge -->
    <path
      d="M4,-1 Q12,-6 20,-1"
      fill="none"
      stroke="#334466"
      stroke-width="2"
      opacity="0.6"
    />
    <!--Side Ridges -->
    <path
      d="M-3,10 Q-4,16 -1,23"
      fill="none"
      stroke="#243d50"
      stroke-width="1.3"
      opacity="0.5"
    />
    <path
      d="M27,10 Q28,16 25,23"
      fill="none"
      stroke="#243d50"
      stroke-width="1.3"
      opacity="0.5"
    />
    <!-- Visor -->
    <path
      d="M0,12 Q-1,16 1,20 Q4,23 12,23 Q20,23 23,20 Q25,16 24,12 Q21,9 12,8 Q3,9 0,12 Z"
      fill="#00aadd"
      opacity="0.9"
    >
      <animate
        attributeName="opacity"
        values="0.75;1;0.75"
        dur="2s"
        repeatCount="indefinite"
      />
    </path>
    <!-- Visor Glow -->
    <path
      d="M2,13 Q3,17 4,19 Q8,21 12,21 Q16,21 20,19 Q21,17 22,13 Q18,11 12,10 Q6,11 2,13 Z"
      fill="#00ddff"
      opacity="0.3"
    />
    <!-- Visor Reflection -->
    <path
      d="M4,12 Q9,10 15,12 Q13,15 8,14 Z"
      fill="#ffffff"
      opacity="0.25"
    />
    <!-- Chin Guard -->
    <path
      d="M3,23 Q2,27 4,30 Q12,32 20,30 Q22,27 21,23"
      fill="none"
      stroke="#243d50"
      stroke-width="1.2"
      opacity="0.6"
    />
    <!-- Neck -->
    <rect x="5" y="30" width="14" height="8" rx="3" fill="#1a2a3a" />

    <!-- Left Arm -->
    <!-- Upper Arm -->
    <path
      d="M-4,38 Q-9,38 -13,42 Q-16,46 -15,50 L-13,51 Q-11,47 -9,44 Q-6,41 -4,40 Z"
      fill="#1a2a3a"
    />
    <!-- Bicep Armor -->
    <ellipse
      cx="-11"
      cy="44"
      rx="5"
      ry="5"
      fill="#1a2a3a"
      stroke="#243d50"
      stroke-width="0.5"
    />
    <!-- Forearm -->
    <path
      d="M-15,50 Q-20,52 -24,55 Q-27,57 -26,60 L-24,61 Q-22,58 -19,55 Q-16,53 -14,51 Z"
      fill="#1a2a3a"
    />
    <!-- Forearm Armor -->
    <rect
      x="-25"
      y="53"
      width="8"
      height="3.5"
      rx="1"
      fill="#243d50"
      opacity="0.6"
      transform="rotate(-15 -21 55)"
    />
    <!-- Fist / Glove -->
    <circle cx="-26" cy="59" r="2.8" fill="#1a1a1a" />

    <!-- Rifle -->
    <g transform="rotate(12 -26 59)">
      <!-- Buffer Tube -->
      <rect
        x="-19"
        y="55.5"
        width="7"
        height="5.5"
        rx="1.2"
        fill="#2a2a2a"
      />
      <!-- Stock Pad -->
      <rect
        x="-14"
        y="55"
        width="4.5"
        height="6.5"
        rx="2"
        fill="#222222"
      />
      <!-- Stock Rest -->
      <rect
        x="-18"
        y="54"
        width="6"
        height="2.5"
        rx="1"
        fill="#333333"
      />
      <!-- Stock Ribbing -->
      <line
        x1="-13"
        y1="56"
        x2="-13"
        y2="61"
        stroke="#333"
        stroke-width="0.4"
      />
      <line
        x1="-11.5"
        y1="56"
        x2="-11.5"
        y2="61"
        stroke="#333"
        stroke-width="0.4"
      />

      <!-- Receiver -->
      <!-- Lower -->
      <rect
        x="-32"
        y="55.5"
        width="15"
        height="6.5"
        rx="1"
        fill="#2a2a2a"
      />
      <!-- Upper -->
      <rect
        x="-32"
        y="53.5"
        width="15"
        height="4"
        rx="1"
        fill="#363636"
      />
      <!-- Rail -->
      <rect
        x="-45"
        y="53"
        width="30"
        height="1.2"
        rx="0.3"
        fill="#1a1a1a"
      />
      <!-- Rail Teeth -->
      <line
        x1="-44"
        y1="53"
        x2="-44"
        y2="53.6"
        stroke="#444"
        stroke-width="0.4"
      />
      <line
        x1="-42"
        y1="53"
        x2="-42"
        y2="53.6"
        stroke="#444"
        stroke-width="0.4"
      />
      <line
        x1="-40"
        y1="53"
        x2="-40"
        y2="53.6"
        stroke="#444"
        stroke-width="0.4"
      />
      <line
        x1="-38"
        y1="53"
        x2="-38"
        y2="53.6"
        stroke="#444"
        stroke-width="0.4"
      />
      <line
        x1="-36"
        y1="53"
        x2="-36"
        y2="53.6"
        stroke="#444"
        stroke-width="0.4"
      />
      <line
        x1="-34"
        y1="53"
        x2="-34"
        y2="53.6"
        stroke="#444"
        stroke-width="0.4"
      />
      <line
        x1="-32"
        y1="53"
        x2="-32"
        y2="53.6"
        stroke="#444"
        stroke-width="0.4"
      />
      <line
        x1="-30"
        y1="53"
        x2="-30"
        y2="53.6"
        stroke="#444"
        stroke-width="0.4"
      />
      <line
        x1="-28"
        y1="53"
        x2="-28"
        y2="53.6"
        stroke="#444"
        stroke-width="0.4"
      />
      <line
        x1="-26"
        y1="53"
        x2="-26"
        y2="53.6"
        stroke="#444"
        stroke-width="0.4"
      />
      <line
        x1="-24"
        y1="53"
        x2="-24"
        y2="53.6"
        stroke="#444"
        stroke-width="0.4"
      />
      <line
        x1="-22"
        y1="53"
        x2="-22"
        y2="53.6"
        stroke="#444"
        stroke-width="0.4"
      />
      <line
        x1="-20"
        y1="53"
        x2="-20"
        y2="53.6"
        stroke="#444"
        stroke-width="0.4"
      />
      <!-- Ejection Port -->
      <rect
        x="-26"
        y="54.5"
        width="3"
        height="2"
        rx="0.3"
        fill="#1a1a1a"
      />
      <!-- Trigger Guard -->
      <path
        d="M-27,62 Q-27,66 -24.5,66 Q-22,66 -22,62"
        fill="none"
        stroke="#222"
        stroke-width="0.6"
      />
      <!-- Pistol Grip -->
      <rect
        x="-27"
        y="62"
        width="4"
        height="6.5"
        rx="1"
        fill="#222222"
      />
      <!-- Grip -->
      <line
        x1="-26.5"
        y1="63"
        x2="-26.5"
        y2="67.5"
        stroke="#333"
        stroke-width="0.3"
      />
      <line
        x1="-25"
        y1="63"
        x2="-25"
        y2="67.5"
        stroke="#333"
        stroke-width="0.3"
      />

      <!-- Magazine -->
      <rect
        x="-31"
        y="62"
        width="5.5"
        height="11"
        rx="1"
        fill="#1a3a4a"
        transform="rotate(-5 -28 67)"
      />
      <!-- Magazine Energy Strip -->
      <rect
        x="-29.8"
        y="63"
        width="2"
        height="9"
        rx="0.4"
        fill="#00aadd"
        opacity="0.4"
        transform="rotate(-5 -28 67)"
      >
        <animate
          attributeName="opacity"
          values="0.25;0.5;0.25"
          dur="2s"
          repeatCount="indefinite"
        />
      </rect>
      <!-- Magazine Base Plate -->
      <rect
        x="-31.5"
        y="72"
        width="6.5"
        height="1.5"
        rx="0.5"
        fill="#2a2a2a"
        transform="rotate(-5 -28 67)"
      />

      <!-- Barrel -->
      <!-- Handguard -->
      <rect
        x="-48"
        y="54.5"
        width="17"
        height="6"
        rx="1.2"
        fill="#3a3a3a"
      />
      <!-- Handguard Side Panel -->
      <rect
        x="-47"
        y="55"
        width="15"
        height="2"
        rx="0.5"
        fill="#404040"
      />
      <!-- Handguard Vents -->
      <line
        x1="-46"
        y1="56"
        x2="-46"
        y2="59.5"
        stroke="#2a2a2a"
        stroke-width="0.6"
      />
      <line
        x1="-44"
        y1="56"
        x2="-44"
        y2="59.5"
        stroke="#2a2a2a"
        stroke-width="0.6"
      />
      <line
        x1="-42"
        y1="56"
        x2="-42"
        y2="59.5"
        stroke="#2a2a2a"
        stroke-width="0.6"
      />
      <line
        x1="-40"
        y1="56"
        x2="-40"
        y2="59.5"
        stroke="#2a2a2a"
        stroke-width="0.6"
      />
      <line
        x1="-38"
        y1="56"
        x2="-38"
        y2="59.5"
        stroke="#2a2a2a"
        stroke-width="0.6"
      />
      <line
        x1="-36"
        y1="56"
        x2="-36"
        y2="59.5"
        stroke="#2a2a2a"
        stroke-width="0.6"
      />
      <!-- Barrel Extension -->
      <rect
        x="-55"
        y="56"
        width="8"
        height="4"
        rx="0.6"
        fill="#484848"
      />
      <!-- Barrel fluting lines -->
      <line
        x1="-54"
        y1="56.5"
        x2="-48"
        y2="56.5"
        stroke="#3a3a3a"
        stroke-width="0.3"
      />
      <line
        x1="-54"
        y1="59.5"
        x2="-48"
        y2="59.5"
        stroke="#3a3a3a"
        stroke-width="0.3"
      />
      <!-- Muzzle Brake -->
      <rect
        x="-59"
        y="54.5"
        width="5"
        height="7"
        rx="1"
        fill="#505050"
      />
      <!-- Muzzle Brake Ports -->
      <rect
        x="-58.5"
        y="55.5"
        width="1.5"
        height="1.5"
        rx="0.3"
        fill="#333"
      />
      <rect
        x="-58.5"
        y="59"
        width="1.5"
        height="1.5"
        rx="0.3"
        fill="#333"
      />
      <rect
        x="-56"
        y="55.5"
        width="1.5"
        height="1.5"
        rx="0.3"
        fill="#333"
      />
      <rect
        x="-56"
        y="59"
        width="1.5"
        height="1.5"
        rx="0.3"
        fill="#333"
      />

      <!-- Foregrip -->
      <path d="M-41,60.5 L-43,65 L-40,65 L-38,60.5 Z" fill="#243d50" />

      <!-- Scope -->
      <!-- Scope Mount Rings -->
      <rect
        x="-34"
        y="51"
        width="3"
        height="3"
        rx="0.5"
        fill="#1a1a1a"
      />
      <rect
        x="-24"
        y="51"
        width="3"
        height="3"
        rx="0.5"
        fill="#1a1a1a"
      />
      <!-- Scope Tube -->
      <rect
        x="-37"
        y="48"
        width="18"
        height="4.5"
        rx="2.2"
        fill="#252525"
      />
      <!-- Objective Bell -->
      <rect
        x="-39"
        y="47"
        width="3.5"
        height="6.5"
        rx="1.5"
        fill="#2e2e2e"
      />
      <!-- Scope Rear Eyepiece -->
      <rect
        x="-20"
        y="48.5"
        width="2.5"
        height="4"
        rx="1"
        fill="#2e2e2e"
      />
      <!-- Scope Turret (Windage) -->
      <rect
        x="-28"
        y="46.5"
        width="2"
        height="2"
        rx="0.5"
        fill="#333"
      />
      <!-- Scope Turret (Elevation) -->
      <rect
        x="-31"
        y="46.5"
        width="2"
        height="2"
        rx="0.5"
        fill="#333"
      />
      <!-- Front Lens -->
      <circle cx="-37.5" cy="50.2" r="2" fill="#00ccff" opacity="0.7">
        <animate
          attributeName="opacity"
          values="0.4;0.9;0.4"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>
      <!-- Rear lens -->
      <circle cx="-19" cy="50.5" r="1" fill="#00aadd" opacity="0.3" />
      <!-- Crosshair Reflection -->
      <line
        x1="-38.5"
        y1="50.2"
        x2="-36.5"
        y2="50.2"
        stroke="#00ffff"
        stroke-width="0.3"
        opacity="0.5"
      />
      <line
        x1="-37.5"
        y1="49.2"
        x2="-37.5"
        y2="51.2"
        stroke="#00ffff"
        stroke-width="0.3"
        opacity="0.5"
      />

      <!-- Accessories -->
      <!-- Laser Sight -->
      <rect
        x="-48"
        y="60.5"
        width="3"
        height="2"
        rx="0.5"
        fill="#333333"
      />
      <circle cx="-46.5" cy="61.5" r="0.6" fill="#ff0000" opacity="0.7">
        <animate
          attributeName="opacity"
          values="0.4;0.9;0.4"
          dur="1s"
          repeatCount="indefinite"
        />
      </circle>
      <!-- Light -->
      <rect
        x="-53"
        y="60.5"
        width="3"
        height="3"
        rx="0.8"
        fill="#3a3a3a"
      />
      <circle cx="-51.5" cy="62" r="1" fill="#ffff88" opacity="0.3">
        <animate
          attributeName="opacity"
          values="0.15;0.4;0.15"
          dur="1.5s"
          repeatCount="indefinite"
        />
      </circle>

      <!-- Muzzle Flash -->
      <circle cx="-59" cy="58" r="4" fill="#00ccff" opacity="0.35">
        <animate
          attributeName="opacity"
          values="0.15;0.5;0.15"
          dur="1s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="r"
          values="3;5;3"
          dur="1s"
          repeatCount="indefinite"
        />
      </circle>
      <!-- Expanding Energy Ring -->
      <circle
        cx="-59"
        cy="58"
        r="6"
        fill="none"
        stroke="#00ccff"
        stroke-width="0.5"
        opacity="0.15"
      >
        <animate
          attributeName="r"
          values="5;8;5"
          dur="1.5s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.1;0.25;0.1"
          dur="1.5s"
          repeatCount="indefinite"
        />
      </circle>
    </g>

    <!-- Right Arm -->
    <path
      d="M28,38 Q35,38 37,42 L62,43 Q64,41 64,47 L37,48 Q35,51 28,51 Z"
      fill="#1a2a3a"
    />
    <!-- Bicep -->
    <ellipse
      cx="34"
      cy="44"
      rx="7"
      ry="8"
      fill="#1a2a3a"
      stroke="#243d50"
      stroke-width="0.5"
    />
    <!-- Forearm Armor -->
    <rect
      x="42"
      y="41"
      width="16"
      height="7"
      rx="1"
      fill="#243d50"
      opacity="0.6"
    />

    <!-- Pistol -->
    <g transform="rotate(-2 62 44)">
      <!-- Slide -->
      <rect
        x="58"
        y="38"
        width="24"
        height="10"
        rx="1.5"
        fill="#0f1e2e"
      />
      <!-- Slide Top Flat -->
      <rect
        x="59"
        y="37"
        width="22"
        height="3"
        rx="0.8"
        fill="#162838"
      />
      <!-- Slide Serrations -->
      <line
        x1="74"
        y1="38"
        x2="74"
        y2="41"
        stroke="#243d50"
        stroke-width="0.4"
      />
      <line
        x1="75.5"
        y1="38"
        x2="75.5"
        y2="41"
        stroke="#243d50"
        stroke-width="0.4"
      />
      <line
        x1="77"
        y1="38"
        x2="77"
        y2="41"
        stroke="#243d50"
        stroke-width="0.4"
      />
      <line
        x1="78.5"
        y1="38"
        x2="78.5"
        y2="41"
        stroke="#243d50"
        stroke-width="0.4"
      />
      <line
        x1="80"
        y1="38"
        x2="80"
        y2="41"
        stroke="#243d50"
        stroke-width="0.4"
      />
      <!-- Ejection Port -->
      <rect
        x="68"
        y="38.5"
        width="4"
        height="2"
        rx="0.3"
        fill="#0a1420"
      />
      <!-- Barrel -->
      <rect
        x="82"
        y="40"
        width="7"
        height="6"
        rx="0.8"
        fill="#162838"
      />
      <!-- Barrel Fluting -->
      <line
        x1="83"
        y1="41"
        x2="88"
        y2="41"
        stroke="#0f1e2e"
        stroke-width="0.3"
      />
      <line
        x1="83"
        y1="45"
        x2="88"
        y2="45"
        stroke="#0f1e2e"
        stroke-width="0.3"
      />
      <!-- Muzzle Compensator -->
      <rect
        x="88"
        y="39"
        width="3.5"
        height="8"
        rx="0.6"
        fill="#1a2a3a"
      />
      <!-- Compensator Ports -->
      <rect
        x="88.5"
        y="39.8"
        width="1.2"
        height="1.2"
        rx="0.3"
        fill="#0a1420"
      />
      <rect
        x="88.5"
        y="44.8"
        width="1.2"
        height="1.2"
        rx="0.3"
        fill="#0a1420"
      />
      <rect
        x="90"
        y="39.8"
        width="1.2"
        height="1.2"
        rx="0.3"
        fill="#0a1420"
      />
      <rect
        x="90"
        y="44.8"
        width="1.2"
        height="1.2"
        rx="0.3"
        fill="#0a1420"
      />
      <!-- Frame / Lower -->
      <rect
        x="58"
        y="48"
        width="18"
        height="5"
        rx="0.8"
        fill="#1a2a3a"
      />
      <!-- Accessory Rail -->
      <rect
        x="60"
        y="48"
        width="12"
        height="1.5"
        rx="0.3"
        fill="#0f1e2e"
      />
      <!-- Rail Teeth -->
      <line
        x1="61"
        y1="48"
        x2="61"
        y2="49"
        stroke="#243d50"
        stroke-width="0.4"
      />
      <line
        x1="63"
        y1="48"
        x2="63"
        y2="49"
        stroke="#243d50"
        stroke-width="0.4"
      />
      <line
        x1="65"
        y1="48"
        x2="65"
        y2="49"
        stroke="#243d50"
        stroke-width="0.4"
      />
      <line
        x1="67"
        y1="48"
        x2="67"
        y2="49"
        stroke="#243d50"
        stroke-width="0.4"
      />
      <line
        x1="69"
        y1="48"
        x2="69"
        y2="49"
        stroke="#243d50"
        stroke-width="0.4"
      />
      <!-- Trigger Guard -->
      <path
        d="M64,53 Q64,58 67,58 Q70,58 70,53"
        fill="none"
        stroke="#0f1e2e"
        stroke-width="0.6"
      />
      <!-- Trigger -->
      <path d="M67,53.5 L66.5,56 L68,56 L67.5,53.5 Z" fill="#243d50" />
      <!-- Grip -->
      <rect
        x="62"
        y="53"
        width="8"
        height="10"
        rx="1.5"
        fill="#1a2a3a"
      />
      <!-- Grip Texture -->
      <line
        x1="63.5"
        y1="54"
        x2="63.5"
        y2="61.5"
        stroke="#243d50"
        stroke-width="0.3"
      />
      <line
        x1="65"
        y1="54"
        x2="65"
        y2="61.5"
        stroke="#243d50"
        stroke-width="0.3"
      />
      <line
        x1="66.5"
        y1="54"
        x2="66.5"
        y2="61.5"
        stroke="#243d50"
        stroke-width="0.3"
      />
      <line
        x1="68"
        y1="54"
        x2="68"
        y2="61.5"
        stroke="#243d50"
        stroke-width="0.3"
      />
      <!-- Grip Cross-Hatching -->
      <line
        x1="63"
        y1="55.5"
        x2="69"
        y2="55.5"
        stroke="#243d50"
        stroke-width="0.2"
      />
      <line
        x1="63"
        y1="57.5"
        x2="69"
        y2="57.5"
        stroke="#243d50"
        stroke-width="0.2"
      />
      <line
        x1="63"
        y1="59.5"
        x2="69"
        y2="59.5"
        stroke="#243d50"
        stroke-width="0.2"
      />
      <!-- Grip Base Plate -->
      <rect
        x="61.5"
        y="62"
        width="9"
        height="2"
        rx="0.5"
        fill="#0f1e2e"
      />
      <!-- Magazine -->
      <rect
        x="63"
        y="53"
        width="6"
        height="11"
        rx="0.8"
        fill="#0a1420"
        transform="rotate(2 66 58)"
      />
      <!-- Magazine Energy Strip -->
      <rect
        x="64.5"
        y="54"
        width="2.5"
        height="9"
        rx="0.4"
        fill="#00aadd"
        opacity="0.35"
        transform="rotate(2 66 58)"
      >
        <animate
          attributeName="opacity"
          values="0.2;0.5;0.2"
          dur="2s"
          repeatCount="indefinite"
        />
      </rect>
      <!-- Magazine Base -->
      <rect
        x="62.5"
        y="63.5"
        width="7"
        height="1.5"
        rx="0.4"
        fill="#162838"
        transform="rotate(2 66 58)"
      />

      <!-- Tactical Laser Module -->
      <rect
        x="60"
        y="49.5"
        width="5"
        height="2.5"
        rx="0.6"
        fill="#1a1a1a"
      />
      <circle cx="60.5" cy="50.8" r="0.6" fill="#ff0000" opacity="0.7">
        <animate
          attributeName="opacity"
          values="0.4;0.9;0.4"
          dur="1s"
          repeatCount="indefinite"
        />
      </circle>

      <!-- Rear Sight -->
      <rect
        x="75"
        y="35.5"
        width="4"
        height="2.5"
        rx="0.5"
        fill="#0a1420"
      />
      <rect
        x="75.8"
        y="35"
        width="0.8"
        height="2"
        rx="0.2"
        fill="#1a2a3a"
      />
      <rect
        x="78"
        y="35"
        width="0.8"
        height="2"
        rx="0.2"
        fill="#1a2a3a"
      />
      <!-- Front Sight -->
      <rect
        x="60"
        y="35.5"
        width="2"
        height="2.5"
        rx="0.5"
        fill="#0a1420"
      />
      <rect
        x="60.5"
        y="35"
        width="1"
        height="2"
        rx="0.2"
        fill="#1a2a3a"
      />

      <!-- Slide Detail Lines -->
      <line
        x1="59"
        y1="43"
        x2="82"
        y2="43"
        stroke="#243d50"
        stroke-width="0.3"
      />
      <line
        x1="59"
        y1="46"
        x2="76"
        y2="46"
        stroke="#1a3040"
        stroke-width="0.3"
      />

      <!-- Hammer -->
      <rect
        x="58"
        y="41"
        width="1.5"
        height="4"
        rx="0.5"
        fill="#0a1420"
      />

      <!-- Muzzle Energy Glow -->
      <circle cx="92" cy="43" r="4" fill="#00ccff" opacity="0.6">
        <animate
          attributeName="opacity"
          values="0.3;0.8;0.3"
          dur="1.2s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="r"
          values="3;5;3"
          dur="1.2s"
          repeatCount="indefinite"
        />
      </circle>
      <!-- Muzzle Flash Ring -->
      <circle
        cx="92"
        cy="43"
        r="6"
        fill="none"
        stroke="#00ccff"
        stroke-width="0.5"
        opacity="0.15"
      >
        <animate
          attributeName="r"
          values="4;8;4"
          dur="1.2s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.05;0.2;0.05"
          dur="1.2s"
          repeatCount="indefinite"
        />
      </circle>
    </g>

    <!-- Energy Beams -->
    <line
      x1="92"
      y1="44"
      x2="100"
      y2="65"
      stroke="#00ccff"
      stroke-width="2.5"
      opacity="0.5"
      stroke-dasharray="5,7"
    >
      <animate
        attributeName="opacity"
        values="0.3;0.7;0.3"
        dur="0.8s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="stroke-dashoffset"
        values="0;12"
        dur="0.5s"
        repeatCount="indefinite"
      />
    </line>
    <line
      x1="92"
      y1="45"
      x2="100"
      y2="64"
      stroke="#00ddff"
      stroke-width="1"
      opacity="0.3"
      stroke-dasharray="3,9"
    >
      <animate
        attributeName="opacity"
        values="0.1;0.4;0.1"
        dur="0.6s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="stroke-dashoffset"
        values="0;8"
        dur="0.4s"
        repeatCount="indefinite"
      />
    </line>
    <line
      x1="92"
      y1="43"
      x2="100"
      y2="63"
      stroke="#00ccff"
      stroke-width="0.6"
      opacity="0.2"
      stroke-dasharray="2,10"
    >
      <animate
        attributeName="opacity"
        values="0.05;0.3;0.05"
        dur="0.7s"
        repeatCount="indefinite"
      />
    </line>

    <!-- Legs -->
    <!-- Left -->
    <path
      d="M-1,76 Q-4,80 -4,92 L-3,108 Q-2,111 3,111 L12,111 Q15,110 14,107 L14,82 Q14,76 10,76 Z"
      fill="#1a2a3a"
    />
    <!-- Right -->
    <path
      d="M14,76 Q14,82 14,92 L14,108 Q14,111 18,111 L26,111 Q29,110 28,107 L27,82 Q27,76 22,76 Z"
      fill="#1a2a3a"
    />
    <!-- Knee Armor -->
    <ellipse
      cx="7"
      cy="91"
      rx="6"
      ry="5"
      fill="#243d50"
      opacity="0.5"
    />
    <ellipse
      cx="21"
      cy="91"
      rx="6"
      ry="5"
      fill="#243d50"
      opacity="0.5"
    />
    <!-- Shin Guards -->
    <rect
      x="0"
      y="95"
      width="10"
      height="10"
      rx="2"
      fill="#243d50"
      opacity="0.4"
    />
    <rect
      x="16"
      y="95"
      width="10"
      height="10"
      rx="2"
      fill="#243d50"
      opacity="0.4"
    />
    <!-- Boots -->
    <path
      d="M-4,107 Q-5,110 -3,112 L14,112 Q16,110 14,107 Z"
      fill="#0d1a28"
    />
    <path
      d="M14,107 Q12,110 14,112 L29,112 Q31,110 28,107 Z"
      fill="#0d1a28"
    />

    <!-- Utility Belt -->
    <rect x="-4" y="74" width="32" height="5" rx="1" fill="#243d50" />
    <!-- Buckle -->
    <rect
      x="8"
      y="74"
      width="8"
      height="5"
      rx="1"
      fill="#334466"
      opacity="0.6"
    />
    <!-- Pouches (The ultimate fanny pack :) -->
    <rect
      x="0"
      y="76"
      width="5"
      height="4"
      rx="1"
      fill="#1a2a3a"
      stroke="#243d50"
      stroke-width="0.3"
    />
    <rect
      x="19"
      y="76"
      width="5"
      height="4"
      rx="1"
      fill="#1a2a3a"
      stroke="#243d50"
      stroke-width="0.3"
    />

    <!-- Glowing Chest Badge -->
    <circle cx="12" cy="47" r="5" fill="#00ccff" opacity="0.15">
      <animate
        attributeName="opacity"
        values="0.1;0.25;0.1"
        dur="1.8s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="r"
        values="4;6;4"
        dur="1.8s"
        repeatCount="indefinite"
      />
    </circle>
    <circle cx="12" cy="47" r="3" fill="#00aadd" opacity="0.7">
      <animate
        attributeName="opacity"
        values="0.5;0.9;0.5"
        dur="1.8s"
        repeatCount="indefinite"
      />
    </circle>
    <circle cx="12" cy="47" r="1.5" fill="#00ddff" opacity="0.5" />
    <!-- Badge rotating clock hand -->
    <line
      x1="12"
      y1="47"
      x2="12"
      y2="44.5"
      stroke="#aaeeff"
      stroke-width="0.5"
      opacity="0.6"
    >
      <animateTransform
        attributeName="transform"
        type="rotate"
        values="0 12 47;360 12 47"
        dur="4s"
        repeatCount="indefinite"
      />
    </line>
    </g>
  </svg>
`;var Xs=class extends HTMLElement{constructor(){super(),this.attachShadow({mode:`open`}),this.shadowRoot.appendChild(Ys.content.cloneNode(!0))}};customElements.define(`title-hero`,Xs);var Zs=document.createElement(`template`);Zs.innerHTML=`
  <style>
    :host {
      display: block;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
    svg {
      width: 100%;
      height: 100%;
    }
  </style>
  <svg viewBox="0 0 700 400" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <g transform="translate(480, 30)" opacity="0.92" filter="url(#glow)">
    <!-- Aura -->
    <ellipse
      cx="40"
      cy="160"
      rx="90"
      ry="120"
      fill="#440022"
      opacity="0.15"
    >
      <animate
        attributeName="rx"
        values="85;95;85"
        dur="4s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="opacity"
        values="0.1;0.2;0.1"
        dur="4s"
        repeatCount="indefinite"
      />
    </ellipse>
    <!-- Rings -->
    <ellipse
      cx="40"
      cy="140"
      rx="70"
      ry="70"
      fill="none"
      stroke="#ff0088"
      stroke-width="0.6"
      opacity="0.12"
    >
      <animate
        attributeName="rx"
        values="65;75;65"
        dur="3s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="ry"
        values="65;75;65"
        dur="3s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="opacity"
        values="0.06;0.15;0.06"
        dur="3s"
        repeatCount="indefinite"
      />
    </ellipse>
    <ellipse
      cx="40"
      cy="140"
      rx="55"
      ry="55"
      fill="none"
      stroke="#ff0044"
      stroke-width="0.4"
      opacity="0.08"
    >
      <animate
        attributeName="rx"
        values="50;60;50"
        dur="2.5s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="ry"
        values="50;60;50"
        dur="2.5s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="opacity"
        values="0.04;0.12;0.04"
        dur="2.5s"
        repeatCount="indefinite"
      />
    </ellipse>
    <!-- Body -->
    <rect x="10" y="95" width="60" height="120" rx="4" fill="#2a0018" />
    <!-- Armor Plate -->
    <rect
      x="14"
      y="100"
      width="52"
      height="110"
      rx="3"
      fill="#440022"
    />
    <!-- Center Chest Plate -->
    <rect x="22" y="105" width="36" height="50" rx="2" fill="#550030" />
    <!-- Chest Energy Core -->
    <ellipse
      cx="40"
      cy="125"
      rx="8"
      ry="8"
      fill="#ff0088"
      opacity="0.15"
    >
      <animate
        attributeName="opacity"
        values="0.08;0.25;0.08"
        dur="2s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="rx"
        values="7;10;7"
        dur="2s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="ry"
        values="7;10;7"
        dur="2s"
        repeatCount="indefinite"
      />
    </ellipse>
    <ellipse
      cx="40"
      cy="125"
      rx="4"
      ry="4"
      fill="#ff0088"
      opacity="0.4"
    >
      <animate
        attributeName="opacity"
        values="0.25;0.6;0.25"
        dur="2s"
        repeatCount="indefinite"
      />
    </ellipse>
    <ellipse
      cx="40"
      cy="125"
      rx="1.5"
      ry="1.5"
      fill="#ff88bb"
      opacity="0.7"
    />
    <!-- Chest Ribbing -->
    <line
      x1="22"
      y1="115"
      x2="58"
      y2="115"
      stroke="#660038"
      stroke-width="0.5"
    />
    <line
      x1="22"
      y1="120"
      x2="58"
      y2="120"
      stroke="#660038"
      stroke-width="0.5"
    />
    <line
      x1="22"
      y1="130"
      x2="58"
      y2="130"
      stroke="#660038"
      stroke-width="0.5"
    />
    <line
      x1="22"
      y1="135"
      x2="58"
      y2="135"
      stroke="#660038"
      stroke-width="0.5"
    />
    <line
      x1="22"
      y1="145"
      x2="58"
      y2="145"
      stroke="#660038"
      stroke-width="0.5"
    />
    <!-- Side Panel Lines -->
    <line
      x1="14"
      y1="105"
      x2="14"
      y2="205"
      stroke="#660038"
      stroke-width="0.4"
    />
    <line
      x1="66"
      y1="105"
      x2="66"
      y2="205"
      stroke="#660038"
      stroke-width="0.4"
    />

    <!-- Shoulder Pauldrons -->
    <!-- Left -->
    <path
      d="M10,95 Q-15,85 -20,100 Q-18,115 -5,118 Q5,115 10,110 Z"
      fill="#440022"
      stroke="#660038"
      stroke-width="0.5"
    />
    <path
      d="M8,97 Q-10,90 -14,102 Q-12,112 -2,114 Q6,112 8,108 Z"
      fill="#550030"
    />
    <!-- Pauldron Spikes -->
    <path d="M-14,100 L-22,88 L-12,96 Z" fill="#660038" />
    <path d="M-16,105 L-26,97 L-14,103 Z" fill="#660038" />
    <!-- Right -->
    <path
      d="M70,95 Q95,85 100,100 Q98,115 85,118 Q75,115 70,110 Z"
      fill="#440022"
      stroke="#660038"
      stroke-width="0.5"
    />
    <path
      d="M72,97 Q90,90 94,102 Q92,112 82,114 Q74,112 72,108 Z"
      fill="#550030"
    />
    <!-- Pauldron Spikes -->
    <path d="M94,100 L102,88 L92,96 Z" fill="#660038" />
    <path d="M96,105 L106,97 L94,103 Z" fill="#660038" />

    <!-- Head -->
    <rect x="20" y="60" width="40" height="40" rx="5" fill="#2a0018" />
    <!-- Helmet Plating -->
    <rect x="22" y="62" width="36" height="36" rx="4" fill="#440022" />
    <!-- Helmet Ridge -->
    <rect x="35" y="58" width="10" height="6" rx="2" fill="#550030" />
    <!-- Helmet Side Pieces -->
    <rect x="18" y="70" width="5" height="20" rx="1" fill="#550030" />
    <rect x="57" y="70" width="5" height="20" rx="1" fill="#550030" />

    <!-- Crown / Horns -->
    <!-- Left Horn -->
    <path
      d="M24,62 Q18,40 10,25 Q8,20 12,18 Q16,22 20,35 Q22,48 24,58 Z"
      fill="#660038"
      stroke="#880044"
      stroke-width="0.4"
    >
      <animate
        attributeName="d"
        values="M24,62 Q18,40 10,25 Q8,20 12,18 Q16,22 20,35 Q22,48 24,58 Z;M24,62 Q16,38 8,22 Q6,17 10,15 Q14,19 18,33 Q21,47 24,58 Z;M24,62 Q18,40 10,25 Q8,20 12,18 Q16,22 20,35 Q22,48 24,58 Z"
        dur="6s"
        repeatCount="indefinite"
      />
    </path>
    <!-- Center Horn -->
    <path
      d="M36,60 Q35,35 34,15 Q33,8 37,5 Q41,4 43,8 Q44,15 44,35 Q44,50 44,60 Z"
      fill="#770040"
      stroke="#990055"
      stroke-width="0.4"
    >
      <animate
        attributeName="d"
        values="M36,60 Q35,35 34,15 Q33,8 37,5 Q41,4 43,8 Q44,15 44,35 Q44,50 44,60 Z;M36,60 Q34,33 33,12 Q32,5 36,2 Q40,1 42,5 Q43,12 43,33 Q43,48 44,60 Z;M36,60 Q35,35 34,15 Q33,8 37,5 Q41,4 43,8 Q44,15 44,35 Q44,50 44,60 Z"
        dur="5s"
        repeatCount="indefinite"
      />
    </path>
    <!-- Right Horn -->
    <path
      d="M56,62 Q62,40 70,25 Q72,20 68,18 Q64,22 60,35 Q58,48 56,58 Z"
      fill="#660038"
      stroke="#880044"
      stroke-width="0.4"
    >
      <animate
        attributeName="d"
        values="M56,62 Q62,40 70,25 Q72,20 68,18 Q64,22 60,35 Q58,48 56,58 Z;M56,62 Q64,38 72,22 Q74,17 70,15 Q66,19 62,33 Q59,47 56,58 Z;M56,62 Q62,40 70,25 Q72,20 68,18 Q64,22 60,35 Q58,48 56,58 Z"
        dur="6s"
        repeatCount="indefinite"
      />
    </path>
    <!-- Horn Glow Tips -->
    <circle cx="12" cy="18" r="2" fill="#ff0088" opacity="0.5">
      <animate
        attributeName="opacity"
        values="0.3;0.7;0.3"
        dur="2s"
        repeatCount="indefinite"
      />
    </circle>
    <circle cx="38" cy="5" r="2.5" fill="#ff0088" opacity="0.6">
      <animate
        attributeName="opacity"
        values="0.3;0.8;0.3"
        dur="1.8s"
        repeatCount="indefinite"
      />
    </circle>
    <circle cx="68" cy="18" r="2" fill="#ff0088" opacity="0.5">
      <animate
        attributeName="opacity"
        values="0.3;0.7;0.3"
        dur="2s"
        repeatCount="indefinite"
      />
    </circle>

    <!-- Three Eyes -->
    <!-- Left Eye -->
    <rect
      x="25"
      y="74"
      width="8"
      height="6"
      rx="1"
      fill="#ff0000"
      opacity="0.9"
    >
      <animate
        attributeName="opacity"
        values="0.7;1;0.7"
        dur="1.5s"
        repeatCount="indefinite"
      />
    </rect>
    <rect
      x="27"
      y="75.5"
      width="4"
      height="3"
      rx="0.5"
      fill="#ffaaaa"
      opacity="0.8"
    />
    <rect
      x="28"
      y="76"
      width="2"
      height="2"
      rx="0.3"
      fill="#ffffff"
      opacity="0.6"
    />
    <!-- Center Eye (larger) -->
    <rect
      x="33"
      y="72"
      width="14"
      height="10"
      rx="2"
      fill="#ff0000"
      opacity="0.95"
    >
      <animate
        attributeName="opacity"
        values="0.8;1;0.8"
        dur="1.2s"
        repeatCount="indefinite"
      />
    </rect>
    <rect
      x="36"
      y="74"
      width="8"
      height="6"
      rx="1"
      fill="#ffaaaa"
      opacity="0.8"
    />
    <rect
      x="38"
      y="75"
      width="4"
      height="4"
      rx="0.5"
      fill="#ffffff"
      opacity="0.7"
    />
    <!-- Pupil animation -->
    <rect x="39" y="76" width="2" height="2" rx="0.5" fill="#ff0044">
      <animate
        attributeName="x"
        values="39;37;41;39"
        dur="4s"
        repeatCount="indefinite"
      />
    </rect>
    <!-- Right Eye -->
    <rect
      x="47"
      y="74"
      width="8"
      height="6"
      rx="1"
      fill="#ff0000"
      opacity="0.9"
    >
      <animate
        attributeName="opacity"
        values="0.7;1;0.7"
        dur="1.5s"
        repeatCount="indefinite"
      />
    </rect>
    <rect
      x="49"
      y="75.5"
      width="4"
      height="3"
      rx="0.5"
      fill="#ffaaaa"
      opacity="0.8"
    />
    <rect
      x="50"
      y="76"
      width="2"
      height="2"
      rx="0.3"
      fill="#ffffff"
      opacity="0.6"
    />
    <!-- Eye Glow -->
    <rect
      x="23"
      y="72"
      width="12"
      height="10"
      rx="2"
      fill="#ff0000"
      opacity="0.1"
    >
      <animate
        attributeName="opacity"
        values="0.05;0.15;0.05"
        dur="1.5s"
        repeatCount="indefinite"
      />
    </rect>
    <rect
      x="31"
      y="70"
      width="18"
      height="14"
      rx="3"
      fill="#ff0000"
      opacity="0.1"
    >
      <animate
        attributeName="opacity"
        values="0.05;0.2;0.05"
        dur="1.2s"
        repeatCount="indefinite"
      />
    </rect>
    <rect
      x="45"
      y="72"
      width="12"
      height="10"
      rx="2"
      fill="#ff0000"
      opacity="0.1"
    >
      <animate
        attributeName="opacity"
        values="0.05;0.15;0.05"
        dur="1.5s"
        repeatCount="indefinite"
      />
    </rect>

    <!-- Belt / Midsection -->
    <rect x="8" y="155" width="64" height="6" rx="1" fill="#330018" />
    <rect x="28" y="155" width="24" height="6" rx="1" fill="#550030" />
    <!-- Belt Buckle -->
    <ellipse
      cx="40"
      cy="158"
      rx="5"
      ry="3"
      fill="#ff0088"
      opacity="0.3"
    >
      <animate
        attributeName="opacity"
        values="0.2;0.4;0.2"
        dur="2s"
        repeatCount="indefinite"
      />
    </ellipse>

    <!-- Arms -->
    <!-- Left Arm -->
    <path
      d="M10,100 Q-5,110 -15,130 Q-20,145 -18,160 Q-15,170 -10,175"
      fill="none"
      stroke="#440022"
      stroke-width="8"
      stroke-linecap="round"
    />
    <path
      d="M10,100 Q-5,110 -15,130 Q-20,145 -18,160 Q-15,170 -10,175"
      fill="none"
      stroke="#550030"
      stroke-width="5"
      stroke-linecap="round"
    />
    <!-- Left Fist -->
    <circle cx="-10" cy="175" r="6" fill="#2a0018" />
    <!-- Left Fist Glow -->
    <circle cx="-10" cy="175" r="8" fill="#ff0088" opacity="0.1">
      <animate
        attributeName="opacity"
        values="0.05;0.15;0.05"
        dur="2s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="r"
        values="7;10;7"
        dur="2s"
        repeatCount="indefinite"
      />
    </circle>
    <!-- Right Arm -->
    <path
      d="M70,100 Q85,110 95,130 Q100,145 98,160 Q95,170 90,175"
      fill="none"
      stroke="#440022"
      stroke-width="8"
      stroke-linecap="round"
    />
    <path
      d="M70,100 Q85,110 95,130 Q100,145 98,160 Q95,170 90,175"
      fill="none"
      stroke="#550030"
      stroke-width="5"
      stroke-linecap="round"
    />
    <!-- Right Fist -->
    <circle cx="90" cy="175" r="6" fill="#2a0018" />
    <!-- Right Fist Energy Orb -->
    <circle cx="90" cy="175" r="5" fill="#ff0088" opacity="0.25">
      <animate
        attributeName="opacity"
        values="0.15;0.4;0.15"
        dur="1.5s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="r"
        values="4;7;4"
        dur="1.5s"
        repeatCount="indefinite"
      />
    </circle>
    <circle cx="90" cy="175" r="2.5" fill="#ff88bb" opacity="0.5">
      <animate
        attributeName="opacity"
        values="0.3;0.7;0.3"
        dur="1.5s"
        repeatCount="indefinite"
      />
    </circle>

    <!-- Legs -->
    <!-- Left Leg -->
    <rect x="14" y="215" width="18" height="70" rx="3" fill="#2a0018" />
    <rect x="16" y="220" width="14" height="55" rx="2" fill="#440022" />
    <!-- Knee Plate -->
    <ellipse
      cx="23"
      cy="248"
      rx="8"
      ry="6"
      fill="#550030"
      opacity="0.7"
    />
    <!-- Shin Guard -->
    <rect
      x="17"
      y="255"
      width="12"
      height="20"
      rx="2"
      fill="#550030"
      opacity="0.5"
    />
    <!-- Boot -->
    <path
      d="M12,282 Q10,288 14,292 L34,292 Q38,288 34,282 Z"
      fill="#1a0011"
    />
    <!-- Right Leg -->
    <rect x="48" y="215" width="18" height="70" rx="3" fill="#2a0018" />
    <rect x="50" y="220" width="14" height="55" rx="2" fill="#440022" />
    <!-- Knee Plate -->
    <ellipse
      cx="57"
      cy="248"
      rx="8"
      ry="6"
      fill="#550030"
      opacity="0.7"
    />
    <!-- Shin Guard -->
    <rect
      x="51"
      y="255"
      width="12"
      height="20"
      rx="2"
      fill="#550030"
      opacity="0.5"
    />
    <!-- Boot -->
    <path
      d="M46,282 Q44,288 48,292 L68,292 Q72,288 68,282 Z"
      fill="#1a0011"
    />

    <!-- Floating Temporal Shards -->
    <path d="M-30,120 L-35,110 L-28,115 Z" fill="#ff0088" opacity="0.3">
      <animate
        attributeName="opacity"
        values="0.1;0.4;0.1"
        dur="3s"
        repeatCount="indefinite"
      />
      <animateTransform
        attributeName="transform"
        type="translate"
        values="0,0;-3,-5;0,0"
        dur="3s"
        repeatCount="indefinite"
      />
    </path>
    <path
      d="M105,130 L112,122 L108,128 Z"
      fill="#ff0044"
      opacity="0.25"
    >
      <animate
        attributeName="opacity"
        values="0.1;0.35;0.1"
        dur="3.5s"
        repeatCount="indefinite"
      />
      <animateTransform
        attributeName="transform"
        type="translate"
        values="0,0;4,-3;0,0"
        dur="3.5s"
        repeatCount="indefinite"
      />
    </path>
    <path d="M-25,160 L-32,155 L-27,158 Z" fill="#ff0088" opacity="0.2">
      <animate
        attributeName="opacity"
        values="0.05;0.3;0.05"
        dur="4s"
        repeatCount="indefinite"
      />
      <animateTransform
        attributeName="transform"
        type="translate"
        values="0,0;-4,3;0,0"
        dur="4s"
        repeatCount="indefinite"
      />
    </path>
    <path d="M100,155 L108,150 L103,153 Z" fill="#ff0044" opacity="0.2">
      <animate
        attributeName="opacity"
        values="0.05;0.3;0.05"
        dur="2.8s"
        repeatCount="indefinite"
      />
      <animateTransform
        attributeName="transform"
        type="translate"
        values="0,0;3,4;0,0"
        dur="2.8s"
        repeatCount="indefinite"
      />
    </path>

    <!-- Dark Energy Tendrils -->
    <path
      d="M15,210 Q0,230 -15,260 Q-25,280 -20,300"
      fill="none"
      stroke="#ff0088"
      stroke-width="1"
      opacity="0.15"
      stroke-dasharray="4,6"
    >
      <animate
        attributeName="stroke-dashoffset"
        values="0;10"
        dur="1.5s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="opacity"
        values="0.08;0.2;0.08"
        dur="3s"
        repeatCount="indefinite"
      />
    </path>
    <path
      d="M65,210 Q80,230 95,260 Q105,280 100,300"
      fill="none"
      stroke="#ff0088"
      stroke-width="1"
      opacity="0.15"
      stroke-dasharray="4,6"
    >
      <animate
        attributeName="stroke-dashoffset"
        values="0;10"
        dur="1.5s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="opacity"
        values="0.08;0.2;0.08"
        dur="3s"
        repeatCount="indefinite"
      />
    </path>
    <path
      d="M40,220 Q35,250 30,280 Q25,300 28,320"
      fill="none"
      stroke="#ff0044"
      stroke-width="0.6"
      opacity="0.1"
      stroke-dasharray="3,8"
    >
      <animate
        attributeName="stroke-dashoffset"
        values="0;8"
        dur="2s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="opacity"
        values="0.05;0.15;0.05"
        dur="4s"
        repeatCount="indefinite"
      />
    </path>
    </g>
  </svg>
`;var Qs=class extends HTMLElement{constructor(){super(),this.attachShadow({mode:`open`}),this.shadowRoot.appendChild(Zs.content.cloneNode(!0))}};customElements.define(`title-paradox-lord`,Qs);
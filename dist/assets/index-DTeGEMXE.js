const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/harness-C8bEYiXe.js","assets/game-BNJUSc51.js","assets/debug-bridge-CMlsuLJC.js"])))=>i.map(i=>d[i]);
import{a as e,c as t,d as n,i as r,n as i,o as a,p as o,r as s,s as c,t as l,v as u,y as d}from"./game-BNJUSc51.js";(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})(),u();var f=class i{static init(e){if(!(`ontouchstart`in window))return null;let t=new i(e);return t.setup(),t}constructor(e){this.game=e,this.joyTouch=null,this.joyOrigin={x:0,y:0},this.joyPos={x:0,y:0},this.joyActive=!1,this.joyRadius=window.innerHeight<420?45:60,this.lookTouch=null,this.lookOrigin={x:0,y:0},this.lookLast={x:0,y:0},this.lookActive=!1,this.lookTapTime=0,this.fireTouch=null,this.zones={},this.safeArea={top:0,right:0,bottom:0,left:0},this.canvas=null,this.ctx=null,this.activeButtons=new Set,this.sprintToggleActive=!1,this.chronoTouch=null,this.crouchTouch=null,this.cutsceneHoldTouch=null,this.cutsceneHoldStart=0,this.lastTapTime=0,this.lastTapZone=null;let t=!1;try{t=!!localStorage.getItem(`cc_touch_tutorial_done`)}catch{}this.showTutorial=!t,this.tutorialDismissed=!1,this.canFullscreen=typeof document.documentElement.requestFullscreen==`function`||typeof document.documentElement.webkitRequestFullscreen==`function`,this.isStandalone=window.navigator.standalone===!0||window.matchMedia(`(display-mode: standalone)`).matches}setup(){this.canvas=document.createElement(`canvas`),this.canvas.id=`touchCanvas`,this.canvas.style.cssText=`position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:20;pointer-events:none;`,document.body.appendChild(this.canvas),this.touchLayer=document.createElement(`div`),this.touchLayer.id=`touchLayer`,this.touchLayer.style.cssText=`position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:15;touch-action:none;`,document.body.appendChild(this.touchLayer),this.resize(),this._onResize=()=>this.resize(),this._onTouchStart=e=>this.onTouchStart(e),this._onTouchMove=e=>this.onTouchMove(e),this._onTouchEnd=e=>this.onTouchEnd(e),window.addEventListener(`resize`,this._onResize),this.touchLayer.addEventListener(`touchstart`,this._onTouchStart,{passive:!1}),this.touchLayer.addEventListener(`touchmove`,this._onTouchMove,{passive:!1}),this.touchLayer.addEventListener(`touchend`,this._onTouchEnd,{passive:!1}),this.touchLayer.addEventListener(`touchcancel`,this._onTouchEnd,{passive:!1}),this.game.mouse.locked=!0,document.body.style.cursor=`none`}destroy(){window.removeEventListener(`resize`,this._onResize),this.touchLayer.removeEventListener(`touchstart`,this._onTouchStart),this.touchLayer.removeEventListener(`touchmove`,this._onTouchMove),this.touchLayer.removeEventListener(`touchend`,this._onTouchEnd),this.touchLayer.removeEventListener(`touchcancel`,this._onTouchEnd),this.canvas.remove(),this.touchLayer.remove()}resize(){let e=window.innerWidth,t=window.innerHeight;this.canvas.width=e,this.canvas.height=t,this._updateSafeArea();let n=this.safeArea,r=t<420;this.joyRadius=r?45:60;let i=r?Math.max(40,Math.min(46,e*.07)):Math.max(44,Math.min(56,e*.09)),a=(r?10:14)+n.right,o=(r?8:14)+n.bottom;this.zones={w:e,h:t,btnSize:i,isCompactPhone:r,joyCenter:{x:Math.max(80,60+n.left),y:r?t-90-n.bottom:t-140-n.bottom},fireBtn:{x:e-a-i*1.6,y:r?t-o-i*1:t-o-i*1.3,r:i},dashBtn:{x:e-a-i*.5,y:r?t-o-i*2.5:t-o-i*3.2,r:i*.65},interactBtn:{x:e-a-i*2.9,y:r?t-o-i*2.5:t-o-i*3.2,r:i*.65},sprintBtn:{x:Math.max(60,42+n.left),y:r?t-170-n.bottom:t-260-n.bottom,r:i*.55},chronoBtn:{x:Math.max(60,42+n.left),y:r?t-240-n.bottom:t-350-n.bottom,r:i*.6},crouchBtn:{x:Math.max(60,42+n.left)+i*.9,y:r?t-200-n.bottom:t-290-n.bottom,r:i*.45},weaponBtn:{x:e-a-i*3.2,y:r?t-o-i*1:t-o-i*1.3,r:i*.55},pauseBtn:{x:e-50-n.right,y:(r?28:40)+n.top,r:r?22:26},fullscreenBtn:{x:e-110-n.right,y:(r?28:40)+n.top,r:r?22:26},midX:e*.28}}_updateSafeArea(){try{let e=getComputedStyle(document.documentElement),t=t=>parseInt(e.getPropertyValue(t),10)||0;this.safeArea={top:t(`--sat`),right:t(`--sar`),bottom:t(`--sab`),left:t(`--sal`)}}catch{}}hitTest(e,t){let n=this.zones,r=.85;return this.dist(e,t,n.fireBtn.x,n.fireBtn.y)<n.fireBtn.r*r?`fire`:this.dist(e,t,n.dashBtn.x,n.dashBtn.y)<n.dashBtn.r*r?`dash`:this.dist(e,t,n.interactBtn.x,n.interactBtn.y)<n.interactBtn.r*r?`interact`:this.dist(e,t,n.chronoBtn.x,n.chronoBtn.y)<n.chronoBtn.r*r?`chrono`:this.dist(e,t,n.sprintBtn.x,n.sprintBtn.y)<n.sprintBtn.r*r?`sprint`:this.dist(e,t,n.crouchBtn.x,n.crouchBtn.y)<n.crouchBtn.r*r?`crouch`:this.dist(e,t,n.weaponBtn.x,n.weaponBtn.y)<n.weaponBtn.r*r?`weapon`:this.dist(e,t,n.pauseBtn.x,n.pauseBtn.y)<n.pauseBtn.r*r?`pause`:this.canFullscreen&&!this.isStandalone&&this.dist(e,t,n.fullscreenBtn.x,n.fullscreenBtn.y)<n.fullscreenBtn.r?`fullscreen`:e<n.midX?`joy`:`look`}dist(e,t,n,r){return Math.sqrt((e-n)**2+(t-r)**2)}onTouchStart(e){e.preventDefault();let t=this.game;if(this.showTutorial&&!this.tutorialDismissed&&t.state===`playing`){this.tutorialDismissed=!0;try{localStorage.setItem(`cc_touch_tutorial_done`,`1`)}catch{}return}if(t.state===`cutscene`){e.changedTouches.length>0&&(this.cutsceneHoldTouch=e.changedTouches[0].identifier,this.cutsceneHoldStart=performance.now(),t.advanceCutsceneFrame());return}if(t.state===`tutorialComplete`){e.changedTouches.length>0&&this.handleTutorialCompleteTap(e.changedTouches[0]);return}if(t.state===`campaignPrompt`||t.state===`gameOver`||t.state===`victory`||t.state===`levelComplete`){e.changedTouches.length>0&&t.handleKeyPress(`Enter`);return}if(t.state===`paused`){e.changedTouches.length>0&&this.handlePauseTap(e.changedTouches[0]);return}if(t.state===`settings`){e.changedTouches.length>0&&this.handleSettingsTap(e.changedTouches[0]);return}if(t.state===`upgrade`){e.changedTouches.length>0&&this.handleUpgradeTap(e.changedTouches[0]);return}if(t.state===`controls`){e.changedTouches.length>0&&this.handleControlsTap(e.changedTouches[0]);return}if(t.state===`characterCreate`){if(e.changedTouches.length>0){let n=e.changedTouches[0],r=this.zones.w,i=this.zones.h,a=this._creatorButtonBounds(r,i);if(n.clientX>=a.saveX&&n.clientX<=a.saveX+a.btnW&&n.clientY>=a.btnY&&n.clientY<=a.btnY+a.btnH){t.audio.menuConfirm(),t._exitCreator(!0);return}if(n.clientX>=a.cancelX&&n.clientX<=a.cancelX+a.btnW&&n.clientY>=a.btnY&&n.clientY<=a.btnY+a.btnH){t.audio.menuConfirm(),t._exitCreator(!1);return}if(n.clientY>40&&n.clientY<110){let e=t.creatorCategoryCount||6;if(n.clientX<60){t.creatorCategory=(t.creatorCategory-1+e)%e,t.audio.menuSelect();return}if(n.clientX>r-60){t.creatorCategory=(t.creatorCategory+1)%e,t.audio.menuSelect();return}}t._handleCreatorClick({clientX:n.clientX,clientY:n.clientY})}return}for(let n of e.changedTouches){let e=n.clientX,r=n.clientY,i=this.hitTest(e,r);if(i===`joy`&&this.joyTouch===null){this.joyTouch=n.identifier,this.joyOrigin={x:e,y:r},this.joyPos={x:e,y:r},this.joyActive=!0;let i=performance.now();this.lastTapZone===`joy`&&i-this.lastTapTime<250?(this.activeButtons.add(`dash`),this.triggerDirectionalDash(t,!0),this.lastTapTime=0):(this.lastTapTime=i,this.lastTapZone=`joy`)}else if(i===`look`&&this.lookTouch===null)this.lookTouch=n.identifier,this.lookOrigin={x:e,y:r},this.lookLast={x:e,y:r},this.lookActive=!0,this.lookTapTime=performance.now();else if(i===`fire`&&this.fireTouch===null)this.fireTouch=n.identifier,t.player.isFiring=!0,this.activeButtons.add(`fire`),t.settings.haptics&&navigator.vibrate&&navigator.vibrate(15);else if(i===`dash`)this.activeButtons.add(`dash`),this.triggerDirectionalDash(t,!0);else if(i===`interact`)this.activeButtons.add(`interact`),t.interact();else if(i===`chrono`&&this.chronoTouch===null)this.activeButtons.add(`chrono`),this.chronoTouch=n.identifier,t.keys[t.keybinds.chronoShift]=!0;else if(i===`crouch`&&this.crouchTouch===null)this.activeButtons.add(`crouch`),this.crouchTouch=n.identifier,t.keys[t.keybinds.crouch]=!0,t.settings.haptics&&navigator.vibrate&&navigator.vibrate(10);else if(i===`sprint`)this.sprintToggleActive=!this.sprintToggleActive,this.activeButtons.add(`sprint`),t.keys[t.keybinds.sprint]=this.sprintToggleActive;else if(i===`weapon`){this.activeButtons.add(`weapon`);let e=t.player;e.weapons.length>1&&(e.currentWeapon=(e.currentWeapon+1)%e.weapons.length,t.triggerAriaOnce(`weaponSwitch`,`weaponSwitch`),t.mode===`tutorial`&&(t.tutorialWeaponSwapped=!0),t.settings.haptics&&navigator.vibrate&&navigator.vibrate(25))}else i===`fullscreen`?this.toggleFullscreen():i===`pause`&&(this.activeButtons.add(`pause`),t.handleKeyPress(`Escape`))}}onTouchMove(e){e.preventDefault();for(let t of e.changedTouches)if(t.identifier===this.joyTouch)this.joyPos.x=t.clientX,this.joyPos.y=t.clientY,this.updateJoystickKeys();else if(t.identifier===this.lookTouch){let e=t.clientX-this.lookLast.x,n=t.clientY-this.lookLast.y;if(this.game.settings.autoFire){let e=t.clientX-this.lookOrigin.x,n=t.clientY-this.lookOrigin.y;Math.sqrt(e*e+n*n)>20?(this.game.player.angle=Math.atan2(n,e),this.game.player.isFiring||(this.game.player.isFiring=!0,this.activeButtons.add(`fire`),this.game.settings.haptics&&navigator.vibrate&&navigator.vibrate(10))):this.game.player.isFiring&&this.fireTouch===null&&(this.game.player.isFiring=!1,this.activeButtons.delete(`fire`))}else{let t=Number(this.game.settings.touchSensitivity);Number.isFinite(t)||(t=1.5);let r=Math.min(3,Math.max(.5,t));this.game.mouse.dx+=e*r,this.game.mouse.dy+=n*r}this.lookLast.x=t.clientX,this.lookLast.y=t.clientY}}onTouchEnd(e){if(e.preventDefault(),this.cutsceneHoldTouch!==null){for(let t of e.changedTouches)if(t.identifier===this.cutsceneHoldTouch){this.cutsceneHoldTouch=null;break}}for(let t of e.changedTouches)if(t.identifier===this.joyTouch)this.joyTouch=null,this.joyActive=!1,this.clearMovementKeys();else if(t.identifier===this.lookTouch){if(this.game.settings.swipeWeapons){let e=performance.now()-this.lookTapTime,n=t.clientX-this.lookOrigin.x,r=t.clientY-this.lookOrigin.y;if(e<300&&Math.abs(n)>50&&Math.abs(n)>Math.abs(r)*1.5){let e=this.game.player;e.weapons.length>1&&(n>0?e.currentWeapon=(e.currentWeapon+1)%e.weapons.length:e.currentWeapon=(e.currentWeapon-1+e.weapons.length)%e.weapons.length,this.game.triggerAriaOnce(`weaponSwitch`,`weaponSwitch`),this.game.mode===`tutorial`&&(this.game.tutorialWeaponSwapped=!0),this.game.settings.haptics&&navigator.vibrate&&navigator.vibrate(25))}}this.game.settings.autoFire&&this.game.player.isFiring&&this.fireTouch===null&&(this.game.player.isFiring=!1,this.activeButtons.delete(`fire`)),this.lookTouch=null,this.lookActive=!1}else t.identifier===this.fireTouch?(this.fireTouch=null,this.game.player.isFiring=!1,this.activeButtons.delete(`fire`)):t.identifier===this.chronoTouch?(this.chronoTouch=null,this.game.keys[this.game.keybinds.chronoShift]=!1,this.activeButtons.delete(`chrono`)):t.identifier===this.crouchTouch&&(this.crouchTouch=null,this.game.keys[this.game.keybinds.crouch]=!1,this.activeButtons.delete(`crouch`));this.activeButtons.delete(`dash`),this.activeButtons.delete(`interact`),this.activeButtons.delete(`pause`),this.activeButtons.delete(`sprint`),this.activeButtons.delete(`weapon`)}updateJoystickKeys(){let e=this.joyPos.x-this.joyOrigin.x,t=this.joyPos.y-this.joyOrigin.y,n=this.game.keybinds;this.game.keys[n.moveForward]=t<-15,this.game.keys[n.moveBack]=t>15,this.game.keys[n.moveLeft]=e<-15,this.game.keys[n.moveRight]=e>15;let r=Math.sqrt(e*e+t*t);this.game.keys[n.sprint]=this.sprintToggleActive||r>this.joyRadius*1.2}clearMovementKeys(){let e=this.game.keybinds;this.game.keys[e.moveForward]=!1,this.game.keys[e.moveBack]=!1,this.game.keys[e.moveLeft]=!1,this.game.keys[e.moveRight]=!1,this.game.keys[e.sprint]=this.sprintToggleActive}handlePauseTap(e){let t=this.zones.w,n=this.zones.h,i=e.clientX,a=e.clientY,o=r(t,n,this.game.mode);for(let e of o.buttons)if(i>=e.x&&i<=e.x+e.w&&a>=e.y&&a<=e.y+e.h){e.index===0?this.game.handleKeyPress(`Escape`):e.index===1?this.game.handleKeyPress(`KeyS`):e.index===2?this.game.handleKeyPress(`KeyC`):e.index===3&&this.game.handleKeyPress(`KeyQ`);return}if(o.saveBtn){let e=o.saveBtn;i>=e.x&&i<=e.x+e.w&&a>=e.y&&a<=e.y+e.h&&this.game.handleKeyPress(`KeyF`)}}handleTutorialCompleteTap(e){let t=this.game,n=this.zones.w,r=this.zones.h,i=e.clientX,o=e.clientY,s=a(n,r,4);for(let e=0;e<4;e++){let n=s.my+8+e*s.itemH;if(i>=s.mx&&i<=s.mx+s.menuW&&o>=n&&o<=n+s.itemH-6){t.tutorialMenuSelection=e,t.audio.menuConfirm(),t.executeTutorialCompletionChoice(e);return}}}triggerDirectionalDash(e,t=!1){let n=e.keybinds,r=e.keys[n.moveForward],i=e.keys[n.moveBack],a=e.keys[n.moveLeft],o=e.keys[n.moveRight];if(r||i||a||o){let t=Math.cos(e.player.angle),n=Math.sin(e.player.angle),s=0,c=0;r&&(s+=t,c+=n),i&&(s-=t,c-=n),a&&(s+=n,c-=t),o&&(s-=n,c+=t);let l=Math.sqrt(s*s+c*c);l>0?(s/=l,c/=l,e.triggerDash(null,s,c)):e.triggerDash(e.keybinds.moveForward)}else t&&e.triggerDash(e.keybinds.moveForward)}handleSettingsTap(n){let r=this.game,i=r.hudCanvas,a=i.width/window.innerWidth,o=i.height/window.innerHeight,s=i.width,c=i.height,l=n.clientX*a,u=n.clientY*o,{headerH:d,sideW:f,panelX:p,panelW:m,contentTop:h,catItemH:g,itemHeights:_}=e(s,c,r.settingsSelection,r.isTouchDevice,r.settingsCategory);if(l<f&&u>d){let e=t(r.isTouchDevice),n=Math.floor((u-h)/g);n>=0&&n<e.length&&(r.settingsCategory=e[n],r.settingsSelection=0,r.audio.menuSelect());return}let v=h;for(let e=0;e<_.length;e++){if(u>=v&&u<=v+_[e]&&l>=p&&l<=p+m){r.settingsSelection=e,l<p+m/2?r.handleKeyPress(`ArrowLeft`):r.handleKeyPress(`ArrowRight`);return}v+=_[e]}u>v&&r.handleKeyPress(`Escape`)}handleUpgradeTap(e){let t=this.game.hudCanvas,r=t.width/window.innerWidth,i=t.height/window.innerHeight,a=t.width,o=t.height,s=e.clientX*r,l=e.clientY*i,u=this.game,d=Object.keys(n),f=c(a,o,d.length,this.game.isTouchDevice);if(l>=f.contY-18&&l<=f.contY+18){u.upgradeSelection=d.length,u.handleKeyPress(`Enter`);return}for(let e=0;e<d.length;e++){let t=e%f.cols,n=Math.floor(e/f.cols),r=t===0?f.leftX:f.rightX,i=f.startY+n*(f.cardH+f.cardGap);if(s>=r&&s<=r+f.colW&&l>=i&&l<=i+f.cardH){u.upgradeSelection=e,u.handleKeyPress(`Enter`);return}}}handleControlsTap(e){let t=this.game.hudCanvas,n=t.width/window.innerWidth,r=t.height/window.innerHeight,i=t.width,a=e.clientX*n,o=e.clientY*r,s=this.game;if(s.rebindingKey)return;let c=Object.keys(s.keybinds),l=i/2-240;for(let e=0;e<c.length;e++){let t=100+e*36;if(a>=l&&a<=l+480&&o>=t-2&&o<=t+36-6){s.controlsSelection=e,s.handleKeyPress(`Enter`);return}}let u=100+c.length*36+10;if(a>=l&&a<=l+480&&o>=u-2&&o<=u+36-6){s.controlsSelection=c.length,s.handleKeyPress(`Enter`);return}s.handleKeyPress(`Escape`)}render(){let e=this.ctx||(this.ctx=this.canvas.getContext(`2d`)),t=this.zones;e.clearRect(0,0,t.w,t.h);let n=this.game.state;if(n===`paused`){this.renderPauseButtons(e);return}if(n===`settings`){this.renderSettingsHint(e);return}if(n===`characterCreate`){this.renderCreatorOverlay(e);return}if(n!==`playing`)return;if(this.showTutorial&&!this.tutorialDismissed){this.renderTouchTutorial(e);return}e.globalAlpha=.35,this._lookHintStart||(this._lookHintStart=performance.now());let r=(performance.now()-this._lookHintStart)/1e3;if(r<6&&(e.globalAlpha=r<5?.12:.12*(6-r),e.fillStyle=`#00ccff`,e.font=`14px monospace`,e.textAlign=`center`,e.textBaseline=`middle`,e.fillText(`↔ DRAG TO LOOK ↔`,t.w*.55,t.h*.35),e.globalAlpha=.35),this.joyActive){let t=this.joyOrigin;e.beginPath(),e.arc(t.x,t.y,this.joyRadius,0,Math.PI*2),e.strokeStyle=`#00ccff`,e.lineWidth=2,e.stroke();let n=this.joyPos.x-t.x,r=this.joyPos.y-t.y,i=Math.sqrt(n*n+r*r),a=Math.min(i,this.joyRadius),o=t.x,s=t.y;i>0&&(o=t.x+n/i*a,s=t.y+r/i*a),e.beginPath(),e.arc(o,s,22,0,Math.PI*2),e.fillStyle=`#00ccff`,e.fill()}else{let n=t.joyCenter;e.globalAlpha=.15,e.beginPath(),e.arc(n.x,n.y,this.joyRadius,0,Math.PI*2),e.strokeStyle=`#00ccff`,e.lineWidth=2,e.stroke(),e.beginPath(),e.arc(n.x,n.y,22,0,Math.PI*2),e.fillStyle=`#00ccff`,e.fill(),e.globalAlpha=.35}this.drawButton(e,t.fireBtn.x,t.fireBtn.y,t.fireBtn.r,`FIRE`,this.activeButtons.has(`fire`)?`#ff4444`:`#ff6644`),this.drawButton(e,t.dashBtn.x,t.dashBtn.y,t.dashBtn.r,`DASH`,this.activeButtons.has(`dash`)?`#44ffff`:`#00cccc`),this.drawButton(e,t.interactBtn.x,t.interactBtn.y,t.interactBtn.r,`USE`,this.activeButtons.has(`interact`)?`#44ff44`:`#00cc44`);let i=this.game.player&&this.game.player.chronoActive;this.drawButton(e,t.chronoBtn.x,t.chronoBtn.y,t.chronoBtn.r,`SLOW`,i?`#cc44ff`:this.activeButtons.has(`chrono`)?`#aa44dd`:`#9944ff`),this.drawButton(e,t.crouchBtn.x,t.crouchBtn.y,t.crouchBtn.r,`CROUCH`,this.activeButtons.has(`crouch`)?`#66dd66`:`#558855`),this.drawButton(e,t.sprintBtn.x,t.sprintBtn.y,t.sprintBtn.r,this.sprintToggleActive?`RUN`:`WALK`,this.sprintToggleActive?`#ffaa00`:`#887744`);{let n=this.game.player;if(n){let r=o[n.weapons[n.currentWeapon]],i=r?r.name.split(` `)[0].toUpperCase():`W1`;this.drawButton(e,t.weaponBtn.x,t.weaponBtn.y,t.weaponBtn.r,i,this.activeButtons.has(`weapon`)?`#ffdd44`:`#aa8833`)}}if(this.drawButton(e,t.pauseBtn.x,t.pauseBtn.y,t.pauseBtn.r,`II`,this.activeButtons.has(`pause`)?`#ffdd44`:`rgba(200,200,200,0.5)`),this.canFullscreen&&!this.isStandalone){let n=!!(document.fullscreenElement||document.webkitFullscreenElement);e.beginPath(),e.arc(t.fullscreenBtn.x,t.fullscreenBtn.y,t.fullscreenBtn.r,0,Math.PI*2),e.fillStyle=n?`rgba(0,255,200,0.35)`:`rgba(255,255,255,0.3)`,e.fill(),e.fillStyle=`#fff`,e.font=`bold 14px monospace`,e.fillText(n?`⊡`:`⊞`,t.fullscreenBtn.x,t.fullscreenBtn.y)}e.globalAlpha=1}renderTouchTutorial(e){let t=this.zones.w,n=this.zones.h,r=this.zones.isCompactPhone;e.fillStyle=`rgba(0, 0, 0, 0.85)`,e.fillRect(0,0,t,n),e.textAlign=`center`,e.textBaseline=`middle`,e.fillStyle=`#00ffcc`,e.font=`bold ${r?18:24}px monospace`,e.fillText(`TOUCH CONTROLS`,t/2,r?24:50);let i=r?42:80,a=r?n-80:n-160;e.fillStyle=`rgba(0, 200, 255, 0.2)`,e.fillRect(0,i,t*.4,a),e.fillStyle=`#00ccff`,e.font=`bold ${r?13:16}px monospace`,e.fillText(`MOVE`,t*.2,n/2-(r?24:40)),e.fillStyle=`#aabbcc`,e.font=`${r?11:14}px monospace`,e.fillText(`Touch to place stick`,t*.2,n/2-(r?8:15)),r||e.fillText(`Push far to sprint`,t*.2,n/2+5),e.fillStyle=`rgba(0, 200, 255, 0.1)`,e.fillRect(t*.4,i,t*.6,a),e.fillStyle=`#00ccff`,e.font=`bold ${r?13:16}px monospace`,e.fillText(`LOOK`,t*.7,n/2-(r?24:40)),e.fillStyle=`#aabbcc`,e.font=`${r?11:14}px monospace`,e.fillText(`Drag to aim`,t*.7,n/2-(r?8:15));let o=r?11:14,s=r?16:25,c=r?n-80:n-145,l=[{label:`FIRE`,desc:`Big button`,color:`#ff6644`},{label:`DASH`,desc:`Top-right`,color:`#00cccc`},{label:`USE`,desc:`Top-left`,color:`#00cc44`},{label:`SLOW`,desc:`Time slow`,color:`#9944ff`},{label:`RUN/WALK`,desc:`Sprint toggle`,color:`#ffaa00`}];for(let n=0;n<l.length;n++)e.fillStyle=l[n].color,e.font=`bold ${o}px monospace`,e.fillText(`${l[n].label} — ${l[n].desc}`,t/2,c+n*s);e.fillStyle=`rgba(255, 255, 255, ${.5+.3*Math.sin(performance.now()/400)})`,e.font=`bold ${r?13:16}px monospace`,e.fillText(`TAP ANYWHERE TO START`,t/2,n-(r?12:30))}renderCreatorOverlay(e){let t=this.zones.w,n=this.zones.h,{btnH:r,btnW:i,btnY:a,saveX:o,cancelX:s}=this._creatorButtonBounds(t,n);e.globalAlpha=.9,e.textAlign=`center`,e.textBaseline=`middle`,e.fillStyle=`rgba(0, 180, 80, 0.5)`,e.beginPath(),e.roundRect(o,a,i,r,8),e.fill(),e.strokeStyle=`#00cc66`,e.lineWidth=2,e.beginPath(),e.roundRect(o,a,i,r,8),e.stroke(),e.fillStyle=`#fff`,e.font=`bold 16px monospace`,e.fillText(`✓ SAVE`,o+i/2,a+r/2),e.fillStyle=`rgba(180, 40, 40, 0.4)`,e.beginPath(),e.roundRect(s,a,i,r,8),e.fill(),e.strokeStyle=`#cc3333`,e.lineWidth=2,e.beginPath(),e.roundRect(s,a,i,r,8),e.stroke(),e.fillStyle=`#fff`,e.font=`bold 16px monospace`,e.fillText(`✗ BACK`,s+i/2,a+r/2),e.font=`bold 36px monospace`,e.fillStyle=`rgba(0, 255, 200, 0.6)`,e.fillText(`◀`,30,72),e.fillText(`▶`,t-30,72),e.font=`11px monospace`,e.fillStyle=`rgba(255,255,255,0.35)`,e.fillText(`Tap tabs · ◀ ▶ to switch · Tap items to select`,t/2,a-12),e.globalAlpha=1}_creatorButtonBounds(e,t){let n=this.safeArea,r=Math.min(140,Math.max(110,e*.18));return{btnH:52,btnW:r,gap:16,btnY:t-52-16-n.bottom,saveX:e/2+16/2,cancelX:e/2-16/2-r}}renderPauseButtons(e){let t=this.zones.w,n=this.zones.h,i=r(t,n,this.game.mode);e.globalAlpha=.7;for(let t of i.buttons){let n=t.x,r=t.y,i=t.w,a=t.h;e.fillStyle=t.color,e.strokeStyle=`#fff`,e.lineWidth=2,e.beginPath(),e.roundRect(n,r,i,a,8),e.fill(),e.stroke(),e.fillStyle=`#fff`,e.font=`bold 13px monospace`,e.textAlign=`center`,e.textBaseline=`middle`,e.fillText(t.label,n+i/2,r+a/2)}if(i.saveBtn){let t=i.saveBtn;e.fillStyle=`#00aa44`,e.beginPath(),e.roundRect(t.x,t.y,t.w,t.h,8),e.fill(),e.stroke(),e.fillStyle=`#fff`,e.fillText(`SAVE`,t.x+t.w/2,t.y+t.h/2)}e.globalAlpha=1}renderSettingsHint(e){let t=this.zones.w,n=this.zones.h;e.globalAlpha=.6;let r=(t-120)/2,i=n-60;e.fillStyle=`#556677`,e.strokeStyle=`#aabbcc`,e.lineWidth=2,e.beginPath(),e.roundRect(r,i,120,44,8),e.fill(),e.stroke(),e.fillStyle=`#fff`,e.font=`bold 14px monospace`,e.textAlign=`center`,e.textBaseline=`middle`,e.fillText(`< BACK`,r+120/2,i+44/2),e.fillStyle=`#8899aa`,e.font=`12px monospace`,e.fillText(`Tap setting to change  ·  Left = decrease  ·  Right = increase`,t/2,i-12),e.globalAlpha=1}toggleFullscreen(){if(!this.canFullscreen||this.isStandalone)return;let e=document.fullscreenElement||document.webkitFullscreenElement,t;if(e)t=document.exitFullscreen?document.exitFullscreen():document.webkitExitFullscreen?document.webkitExitFullscreen():void 0;else{let e=document.documentElement;t=e.requestFullscreen?e.requestFullscreen():e.webkitRequestFullscreen?e.webkitRequestFullscreen():void 0}t&&typeof t.catch==`function`&&t.catch(()=>{})}drawButton(e,t,n,r,i,a){e.beginPath(),e.arc(t,n,r,0,Math.PI*2),e.fillStyle=a,e.fill(),e.strokeStyle=`#fff`,e.lineWidth=2,e.stroke(),e.fillStyle=`#fff`,e.font=`bold ${Math.max(12,r*.45)}px monospace`,e.textAlign=`center`,e.textBaseline=`middle`,e.fillText(i,t,n)}},p=(e,t,n)=>e<t?t:e>n?n:e,m={ultra:{renderScale:1,particleMultiplier:1,drawDistance:20,enableScanlines:!0,enableVignette:!0,enableFloorTexture:!0},high:{renderScale:.85,particleMultiplier:.8,drawDistance:18,enableScanlines:!0,enableVignette:!0,enableFloorTexture:!0},medium:{renderScale:.7,particleMultiplier:.5,drawDistance:14,enableScanlines:!1,enableVignette:!0,enableFloorTexture:!0},low:{renderScale:.5,particleMultiplier:.3,drawDistance:10,enableScanlines:!1,enableVignette:!1,enableFloorTexture:!1}},h=class{constructor(e){this.targetFPS=e?.targetFPS??55,this.minScale=e?.minScale??.35,this.maxScale=e?.maxScale??1,this.renderScale=this.maxScale,this.history=[],this.historySize=30,this.adjustInterval=500,this.lastAdjust=0,this.particleMultiplier=1,this.drawDistance=20,this.enableScanlines=!0,this.enableVignette=!0,this.enableFloorTexture=!0}recordFPS(e){this.history.push(e),this.history.length>this.historySize&&this.history.shift()}get averageFPS(){if(this.history.length===0)return 60;let e=0;for(let t of this.history)e+=t;return e/this.history.length}adjust(e){if(e-this.lastAdjust<this.adjustInterval||(this.lastAdjust=e,this.history.length<this.historySize))return!1;let t=this.averageFPS,n=this.renderScale;return t<this.targetFPS-8?this.renderScale*=.9:t<this.targetFPS-3?this.renderScale*=.97:t>this.targetFPS+2&&this.renderScale<this.maxScale&&(this.renderScale*=1.02),this.renderScale=p(this.renderScale,this.minScale,this.maxScale),this.renderScale<.6?(this.enableScanlines=!1,this.enableVignette=!1,this.particleMultiplier=.3,this.drawDistance=10,this.enableFloorTexture=!1):this.renderScale<.8?(this.enableScanlines=!1,this.enableVignette=!0,this.particleMultiplier=.5,this.drawDistance=14,this.enableFloorTexture=!0):(this.enableScanlines=!0,this.enableVignette=!0,this.particleMultiplier=1,this.drawDistance=20,this.enableFloorTexture=!0),Math.abs(this.renderScale-n)>.005}applyPreset(e){let t=m[e];t&&(this.renderScale=t.renderScale,this.particleMultiplier=t.particleMultiplier,this.drawDistance=t.drawDistance,this.enableScanlines=t.enableScanlines,this.enableVignette=t.enableVignette,this.enableFloorTexture=t.enableFloorTexture)}},g=`modulepreload`,_=function(e){return`/`+e},v={},y=function(e,t,n){let r=Promise.resolve();if(t&&t.length>0){let e=document.getElementsByTagName(`link`),i=document.querySelector(`meta[property=csp-nonce]`),a=i?.nonce||i?.getAttribute(`nonce`);function o(e){return Promise.all(e.map(e=>Promise.resolve(e).then(e=>({status:`fulfilled`,value:e}),e=>({status:`rejected`,reason:e}))))}r=o(t.map(t=>{if(t=_(t,n),t in v)return;v[t]=!0;let r=t.endsWith(`.css`),i=r?`[rel="stylesheet"]`:``;if(n)for(let n=e.length-1;n>=0;n--){let i=e[n];if(i.href===t&&(!r||i.rel===`stylesheet`))return}else if(document.querySelector(`link[href="${t}"]${i}`))return;let o=document.createElement(`link`);if(o.rel=r?`stylesheet`:g,r||(o.as=`script`),o.crossOrigin=``,o.href=t,a&&o.setAttribute(`nonce`,a),document.head.appendChild(o),r)return new Promise((e,n)=>{o.addEventListener(`load`,e),o.addEventListener(`error`,()=>n(Error(`Unable to preload CSS for ${t}`)))})}))}function i(e){let t=new Event(`vite:preloadError`,{cancelable:!0});if(t.payload=e,window.dispatchEvent(t),!t.defaultPrevented)throw e}return r.then(t=>{for(let e of t||[])e.status===`rejected`&&i(e.reason);return e().catch(i)})},b=document.getElementById(`gameCanvas`),x=document.getElementById(`hudCanvas`),S=document.getElementById(`titleScreen`),C=document.getElementById(`modeSelect`),w=document.getElementById(`btnContinueCampaign`),T=document.getElementById(`continueCampaignDesc`),E=document.getElementById(`btnContinueArena`),D=document.getElementById(`continueArenaDesc`),O=new i(b,x),k=new h({targetFPS:55,minScale:O.isTouchDevice?.35:.5,maxScale:1});O.quality=k,u();var A=document.getElementById(`versionLabel`);if(A&&(A.textContent=`v${l}`),`ontouchstart`in window){let e=S.querySelector(`.start-prompt`);e&&(e.textContent=`[ TAP TO START ]`)}var j=0,M=0;function N(){let e=window.innerWidth,t=window.innerHeight;if(O.isTouchDevice){let n=1280;if(e>n||t>n){let r=n/Math.max(e,t);e=Math.round(e*r),t=Math.round(t*r)}}j=e,M=t,x.width=e,x.height=t;let n=k.renderScale,r=Math.round(e*n),i=Math.round(t*n);b.width=r,b.height=i,O.renderer&&O.renderer.resize(r,i)}window.addEventListener(`resize`,N),N();function P(){S.classList.add(`hidden`),C.classList.add(`hidden`),b.style.display=`block`,x.style.display=`block`}function F(){let e=O.getSaveInfo(),t=e.find(e=>e.mode===`campaign`),n=e.find(e=>e.mode===`arena`);t?(w.classList.remove(`hidden`),T.textContent=`Level ${t.level} (${t.score} pts)`):w.classList.add(`hidden`),n?(E.classList.remove(`hidden`),D.textContent=`Round ${n.round} (${n.score} pts)`):E.classList.add(`hidden`)}function I(){O.audio.init(),O.audio.resume(),O.applyAudioSettings()}document.getElementById(`btnArena`).addEventListener(`click`,()=>{I(),O.audio.menuConfirm(),P(),d(`mode_start`,{mode:`arena`}),O.startArena()}),document.getElementById(`btnCampaign`).addEventListener(`click`,()=>{I(),O.audio.menuConfirm(),P(),d(`mode_start`,{mode:`campaign`}),O.shouldShowTutorial()?O.startTutorial():O.showCampaignPrompt()}),document.getElementById(`btnTutorial`).addEventListener(`click`,()=>{I(),O.audio.menuConfirm(),P(),d(`mode_start`,{mode:`tutorial`}),O.startTutorial()}),document.getElementById(`btnBuilder`).addEventListener(`click`,()=>{I(),O.audio.menuConfirm(),P(),d(`mode_start`,{mode:`builder`}),O.startBuilder()}),document.getElementById(`btnMeltdown`).addEventListener(`click`,()=>{I(),O.audio.menuConfirm(),P(),d(`mode_start`,{mode:`meltdown`}),O.startMeltdown()}),document.getElementById(`btnCustomize`).addEventListener(`click`,()=>{I(),O.audio.menuConfirm(),P(),d(`mode_start`,{mode:`creator`}),O.creatorReturnState=s.MODE_SELECT,O.state=s.CHARACTER_CREATE}),document.getElementById(`btnStats`).addEventListener(`click`,()=>{I(),O.audio.menuConfirm(),P(),O.state=s.STATS,O._statsReturnToMenu=!0}),window.ccDevTutorial=e=>{O.setAlwaysTutorial(e!==!1),console.log(`[CC DEV] Always-show-tutorial: ${O.alwaysShowTutorial?`ON`:`OFF`}`)},document.getElementById(`btnBack`).addEventListener(`click`,()=>{O.audio.menuSelect(),C.classList.add(`hidden`),S.classList.remove(`hidden`),O.state=s.TITLE});var L=document.getElementById(`btnFullscreen`),R=typeof document.documentElement.requestFullscreen==`function`||typeof document.documentElement.webkitRequestFullscreen==`function`,z=window.navigator.standalone===!0||window.matchMedia(`(display-mode: standalone)`).matches;if(L)if(!R)if(z)L.style.display=`none`;else if(`ontouchstart`in window&&/iP(hone|ad|od)/.test(navigator.userAgent)){let e=navigator.userAgent;/Safari/.test(e)&&!/CriOS|FxiOS|OPiOS|EdgiOS|DuckDuckGo|brave/i.test(e)&&/Apple/.test(navigator.vendor)?(L.textContent=`📲 ADD TO HOME SCREEN`,L.setAttribute(`aria-label`,`Add to Home Screen`),L.title=`Tap Share → Add to Home Screen for fullscreen mode`,L.addEventListener(`click`,()=>{alert(`To play fullscreen on this device:

1. Tap the Share button (↑) in Safari
2. Select "Add to Home Screen"
3. Open Clockwork Carnage from your home screen

The game will run in fullscreen mode!`)})):(L.textContent=`📲 OPEN IN SAFARI`,L.setAttribute(`aria-label`,`Open in Safari to add to Home Screen`),L.title=`Open in Safari to add as home screen app`,L.addEventListener(`click`,()=>{alert(`To play fullscreen on this device:

1. Open this page in Safari
2. Tap the Share button (↑)
3. Select "Add to Home Screen"
4. Open Clockwork Carnage from your home screen

Note: Only Safari supports home screen apps on iOS.`)}))}else L.style.display=`none`;else if(z)L.style.display=`none`;else{L.addEventListener(`click`,async()=>{try{if(document.fullscreenElement||document.webkitFullscreenElement){let e=document.exitFullscreen||document.webkitExitFullscreen;e&&await e.call(document)}else{let e=document.documentElement,t=e.requestFullscreen||e.webkitRequestFullscreen;t&&await t.call(e)}}catch{}});let e=()=>{L.textContent=document.fullscreenElement||document.webkitFullscreenElement?`⛶ EXIT FULLSCREEN`:`⛶ FULLSCREEN`};document.addEventListener(`fullscreenchange`,e),document.addEventListener(`webkitfullscreenchange`,e),e()}w.addEventListener(`click`,()=>{I(),O.audio.menuConfirm(),O.loadCampaignSave()?P():F()}),E.addEventListener(`click`,()=>{I(),O.audio.menuConfirm(),O.loadArena()?P():F()}),S.addEventListener(`click`,()=>{I(),O.audio.menuConfirm(),O.shouldShowTutorial()?(P(),d(`mode_start`,{mode:`tutorial`}),O.startTutorial()):(S.classList.add(`hidden`),C.classList.remove(`hidden`),F(),O.state=s.MODE_SELECT)}),document.addEventListener(`keydown`,e=>{if(O.state===s.TITLE&&(e.code===`Enter`||e.code===`Space`)){if(I(),O.audio.menuConfirm(),O.shouldShowTutorial()){P(),d(`mode_start`,{mode:`tutorial`}),O.startTutorial();return}S.classList.add(`hidden`),C.classList.remove(`hidden`),F(),O.state=s.MODE_SELECT;return}if(O.state===s.MODE_SELECT){if(e.code===`Digit1`)document.getElementById(`btnCampaign`).click();else if(e.code===`Digit2`)document.getElementById(`btnMeltdown`).click();else if(e.code===`Digit3`)document.getElementById(`btnArena`).click();else if(e.code===`Digit4`)document.getElementById(`btnTutorial`).click();else if(e.code===`Digit5`)document.getElementById(`btnBuilder`).click();else if(e.code===`Digit6`)document.getElementById(`btnCustomize`).click();else if(e.code===`Digit7`)document.getElementById(`btnStats`).click();else if(e.code===`Escape`)document.getElementById(`btnBack`).click();else if(e.code===`ArrowUp`||e.code===`ArrowDown`||e.code===`KeyW`||e.code===`KeyS`){let t=Array.from(C.querySelectorAll(`.mode-btn:not(.hidden)`));if(t.length===0)return;let n=t.indexOf(document.activeElement),r=e.code===`ArrowUp`||e.code===`KeyW`?-1:1,i;i=n===-1?r===1?0:t.length-1:(n+r+t.length)%t.length,t[i].focus(),O.audio.menuSelect()}else if(e.code===`Enter`||e.code===`Space`){let e=document.activeElement;e&&e.classList.contains(`mode-btn`)&&e.click()}}(O.state===s.GAME_OVER||O.state===s.VICTORY)&&(e.code===`Enter`||e.code===`Space`)&&(S.classList.remove(`hidden`),C.classList.add(`hidden`))});var B=null,V=0;function H(e){try{let t=performance.now();O.update(e);let n=performance.now()-t;O.state!==B&&(B=O.state,O.state===s.TITLE?(S.classList.remove(`hidden`),C.classList.add(`hidden`),b.style.display=`none`,x.style.display=`none`):O.state===s.MODE_SELECT?(S.classList.add(`hidden`),C.classList.remove(`hidden`),F(),b.style.display=`none`,x.style.display=`none`):(S.classList.add(`hidden`),C.classList.add(`hidden`),b.style.display=`block`,x.style.display=`block`));let r=0;if(O.state!==s.TITLE&&O.state!==s.MODE_SELECT){let e=performance.now();if(O.render(),r=performance.now()-e,O.transitioning&&O.transitionAlpha>0){let e=O.hudCtx,t=x.width,n=x.height;O._renderTransitionOverlay(e,t,n);let r=O.renderer.ctx;O._renderTransitionOverlay(r,b.width,b.height)}}if(O.profiler.recordFrame(n,r,O.entities.length),k.recordFPS(O.fps),k.adjust(e)){let e=k.renderScale,t=Math.round(j*e),n=Math.round(M*e);b.width=t,b.height=n,O.renderer&&O.renderer.resize(t,n),O._vignetteCanvas=null}if(O.showFPS){let e=O.hudCtx;O.profiler.render(e,4,4,220,280)}U&&U.render(),V=0}catch(e){if(V++,console.error(`[Clockwork Carnage] Frame error (${V}):`,e),V>=60){console.error(`[Clockwork Carnage] Too many consecutive errors, halting game loop.`);return}}requestAnimationFrame(H)}requestAnimationFrame(H),window.addEventListener(`beforeunload`,()=>{O.state===s.PLAYING&&O.mode===`arena`&&O.saveArena(),O.state===s.PLAYING&&O.mode===`campaign`&&O.saveCampaign()}),window.__ccBeforeUnloadRegistered=!0,window.ccProfiler=()=>O.profiler.getSnapshot(),y(()=>import(`./harness-C8bEYiXe.js`).then(e=>{window.ccTest=e.createTestRunner(O)}),__vite__mapDeps([0,1])).catch(()=>{}),y(()=>import(`./debug-bridge-CMlsuLJC.js`).then(e=>{window.ccDebug=e.createDebugBridge(O)}),__vite__mapDeps([2,1])).catch(()=>{}),y(()=>import(`./telemetry-CWqM2hvR.js`).then(e=>{window._ccTelemetryModule=e,window.ccTelemetry=e.createTelemetry(O)}),[]).catch(()=>{});var U=f.init(O);U&&(O.touchControls=U);var W=document.createElement(`template`);W.innerHTML=`
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
  </defs>

  <!-- Deep space background -->
  <rect width="700" height="400" fill="#020210" />

  <!-- Ground atmospheric glow -->
  <rect width="700" height="400" fill="url(#groundGlow)" />

  <!-- Circuit grid overlay (very subtle) -->
  <rect width="700" height="400" fill="url(#circuitGrid)" opacity="0.8" />

  <!-- Central temporal rift glow -->
  <rect width="700" height="400" fill="url(#riftGlow)" />

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
`;var G=class extends HTMLElement{constructor(){super(),this.attachShadow({mode:`open`}),this.shadowRoot.appendChild(W.content.cloneNode(!0))}};customElements.define(`title-background`,G);var K=document.createElement(`template`);K.innerHTML=`
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
`;var q=class extends HTMLElement{constructor(){super(),this.attachShadow({mode:`open`}),this.shadowRoot.appendChild(K.content.cloneNode(!0))}};customElements.define(`title-clock`,q);var J=document.createElement(`template`);J.innerHTML=`
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
`;var Y=class extends HTMLElement{constructor(){super(),this.attachShadow({mode:`open`}),this.shadowRoot.appendChild(J.content.cloneNode(!0))}};customElements.define(`title-hero`,Y);var X=document.createElement(`template`);X.innerHTML=`
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
`;var Z=class extends HTMLElement{constructor(){super(),this.attachShadow({mode:`open`}),this.shadowRoot.appendChild(X.content.cloneNode(!0))}};customElements.define(`title-paradox-lord`,Z);
//# sourceMappingURL=index-DTeGEMXE.js.map
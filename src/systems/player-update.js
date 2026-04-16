// ─── Player Update System ───────────────────────────────────────────────────
// Player movement: WASD, dash, sprint, crouch, slide, mouse look.
// Owns _prevCrouchKey state for edge detection.
// ─────────────────────────────────────────────────────────────────────────────
import { isPassable } from "./physics.js";

export class PlayerUpdateSystem {
  _prevCrouchKey = false;

  /**
   * @param {{ player, keys, keybinds, mouse, settings, mode, map, audio }} ctx
   * @param {number} dt
   * @returns {{ tutorialSlid?: boolean, tutorialCrouched?: boolean } | null}
   */
  update(ctx, dt) {
    const { player: p, keys, keybinds: kb, mouse, settings, mode, map, audio, noclip } = ctx;
    let moveX = 0, moveY = 0;
    const cos = Math.cos(p.angle);
    const sin = Math.sin(p.angle);
    let flags = null;

    // Dash cooldown
    if (p.dashCooldown > 0) p.dashCooldown -= dt;

    // Active dash movement
    if (p.isDashing) {
      p.dashTime -= dt;
      if (p.dashTime <= 0) {
        p.isDashing = false;
      } else {
        const dashSpeed = p.moveSpeed * 3.5 * p.dashDistMult;
        moveX = p.dashDirX * dashSpeed * dt;
        moveY = p.dashDirY * dashSpeed * dt;

        // Collision detection (dash)
        const margin = 0.2;
        const newX = p.x + moveX;
        const newY = p.y + moveY;
        if (noclip || isPassable(map, Math.floor(newX + margin * Math.sign(moveX)), Math.floor(p.y))) p.x = newX;
        if (noclip || isPassable(map, Math.floor(p.x), Math.floor(newY + margin * Math.sign(moveY)))) p.y = newY;

        // Mouse look during dash
        if (mouse.dx !== 0) {
          const invertMul = settings.invertX ? -1 : 1;
          p.angle += mouse.dx * 0.002 * p.rotSpeed * settings.sensitivity * invertMul;
          mouse.dx = 0;
        }
        if (keys["ArrowLeft"]) p.angle -= p.rotSpeed * dt;
        if (keys["ArrowRight"]) p.angle += p.rotSpeed * dt;

        p.staminaRegenDelay = 0.5;
        return flags;
      }
    }

    // Sprint check
    const isMoving =
      keys[kb.moveForward] || keys[kb.moveBack] ||
      keys[kb.moveLeft] || keys[kb.moveRight] ||
      keys["ArrowUp"] || keys["ArrowDown"];
    p.isSprinting = (keys[kb.sprint] || keys["ShiftRight"]) && isMoving && p.stamina > 0;

    // Footstep audio
    audio.setFootstepCadence(p.isSprinting ? 1.6 : 1.0);
    audio.updateFootsteps(isMoving && !p.isDashing && !p.isSliding, performance.now());

    // Stamina management
    if (p.isSprinting) {
      p.stamina = Math.max(0, p.stamina - 25 * Math.max(0, p.sprintDrainMult) * dt);
      p.staminaRegenDelay = 0.5;
      if (p.stamina <= 0) p.isSprinting = false;
    } else {
      if (p.staminaRegenDelay > 0) {
        p.staminaRegenDelay -= dt;
      } else {
        p.stamina = Math.min(p.maxStamina, p.stamina + 15 * p.staminaRegenRate * dt);
      }
    }

    // Crouch & Slide handling
    const crouchHeld = !!keys[kb.crouch];
    const crouchJustPressed = crouchHeld && !this._prevCrouchKey;
    p.isCrouching = crouchHeld && !p.isSliding;

    // Start slide
    if (
      crouchJustPressed && (p.isSprinting || p.isDashing) &&
      !p.isSliding && p.slideCooldown <= 0 && p.stamina >= p.slideStaminaCost
    ) {
      p.isSliding = true;
      p.slideTime = p.slideDuration;
      p.slideDirX = Math.cos(p.angle);
      p.slideDirY = Math.sin(p.angle);
      p.stamina = Math.max(0, p.stamina - p.slideStaminaCost);
      p.slideCooldown = 0.8;
      p.staminaRegenDelay = 0.5;
      if (mode === "tutorial") { flags = flags || {}; flags.tutorialSlid = true; }
    }

    if (p.slideCooldown > 0) p.slideCooldown -= dt;

    // Slide movement
    if (p.isSliding) {
      p.slideTime -= dt;
      if (p.slideTime <= 0) {
        p.isSliding = false;
      } else {
        const tFrac = p.slideTime / p.slideDuration;
        const slideSpeed = p.moveSpeed * p.slideSpeedMult * (0.6 + 0.4 * tFrac);
        moveX = p.slideDirX * slideSpeed * dt;
        moveY = p.slideDirY * slideSpeed * dt;

        // Collision (slide)
        const margin = 0.2;
        const newX = p.x + moveX;
        const newY = p.y + moveY;
        if (noclip || isPassable(map, Math.floor(newX + margin * Math.sign(moveX)), Math.floor(p.y))) p.x = newX;
        if (noclip || isPassable(map, Math.floor(p.x), Math.floor(newY + margin * Math.sign(moveY)))) p.y = newY;

        p.weaponBob += dt * 18;
        p.staminaRegenDelay = 0.5;
        if (mode === "tutorial") { flags = flags || {}; flags.tutorialCrouched = true; }
        this._prevCrouchKey = crouchHeld;
        return flags;
      }
    }

    let speed = p.isSprinting ? p.moveSpeed * 1.6 : p.moveSpeed;
    if (p.isCrouching) {
      speed *= 0.5;
      if (mode === "tutorial") { flags = flags || {}; flags.tutorialCrouched = true; }
    }

    // WASD movement (meltdown restricts forward/back)
    const meltdownMode = mode === "meltdown";
    if (!meltdownMode && (keys[kb.moveForward] || keys["ArrowUp"])) { moveX += cos; moveY += sin; }
    if (!meltdownMode && (keys[kb.moveBack] || keys["ArrowDown"])) { moveX -= cos; moveY -= sin; }
    if (keys[kb.moveLeft]) { moveX += sin; moveY -= cos; }
    if (keys[kb.moveRight]) { moveX -= sin; moveY += cos; }

    // Normalize
    const len = Math.sqrt(moveX * moveX + moveY * moveY);
    if (len > 0) {
      moveX = (moveX / len) * speed * dt;
      moveY = (moveY / len) * speed * dt;
    }

    // Walking bob
    if (p.isDashing) {
      p.weaponBob += dt * 22;
    } else if (len > 0) {
      p.weaponBob += dt * (p.isSprinting ? 15 : 8);
    } else {
      p.weaponBob *= 0.9;
    }

    // Mouse look
    if (mouse.dx !== 0) {
      const invertMul = settings.invertX ? -1 : 1;
      p.angle += mouse.dx * 0.002 * p.rotSpeed * settings.sensitivity * invertMul;
      mouse.dx = 0;
    }
    mouse.dy = 0;

    // Keyboard rotation
    if (keys["ArrowLeft"]) p.angle -= p.rotSpeed * dt;
    if (keys["ArrowRight"]) p.angle += p.rotSpeed * dt;

    // Collision detection and movement
    const margin = 0.2;
    const newX = p.x + moveX;
    const newY = p.y + moveY;
    if (noclip || isPassable(map, Math.floor(newX + margin * Math.sign(moveX)), Math.floor(p.y))) p.x = newX;
    if (noclip || isPassable(map, Math.floor(p.x), Math.floor(newY + margin * Math.sign(moveY)))) p.y = newY;

    this._prevCrouchKey = crouchHeld;
    return flags;
  }

  /**
   * @param {{ player, keybinds }} ctx
   * @param {string} code - key code that triggered dash
   * @param {number} [rawDirX] - direct world-space X (joystick)
   * @param {number} [rawDirY] - direct world-space Y (joystick)
   * @returns {boolean} true if dash was triggered
   */
  triggerDash(ctx, code, rawDirX, rawDirY) {
    const { player: p, keybinds } = ctx;
    const cost = Math.max(0, p.dashStaminaCost);
    if (p.dashCooldown > 0 || p.stamina < cost || p.isDashing) return false;

    let dirX = 0, dirY = 0;
    if (rawDirX !== undefined && rawDirY !== undefined) {
      dirX = rawDirX;
      dirY = rawDirY;
    } else {
      const cos = Math.cos(p.angle);
      const sin = Math.sin(p.angle);
      if (code === keybinds.moveForward) { dirX = cos; dirY = sin; }
      else if (code === keybinds.moveBack) { dirX = -cos; dirY = -sin; }
      else if (code === keybinds.moveLeft) { dirX = sin; dirY = -cos; }
      else if (code === keybinds.moveRight) { dirX = -sin; dirY = cos; }
    }

    p.isDashing = true;
    p.dashTime = 0.15;
    p.dashDirX = dirX;
    p.dashDirY = dirY;
    p.dashCooldown = 0.4;
    p.stamina -= cost;
    p.staminaRegenDelay = 0.5;
    return true;
  }
}

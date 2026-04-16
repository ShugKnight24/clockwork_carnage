/**
 * ProjectileSystem — per-frame projectile movement, collision, and cleanup.
 * Extracted from game.js via strangler fig pattern.
 *
 * Stateless module: call updateProjectiles(ctx, dt) each frame.
 */

/**
 * @param {object} ctx - Game context bag
 * @param {number} dt  - Delta time in seconds
 */
export function updateProjectiles(ctx, dt) {
  const { projectiles, entities, entityGrid, map, player, time, audio } = ctx;

  for (const p of projectiles) {
    if (!p.active) continue;

    // Sub-step to prevent wall clipping
    const totalDist = p.speed * dt;
    const stepSize = 0.3;
    const steps = Math.max(1, Math.ceil(totalDist / stepSize));
    const stepDt = dt / steps;

    for (let s = 0; s < steps; s++) {
      if (!p.active) break;

      p.x += p.dirX * p.speed * stepDt;
      p.y += p.dirY * p.speed * stepDt;

      const mx = Math.floor(p.x);
      const my = Math.floor(p.y);
      if (mx < 0 || my < 0 || mx >= map.width || my >= map.height) {
        p.active = false;
        break;
      }
      if (map.grid[my][mx] > 0) {
        ctx.spawnWallSparks(p.x, p.y);
        p.active = false;
        break;
      }

      // Hit enemies (player projectiles)
      if (p.owner === "player") {
        const hitCandidates = entityGrid.query(p.x, p.y, 1.5);
        for (const e of hitCandidates) {
          if (e.type !== "enemy" || !e.active || e.state === "dead") continue;
          const edx = p.x - e.x;
          const edy = p.y - e.y;
          if (edx * edx + edy * edy < e.def.radius * e.def.radius) {
            // EMP rounds: disable shields and stun nearby
            if (p.emp) {
              if (e._shield) e._shield = 0;
              e._empDisabledUntil = time + 3000;
              e.state = "pain";
              e.painTimer = 500;
              const pan = audio.calculatePan(e.x, e.y, player.x, player.y, player.angle);
              audio.enemyHit(pan);
              // Disable nearby ranged/drones (radius 3)
              const empTargets = entityGrid.query(p.x, p.y, 3);
              for (const et of empTargets) {
                if (et.type !== "enemy" || !et.active || et.state === "dead") continue;
                const ddx = et.x - p.x;
                const ddy = et.y - p.y;
                if (ddx * ddx + ddy * ddy < 9) {
                  if (et.def && (et.def.attackType === "ranged" || et.enemyType === "drone")) {
                    et._empDisabledUntil = time + 3000;
                    et.state = "pain";
                    et.painTimer = 500;
                  }
                }
              }
            }
            ctx.damageEnemy(e, p.damage);
            p.active = false;
            // Splash damage for cannon (radius 2)
            if (p.damage > 50) {
              const splashTargets = entityGrid.query(p.x, p.y, 2);
              for (const st of splashTargets) {
                if (st === e || st.type !== "enemy" || !st.active) continue;
                const sdx = p.x - st.x;
                const sdy = p.y - st.y;
                if (sdx * sdx + sdy * sdy < 4) {
                  ctx.damageEnemy(st, p.damage * 0.5);
                }
              }
            }
            break;
          }
        }
      }

      // Hit player (enemy projectiles)
      if (p.owner === "enemy" && p.active) {
        const pdx = p.x - player.x;
        const pdy = p.y - player.y;
        if (pdx * pdx + pdy * pdy < 0.25) {
          ctx.damagePlayer(p.damage);
          p.active = false;
        }
      }
    }

    p.life -= dt;
    if (p.life <= 0) p.active = false;
  }

  // Clean up dead projectiles (in-place compaction)
  let pw = 0;
  for (let i = 0; i < projectiles.length; i++) {
    if (projectiles[i].active) projectiles[pw++] = projectiles[i];
  }
  projectiles.length = pw;

  // Remove dead projectile entities
  let ew = 0;
  for (let i = 0; i < entities.length; i++) {
    const e = entities[i];
    if (e.type !== "projectile" || e.active) entities[ew++] = e;
  }
  entities.length = ew;
}

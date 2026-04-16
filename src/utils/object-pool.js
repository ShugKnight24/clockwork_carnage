/**
 * Generic object pool to reduce GC pressure.
 *
 * Used for particles, projectiles, damage numbers — anything that's
 * created and destroyed frequently during gameplay.
 */

export class ObjectPool {
  constructor(create, reset, prewarm = 0) {
    this.pool = [];
    this.createFn = create;
    this.resetFn = reset;
    // Pre-allocate objects to avoid initial burst allocations
    for (let i = 0; i < prewarm; i++) {
      this.pool.push(this.createFn());
    }
  }

  /** Get an object from the pool, or create a new one if empty. */
  acquire() {
    return this.pool.pop() ?? this.createFn();
  }

  /** Return an object to the pool after resetting it. */
  release(obj) {
    this.resetFn(obj);
    this.pool.push(obj);
  }

  /** Release all objects in an array back to the pool. */
  releaseAll(objects) {
    for (const obj of objects) this.release(obj);
    objects.length = 0;
  }

  /** Number of objects currently available in the pool. */
  get available() {
    return this.pool.length;
  }
}

// Simple 2D value noise (suffisant pour la génération de terrain)

(function (global) {
  function Noise2D(seed) {
    this.seed = seed || 1;
    this.perm = new Uint8Array(512);
    for (let i = 0; i < 256; i++) {
      this.perm[i] = i;
    }
    let n, q;
    for (let i = 255; i > 0; i--) {
      n = Math.floor((this.seed = (this.seed * 16807) % 2147483647) / 2147483647 * (i + 1));
      q = this.perm[i];
      this.perm[i] = this.perm[n];
      this.perm[n] = q;
    }
    for (let i = 0; i < 256; i++) {
      this.perm[i + 256] = this.perm[i];
    }
  }

  Noise2D.prototype.fade = function (t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  };

  Noise2D.prototype.lerp = function (a, b, t) {
    return a + t * (b - a);
  };

  Noise2D.prototype.grad = function (hash, x, y) {
    switch (hash & 3) {
      case 0: return x + y;
      case 1: return -x + y;
      case 2: return x - y;
      case 3: return -x - y;
      default: return 0;
    }
  };

  Noise2D.prototype.noise = function (x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);

    const u = this.fade(x);
    const v = this.fade(y);

    const aa = this.perm[X + this.perm[Y]];
    const ab = this.perm[X + this.perm[Y + 1]];
    const ba = this.perm[X + 1 + this.perm[Y]];
    const bb = this.perm[X + 1 + this.perm[Y + 1]];

    const x1 = this.lerp(this.grad(aa, x, y), this.grad(ba, x - 1, y), u);
    const x2 = this.lerp(this.grad(ab, x, y - 1), this.grad(bb, x - 1, y - 1), u);

    return (this.lerp(x1, x2, v) + 1) * 0.5; // [0,1]
  };

  global.Noise2D = Noise2D;
})(window);

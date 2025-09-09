
export function createPRNG(seedStr: string): () => number {
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) {
        seed = (seed + seedStr.charCodeAt(i) * (i + 1)) % 2147483647;
    }
    return () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
    };
}

const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

export function createNoise2D(random: () => number = Math.random): (x: number, y: number) => number {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
        const r = Math.floor(random() * (i + 1));
        const v = p[i];
        p[i] = p[r];
        p[r] = v;
    }
    const perm = new Uint8Array([...p, ...p]);
    const grad3 = new Float32Array([1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1]);
    const permMod12 = new Uint8Array(512);
    for (let i = 0; i < 512; i++) permMod12[i] = perm[i] % 12;

    return (x, y) => {
        let n0 = 0, n1 = 0, n2 = 0;
        const s = (x + y) * F2;
        const i = Math.floor(x + s), j = Math.floor(y + s);
        const t = (i + j) * G2;
        const X0 = i - t, Y0 = j - t;
        const x0 = x - X0, y0 = y - Y0;
        let i1: number, j1: number;
        if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
        const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
        const x2 = x0 - 1.0 + 2.0 * G2, y2 = y0 - 1.0 + 2.0 * G2;
        const ii = i & 255, jj = j & 255;
        let t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 >= 0) { t0 *= t0; const gi0 = permMod12[ii + perm[jj]] * 3; n0 = t0 * t0 * (grad3[gi0] * x0 + grad3[gi0 + 1] * y0); }
        let t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 >= 0) { t1 *= t1; const gi1 = permMod12[ii + i1 + perm[jj + j1]] * 3; n1 = t1 * t1 * (grad3[gi1] * x1 + grad3[gi1 + 1] * y1); }
        let t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 >= 0) { t2 *= t2; const gi2 = permMod12[ii + 1 + perm[jj + 1]] * 3; n2 = t2 * t2 * (grad3[gi2] * x2 + grad3[gi2 + 1] * y2); }
        return 70.0 * (n0 + n1 + n2);
    };
}

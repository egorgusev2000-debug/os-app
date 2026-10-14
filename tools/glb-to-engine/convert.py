"""MakeHuman GLB (game engine rig) -> mesh data for the Ось WebGL engine.

The engine skins one body mesh with 17 rigid bones (dual quaternions) around its own rest skeleton.
Here the MakeHuman body is re-posed from its own rest pose into the engine rest pose:
limbs follow the engine bone frames (with an axial stretch so the joints line up),
the torso gets a smooth warp that lines up hips and shoulders, the head keeps its real size.
Clothes, anatomy fibres and relief are copied from the nearest vertex of the engine's own body.
"""
import json, struct, base64, sys
import numpy as np
from scipy.spatial import cKDTree

if len(sys.argv) < 4:
    sys.exit('usage: python convert.py model.glb engine_rest.json src/data/body-male.js')
GLB, ENG, OUT = sys.argv[1], sys.argv[2], sys.argv[3]

# ---------------- GLB ----------------
f = open(GLB, 'rb').read()
clen, _ = struct.unpack('<II', f[12:20]); J = json.loads(f[20:20 + clen])
off = 20 + clen; blen, _ = struct.unpack('<II', f[off:off + 8]); BIN = f[off + 8:off + 8 + blen]
CT = {5126: np.float32, 5123: np.uint16, 5125: np.uint32, 5121: np.uint8}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
def raw(bvi, ctype, count, n, extra=0):
    bv = J['bufferViews'][bvi]; o = bv.get('byteOffset', 0) + extra
    return np.frombuffer(BIN, dtype=CT[ctype], count=count * n, offset=o).reshape(count, n)
def acc(i):
    a = J['accessors'][i]; n = NC[a['type']]
    if 'bufferView' in a: x = raw(a['bufferView'], a['componentType'], a['count'], n, a.get('byteOffset', 0))
    else: x = np.zeros((a['count'], n), CT[a['componentType']])
    if 'sparse' in a:
        sp = a['sparse']; x = x.copy()
        ii = raw(sp['indices']['bufferView'], sp['indices']['componentType'], sp['count'], 1, sp['indices'].get('byteOffset', 0)).ravel()
        vv = raw(sp['values']['bufferView'], a['componentType'], sp['count'], n, sp['values'].get('byteOffset', 0))
        x[ii.astype(np.int64)] = vv
    if a.get('normalized') and x.dtype != np.float32: x = x.astype(np.float32) / np.iinfo(x.dtype).max
    return x.astype(np.float64) if x.dtype == np.float32 else x

skin = J['skins'][0]
jnames = [J['nodes'][j]['name'] for j in skin['joints']]
IBM = acc(skin['inverseBindMatrices']).reshape(-1, 4, 4)
JW = {}  # joint rest world position (cm)
for k, n in enumerate(jnames):
    M = np.linalg.inv(IBM[k].T); JW[n] = M[:3, 3] * 100.0

def mesh_data(mi):
    m = J['meshes'][mi]; p = m['primitives'][0]
    P = acc(p['attributes']['POSITION']).copy()
    ws = m.get('weights') or [0] * len(p.get('targets', []))
    for t, w in zip(p.get('targets', []), ws):
        if w: P += w * acc(t['POSITION'])
    I = acc(p['indices']).astype(np.int64).reshape(-1, 3)
    Jn = acc(p['attributes']['JOINTS_0']).astype(np.int64)
    Wt = acc(p['attributes']['WEIGHTS_0']).astype(np.float64)
    return P * 100.0, I, Jn, Wt

body_mi = next(i for i, m in enumerate(J['meshes']) if m['name'] == 'base')
P, I, Jn, Wt = mesh_data(body_mi)

# weld by position (UV seams are not needed: the engine has no textures)
key = np.round(P * 100).astype(np.int64)
_, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
inv = inv.ravel()
Pw, Jw, Ww = P[first], Jn[first], Wt[first]
T = inv[I]
T = T[(T[:, 0] != T[:, 1]) & (T[:, 1] != T[:, 2]) & (T[:, 0] != T[:, 2])]

# keep only the body shell: the largest connected component (helpers are separate pieces)
n = len(Pw); parent = np.arange(n)
def find(x):
    r = x
    while parent[r] != r: r = parent[r]
    while parent[x] != r: parent[x], x = r, parent[x]
    return r
for a, b, c in T:
    ra, rb, rc = find(a), find(b), find(c)
    if rb != ra: parent[rb] = ra
    rc = find(c)
    if rc != ra: parent[rc] = ra
roots = np.array([find(i) for i in range(n)])
u, cnt = np.unique(roots, return_counts=True)
body = u[np.argmax(cnt)]
keep = roots == body
remap = -np.ones(n, np.int64); remap[keep] = np.arange(keep.sum())
T = remap[T]; T = T[(T >= 0).all(1)]
Pw, Jw, Ww = Pw[keep], Jw[keep], Ww[keep]
print('body verts', len(Pw), 'tris', len(T))

# ---------------- engine rest ----------------
E = json.load(open(ENG)); sk = {k: np.array(v, float) for k, v in E['sk'].items()}
Fr = lambda k: sk[k].reshape(3, 3)  # row-major: columns are the local axes in world
BONE = {d[0]: i for i, d in enumerate(E['def'])}

def nrm(v): return v / np.linalg.norm(v)
def frame(x0, y):
    y = nrm(y); x = nrm(x0 - np.dot(x0, y) * y); z = np.cross(x, y)
    return np.stack([x, y, z], 1)

X = np.array([1.0, 0, 0]); Y = np.array([0, 1.0, 0])
maps = {}   # joint name -> (o, A, e, F, S) for limbs; 'W' for the torso warp
for s, S in (('l', 'L'), ('r', 'R')):
    ua, la, ha = JW['upperarm_' + s], JW['lowerarm_' + s], JW['hand_' + s]
    mid = JW['middle_01_' + s]
    ud, fd = nrm(la - ua), nrm(ha - la)
    x0 = -nrm(np.cross(ud, fd))
    Ls_ua = np.linalg.norm(sk['E' + S] - sk['S' + S]) / np.linalg.norm(la - ua)
    Ls_fa = np.linalg.norm(sk['W' + S] - sk['E' + S]) / np.linalg.norm(ha - la)
    maps['upperarm_' + s] = (ua, frame(x0, -ud), sk['S' + S], Fr('Fu' + S), np.diag([1, Ls_ua, 1]), BONE['ua' + S])
    maps['lowerarm_' + s] = (la, frame(x0, -fd), sk['E' + S], Fr('Ff' + S), np.diag([1, Ls_fa, 1]), BONE['fa' + S])
    hand_map = (ha, frame(x0, -nrm(mid - ha)), sk['W' + S], Fr('Fw' + S), np.eye(3), BONE['hand' + S])
    for jn in jnames:
        if jn.endswith('_' + s) and (jn.startswith('hand') or jn.split('_')[0] in ('thumb', 'index', 'middle', 'ring', 'pinky')):
            maps[jn] = hand_map
    th, ca, fo, ba = JW['thigh_' + s], JW['calf_' + s], JW['foot_' + s], JW['ball_' + s]
    Ls_th = np.linalg.norm(sk['K' + S] - sk['H' + S]) / np.linalg.norm(ca - th)
    Ls_sh = np.linalg.norm(sk['A' + S] - sk['K' + S]) / np.linalg.norm(fo - ca)
    maps['thigh_' + s] = (th, frame(X, -(ca - th)), sk['H' + S], Fr('Fth' + S), np.diag([1, Ls_th, 1]), BONE['th' + S])
    maps['calf_' + s] = (ca, frame(X, -(fo - ca)), sk['K' + S], Fr('Fsh' + S), np.diag([1, Ls_sh, 1]), BONE['sh' + S])
    fz = ba - fo; fz[1] = 0; fz = nrm(fz)
    Af = np.stack([np.cross(Y, fz), Y, fz], 1)
    foot_map = (fo, Af, sk['A' + S], Fr('Fa' + S), np.eye(3), BONE['foot' + S])
    maps['foot_' + s] = foot_map; maps['ball_' + s] = foot_map

# torso warp: hips and shoulders line up, the head keeps its size
yh = (JW['thigh_l'][1] + JW['thigh_r'][1]) / 2; ys = (JW['upperarm_l'][1] + JW['upperarm_r'][1]) / 2
Hy, Sy = sk['HL'][1], sk['SL'][1]
kxh = sk['HL'][0] / JW['thigh_l'][0]; kxs = sk['SL'][0] / JW['upperarm_l'][0]
dzh = sk['HL'][2] - JW['thigh_l'][2]; dzs = sk['SL'][2] - JW['upperarm_l'][2]
def W(v):
    v = np.atleast_2d(v); y = v[:, 1]
    t = np.clip((y - yh) / (ys - yh), 0, 1)
    ye = np.where(y <= yh, y + (Hy - yh), np.where(y >= ys, y + (Sy - ys), Hy + (y - yh) * (Sy - Hy) / (ys - yh)))
    kx = kxh + (kxs - kxh) * t
    up = np.clip((y - ys) / 8.0, 0, 1); kx = kx + (1 - kx) * up * (y > ys)
    dz = dzh + (dzs - dzh) * t
    return np.stack([v[:, 0] * kx, ye, v[:, 2] + dz], 1)
TORSO = {'pelvis': 'pelvis', 'spine_01': 'lumbar', 'spine_02': 'lumbar', 'spine_03': 'thorax', 'clavicle_l': 'thorax', 'clavicle_r': 'thorax', 'neck_01': 'neck', 'head': 'head'}
for jn, bn in TORSO.items(): maps[jn] = ('W', BONE[bn])
missing = [j for j in jnames if j not in maps and j != 'Root']
print('unmapped joints', missing)

def apply_map(m, v):
    if isinstance(m[0], str): return W(v)
    o, A, e, F, S, _ = m
    return e + ((F @ S @ A.T) @ (v - o).T).T

# ---------------- re-pose into the engine rest ----------------
nv = len(Pw)
out = np.zeros((nv, 3)); bw = np.zeros((nv, 17))
Wn = Ww / Ww.sum(1, keepdims=True)
for k in range(4):
    for ji, jn in enumerate(jnames):
        sel = (Jw[:, k] == ji) & (Wn[:, k] > 0)
        if not sel.any(): continue
        m = maps.get(jn) or maps['pelvis']
        out[sel] += Wn[sel, k:k + 1] * apply_map(m, Pw[sel])
        bw[sel, m[-1]] += Wn[sel, k]
order = np.argsort(-bw, 1)[:, :4]
BI = order.astype(np.float32)
BWt = np.take_along_axis(bw, order, 1); BWt /= BWt.sum(1, keepdims=True)

# normals from the re-posed surface
Nn = np.zeros_like(out)
fn = np.cross(out[T[:, 1]] - out[T[:, 0]], out[T[:, 2]] - out[T[:, 0]])
for k in range(3): np.add.at(Nn, T[:, k], fn)
Nn /= np.linalg.norm(Nn, axis=1, keepdims=True) + 1e-12
# winding: make normals point outward (check torso front)
c = out.mean(0)
if np.mean(np.sum((out - c) * Nn, 1)) < 0: Nn = -Nn; T = T[:, [0, 2, 1]]

# ---------------- clothes / anatomy labels from the nearest engine vertex ----------------
EP = np.array(E['P']).reshape(-1, 3); ECL = np.array(E['CL']).reshape(-1, 4); ELM = np.array(E['LM']).reshape(-1, 4); ERL = np.array(E['RL'])
yWaist = float(np.median(EP[:, 1] - ECL[:, 1]))
d, nn = cKDTree(EP).query(out)
# clothes from this body's own weights (engine formulas): top on the torso, shorts on pelvis and upper thighs
torsoW = bw[:, BONE['pelvis']] + bw[:, BONE['lumbar']] + bw[:, BONE['thorax']]
thighW = bw[:, BONE['thL']] + bw[:, BONE['thR']]
def tseg(a, b):
    ax = b - a; return np.clip((out - a) @ ax / (ax @ ax), 0, 1)
tTh = np.where(out[:, 0] >= 0, tseg(sk['HL'], sk['KL']), tseg(sk['HR'], sk['KR']))
CL = np.zeros((nv, 4))
CL[:, 0] = torsoW - 0.5
CL[:, 1] = out[:, 1] - yWaist
CL[:, 2] = np.minimum(torsoW + thighW - 0.5, 0.42 - tTh)
# neckline: a soft scoop at the front
fz = np.clip((out[:, 2] + 1.0) / 8.0, 0, 1)
ax_ = np.abs(out[:, 0]); strap = np.clip((ax_ - 6.5) / 3.5, 0, 1); strap = strap * strap * (3 - 2 * strap)
yN = sk['SL'][1] + 2.5 - 6.0 * fz + 40.0 * strap
CL[:, 0] = np.minimum(CL[:, 0], (yN - out[:, 1]) * 0.25)
RL = ERL[nn] * 0.4
# head and hands: always skin, no shirt
head = bw[:, BONE['head']] > 0.5
CL[head, 0] = np.minimum(CL[head, 0], -0.5); CL[head, 2] = np.minimum(CL[head, 2], -0.5)
# smooth the clothes edges over the surface (neighbour averaging)
nbr_i = np.concatenate([T[:, 0], T[:, 1], T[:, 2], T[:, 1], T[:, 2], T[:, 0]])
nbr_j = np.concatenate([T[:, 1], T[:, 2], T[:, 0], T[:, 0], T[:, 1], T[:, 2]])
deg = np.bincount(nbr_i, minlength=nv).astype(float)
for _ in range(6):
    for c in (0, 2):
        acc_ = np.bincount(nbr_i, weights=CL[nbr_j, c], minlength=nv)
        CL[:, c] = 0.5 * CL[:, c] + 0.5 * acc_ / np.maximum(deg, 1)
# anatomy fibres computed on this surface: angle around the limb and position along it
TEN = {'ua': [0, 0], 'fa': [0, 0.26], 'th': [0, 0], 'sh': [0.1, 0.22]}
LIMB = {'ua': ('S', 'E', 'Fu'), 'fa': ('E', 'W', 'Ff'), 'th': ('H', 'K', 'Fth'), 'sh': ('K', 'A', 'Fsh')}
LM = np.zeros((nv, 4)); LM[:, 1] = -1.0
main = np.argmax(bw, 1)
for S_ in ('L', 'R'):
    for nm, (a0, b0, f0) in LIMB.items():
        bi = BONE[nm + S_]; sel = main == bi
        if not sel.any(): continue
        A0, B0, F0 = sk[a0 + S_], sk[b0 + S_], Fr(f0 + S_)
        ax = B0 - A0; L0 = np.linalg.norm(ax); zz = ax / L0
        q = out[sel] - A0; t = q @ zz / L0; tc = np.clip(t, 0, 1)
        dv = q - np.outer(tc * L0, zz)
        ph = np.arctan2(dv @ F0[:, 0], dv @ F0[:, 2])
        LM[sel, 0] = ph; LM[sel, 1] = tc; LM[sel, 2] = TEN[nm][0]; LM[sel, 3] = TEN[nm][1]
for nm in ('hand', 'foot'):
    for S_ in ('L', 'R'): LM[main == BONE[nm + S_], 1] = -2.0
LM[head, 1] = -2.0
print('nearest dist median/max', np.median(d), d.max(), 'yWaist', yWaist)

# ---------------- eyes, eyebrows and hair shell in the head frame ----------------
HC, Fh = sk['HC'], Fr('Fh')
def to_head(p): return (Fh.T @ (p - HC).T).T
def head_pos(p): return to_head(W(p))
feat = {}
for mi, m in enumerate(J['meshes']):
    if m['name'] in ('base',): continue
    Pm, Im, Jm, Wm = mesh_data(mi)
    hp = head_pos(Pm)
    if 'eyebrow' in m['name']:
        for side, sel in (('l', hp[:, 0] > 0), ('r', hp[:, 0] < 0)):
            q = hp[sel]; xs = np.abs(q[:, 0]); o = np.argsort(xs)
            pts = []
            for a, b in ((0, 0.2), (0.4, 0.6), (0.8, 1.0)):
                s0 = o[int(a * len(o)):max(int(b * len(o)), int(a * len(o)) + 1)]
                pts.append(q[s0].mean(0).round(2).tolist())
            feat['brow_' + side] = pts
    else:
        for side, sel in (('l', hp[:, 0] > 0), ('r', hp[:, 0] < 0)):
            q = hp[sel]; ctr = (q.max(0) + q.min(0)) / 2; r = float((q.max(0) - q.min(0)).max() / 2)
            front = q[np.argmax(q[:, 2])]
            feat['eye_' + side] = {'c': ctr.round(2).tolist(), 'r': round(r, 2), 'f': nrm(front - ctr).round(3).tolist()}
# cranium: head vertices above the brow line, fitted with an axis-aligned ellipsoid in the head frame
hv = to_head(out[head]); browy = np.mean([p[1] for k in ('brow_l', 'brow_r') for p in feat.get(k, [[0, 0, 0]])])
cr = hv[hv[:, 1] > browy - 1.0]
lo, hi = cr.min(0), cr.max(0)
feat['skull'] = {'c': [0.0, round(float(browy - 1.0), 2), round(float((lo[2] + hi[2]) / 2), 2)], 'r': [round(float(max(-lo[0], hi[0])), 2), round(float(hi[1] - (browy - 1.0)), 2), round(float((hi[2] - lo[2]) / 2), 2)], 'top': round(float(hi[1]), 2)}
print('features', json.dumps(feat))

# ---------------- short hair: a thin shell over the cranium, part of the body mesh, flagged in CL.w ----------------
browy = float(np.mean([p[1] for k in ('brow_l', 'brow_r') for p in feat[k]]))
qh = to_head(out)
th = np.arctan2(qh[:, 0], qh[:, 2])
a = np.abs(th)
hl = np.interp(a, [0, 0.55, 1.1, 1.7, 2.4, np.pi], [browy + 4.6, browy + 4.2, browy + 2.6, browy + 2.2, -4.0, -5.5])
hairv = head & (qh[:, 1] > hl - 2.5)
tri_h = T[hairv[T].all(1)]
idx_h = np.unique(tri_h)
newi = -np.ones(nv, np.int64); newi[idx_h] = nv + np.arange(len(idx_h))
HP = out[idx_h] + Nn[idx_h] * 0.45
out = np.vstack([out, HP]); Nn = np.vstack([Nn, Nn[idx_h]])
hb = np.zeros((len(idx_h), 4), np.float32); hb[:, 0] = BONE['head']
BI = np.vstack([BI, hb]); BWt = np.vstack([BWt, np.tile([1.0, 0, 0, 0], (len(idx_h), 1))])
CLh = CL[idx_h].copy(); CLh[:, 3] = np.where(np.abs(qh[idx_h, 1] - hl[idx_h]) < 0.02, 0.02, qh[idx_h, 1] - hl[idx_h]); CL = np.vstack([CL, CLh])
LMh = LM[idx_h].copy(); LM = np.vstack([LM, LMh]); RL = np.concatenate([RL, np.zeros(len(idx_h))])
T = np.vstack([T, newi[tri_h]])
nv = len(out)
print('hair verts', len(idx_h), 'tris', len(tri_h))

# ---------------- pack ----------------
def b64(a): return base64.b64encode(np.ascontiguousarray(a).tobytes()).decode()
pk = {
    'nv': int(nv), 'nt': int(len(T)),
    'P': b64(np.round(out * 100).astype(np.int16)),          # 0.01 cm
    'N': b64(np.round(Nn * 127).astype(np.int8)),
    'BI': b64(BI.astype(np.uint8)), 'BW': b64(np.round(BWt * 255).astype(np.uint8)),
    'CL': b64(np.round(np.clip(CL, -300, 300) * 100).astype(np.int16)),
    'LM': b64(np.round(np.clip(LM, -300, 300) * 100).astype(np.int16)),
    'RL': b64(np.round(np.clip(RL, -1, 1) * 127).astype(np.int8)),
    'IDX': b64(T.astype(np.uint16).ravel()),
    'feat': feat
}
assert np.abs(out).max() < 320 and nv < 65536
payload = json.dumps(pk, ensure_ascii=False, separators=(',', ':'))
with open(OUT, 'w', encoding='utf-8') as fo:
    if OUT.endswith('.js'):
        fo.write('/* MakeHuman male body (CC0), re-posed onto the engine skeleton by tools/glb-to-engine/convert.py */ window.OS3H_M = ' + payload + ';\n')
    else:
        fo.write(payload)
print('packed bytes', len(payload))

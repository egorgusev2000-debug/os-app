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
    sys.exit('usage: python convert.py model.glb engine_rest.json src/data/body-male.js [hair_dir base.obj]')
GLB, ENG, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
# optional: a MakeHuman hair proxy folder (.mhclo + .obj + diffuse .png) and the hm08 base mesh (base.obj) it is fitted to
HAIR, BASEOBJ = (sys.argv[4], sys.argv[5]) if len(sys.argv) > 5 else (None, None)

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
UV0 = acc(J['meshes'][body_mi]['primitives'][0]['attributes']['TEXCOORD_0'])

# optional body shape like the MakeHuman sliders: MH_MUSCLE and MH_WEIGHT from 0 to 1 (0.5 = as exported).
# Uses the CC0 macro targets universal-male-young-*.target from assets/models/targets (needs base.obj).
import os as _os0
MUS, WGT = float(_os0.environ.get('MH_MUSCLE', '0.5')), float(_os0.environ.get('MH_WEIGHT', '0.5'))
# more targets with their weights, e.g. MH_EXTRA="torso-vshape-incr:0.5,l-upperarm-muscle-incr:0.8"
EXTRA = [(q.split(':')[0], float(q.split(':')[1])) for q in _os0.environ.get('MH_EXTRA', '').split(',') if ':' in q]
if (MUS != 0.5 or WGT != 0.5 or EXTRA) and BASEOBJ:
    TDIR = _os0.environ.get('MH_TARGETS', _os0.path.join(_os0.path.dirname(GLB), 'targets'))
    def side(v, lo, hi):
        t = abs(v - 0.5) / 0.5
        return [('average', 1 - t), (hi if v > 0.5 else lo, t)]
    base0 = np.array([list(map(float, l.split()[1:4])) for l in open(BASEOBJ) if l.startswith('v ')])
    unm = acc(J['meshes'][body_mi]['primitives'][0]['attributes']['POSITION'])
    tr0 = (unm.min(0) + unm.max(0)) / 2 - (base0 * 0.1).min(0) / 2 - (base0 * 0.1).max(0) / 2
    dd0, bi = cKDTree(base0 * 0.1 + tr0).query(unm)
    assert dd0.max() < 1e-4, 'base mesh does not match the GLB body'
    D = np.zeros_like(base0)
    for mn, mw in side(MUS, 'min', 'max'):
        for wn, ww in side(WGT, 'min', 'max'):
            w = mw * ww
            if w < 1e-6: continue
            fn = _os0.path.join(TDIR, 'universal-male-young-%smuscle-%sweight.target' % (mn, wn))
            for l in open(fn):
                q = l.split()
                if len(q) == 4 and not l.startswith('#'): D[int(q[0])] += w * np.array(list(map(float, q[1:])))
    for tn, w in EXTRA:
        for l in open(_os0.path.join(TDIR, tn + '.target')):
            q = l.split()
            if len(q) == 4 and not l.startswith('#'): D[int(q[0])] += w * np.array(list(map(float, q[1:])))
    P = P + D[bi] * 0.1 * 100.0
    print('shape: muscle %.2f weight %.2f' % (MUS, WGT), ' '.join('%s %.2f' % e for e in EXTRA))

# weld by position for the surface work; the UV seams come back at the end (the skin texture needs them)
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
# hips: the back of the buttocks stays with the pelvis (MakeHuman ties much of it to the thigh, so in a deep squat a lump
# of buttock swings out with the thigh); a short smoothing pass blends the new border
import os as _os
GLUTE = float(_os.environ.get('GLUTE_KEEP', '0.7'))
if GLUTE > 0:
    hipy, hipz = sk['HL'][1], sk['HL'][2]
    back = np.clip((hipz - 2.0 - out[:, 2]) / 7.0, 0, 1)
    upper = np.clip((out[:, 1] - (hipy - 20.0)) / 10.0, 0, 1)
    side = np.clip((22.0 - np.abs(out[:, 0])) / 6.0, 0, 1)
    k = GLUTE * back * upper * side
    pel = BONE['pelvis']
    for th_ in (BONE['thL'], BONE['thR']):
        moved = bw[:, th_] * k
        bw[:, th_] -= moved; bw[:, pel] += moved
    ni = np.concatenate([T[:, 0], T[:, 1], T[:, 2], T[:, 1], T[:, 2], T[:, 0]])
    nj = np.concatenate([T[:, 1], T[:, 2], T[:, 0], T[:, 0], T[:, 1], T[:, 2]])
    dg = np.maximum(np.bincount(ni, minlength=nv), 1).astype(float)
    ch = [pel, BONE['thL'], BONE['thR']]
    reg = (k > 0.01) | (np.bincount(ni, weights=(k[nj] > 0.01).astype(float), minlength=nv) > 0)
    sub = bw[:, ch].copy(); tot = sub.sum(1, keepdims=True)
    for _ in range(int(_os.environ.get('GLUTE_SMOOTH', '8'))):
        avg = np.stack([np.bincount(ni, weights=sub[nj, c], minlength=nv) for c in range(3)], 1) / dg[:, None]
        sub = np.where(reg[:, None], 0.5 * sub + 0.5 * avg, sub)
    bw[:, ch] = sub / np.maximum(sub.sum(1, keepdims=True), 1e-9) * tot
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
WIND_FLIP = False
if np.mean(np.sum((out - c) * Nn, 1)) < 0: Nn = -Nn; T = T[:, [0, 2, 1]]; WIND_FLIP = True

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

# ---------------- back to the original vertices: UV seams and the skin texture ----------------
import io
from PIL import Image
ow = remap[inv]                                   # original GLB vertex -> body vertex (or -1)
okv = ow >= 0
oid = -np.ones(len(ow), np.int64); oid[okv] = np.arange(okv.sum())
To = oid[I]; To = To[(To >= 0).all(1)]
if WIND_FLIP: To = To[:, [0, 2, 1]]
src = ow[okv]
out, Nn, BI, BWt, CL, LM, RL = out[src], Nn[src], BI[src], BWt[src], CL[src], LM[src], RL[src]
UV = UV0[okv]
T = To; nv = len(out)
print('body verts with UV seams', nv, 'tris', len(T))

def image_bytes(ii):
    im = J['images'][ii]; bv = J['bufferViews'][im['bufferView']]
    return BIN[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]
def data_url(img, size, fmt):
    img = img.copy(); img.thumbnail((size, size), Image.LANCZOS)
    b = io.BytesIO()
    if fmt == 'jpeg': img.convert('RGB').save(b, 'JPEG', quality=86, optimize=True, progressive=True)
    else: img.save(b, 'PNG', optimize=True)
    return 'data:image/%s;base64,' % fmt + base64.b64encode(b.getvalue()).decode()
mat = J['materials'][J['meshes'][body_mi]['primitives'][0]['material']]
tex_i = J['textures'][mat['pbrMetallicRoughness']['baseColorTexture']['index']]['source']
skin_url = data_url(Image.open(io.BytesIO(image_bytes(tex_i))), 1024, 'jpeg')

# ---------------- extra parts skinned to the head: eyebrows (from the GLB) and hair (MakeHuman proxy) ----------------
def tri_normals(Pp, Tt):
    Nq = np.zeros_like(Pp)
    fn_ = np.cross(Pp[Tt[:, 1]] - Pp[Tt[:, 0]], Pp[Tt[:, 2]] - Pp[Tt[:, 0]])
    for k in range(3): np.add.at(Nq, Tt[:, k], fn_)
    return Nq / (np.linalg.norm(Nq, axis=1, keepdims=True) + 1e-12)
def outward(Pp, Tt, Nq, ctr):
    if np.mean(np.sum((Pp - ctr) * Nq, 1)) < 0: return -Nq, Tt[:, [0, 2, 1]]
    return Nq, Tt
parts = []
head_ctr = sk['HC']
for mi, m in enumerate(J['meshes']):
    if 'eyebrow' not in m['name']: continue
    Pm, Im, _, _ = mesh_data(mi)
    pe = W(Pm); te = Im.copy(); ne = tri_normals(pe, te); ne, te = outward(pe, te, ne, head_ctr)
    pr = m['primitives'][0]; uve = acc(pr['attributes']['TEXCOORD_0'])
    ti = J['textures'][J['materials'][pr['material']]['pbrMetallicRoughness']['baseColorTexture']['index']]['source']
    parts.append({'n': 'brows', 'P': pe, 'N': ne, 'UV': uve, 'T': te, 'tex': data_url(Image.open(io.BytesIO(image_bytes(ti))).convert('RGBA'), 256, 'png'), 'alpha': 1})
if HAIR:
    import glob, os
    from scipy.spatial import cKDTree as KD
    base = np.array([list(map(float, l.split()[1:4])) for l in open(BASEOBJ) if l.startswith('v ')])
    raw0 = acc(J['meshes'][body_mi]['primitives'][0]['attributes']['POSITION'])     # unmorphed, metres
    tr = (raw0.min(0) + raw0.max(0)) / 2 - (base * 0.1).min(0) / 2 - (base * 0.1).max(0) / 2
    dd, hm = KD(raw0).query(base * 0.1 + tr)
    assert dd.max() < 1e-4, 'base mesh does not match the GLB body'
    Vm = (P[hm] / 100.0 - tr) / 0.1                  # morphed body in base-mesh units
    clo = glob.glob(os.path.join(HAIR, '*.mhclo'))[0]
    sc = {}; refs = []; objf = None; inv_ = False
    for l in open(clo):
        w = l.split()
        if not w or w[0].startswith('#'): continue
        if w[0] in ('x_scale', 'y_scale', 'z_scale'): sc[w[0][0]] = (int(w[1]), int(w[2]), float(w[3]))
        elif w[0] == 'obj_file': objf = w[1]
        elif w[0] == 'verts': inv_ = True
        elif inv_ and len(w) == 9: refs.append([float(x) for x in w])
        elif inv_ and len(w) == 1 and w[0].isdigit(): refs.append([float(w[0]), 0, 0, 1, 0, 0, 0, 0, 0])
    refs = np.array(refs); ri = refs[:, :3].astype(int); rw = refs[:, 3:6]; ro = refs[:, 6:9]
    scale = np.array([abs(Vm[sc[a][0], k] - Vm[sc[a][1], k]) / sc[a][2] for k, a in enumerate('xyz')])
    hv = (Vm[ri] * rw[:, :, None]).sum(1) + ro * scale
    hcm = (hv * 0.1 + tr) * 100.0                        # same space as P (cm)
    vs, vts, faces = [], [], []
    for l in open(os.path.join(HAIR, objf)):
        w = l.split()
        if not w: continue
        if w[0] == 'vt': vts.append([float(w[1]), float(w[2])])
        elif w[0] == 'f':
            c = [tuple(int(x) - 1 for x in t.split('/')[:2]) for t in w[1:]]
            for k in range(1, len(c) - 1): faces.append((c[0], c[k], c[k + 1]))
    assert len(hcm) == sum(1 for l in open(os.path.join(HAIR, objf)) if l.startswith('v '))
    key_ = {}; hp, huv, ht = [], [], []
    for f_ in faces:
        tri = []
        for (vi, ti) in f_:
            if (vi, ti) not in key_: key_[(vi, ti)] = len(hp); hp.append(hcm[vi]); huv.append(vts[ti])
            tri.append(key_[(vi, ti)])
        ht.append(tri)
    hp = W(np.array(hp)); ht = np.array(ht); huv = np.array(huv); huv[:, 1] = 1.0 - huv[:, 1]   # obj UV: origin bottom-left
    hn = tri_normals(hp, ht); hn, ht = outward(hp, ht, hn, head_ctr)
    png = [x for x in glob.glob(os.path.join(HAIR, '*.png')) if 'diffuse' in x.lower()] or glob.glob(os.path.join(HAIR, '*.png'))
    parts.append({'n': 'hair', 'P': hp, 'N': hn, 'UV': huv, 'T': ht, 'tex': data_url(Image.open(png[0]).convert('RGBA'), 512, 'png'), 'alpha': 1})
    print('hair', os.path.basename(clo), 'verts', len(hp), 'tris', len(ht))

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
    'UV': b64(np.round(np.clip(UV, 0, 1) * 65535).astype(np.uint16)),
    'tex': skin_url,
    'parts': [{'n': q['n'], 'nv': int(len(q['P'])), 'P': b64(np.round(q['P'] * 100).astype(np.int16)), 'N': b64(np.round(q['N'] * 127).astype(np.int8)),
               'UV': b64(np.round(np.clip(q['UV'], 0, 1) * 65535).astype(np.uint16)), 'IDX': b64(q['T'].astype(np.uint16).ravel()),
               'tex': q['tex'], 'alpha': q['alpha'], 'bone': int(BONE['head'])} for q in parts],
    'feat': feat
}
assert np.abs(out).max() < 320 and nv < 65536
payload = json.dumps(pk, ensure_ascii=False, separators=(',', ':'))
if OUT.endswith('.js'):
    # Several files of at most ~0.5 MB: the Claude app on phones does not load a file over about 1 MB.
    # body-male.js holds the geometry, -2 the triangles and clothing borders, -3 the skin and eyebrows, -4 the hair.
    js = lambda o: json.dumps(o, ensure_ascii=False, separators=(',', ':'))
    head = '/* MakeHuman male body (CC0), re-posed onto the engine skeleton by tools/glb-to-engine/convert.py, part %d of 4 */ '
    core = {k: pk[k] for k in ('nv', 'nt', 'P', 'N', 'BI', 'BW', 'RL', 'UV', 'feat')}
    chunks = [
        head % 1 + 'window.OS3H_M = Object.assign(window.OS3H_M || {}, ' + js(core) + ');\n',
        head % 2 + 'window.OS3H_M = Object.assign(window.OS3H_M || {}, ' + js({k: pk[k] for k in ('CL', 'LM', 'IDX')}) + ');\n',
        head % 3 + 'window.OS3H_M = Object.assign(window.OS3H_M || {}, ' + js({'tex': pk['tex']}) + ');\n'
        + ''.join('(window.OS3H_M.parts = window.OS3H_M.parts || []).push(' + js(q) + ');\n' for q in pk['parts'] if q['n'] != 'hair'),
        head % 4 + ''.join('(window.OS3H_M = window.OS3H_M || {}, window.OS3H_M.parts = window.OS3H_M.parts || []).push(' + js(q) + ');\n' for q in pk['parts'] if q['n'] == 'hair'),
    ]
    for i, c in enumerate(chunks):
        fn = OUT if i == 0 else OUT[:-3] + '-%d.js' % (i + 1)
        open(fn, 'w', encoding='utf-8').write(c)
        print('wrote', fn, len(c.encode('utf-8')), 'bytes')
        assert len(c.encode('utf-8')) < 700000, 'a body file is too big for phones'
else:
    open(OUT, 'w', encoding='utf-8').write(payload)
print('packed bytes', len(payload))

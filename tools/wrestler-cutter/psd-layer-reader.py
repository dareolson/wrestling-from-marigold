"""Minimal, dependency-free PSD layer reader. Inventory + per-layer RGBA extraction."""
import struct, sys

class R:
    def __init__(s, b): s.b=b; s.i=0
    def u8(s):  v=s.b[s.i]; s.i+=1; return v
    def u16(s): v=struct.unpack_from('>H',s.b,s.i)[0]; s.i+=2; return v
    def i16(s): v=struct.unpack_from('>h',s.b,s.i)[0]; s.i+=2; return v
    def u32(s): v=struct.unpack_from('>I',s.b,s.i)[0]; s.i+=4; return v
    def i32(s): v=struct.unpack_from('>i',s.b,s.i)[0]; s.i+=4; return v
    def raw(s,n): v=s.b[s.i:s.i+n]; s.i+=n; return v

def unpackbits(data, expected):
    """PackBits / PSD RLE decode."""
    out=bytearray(); i=0; n=len(data)
    while i<n and len(out)<expected:
        h=data[i]; i+=1
        if h<=127:
            cnt=h+1; out+=data[i:i+cnt]; i+=cnt
        elif h>127:
            cnt=257-h
            if i<n: out+=bytes([data[i]])*cnt; i+=1
    return bytes(out[:expected])

def parse(path):
    b=open(path,'rb').read()
    r=R(b)
    assert r.raw(4)==b'8BPS', 'not a PSD'
    ver=r.u16(); assert ver==1, f'PSB not supported (version {ver})'
    r.raw(6)
    channels=r.u16(); H=r.u32(); W=r.u32(); depth=r.u16(); mode=r.u16()
    hdr=dict(channels=channels,width=W,height=H,depth=depth,mode=mode)
    cmlen=r.u32(); r.raw(cmlen)
    irlen=r.u32(); r.raw(irlen)
    lmlen=r.u32(); lm_end=r.i+lmlen
    lilen=r.u32(); li_end=r.i+lilen
    cnt=r.i16(); abs_cnt=abs(cnt)
    layers=[]
    for _ in range(abs_cnt):
        top=r.i32(); left=r.i32(); bottom=r.i32(); right=r.i32()
        nch=r.u16()
        chans=[]
        for _ in range(nch):
            cid=r.i16(); clen=r.u32(); chans.append((cid,clen))
        sig=r.raw(4); blend=r.raw(4).decode('latin1')
        opacity=r.u8(); clipping=r.u8(); flags=r.u8(); r.u8()
        extra_len=r.u32(); extra_end=r.i+extra_len
        mask_len=r.u32(); r.raw(mask_len)
        blr_len=r.u32(); r.raw(blr_len)
        nlen=r.u8(); name=r.raw(nlen).decode('latin1')
        pad=(1+nlen)%4
        if pad: r.raw(4-pad)
        uni=None
        while r.i+12<=extra_end:
            asig=r.raw(4)
            if asig not in (b'8BIM',b'8B64'): r.i-=4; break
            key=r.raw(4).decode('latin1'); alen=r.u32()
            adata=r.raw(alen + (alen%2))
            if key=='luni':
                try:
                    ln=struct.unpack_from('>I',adata,0)[0]
                    uni=adata[4:4+ln*2].decode('utf-16-be')
                except Exception: pass
        r.i=extra_end
        layers.append(dict(top=top,left=left,bottom=bottom,right=right,
            w=max(0,right-left),h=max(0,bottom-top),channels=chans,blend=blend,
            opacity=opacity,clipping=clipping,flags=flags,
            visible=not bool(flags & 0x02), name=uni or name))
    # channel image data, in layer order
    for L in layers:
        L['pixels']={}
        for cid,clen in L['channels']:
            start=r.i; comp=r.u16(); w,h=L['w'],L['h']
            body=r.raw(clen-2)
            if w==0 or h==0: L['pixels'][cid]=None; continue
            if comp==0:
                plane=body[:w*h]
            elif comp==1:
                counts=struct.unpack_from('>'+'H'*h, body, 0)
                off=2*h; rows=[]
                for c in counts:
                    rows.append(unpackbits(body[off:off+c], w)); off+=c
                plane=b''.join(rows)
            else:
                plane=None
            L['pixels'][cid]=plane
    return hdr, layers

if __name__=='__main__':
    hdr, layers = parse(sys.argv[1])
    print(f"canvas {hdr['width']}x{hdr['height']}  channels={hdr['channels']} depth={hdr['depth']} mode={hdr['mode']}")
    print(f"{len(layers)} layers\n")
    print(f"{'#':>2} {'name':<16} {'left':>5} {'top':>5} {'w':>5} {'h':>5} {'op':>4} {'blend':>5} {'vis':>4} chans  decoded")
    for i,L in enumerate(layers):
        ch=','.join(str(c) for c,_ in L['channels'])
        dec=sum(1 for v in L['pixels'].values() if v)
        print(f"{i:>2} {L['name']:<16} {L['left']:>5} {L['top']:>5} {L['w']:>5} {L['h']:>5} "
              f"{L['opacity']:>4} {L['blend']:>5} {str(L['visible']):>4} [{ch}]  {dec}/{len(L['channels'])}")

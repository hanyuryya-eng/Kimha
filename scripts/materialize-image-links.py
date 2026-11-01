"""Repair flattened OCI hard links whose source was whiteouted in a later layer.

Sources are recovered only from SHA256-verified blobs of the pinned manifest.
No package bytes are invented or fetched from a different image/version.
"""
import copy
import hashlib
import json
import pathlib
import subprocess
import sys
import tarfile

archive = pathlib.Path(sys.argv[1])
manifest = json.loads(pathlib.Path(sys.argv[2]).read_text())
crane, repo = sys.argv[3:5]
clean = lambda value: value.removeprefix('./').lstrip('/')
with tarfile.open(archive) as source:
    members = source.getmembers()
    positions = {clean(m.name): i for i, m in enumerate(members)}
    broken = {clean(m.linkname) for m in members if m.islnk() and clean(m.linkname) not in positions}
    forward = {m.name for i, m in enumerate(members) if m.islnk() and positions.get(clean(m.linkname), -1) > i}
    if not broken and not forward:
        sys.exit(0)
    recovered = {}
    for layer in sorted(manifest['layers'], key=lambda item: item['size'], reverse=True):
        if broken <= recovered.keys():
            break
        digest = layer['digest']
        if not digest.startswith('sha256:'):
            raise RuntimeError('Unsupported layer hash')
        blob = archive.parent / 'repair-layer.tar.gz'
        with blob.open('wb') as out:
            subprocess.run([crane, 'blob', repo + '@' + digest], stdout=out, check=True)
        sha = hashlib.sha256()
        with blob.open('rb') as stream:
            while chunk := stream.read(1024 * 1024):
                sha.update(chunk)
        if sha.hexdigest() != digest.split(':', 1)[1]:
            raise RuntimeError('Official layer digest mismatch')
        with tarfile.open(blob, mode='r|gz') as original:
            for member in original:
                name = clean(member.name)
                if name in broken and name not in recovered:
                    if member.isfile():
                        recovered[name] = ('file', original.extractfile(member).read())
                    elif member.issym():
                        recovered[name] = ('symlink', member.linkname)
        blob.unlink()
    if broken - recovered.keys():
        raise RuntimeError('Original hard-link data could not be verified')
    fixed = archive.with_suffix('.fixed.tar')
    with tarfile.open(fixed, 'w', format=tarfile.PAX_FORMAT) as target:
        for member in members:
            if member.islnk() and (clean(member.linkname) in broken or member.name in forward):
                changed = copy.copy(member)
                changed.pax_headers = dict(member.pax_headers)
                changed.pax_headers.pop('linkpath', None)
                changed.pax_headers.pop('size', None)
                changed.type = tarfile.REGTYPE
                changed.linkname = ''
                if clean(member.linkname) in broken:
                    import io
                    kind, content = recovered[clean(member.linkname)]
                    if kind == 'symlink':
                        changed.type = tarfile.SYMTYPE
                        changed.linkname = content
                        changed.size = 0
                        target.addfile(changed)
                    else:
                        changed.size = len(content)
                        target.addfile(changed, io.BytesIO(content))
                else:
                    original = source.extractfile(member)
                    changed.size = source.getmember(member.linkname).size
                    target.addfile(changed, original)
            else:
                target.addfile(member, source.extractfile(member) if member.isfile() else None)
    fixed.replace(archive)
print('Verified original hard-link content materialized:', len(broken) + len(forward))

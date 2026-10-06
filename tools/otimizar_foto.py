#!/usr/bin/env python3
"""Prepara fotos para o site: corrige a rotação, APAGA os metadados (GPS/EXIF) e gera duas versões.

Uso:  python3 tools/otimizar_foto.py caminho/da/foto.jpg nome-do-lugar [nome-do-lugar2 ...]
Gera: fotos/<nome>.jpg  (até 1400 px, para a ficha)  e  fotos/<nome>-mini.jpg  (até 360 px, para a lista).
Requer Pillow:  pip install pillow
"""
import sys
from pathlib import Path
from PIL import Image, ImageOps

def salvar(img, destino, lado, qualidade):
    im = img.copy()
    im.thumbnail((lado, lado), Image.LANCZOS)
    im.save(destino, 'JPEG', quality=qualidade, optimize=True, progressive=True)  # sem EXIF
    print(f'{destino}  {im.size[0]}x{im.size[1]}  {destino.stat().st_size // 1024} KB')

def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    origem = Path(sys.argv[1])
    img = ImageOps.exif_transpose(Image.open(origem)).convert('RGB')
    pasta = Path(__file__).resolve().parent.parent / 'fotos'
    pasta.mkdir(exist_ok=True)
    for nome in sys.argv[2:]:
        salvar(img, pasta / f'{nome}.jpg', 1400, 80)
        salvar(img, pasta / f'{nome}-mini.jpg', 360, 78)

if __name__ == '__main__':
    main()

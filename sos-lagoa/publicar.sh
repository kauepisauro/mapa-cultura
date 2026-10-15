#!/bin/sh
# Publica no Firebase Hosting (https://sos-lagoa.web.app) com o grupo padrão embutido SÓ no site publicado.
# Uso:   ./publicar.sh CODIGO_DO_GRUPO        (precisa do firebase-tools logado: veja PUBLICAR-FIREBASE.md)
# O código é escrito em js/grupo-padrao.js, publicado, e o arquivo volta a ficar vazio (nunca vai para o GitHub).
set -e
cd "$(dirname "$0")"
[ -n "$1" ] || { echo "Falta o código do grupo."; exit 1; }
trap 'git checkout -- js/grupo-padrao.js 2>/dev/null || printf "%s\n" "export const GRUPO_PADRAO = '"'"''"'"';" > js/grupo-padrao.js' EXIT
printf "export const GRUPO_PADRAO = '%s';\n" "$1" > js/grupo-padrao.js
firebase deploy --only hosting --project sos-lagoa --non-interactive

# Publicar a Plataforma SOS Lagoa (sem ligação com outro projeto nem com dados pessoais)

O endereço do GitHub Pages carrega o nome da **conta** que publica. Por isso, para o link não ter nome de pessoa nem
de outro projeto, use uma **conta própria do movimento**.

## Passo a passo (uns 10 minutos, tudo pelo navegador)
1. **Crie uma conta nova no GitHub** (github.com/signup) com um e-mail do movimento e um nome de usuário neutro,
   por exemplo `soslagoa`. Deixe o perfil sem nome pessoal e, em *Settings → Emails*, marque
   **“Keep my email addresses private”**.
2. **Crie um repositório público** chamado exatamente `NOME-DE-USUARIO.github.io` (ex.: `soslagoa.github.io`).
   Assim o link fica na raiz, sem nome de projeto: `https://soslagoa.github.io/`.
3. Descompacte o ZIP, abra o repositório e use **Add file → Upload files**: arraste **o conteúdo** da pasta
   (arquivos e pastas `css`, `js`, `icons`, `data`, `index.html`, `sw.js`…) e clique em **Commit changes**.
4. **Settings → Pages → Build and deployment**: *Source* = “Deploy from a branch”, *Branch* = `main` / `(root)` → **Save**.
5. Em 1–2 minutos o link está no ar. Abra no celular e instale (Android: menu ⋮ → “Instalar app”; iPhone: Compartilhar → “Adicionar à Tela de Início”).

## Cuidados
- O app usa o projeto Firebase `sos-lagoa` (`js/firebase-config.js`, dados públicos). O banco e o código do grupo não mudam ao trocar de endereço: quem abrir o link novo com `?g=CODIGO` entra no mesmo grupo.
- **Os dados não migram entre endereços.** Quem usou outro link: em *Ajustes → Baixar backup* e, no novo, *Restaurar backup*.
- `data/inicial.json` fica público no site. Só deixe ali o que pode ser público.
- Para atualizar depois: edite/envie os arquivos pelo próprio GitHub (ou peça ajuda) e suba `versao`/`VERSAO` juntos.

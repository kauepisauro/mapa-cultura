# Publicar em https://sos-lagoa.web.app (Firebase Hosting) — roteiro para continuar

Estado (15/10/2026): **PUBLICADO** em https://sos-lagoa.web.app (versão 2026-10-15.6), grupo criado no Firestore e testado.
Para publicar uma versão nova é preciso repetir os passos 1–3 abaixo (login do dono do projeto no Google).
O link de login (`auth.firebase.tools`) vence em poucos minutos: o dono precisa abri-lo logo e colar o código na hora.

Pré-requisito da sessão (rede do ambiente): liberar `auth.firebase.tools`, `firebase-public.firebaseio.com` e `sos-lagoa.web.app`.

1. Em uma pasta de trabalho (fora do repositório): `npm install firebase-tools@13.29.1`.
2. `firebase login --no-localhost` -> abre um link; o dono autoriza e COLA o código. (Autorização só deste ambiente;
   revogável em https://myaccount.google.com/permissions, procurar "Firebase CLI".)
3. Na pasta `sos-lagoa/`: `firebase deploy --only hosting --project sos-lagoa`.
4. Conferir https://sos-lagoa.web.app e o convite `https://sos-lagoa.web.app/?g=CODIGO` (código só com o dono; nunca no repositório).
5. (Pendente) Tirar o app do repositório do Mapa Vivo (branch publicada `claude/great-albattani-kxi1un`): apagar a pasta `sos-lagoa/`,
   voltar `package.json` para `"test": "node --test tests/run.mjs"` e remover a seção "SOS Lagoa" do `CLAUDE.md` da raiz.
   Perguntar antes se o link antigo já foi divulgado: se sim, deixar um aviso "mudamos de endereço" por alguns dias.
6. Atualizar o link em README/PUBLICAR.md e regerar o ZIP para quem quiser hospedar por conta própria.

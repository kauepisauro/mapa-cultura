// Configuração do app SOS Lagoa.
// IMPORTANTE: `versao` precisa ser igual a VERSAO em sw.js (o teste confere).
// Sempre que publicar uma mudança, suba as duas juntas (formato AAAA-MM-DD.N).
export const CONFIG = {
  versao: '2026-10-15.4',
  nome: 'Plataforma SOS Lagoa',
  lema: 'Movimento popular em defesa da Lagoa da Conceição',
  chaveDados: 'soslagoa:dados:v1',
  chaveEu: 'soslagoa:eu',
  chaveTema: 'soslagoa:tema',
  chaveBoasVindas: 'soslagoa:boasvindas',
  chaveSemeado: 'soslagoa:semeado', // edição de data/inicial.json já aplicada neste aparelho
  chaveEdicaoRecusada: 'soslagoa:edicao-recusada',
};

// Cores tiradas da logo (azul-noite, sol vermelho, verde-água, dourado) + apoio.
export const CORES_FRENTE = [
  '#e5262b', '#3d78c4', '#3fb5a6', '#e0bb3a',
  '#f08a3c', '#9b7bd6', '#e0609a', '#6fbf5f',
];

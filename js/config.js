// ─────────────────────────────────────────────────────────────
//  Configuração do Mapa Vivo Florianópolis (Cartografia Líquen)
//  Tudo o que você precisa ajustar para publicar está neste arquivo.
// ─────────────────────────────────────────────────────────────
export const CONFIG = {
  versao: '2026-10-23.1', // aparece no rodapé do painel; ajuda a conferir o que está publicado
  nome: 'Mapa Vivo Florianópolis',
  projeto: 'Cartografia Líquen',
  subtitulo: 'culturas da Grande Florianópolis',

  // ── Banco de dados colaborativo (Supabase, plano gratuito) ──
  // Passo a passo no README.md. Deixe vazio para rodar em "modo demonstração"
  // (dados de exemplo em data/seed.json; envios ficam só no navegador de quem enviou).
  supabaseUrl: '',
  supabaseAnonKey: '',

  // ── Contato público (Sobre/rodapé) e curadoria (envios quando o banco não está configurado) ──
  contatoEmail: '', // ex.: 'contato@seudominio.org' (aparece em Sobre → Contato)
  contatoWhatsapp: '', // ex.: '5548999999999'
  curadoriaWhatsapp: '', // ex.: '5548999999999'
  curadoriaEmail: '', // ex.: 'contato@seudominio.org'
  instagram: 'zona.liquen',

  // ── Mapa ──
  // Recorte: Grande Florianópolis (ilha + continente: São José, Palhoça, Biguaçu, Santo Amaro, Gov. Celso Ramos…)
  centro: [-27.63, -48.55],
  zoomInicial: 10.5,
  limites: [[-28.1, -49.1], [-27.15, -48.25]], // não deixa o mapa "fugir" da região
  // Mapa-base: OpenStreetMap (gratuito, sem chave). Para tráfego alto, use MapTiler/Stadia (com chave)
  // ou hospede seus tiles — veja a política: https://operations.osmfoundation.org/policies/tiles/
  // O modo noite usa os mesmos tiles com um filtro escuro (CSS).
  // Mapa-base vetorial com estilo próprio (js/estilo-mapa.js). Grátis, sem chave: https://openfreemap.org
  // Se falhar (sem WebGL ou serviço fora), o site volta sozinho para os tiles raster abaixo.
  mapaVetorial: {
    fonte: 'https://tiles.openfreemap.org/planet',
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    atribuicao: '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> · © <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> · dados © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  },
  tiles: {
    dia: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    noite: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    atribuicao: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },


  // Território-piloto (aparece como uma "mancha" no mapa). Use null para ocultar.
  territorioPiloto: null,

  // ── Conteúdo ──
  licenca: 'CC BY-SA 4.0',
  licencaUrl: 'https://creativecommons.org/licenses/by-sa/4.0/deed.pt-br',
  // Créditos exigidos pelo edital (FCC/Aldir Blanc). Ative só depois de contemplado.
  mostrarCreditosEdital: false,

  // Quantos dias à frente a agenda calcula eventos recorrentes
  horizonteDias: 90,
};

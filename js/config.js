// ─────────────────────────────────────────────────────────────
//  Configuração do Cartografia Líquen
//  Tudo o que você precisa ajustar para publicar está neste arquivo.
// ─────────────────────────────────────────────────────────────
export const CONFIG = {
  versao: '2026-10-06.5', // aparece no rodapé do painel; ajuda a conferir o que está publicado
  nome: 'Cartografia Líquen',
  subtitulo: 'mapa vivo das culturas da Grande Florianópolis',

  // ── Banco de dados colaborativo (Supabase, plano gratuito) ──
  // Passo a passo no README.md. Deixe vazio para rodar em "modo demonstração"
  // (dados de exemplo em data/seed.json; envios ficam só no navegador de quem enviou).
  supabaseUrl: '',
  supabaseAnonKey: '',

  // ── Curadoria: para onde vão os envios quando o banco não está configurado ──
  curadoriaWhatsapp: '', // ex.: '5548999999999'
  curadoriaEmail: '', // ex.: 'contato@seudominio.org'
  instagram: '', // ex.: 'cartografialiquen'

  // ── Mapa ──
  // Recorte: Grande Florianópolis (ilha + continente: São José, Palhoça, Biguaçu, Santo Amaro, Gov. Celso Ramos…)
  centro: [-27.63, -48.55],
  zoomInicial: 10.5,
  limites: [[-28.1, -49.1], [-27.15, -48.25]], // não deixa o mapa "fugir" da região
  // Mapa-base: OpenStreetMap (gratuito, sem chave). Para tráfego alto, use MapTiler/Stadia (com chave)
  // ou hospede seus tiles — veja a política: https://operations.osmfoundation.org/policies/tiles/
  // O modo noite usa os mesmos tiles com um filtro escuro (CSS).
  tiles: {
    dia: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    noite: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    atribuicao: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },


  // Território-piloto (aparece como uma "mancha" no mapa). Use null para ocultar.
  territorioPiloto: { nome: 'Território-piloto · Lagoa da Conceição', centro: [-27.6045, -48.4655], raioM: 2700 },

  // ── Conteúdo ──
  licenca: 'CC BY-SA 4.0',
  licencaUrl: 'https://creativecommons.org/licenses/by-sa/4.0/deed.pt-br',
  // Créditos exigidos pelo edital (FCC/Aldir Blanc). Ative só depois de contemplado.
  mostrarCreditosEdital: false,

  // Quantos dias à frente a agenda calcula eventos recorrentes
  horizonteDias: 90,
};

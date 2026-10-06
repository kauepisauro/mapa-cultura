// ─────────────────────────────────────────────────────────────
//  Configuração do Cartografia Líquen
//  Tudo o que você precisa ajustar para publicar está neste arquivo.
// ─────────────────────────────────────────────────────────────
export const CONFIG = {
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
  tiles: {
    dia: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    noite: 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png',
    atribuicao: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>',
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

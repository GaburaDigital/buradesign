// Ícones das ferramentas. Traço de 1.8, grade 24 por 24, sem preenchimento
// pesado, para continuarem legíveis em botões pequenos.

const D = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"';
const V = 'fill="none" stroke="var(--verde)" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"';

const FERRAMENTAS = {
  seta: `<path d="M5 3 L5 19 L9.5 15 L12.5 21 L15 19.5 L12 14 L18 13.5 Z" ${D}/>`,
  quadrado: `<rect x="5" y="5" width="14" height="14" ${D}/>`,
  retangulo: `<rect x="3" y="7" width="18" height="10" ${D}/>`,
  circulo: `<circle cx="12" cy="12" r="8" ${D}/>`,
  elipse: `<ellipse cx="12" cy="12" rx="9" ry="6" ${D}/>`,
  poligono: `<path d="M12 3.5 L20.5 9.5 L17.3 19.5 L6.7 19.5 L3.5 9.5 Z" ${D}/>`,
  estrela: `<path d="M12 3 L14.6 9.6 L21.5 10 L16.2 14.4 L18 21 L12 17.2 L6 21 L7.8 14.4 L2.5 10 L9.4 9.6 Z" ${D}/>`,
  engrenagem: `<circle cx="12" cy="12" r="5.5" ${D}/><circle cx="12" cy="12" r="2" ${V}/>
    <path d="M12 2.5 V5 M12 19 V21.5 M2.5 12 H5 M19 12 H21.5 M5.2 5.2 L7 7 M17 17 L18.8 18.8 M18.8 5.2 L17 7 M7 17 L5.2 18.8" ${D}/>`,
  texto: `<path d="M4 6 V4 H20 V6 M12 4 V20 M8.5 20 H15.5" ${D}/>`,
  caneta: `<path d="M4 20 L6.5 13 L16 3.5 L20.5 8 L11 17.5 Z" ${D}/><path d="M14.5 5 L19 9.5" ${V}/>`,
  nos: `<path d="M4.5 18 C 8 6, 16 6, 19.5 18" ${D}/>
    <rect x="2.5" y="16" width="4" height="4" ${V}/><rect x="17.5" y="16" width="4" height="4" ${V}/>
    <rect x="10" y="6.5" width="4" height="4" ${D}/>`,
  negativo: `<circle cx="12" cy="12" r="8" fill="none" stroke="var(--perigo)" stroke-width="1.8"/>
    <path d="M6.5 6.5 L17.5 17.5" stroke="var(--perigo)" stroke-width="1.8"/>`,
  unir: `<circle cx="9.5" cy="12" r="6" ${D}/><circle cx="14.5" cy="12" r="6" ${V}/>`,
  desunir: `<circle cx="8" cy="12" r="5.2" ${D}/><circle cx="16" cy="12" r="5.2" ${D}/>
    <path d="M12 4 V20" stroke="var(--verde)" stroke-width="1.8" stroke-dasharray="3 2"/>`,
  caminho: `<path d="M4 18 C 8 4, 16 20, 20 6" ${D}/><rect x="2.5" y="16" width="3.5" height="3.5" ${V}/>
    <rect x="18" y="4.5" width="3.5" height="3.5" ${V}/>`,
  desfazer: `<path d="M9 6 L4 11 L9 16" ${V}/><path d="M4 11 H14 A5.5 5.5 0 0 1 14 22 H10" ${D}/>`,
  refazer: `<path d="M15 6 L20 11 L15 16" ${V}/><path d="M20 11 H10 A5.5 5.5 0 0 0 10 22 H14" ${D}/>`,
  mais: `<path d="M12 5 V19 M5 12 H19" ${D}/>`,
  menos: `<path d="M5 12 H19" ${D}/>`,
  enquadrar: `<path d="M4 9 V4 H9 M15 4 H20 V9 M20 15 V20 H15 M9 20 H4 V15" ${D}/><rect x="9" y="9" width="6" height="6" ${V}/>`,
  pasta: `<path d="M3 19 V6 H10 L12 8.5 H21 V19 Z" ${D}/>`,
  exportar: `<path d="M6 3.5 H14 L18 7.5 V15" ${D}/><path d="M14 3.5 V7.5 H18" ${D}/>
    <path d="M9 8.5 H11 M9 11.5 H14" ${D}/>
    <path d="M12 15 V21 M9 18 L12 21 L15 18" ${V}/>
    <path d="M3 15 H21" ${D}/>`,
  mao: `<path d="M9 12.5 V5.5 a1.6 1.6 0 0 1 3.2 0 V11 V4.6 a1.6 1.6 0 0 1 3.2 0 V11 V6.4 a1.6 1.6 0 0 1 3.2 0 V15 a6 6 0 0 1 -6 6 h-1.6 a5 5 0 0 1 -4 -2 L4 14 a1.7 1.7 0 0 1 2.6 -2.1 z" ${D}/>`,
  concluir: `<path d="M4 12.5 L9.5 18 L20 6" ${V}/>`,
  fecharForma: `<path d="M6 18 C 8 6, 16 6, 18 18" ${D}/><path d="M6 18 H18" ${V}/>
    <rect x="3.5" y="16" width="5" height="5" ${D}/><rect x="15.5" y="16" width="5" height="5" ${D}/>`,
  alinharEsquerda: `<path d="M4 3 V21" ${V}/><rect x="7" y="5.5" width="12" height="4" ${D}/><rect x="7" y="14.5" width="7" height="4" ${D}/>`,
  alinharCentroH: `<path d="M12 3 V21" ${V}/><rect x="4" y="5.5" width="16" height="4" ${D}/><rect x="7.5" y="14.5" width="9" height="4" ${D}/>`,
  alinharDireita: `<path d="M20 3 V21" ${V}/><rect x="5" y="5.5" width="12" height="4" ${D}/><rect x="10" y="14.5" width="7" height="4" ${D}/>`,
  alinharTopo: `<path d="M3 4 H21" ${V}/><rect x="5.5" y="7" width="4" height="12" ${D}/><rect x="14.5" y="7" width="4" height="7" ${D}/>`,
  alinharMeioV: `<path d="M3 12 H21" ${V}/><rect x="5.5" y="4" width="4" height="16" ${D}/><rect x="14.5" y="7.5" width="4" height="9" ${D}/>`,
  alinharBase: `<path d="M3 20 H21" ${V}/><rect x="5.5" y="5" width="4" height="12" ${D}/><rect x="14.5" y="10" width="4" height="7" ${D}/>`,
  distribuirH: `<rect x="2.5" y="7" width="4" height="10" ${D}/><rect x="10" y="7" width="4" height="10" ${V}/><rect x="17.5" y="7" width="4" height="10" ${D}/>`,
  distribuirV: `<rect x="7" y="2.5" width="10" height="4" ${D}/><rect x="7" y="10" width="10" height="4" ${V}/><rect x="7" y="17.5" width="10" height="4" ${D}/>`,
  frente: `<rect x="4" y="4" width="11" height="11" ${D}/><rect x="9" y="9" width="11" height="11" ${V}/>`,
  tras: `<rect x="9" y="9" width="11" height="11" ${D}/><rect x="4" y="4" width="11" height="11" ${V}/>`,
  lixo: `<path d="M5 6.5 H19 M9.5 6.5 V4 H14.5 V6.5 M7 6.5 L8 20 H16 L17 6.5" ${D}/>`,
  cubo3d: `<path d="M12 3 L20 7.5 L12 12 L4 7.5 Z" ${D}/><path d="M4 7.5 V16.5 L12 21 V12" ${D}/><path d="M20 7.5 V16.5 L12 21" ${V}/>`,
  girar: `<path d="M20 12 a8 8 0 1 1 -2.7 -6" ${D}/><path d="M20 4.5 V10 H14.5" ${V}/>`,
  mover3d: `<path d="M12 3 V21 M3 12 H21" ${D}/><path d="M12 3 L9.5 6 M12 3 L14.5 6 M12 21 L9.5 18 M12 21 L14.5 18" ${V}/>
    <path d="M3 12 L6 9.5 M3 12 L6 14.5 M21 12 L18 9.5 M21 12 L18 14.5" ${V}/>`,
  escalar: `<rect x="3.5" y="3.5" width="9" height="9" ${D}/><rect x="12" y="12" width="8.5" height="8.5" ${V}/>`,
  naBase: `<path d="M3 19 H21" ${D}/><path d="M8 4 H16 V12 H8 Z" ${D}/><path d="M8 15.5 H16" ${V}/>
    <path d="M12 12 V15" ${V}/>`,
  camera: `<path d="M3 7.5 H7 L9 5 H15 L17 7.5 H21 V19 H3 Z" ${D}/><circle cx="12" cy="13" r="4" ${V}/>`,
  somar: `<rect x="3.5" y="3.5" width="10" height="10" ${D}/><rect x="10.5" y="10.5" width="10" height="10" ${D}/>
    <path d="M15.5 13 V18 M13 15.5 H18" ${V}/>`,
  cuboide3d: `<path d="M12 4 L21 8 L12 12 L3 8 Z" ${D}/><path d="M3 8 V15 L12 19 V12" ${D}/><path d="M21 8 V15 L12 19" ${V}/>`,
  esfera3d: `<circle cx="12" cy="12" r="8.5" ${D}/><path d="M3.5 12 a8.5 4 0 0 0 17 0 a8.5 4 0 0 0 -17 0" ${V}/>`,
  cilindro3d: `<ellipse cx="12" cy="6" rx="7" ry="3" ${D}/><path d="M5 6 V18 M19 6 V18" ${D}/>
    <path d="M5 18 a7 3 0 0 0 14 0" ${V}/>`,
  cone3d: `<path d="M12 3 L19 17 M12 3 L5 17" ${D}/><ellipse cx="12" cy="17" rx="7" ry="3" ${V}/>`,
  torus3d: `<ellipse cx="12" cy="12" rx="9" ry="5.5" ${D}/><ellipse cx="12" cy="12" rx="3.6" ry="2" ${V}/>`,
  piramide3d: `<path d="M12 3 L21 16 L12 20 L3 16 Z" ${D}/><path d="M12 3 L12 20" ${V}/>`,
  prisma3d: `<path d="M12 3 L19 6.5 L19 14 L12 17.5 L5 14 L5 6.5 Z" ${D}/>
    <path d="M5 6.5 L12 10 L19 6.5 M12 10 V17.5" ${V}/><path d="M12 17.5 V21" ${D}/>`,
  anel3d: `<ellipse cx="12" cy="9" rx="8.5" ry="4" ${D}/><ellipse cx="12" cy="9" rx="3.5" ry="1.6" ${V}/>
    <path d="M3.5 9 V14 a8.5 4 0 0 0 17 0 V9" ${D}/>`,
  estrela3d: `<path d="M12 3 L14.3 9 L20.5 9.4 L15.7 13.2 L17.3 19 L12 15.6 L6.7 19 L8.3 13.2 L3.5 9.4 L9.7 9 Z" ${D}/>
    <path d="M6.7 19 V21.5 M17.3 19 V21.5 M12 15.6 V18" ${V}/>`,
  dado3d: `<path d="M12 3 L20 7.5 L12 12 L4 7.5 Z" ${D}/><path d="M4 7.5 V16.5 L12 21 V12" ${D}/><path d="M20 7.5 V16.5 L12 21" ${D}/>
    <circle cx="12" cy="7.5" r="1.2" fill="var(--verde)" stroke="none"/>
    <circle cx="7.5" cy="12" r="1.1" fill="var(--verde)" stroke="none"/>
    <circle cx="16.5" cy="12" r="1.1" fill="var(--verde)" stroke="none"/>`,
  palito3d: `<path d="M6 8 L18 5 a3 1.6 0 0 1 0 3.2 L6 11.2 a3 1.6 0 0 1 0 -3.2 Z" ${D}/>
    <path d="M6 11.2 V14 a3 1.6 0 0 0 0.6 1 L18 12 a3 1.6 0 0 0 0.6 -1 V8.2" ${V}/>`,
  espeto3d: `<path d="M4 18 L17 6" ${D}/><path d="M17 6 L20.5 3.5 L19 8" ${V}/><path d="M4 18 l1.6 1.6" ${D}/>`,
  engrenagem3d: `<circle cx="12" cy="10" r="5" ${D}/>
    <path d="M12 3 V5 M12 15 V17 M5 10 H7 M17 10 H19 M7.2 5.2 L8.6 6.6 M15.4 13.4 L16.8 14.8 M16.8 5.2 L15.4 6.6 M8.6 13.4 L7.2 14.8" ${D}/>
    <circle cx="12" cy="10" r="1.8" ${V}/>
    <path d="M7 13.5 V16 a5 2.6 0 0 0 10 0 V13.5" ${V}/>`,
  alternar2d: `<path d="M20.5 9 a8.5 8.5 0 1 0 0.6 4" ${D}/><path d="M21 3.5 V9.5 H15" ${V}/>
    <text x="12" y="16" text-anchor="middle" font-family="monospace" font-size="9" font-weight="700" fill="currentColor" stroke="none">2D</text>`,
  alternar3d: `<path d="M20.5 9 a8.5 8.5 0 1 0 0.6 4" ${D}/><path d="M21 3.5 V9.5 H15" ${V}/>
    <text x="12" y="16" text-anchor="middle" font-family="monospace" font-size="9" font-weight="700" fill="currentColor" stroke="none">3D</text>`,
  guardarBolsa: `<path d="M6 10 H18 L19.5 21 H4.5 Z" ${D}/><path d="M9 10 V8 A3 3 0 0 1 15 8 V10" ${D}/>
    <path d="M12 1.5 V7 M9.5 4.5 L12 7 L14.5 4.5" ${V}/>`,
  arquivo: `<path d="M6 3 H14 L18.5 7.5 V21 H6 Z" ${D}/><path d="M14 3 V7.5 H18.5" ${D}/>
    <path d="M9 12 H15.5 M9 15.5 H13.5" ${V}/>`,
  caixaFerramentas: `<path d="M3 9 H21 V20 H3 Z" ${D}/><path d="M8.5 9 V6 H15.5 V9" ${D}/><path d="M3 13.5 H21" ${V}/>
    <rect x="10.5" y="11.5" width="3" height="4" ${D}/>`,
  formas3d: `<path d="M7 7 L12 9.5 L7 12 L2 9.5 Z" ${D}/><path d="M2 9.5 V15 L7 17.5 V12" ${D}/><path d="M12 9.5 V15 L7 17.5" ${V}/>
    <circle cx="18" cy="7" r="4" ${D}/><path d="M18 12.5 L22 20.5 H14 Z" ${V}/>`,
  telaCheia: `<path d="M3 9 V3.5 H8.5 M15.5 3.5 H21 V9 M21 15 V20.5 H15.5 M8.5 20.5 H3 V15" ${V}/>
    <rect x="7" y="7" width="10" height="10" ${D}/>`,
  ponteiro: `<path d="M4 3 L4 15.5 L7.5 12.5 L10 18 L12.5 17 L10 11.8 L14.5 11.5 Z" ${D}/>
    <path d="M14 5.5 H17 L18 4 H21 V10 H14 Z" ${V}/>`,
  cameraCubo: `<path d="M3 8 H6.5 L8 6 H14 L15.5 8 H19 V19 H3 Z" ${D}/>
    <path d="M11 9.5 L15 11.5 L11 13.5 L7 11.5 Z" ${V}/><path d="M7 11.5 V15.5 L11 17.5 V13.5 M15 11.5 V15.5 L11 17.5" ${V}/>`,
  caixas: `<path d="M9 5 L15.5 8 L9 11 L2.5 8 Z" ${D}/><path d="M2.5 8 V14 L9 17 V11" ${D}/><path d="M15.5 8 V14 L9 17" ${V}/>
    <path d="M16 13 L21.5 15.5 L16 18 L14 17" ${D}/>`,
  arredondados: `<circle cx="8" cy="8" r="5" ${D}/><path d="M14 20 a5 2 0 0 0 8 0 V12 a5 2 0 0 0 -8 0 Z" ${D}/>
    <ellipse cx="18" cy="12" rx="4" ry="2" ${V}/>`,
  prismas: `<path d="M8 3 L13 6 V13 L8 16 L3 13 V6 Z" ${D}/><path d="M3 6 L8 9 L13 6 M8 9 V16" ${V}/>
    <path d="M17 11 L21 20 H13 Z" ${D}/>`,
  palitos: `<path d="M3 9 L14 6.5 a2.6 1.4 0 0 1 0 2.8 L3 11.8 a2.6 1.4 0 0 1 0 -2.8 Z" ${D}/>
    <path d="M4 19 L18 13" ${D}/><path d="M18 13 L21.5 11.5 L20 15" ${V}/>`,
  engrenagens: `<circle cx="8.5" cy="9" r="4.5" ${D}/><circle cx="8.5" cy="9" r="1.6" ${V}/>
    <path d="M8.5 3 V4.5 M8.5 13.5 V15 M2.5 9 H4 M13 9 H14.5" ${D}/>
    <path d="M3 19 H21 M5 19 V17 M8 19 V17 M11 19 V17 M14 19 V17 M17 19 V17" ${V}/>`,
  outrosSolidos: `<ellipse cx="7.5" cy="8" rx="5.5" ry="3.2" ${D}/><ellipse cx="7.5" cy="8" rx="2" ry="1.1" ${V}/>
    <path d="M17 4 L21.5 14 H12.5 Z" ${D}/><path d="M12.5 14 a4.5 1.8 0 0 0 9 0" ${V}/>`,
  meiaEsfera3d: `<path d="M3.5 15 a8.5 8.5 0 0 1 17 0 Z" ${D}/><path d="M3.5 15 a8.5 3 0 0 0 17 0" ${V}/>`,
  cremalheira3d: `<path d="M3 14 H21 V19 H3 Z" ${D}/>
    <path d="M5 14 V10 H8 V14 M10 14 V10 H13 V14 M15 14 V10 H18 V14" ${V}/>`,
  regua: `<path d="M3 8 H21 V16 H3 Z" ${D}/><path d="M7 8 V12 M11 8 V13 M15 8 V12 M18 8 V13" ${V}/>`,
};

export function ferramenta(nome, titulo) {
  const desenho = FERRAMENTAS[nome];
  if (!desenho) return "";
  const rotulo = titulo ? `role="img" aria-label="${titulo}"` : 'aria-hidden="true" focusable="false"';
  return `<svg class="icone" viewBox="0 0 24 24" ${rotulo} xmlns="http://www.w3.org/2000/svg">${desenho}</svg>`;
}

export function nomesDeFerramentas() {
  return Object.keys(FERRAMENTAS);
}

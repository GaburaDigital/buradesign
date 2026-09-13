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
  exportar: `<path d="M12 15 V4 M8 8 L12 4 L16 8" ${V}/><path d="M4 14 V20 H20 V14" ${D}/>`,
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

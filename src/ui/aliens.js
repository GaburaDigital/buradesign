// O elenco fixo da oficina. Cada um cuida de um setor e tem jeito próprio de
// falar. Os desenhos são arquivos SVG em assets/aliens, feitos no Inkscape.
// Para trocar a arte, basta substituir o arquivo mantendo o nome.

export const ELENCO = Object.freeze({
  zorp: {
    id: "zorp",
    nome: "ZORP",
    cargo: "Criação Livre",
    jeito: "empolgado, aperta todos os botões",
    som: "alienAnimado",
  },
  nibla: {
    id: "nibla",
    nome: "NIBLA",
    cargo: "Design com Programação",
    jeito: "metódica, adora repetição",
    som: "alienOi",
  },
  krux: {
    id: "krux",
    nome: "KRUX",
    cargo: "Montagem com Peças Cortadas",
    jeito: "veterano, fala em milímetros",
    som: "alienResmungo",
  },
  pip: {
    id: "pip",
    nome: "PIP",
    cargo: "Simulação de Mecânica",
    jeito: "hiperativo, testa até quebrar",
    som: "alienAnimado",
  },
});

export function alien(id) {
  const ficha = ELENCO[id];
  if (!ficha) return "";
  return `<img class="alien" src="assets/aliens/${ficha.id}.svg" alt="${ficha.nome}" loading="lazy" decoding="async" width="300" height="300">`;
}

export function fala(id, texto) {
  const ficha = ELENCO[id];
  if (!ficha) return "";
  return `<div class="fala-alien">${alien(id)}
    <p><strong>${ficha.nome}:</strong> ${texto}</p></div>`;
}

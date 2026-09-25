// O plano de corte em SVG, em milímetros de verdade.
//
// Uma folha por vez, empilhadas no mesmo arquivo com um respiro entre elas —
// assim quem tem uma chapa só corta a primeira e para, e quem tem várias
// manda tudo de uma vez. O corte sai em preto, traço fino; o número da peça
// sai em vermelho, que é a cor que as cortadoras costumam ler como gravação.

const CORTE = "#000000";
const GRAVACAO = "#e03131";
const MOLDURA = "#9aa3ab";
const RESPIRO_ENTRE_FOLHAS = 20;

const numero = (valor) => Number(valor.toFixed(3));

function caminhoDe(pontos, deslocaX, deslocaY) {
  if (!pontos.length) return "";
  const partes = pontos.map(
    ([u, v], i) => `${i === 0 ? "M" : "L"} ${numero(u + deslocaX)} ${numero(v + deslocaY)}`,
  );
  return `${partes.join(" ")} Z`;
}

function rotulo(peca, x, y, indice) {
  const { largura, altura } = peca.limites;
  const tamanho = Math.max(3, Math.min(9, Math.min(largura, altura) * 0.28));
  const meioX = numero(x + largura / 2);
  const meioY = numero(y + altura / 2 + tamanho * 0.35);
  return `    <text x="${meioX}" y="${meioY}" fill="${GRAVACAO}" font-family="monospace" font-size="${numero(tamanho)}" text-anchor="middle">${indice}</text>`;
}

export function montarPlanoSVG(arranjo, opcoes = {}) {
  const { chapaLargura, chapaAltura, folhas } = arranjo;
  const { titulo = "BuraDESIGN", material = "", espessura = 0, comRotulos = true } = opcoes;

  const alturaTotal =
    folhas.length * chapaAltura + Math.max(0, folhas.length - 1) * RESPIRO_ENTRE_FOLHAS;
  const linhas = [];
  let numeroDaPeca = 0;

  folhas.forEach((folha, indiceDaFolha) => {
    const topo = indiceDaFolha * (chapaAltura + RESPIRO_ENTRE_FOLHAS);
    linhas.push(`  <g id="folha${indiceDaFolha + 1}">`);
    // A moldura é só referência: fica fora da cor de corte de propósito.
    linhas.push(
      `    <rect x="0" y="${numero(topo)}" width="${numero(chapaLargura)}" height="${numero(chapaAltura)}" fill="none" stroke="${MOLDURA}" stroke-width="0.2" stroke-dasharray="4 2"/>`,
    );
    for (const posta of folha.pecas) {
      numeroDaPeca += 1;
      const x = posta.x;
      const y = topo + posta.y;
      const partes = [caminhoDe(posta.peca.contorno, x, y)];
      for (const furo of posta.peca.furos) partes.push(caminhoDe(furo, x, y));
      linhas.push(
        `    <path d="${partes.join(" ")}" fill="none" stroke="${CORTE}" stroke-width="0.1" fill-rule="evenodd"><title>${posta.peca.nome}</title></path>`,
      );
      if (comRotulos) linhas.push(rotulo(posta.peca, x, y, numeroDaPeca));
    }
    linhas.push("  </g>");
  });

  const legenda = [material, espessura ? `${espessura} mm` : ""].filter(Boolean).join(" · ");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1"
     width="${numero(chapaLargura)}mm" height="${numero(alturaTotal)}mm"
     viewBox="0 0 ${numero(chapaLargura)} ${numero(alturaTotal)}">
  <title>${titulo}${legenda ? ` — ${legenda}` : ""}</title>
${linhas.join("\n")}
</svg>
`;
}

// A lista de peças que vai junto com o plano: o aluno risca conforme monta.
export function listaDePecas(arranjo) {
  const lista = [];
  let n = 0;
  arranjo.folhas.forEach((folha, indiceDaFolha) => {
    for (const posta of folha.pecas) {
      n += 1;
      lista.push({
        numero: n,
        nome: posta.peca.nome,
        folha: indiceDaFolha + 1,
        largura: Number(posta.peca.limites.largura.toFixed(1)),
        altura: Number(posta.peca.limites.altura.toFixed(1)),
        girada: Boolean(posta.peca.girada),
      });
    }
  });
  return lista;
}

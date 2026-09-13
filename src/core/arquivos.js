// Entrada e saída de arquivos. Serve para a Bolsa, para projetos e mais tarde
// para SVG e STL. Usa link temporário porque funciona igual no Chrome e no
// Safari, inclusive no iPad.

export function baixarTexto(nomeArquivo, texto, tipo = "application/json") {
  const pacote = new Blob([texto], { type: `${tipo};charset=utf-8` });
  const endereco = URL.createObjectURL(pacote);
  const link = document.createElement("a");
  link.href = endereco;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(endereco), 2000);
}

export function baixarJSON(nomeArquivo, dados) {
  baixarTexto(nomeArquivo, JSON.stringify(dados, null, 2));
}

export function escolherArquivo(aceita = ".json,application/json") {
  return new Promise((resolver) => {
    const campo = document.createElement("input");
    campo.type = "file";
    campo.accept = aceita;
    campo.style.position = "fixed";
    campo.style.left = "-9999px";
    document.body.appendChild(campo);
    campo.addEventListener("change", () => {
      const arquivo = campo.files && campo.files[0];
      campo.remove();
      resolver(arquivo || null);
    });
    campo.click();
  });
}

export async function lerJSON(arquivo) {
  const texto = await arquivo.text();
  return JSON.parse(texto);
}

export function carimboDeData() {
  const agora = new Date();
  const doisDigitos = (n) => String(n).padStart(2, "0");
  return (
    `${agora.getFullYear()}-${doisDigitos(agora.getMonth() + 1)}-${doisDigitos(agora.getDate())}` +
    `_${doisDigitos(agora.getHours())}${doisDigitos(agora.getMinutes())}`
  );
}

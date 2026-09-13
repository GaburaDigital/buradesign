// Todos os textos da interface. Para criar outro idioma, copie este arquivo,
// traduza só o lado direito e registre o código em src/core/idioma.js.

export default {
  idioma: { codigo: "pt-BR", nome: "Português (Brasil)" },

  app: {
    nome: "BuraDESIGN",
    resumo: "Oficina de desenho para corte e modelagem 3D. Sem conta, sem internet.",
  },

  boot: {
    dica: "Pressione qualquer tecla para continuar",
    linhas: [
      "OFICINA ORBITAL / SISTEMA BURADESIGN v0.1",
      "verificando energia da bancada ......... OK",
      "montando mesa de corte ................ OK",
      "calibrando base de impressão .......... OK",
      "acordando a tripulação ................ OK",
      "abrindo a bolsa de peças .............. {bolsa}",
      "",
      "quatro aliens assumiram seus postos.",
      "a oficina está sua.",
    ],
  },

  acoes: {
    ajustes: "Ajustes",
    bolsa: "Bolsa",
    fechar: "Fechar",
    salvar: "Salvar preferências",
    cancelar: "Cancelar",
    voltar: "Voltar ao início",
    confirmar: "Confirmar",
    exportar: "Baixar bolsa",
    colocarNaMesa: "Colocar na mesa",
    limparBase: "Limpar base",
    arrastar: "Arrastar a vista",
    continuar: "Continuar desenho",
    concluirForma: "Concluir forma",
    fecharForma: "Fechar forma",
    importar: "Importar bolsa",
    esvaziar: "Esvaziar bolsa",
    remover: "Remover",
    limparCache: "Limpar cache",
    restaurar: "Voltar ao padrão",
    repositorio: "Acessar repositório - CÓDIGO ABERTO",
  },

  inicio: {
    titulo: "Escolha um setor da oficina",
    subtitulo: "Cada setor tem um responsável. Você pode trocar de setor a qualquer momento.",
    aberto: "Aberto",
    emObras: "Em obras",
    avisoDispositivo:
      "Esta oficina funciona melhor no computador. No celular alguns modos ficam limitados.",
    avisoPeso: "Atenção: projeto pesado para dispositivos móveis.",
  },

  ajustes: {
    titulo: "Ajustes da oficina",
    aparencia: "Aparência",
    tema: "Tema",
    temaEscuro: "Escuro",
    temaClaro: "Claro",
    temaSistema: "Sistema",
    temaRosa: "Rosa",
    temaFlash: "Flash",
    alcas: "Tamanho das alças",
    alcasNormal: "Normal",
    alcasGrande: "Grande",
    alcasEnorme: "Enorme",
    alcasAjuda: "Alças maiores facilitam para quem está começando e para quem usa o dedo na tela.",
    salvarSozinho: "Salvar o projeto sozinho",
    som: "Som",
    somAtivo: "Efeitos sonoros",
    volume: "Volume",
    oficina: "Bancada",
    unidade: "Unidade de medida",
    snap: "Encaixe no grid",
    semSnap: "Sem encaixe",
    boot: "Inicialização",
    bootRapido: "Pular a abertura do sistema",
    avisoDispositivo: "Mostrar aviso em telas pequenas",
    dados: "Dados guardados",
    dadosAjuda:
      "As preferências ficam no navegador deste computador. A Bolsa fica em um depósito separado e não some ao limpar as preferências.",
    salvo: "Preferências salvas.",
    naoSalvo: "Há mudanças não salvas.",
    cacheLimpo: "Cache limpo. Recarregue a página para baixar tudo de novo.",
    confirmarCache:
      "Isso apaga as preferências e os arquivos guardados para uso offline. A Bolsa não é apagada. Continuar?",
  },

  bolsa: {
    titulo: "Bolsa de peças",
    resumo: "Peças guardadas aqui podem ser usadas em qualquer setor.",
    vazia: "A bolsa está vazia. Peças criadas nos setores aparecem aqui.",
    demonstracao: "Criar peça de demonstração",
    confirmarEsvaziar: "Isso remove todas as peças da bolsa. Continuar?",
    esvaziada: "Bolsa esvaziada.",
    baixada: "Bolsa baixada.",
    importadas: "{n} peças somadas à bolsa.",
    removida: "Peça removida.",
    erroArquivo: "Não consegui ler esse arquivo. Ele precisa ser uma bolsa do BuraDESIGN.",
    itemDemo: "Cubo de demonstração",
    semDestino: "Abra um setor de desenho para colocar a peça na mesa.",
    colocada: "Peça colocada na mesa.",
    nomeArquivo: "Nome do arquivo da bolsa:",
  },

  setores: {
    livre: {
      nome: "Criação Livre",
      descricao: "Desenhe em 2D para corte e modele em 3D para impressão.",
    },
    livre3d: {
      nome: "Criação Livre 3D",
      descricao: "Modele sólidos e exporte STL para a impressora 3D.",
    },
    blocos: {
      nome: "Design com Programação",
      descricao: "Monte peças programando em blocos, com desafios para treinar.",
    },
    corte: {
      nome: "Montagem com Peças Cortadas",
      descricao: "Construa em 3D e gere o plano de corte em chapa.",
    },
    fisica: {
      nome: "Simulação de Mecânica",
      descricao: "Teste alavancas, engrenagens e motores com física.",
    },
  },

  emObras: {
    titulo: "Setor em obras",
    texto: "Este setor abre em uma atualização futura. Por enquanto, o mapa da obra está no README.",
  },

  rodape: {
    credito: "criado por GABURA - estude, aprenda e compartilhe mais exercício em:",
  },
};

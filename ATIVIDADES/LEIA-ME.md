# Pasta ATIVIDADES

Tudo que o site usa como conteúdo de exercício mora aqui. A regra da casa é
simples: **o nome do arquivo é o nome que aparece na interface**. Para somar
uma atividade, coloque o arquivo na pasta certa e registre uma linha no
`catalogo.json` da raiz.

| Pasta | Para que serve | Usada em |
| --- | --- | --- |
| `DESAFIOS_2D` | Desafios de desenho em 2D, guardados como programa-solução em blocos | Design com Programação |
| `DESAFIOS_3D` | Desafios de modelagem em 3D, mesmo formato | Design com Programação |
| `PECAS_PRONTAS` | Peças de uso comum (garra, esteira, polias, engrenagens) | Peças Cortadas e Simulação |
| `MODELOS_EXEMPLO` | Modelos para importar e modificar | Criação Livre e Peças Cortadas |

## Como somar um desafio

1. Monte a solução dentro do próprio site, no setor Design com Programação.
2. Use **Exportar como desafio**. O arquivo sai pronto, com a forma alvo já
   calculada a partir da sua solução.
3. Salve o arquivo na pasta `DESAFIOS_2D` ou `DESAFIOS_3D`.
4. Abra o `catalogo.json` e some o item na coleção correspondente, no formato
   mostrado em `exemploDeItem`.
5. Suba o número de `VERSAO` no `sw.js` para que os navegadores baixem a
   novidade em vez de usar a cópia guardada.

Os desafios chegam em lotes de 20.

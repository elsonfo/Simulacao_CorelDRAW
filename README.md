# VectorClass - Simulador de desenho vetorial

Sistema web simples, inspirado em ferramentas como CorelDRAW, para aulas de nivelamento de informática. Ele roda direto no navegador e foi pensado para praticar coordenação com mouse, seleção, formas, texto, cores, camadas, salvamento e exportação.

## Como usar em sala

1. Abra `index.html` em qualquer navegador moderno.
2. Use as ferramentas laterais para criar formas, linhas, desenho livre e texto.
3. Oriente os alunos pelas atividades do painel **Aulas**.
4. Exporte o trabalho em `SVG`, `PNG` ou salve o projeto em `JSON`.

## Recursos

- Editor vetorial com retângulo, elipse, linha, desenho livre, texto e seleção.
- Alteração de preenchimento, contorno, espessura e tamanho do texto.
- Duplicar, apagar, enviar para frente, enviar para trás e grade visual.
- Painel de camadas para selecionar objetos.
- Exportação em SVG e PNG.
- Salvamento e abertura de projetos em JSON.
- Interface responsiva para computadores e notebooks da escola.

## Publicação no GitHub

Depois de conectar este repositório a um remoto do GitHub:

```powershell
git remote add origin https://github.com/SEU_USUARIO/vectorclass.git
git branch -M main
git add .
git commit -m "Cria simulador VectorClass"
git push -u origin main
```

Para publicar como site:

1. Acesse o repositório no GitHub.
2. Abra **Settings > Pages**.
3. Em **Build and deployment**, escolha a branch `main` e a pasta `/root`.
4. Salve e aguarde o link do GitHub Pages.

## Recursos livres

Este projeto evita dependências externas para funcionar mesmo sem internet. Se quiser complementar as aulas, use bancos livres como:

- [Openclipart](https://openclipart.org/) para imagens SVG livres.
- [Wikimedia Commons](https://commons.wikimedia.org/) para imagens educacionais.
- [Google Fonts](https://fonts.google.com/) para fontes com licenças abertas.

Confira sempre a licença antes de redistribuir materiais de terceiros.

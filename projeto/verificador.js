import readline from "readline";
import pkg from "pg";
import fs from "fs";
const { Pool } = pkg;

const path = "../csvs";
// aqui é apenas o objeto da biblioteca node que se comunica com o banco
const pool = new Pool({
  user: "postgres",
  password: "admin@123",
  host: "localhost",
  port: 5432,
  database: "teste_dE_depencia_funcional",
});

// aqui é o objeto da biblioteca node que lê entradas do terminal
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// função que pega todas as tabelas do banco
async function pegaTabelas() {
  const client = await pool.connect();
  const consultaTabelas = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE';
  `);
  client.release();

  const tabelas = [];
  for (let i = 0; i < consultaTabelas.rows.length; i++) {
    tabelas.push(consultaTabelas.rows[i].table_name);
  }
  return tabelas;
}
//pega todas as colunas de uma tabela específica
async function pegaColunas(tabela) {
  const client = await pool.connect();
  const verificarCR = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = '${tabela}';
  `);
  client.release();

  const colunas = [];
  for (let i = 0; i < verificarCR.rows.length; i++) {
    colunas.push(verificarCR.rows[i].column_name);
  }
  return colunas;
}

// função que transforma um arquivo CSV em uma tabela no banco
async function transformarCsv(nomeArquivo) {
  let caminhoCompleto = "";
  for (let i = 0; i < path.length; i++) {
    caminhoCompleto += path[i];
  }
  caminhoCompleto += "/" + nomeArquivo;

  const conteudo = fs.readFileSync(caminhoCompleto, "utf8");

  let linhas = [];
  let linha = "";
  for (let i = 0; i < conteudo.length; i++) {
    if (conteudo[i] === "\n") {
      if (linha.trim() !== "") linhas.push(linha.trim());
      linha = "";
    } else {
      linha += conteudo[i];
    }
  }
  if (linha.trim() !== "") linhas.push(linha.trim());

  let colunas = [];
  let coluna = "";
  let primeiraLinha = linhas[0];
  for (let i = 0; i < primeiraLinha.length; i++) {
    if (primeiraLinha[i] === ";") {
      colunas.push(coluna.trim());
      coluna = "";
    } else {
      coluna += primeiraLinha[i];
    }
  }
  if (coluna !== "") colunas.push(coluna.trim());

  let dados = [];
  for (let i = 1; i < linhas.length; i++) {
    let valores = [];
    let valor = "";
    let linhaAtual = linhas[i];
    for (let j = 0; j < linhaAtual.length; j++) {
      if (linhaAtual[j] === ";") {
        valores.push(valor.trim());
        valor = "";
      } else {
        valor += linhaAtual[j];
      }
    }
    if (valor !== "") valores.push(valor.trim());
    if (valores.length > 0) dados.push(valores);
  }

  const nomeTabela = nomeArquivo.split(".")[0].trim().toLowerCase();
  if (nomeTabela === "") {
    console.log("Nome de tabela inválido!");
    return;
  }

  const client = await pool.connect();

  await client.query(`DROP TABLE IF EXISTS ${nomeTabela};`);

  let createSQL = `CREATE TABLE ${nomeTabela} (\n`;
  for (let i = 0; i < colunas.length; i++) {
    createSQL += `"${colunas[i]}" VARCHAR(50)`;
    if (i < colunas.length - 1) createSQL += ",\n";
  }
  createSQL += "\n);";

  console.log(createSQL);
  await client.query(createSQL);

  for (let i = 0; i < dados.length; i++) {
    const linhaDados = dados[i];
    let insertSQL = `INSERT INTO ${nomeTabela} VALUES (`;
    for (let j = 0; j < linhaDados.length; j++) {
      let valorSeguro = linhaDados[j].replace(/'/g, "''");
      insertSQL += `'${valorSeguro}'`;
      if (j < linhaDados.length - 1) insertSQL += ",";
    }
    insertSQL += ");";
    console.log(insertSQL);
    await client.query(insertSQL);
  }

  client.release();
  console.log(`Tabela '${nomeTabela}' criada e dados inseridos com sucesso!\n`);
  menu();
}

//aqui começa o menu interativo onde a pessoa escolhe o que fazer por numeros e os numeros sejam gerado intuitivamente
async function menu() {
  const tabelas = await pegaTabelas();
  const client = await pool.connect();

  function mostraMenu() {
    console.log(
      "\nInsira o número da tabela que deseja verificar, insira uma nova tabela ou saia:"
    );
    for (let i = 0; i < tabelas.length; i++) {
      console.log(`${i + 1} - ${tabelas[i]}`);
    }

    let inserir = tabelas.length + 1;
    let sair = tabelas.length + 2;
    console.log(`${inserir} - Inserir tabela no banco`);
    console.log(`${sair} - Sair`);

    rl.question("Escolha uma opção: ", async (opcao) => {
      const num = parseInt(opcao);

      if (num === sair) {
        console.log("Saindo...");
        rl.close();
        client.release();
        await pool.end();
        return;
      } else if (num === inserir) {
        fs.readdir(path, async function (err, arquivos) {
          if (err) {
            console.log("Erro ao ler a pasta:", err);
            return;
          }

          console.log("\nArquivos encontrados na pasta csvs:");
          for (let i = 0; i < arquivos.length; i++) {
            console.log(i + 1 + " - " + arquivos[i]);
          }

          rl.question(
            "Escolha o número do arquivo CSV: ",
            async function (opcao) {
              const indice = parseInt(opcao);
              if (indice > 0 && indice <= arquivos.length) {
                const nomeArquivo = arquivos[indice - 1];
                await transformarCsv(nomeArquivo);
              } else {
                console.log("Número inválido!");
                menu();
              }
            }
          );
        });
      } else if (num >= 1 && num <= tabelas.length) {
        const tabelaEscolhida = tabelas[num - 1];
        const colunas = await pegaColunas(tabelaEscolhida);
        console.log(
          `\nColunas da tabela ${tabelaEscolhida}: ${colunas.join(", ")}`
        );
        await verificaDependenciasComMensagem(tabelaEscolhida);
      } else {
        console.log("Opção inválida!");
        mostraMenu();
      }
    });
  }

  mostraMenu();
}

// função que gera todas as combinações de 1 a 3 colunas para o lado esquerdo
function geraCombinacoes(colunas) {
  let combinacoes = [];
  // 1 coluna
  for (let i = 0; i < colunas.length; i++) {
    combinacoes.push([colunas[i]]);
  }
  // 2 colunas
  for (let i = 0; i < colunas.length; i++) {
    for (let j = i + 1; j < colunas.length; j++) {
      combinacoes.push([colunas[i], colunas[j]]);
    }
  }
  // 3 colunas
  for (let i = 0; i < colunas.length; i++) {
    for (let j = i + 1; j < colunas.length; j++) {
      for (let k = j + 1; k < colunas.length; k++) {
        combinacoes.push([colunas[i], colunas[j], colunas[k]]);
      }
    }
  }
  return combinacoes;
}

// função ajustada para mostrar mensagem de dependências válidas abaixo das colunas
async function verificaDependenciasComMensagem(tabela) {
  const colunas = await pegaColunas(tabela);
  const combinacoes = geraCombinacoes(colunas);
  const client = await pool.connect();
  let dependenciasInvalidas = [];
  let totalTestes = 0;

  for (let i = 0; i < combinacoes.length; i++) {
    const ladoEsq = combinacoes[i];
    for (let j = 0; j < colunas.length; j++) {
      if (ladoEsq.includes(colunas[j])) continue;
      const ladoDir = colunas[j];
      const groupBy = ladoEsq.map((c) => `"${c}"`).join(", ");
      const query = `SELECT ${groupBy}, COUNT(DISTINCT "${ladoDir}") AS cnt FROM "${tabela}" GROUP BY ${groupBy} HAVING COUNT(DISTINCT "${ladoDir}") > 1;`;
      const res = await client.query(query);
      totalTestes++;
      if (res.rows.length > 0) {
        dependenciasInvalidas.push({ esquerda: ladoEsq, direita: ladoDir });
      }
    }
  }
  client.release();
  if (dependenciasInvalidas.length === 0) {
    console.log(`Dependências funcionais válidas para a tabela '${tabela}'.\n`);
  } else {
    console.log(
      `\nDependências funcionais NÃO válidas para a tabela '${tabela}':`
    );
    for (let dep of dependenciasInvalidas) {
      console.log(`${dep.esquerda.join(", ")} -> ${dep.direita}`);
    }
    console.log(
      `Total: ${dependenciasInvalidas.length} dependências não válidas\n`
    );
  }
  menu();
}

menu();

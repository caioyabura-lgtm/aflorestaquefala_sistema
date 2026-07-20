/**
 * Objetivo: concentrar funções auxiliares reutilizáveis do Apps Script.
 * Entradas: nomes de abas, cabeçalhos e objetos recebidos do frontend.
 * Saídas: planilhas preparadas, objetos normalizados e respostas JSON.
 * Dependências: SpreadsheetApp e ContentService.
 * Arquivos utilizados: util.gs.
 * Abas utilizadas: definidas pelos módulos consumidores.
 */

function obterPlanilha_() {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  if (!planilha) {
    throw new Error("Nenhuma planilha ativa encontrada. Vincule este Apps Script à planilha oficial do Sistema de Produção.");
  }
  return planilha;
}

function obterAba_(nomeAba, cabecalhos) {
  const planilha = obterPlanilha_();
  let aba = planilha.getSheetByName(nomeAba);

  if (!aba) {
    aba = planilha.insertSheet(nomeAba);
  }

  if (cabecalhos && cabecalhos.length) {
    const primeiraLinha = aba.getRange(1, 1, 1, cabecalhos.length).getValues()[0];
    const precisaCabecalho = primeiraLinha.every((valor) => valor === "");
    if (precisaCabecalho) {
      aba.getRange(1, 1, 1, cabecalhos.length).setValues([cabecalhos]);
    }
  }

  return aba;
}

function listarObjetosDaAba_(nomeAba, cabecalhos) {
  const aba = obterAba_(nomeAba, cabecalhos);
  const ultimaLinha = aba.getLastRow();
  const ultimaColuna = cabecalhos.length;

  if (ultimaLinha < 2) return [];

  return aba
    .getRange(2, 1, ultimaLinha - 1, ultimaColuna)
    .getValues()
    .filter((linha) => linha.some((valor) => valor !== ""))
    .map((linha, indice) => {
      return cabecalhos.reduce((objeto, cabecalho, posicao) => {
        objeto[cabecalho] = normalizarValor_(linha[posicao]);
        return objeto;
      }, { id: indice + 1 });
    });
}

function normalizarValor_(valor) {
  if (valor instanceof Date) return valor.toISOString();
  if (valor === null || valor === undefined) return "";
  return valor;
}

function interpretarPayload_(evento) {
  if (!evento || !evento.postData || !evento.postData.contents) return {};

  try {
    return JSON.parse(evento.postData.contents);
  } catch (erro) {
    return evento.parameter || {};
  }
}

function responderJson_(dados) {
  return ContentService
    .createTextOutput(JSON.stringify(dados))
    .setMimeType(ContentService.MimeType.JSON);
}

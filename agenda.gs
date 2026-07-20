/**
 * Objetivo: registrar e listar marcações do calendário de produção.
 * Entradas: nome, data, hora, titulo, descricao e registradoEm.
 * Saídas: registros gravados/listados em formato JSON.
 * Dependências: util.gs.
 * Arquivos utilizados: agenda.gs e util.gs.
 * Abas utilizadas: calendario_producao.
 */

const ABA_AGENDA = "calendario_producao";
const CABECALHOS_AGENDA = ["id", "nome", "data", "hora", "titulo", "descricao", "registradoEm"];

function registrarAgendaSite(dados) {
  const aba = obterAba_(ABA_AGENDA, CABECALHOS_AGENDA);
  const id = Math.max(aba.getLastRow(), 1);

  aba.appendRow([
    id,
    dados.nome || "",
    dados.data || "",
    dados.hora || "",
    dados.titulo || "",
    dados.descricao || "",
    dados.registradoEm || new Date().toISOString()
  ]);

  return { ok: true, acao: "registrarAgenda", id };
}

function listarAgenda() {
  return listarObjetosDaAba_(ABA_AGENDA, CABECALHOS_AGENDA);
}

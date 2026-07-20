/**
 * Objetivo: registrar e listar tarefas enviadas pelo site de produção.
 * Entradas: tarefa, setor, etapa, observacao, usuario e registradoEm.
 * Saídas: registros gravados/listados em formato JSON.
 * Dependências: util.gs.
 * Arquivos utilizados: tarefas.gs e util.gs.
 * Abas utilizadas: tarefas_registro.
 */

const ABA_TAREFAS = "tarefas_registro";
const CABECALHOS_TAREFAS = ["id", "tarefa", "setor", "etapa", "observacao", "usuario", "registradoEm"];

function registrarTarefaSite(dados) {
  const aba = obterAba_(ABA_TAREFAS, CABECALHOS_TAREFAS);
  const id = Math.max(aba.getLastRow(), 1);

  aba.appendRow([
    id,
    dados.tarefa || "",
    dados.setor || "",
    dados.etapa || "",
    dados.observacao || "",
    dados.usuario || "",
    dados.registradoEm || new Date().toISOString()
  ]);

  return { ok: true, acao: "registrar_tarefa", id };
}

function listarTarefas() {
  return listarObjetosDaAba_(ABA_TAREFAS, CABECALHOS_TAREFAS);
}

/**
 * Objetivo: expor a API pública do Sistema de Produção para o site.
 * Entradas: parâmetros GET e payloads POST enviados pelo frontend.
 * Saídas: respostas JSON para consultas e confirmações de gravação.
 * Dependências: agenda.gs, tarefas.gs e util.gs.
 * Arquivos utilizados: api.gs, agenda.gs, tarefas.gs e util.gs.
 * Abas utilizadas: calendario_producao e tarefas_registro.
 */

function doGet(e) {
  const acao = (e && e.parameter && e.parameter.acao ? e.parameter.acao : "").trim();

  if (acao === "listarAgenda" || acao === "listar_agenda" || acao === "agenda") {
    return responderJson_(listarAgenda());
  }

  if (acao === "listarTarefas" || acao === "listar_tarefas" || acao === "tarefas") {
    return responderJson_(listarTarefas());
  }

  return responderJson_(listarTarefas());
}

function doPost(e) {
  const dados = interpretarPayload_(e);
  const acao = (dados.acao || "").trim();

  if (acao === "registrar_tarefa") {
    return responderJson_(registrarTarefaSite(dados));
  }

  if (acao === "registrarAgenda" || acao === "registrar_agenda") {
    return responderJson_(registrarAgendaSite(dados));
  }

  return responderJson_({
    ok: false,
    erro: "Ação não reconhecida.",
    acao
  });
}

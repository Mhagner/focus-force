export type WorkspaceMode = 'WORK' | 'STUDY';

export interface WorkspaceLabels {
  /** "Projeto" / "Matéria" */
  project: string;
  projects: string;
  /** "Tarefa" / "Tópico" */
  task: string;
  tasks: string;
  newProject: string;
  newTask: string;
  noProjects: string;
  projectName: string;
  /** Campo reaproveitado de Project.client */
  clientField: string;
  clientPlaceholder: string;
  /** Campo reaproveitado de Project.estimatedDeliveryDate */
  dueDateField: string;
}

export const WORKSPACE_LABELS: Record<WorkspaceMode, WorkspaceLabels> = {
  WORK: {
    project: 'Projeto',
    projects: 'Projetos',
    task: 'Tarefa',
    tasks: 'Tarefas',
    newProject: 'Novo projeto',
    newTask: 'Nova tarefa',
    noProjects: 'Nenhum projeto cadastrado ainda.',
    projectName: 'Nome do Projeto',
    clientField: 'Cliente',
    clientPlaceholder: 'Nome do cliente',
    dueDateField: 'Data prevista de entrega',
  },
  STUDY: {
    project: 'Matéria',
    projects: 'Matérias',
    task: 'Tópico',
    tasks: 'Tópicos',
    newProject: 'Nova matéria',
    newTask: 'Novo tópico',
    noProjects: 'Nenhuma matéria cadastrada ainda.',
    projectName: 'Nome da Matéria',
    clientField: 'Concurso / Exame',
    clientPlaceholder: 'Ex.: TRF 3ª Região, ENEM 2026',
    dueDateField: 'Data da prova',
  },
};

export const MODE_DESCRIPTIONS: Record<WorkspaceMode, { title: string; description: string }> = {
  WORK: {
    title: 'Trabalho',
    description: 'Projetos, clientes, tarefas, valor/hora e integração com Clockfy.',
  },
  STUDY: {
    title: 'Estudos',
    description: 'Matérias, tópicos e sessões de foco para concursos, vestibular e provas.',
  },
};

export type TaskStatusKey = 'todo' | 'call_agendada' | 'pronta_elaboracao' | 'doing' | 'done';

/**
 * Nomes dos 5 estágios do quadro por modo. O status gravado no banco é o mesmo nos dois modos;
 * só o rótulo muda. Em Estudos o fluxo é: A estudar → Teoria → Exercícios → Revisão → Dominado.
 */
export const STATUS_TITLES: Record<WorkspaceMode, Record<TaskStatusKey, string>> = {
  WORK: {
    todo: 'Todo',
    call_agendada: 'Call agendada',
    pronta_elaboracao: 'Pronta para elaboracao',
    doing: 'Fazendo',
    done: 'Feito',
  },
  STUDY: {
    todo: 'A estudar',
    call_agendada: 'Teoria',
    pronta_elaboracao: 'Exercícios',
    doing: 'Revisão',
    done: 'Dominado',
  },
};

/** Versão curta, usada nos botões de status do detalhe da tarefa/tópico. */
export const STATUS_SHORT_TITLES: Record<WorkspaceMode, Record<TaskStatusKey, string>> = {
  WORK: { todo: 'Todo', call_agendada: 'Call', pronta_elaboracao: 'Pronta', doing: 'Fazendo', done: 'Feito' },
  STUDY: STATUS_TITLES.STUDY,
};

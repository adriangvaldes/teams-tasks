/**
 * Porta de saida para o tempo. Existe para que "agora" seja injetavel:
 * nenhuma camada acima do main.ts chama `new Date()` diretamente, o que torna
 * timestamps e regras como `isOverdue` testaveis de forma deterministica.
 */
export interface Clock {
  now(): Date
}

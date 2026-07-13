export class EntityNotFoundError extends Error {
  constructor(entityName: string) {
    super(`Entity ${entityName} not found`);
  }
}

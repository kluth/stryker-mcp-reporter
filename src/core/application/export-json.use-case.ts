export class ExportJsonUseCase {
  execute(history: any[]): string {
    return JSON.stringify(history, null, 2);
  }
}
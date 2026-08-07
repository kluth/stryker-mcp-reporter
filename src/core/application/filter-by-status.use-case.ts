export class FilterByStatusUseCase {
  execute(history: any[], status: string): any[] {
    if (!status) return history;
    return history.filter(item => item.report?.status === status);
  }
}
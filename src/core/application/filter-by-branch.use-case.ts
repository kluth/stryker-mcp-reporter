export class FilterByBranchUseCase {
  execute(history: any[], branch: string): any[] {
    if (!branch) return history;
    return history.filter(item => item.report?.branch === branch);
  }
}
export class SearchHistoryUseCase {
  execute(history: any[], query: string): any[] {
    if (!query) return history;
    const lowerQuery = query.toLowerCase();
    return history.filter(item => {
      const commitMsg = item.report?.commitMessage || '';
      return commitMsg.toLowerCase().includes(lowerQuery);
    });
  }
}

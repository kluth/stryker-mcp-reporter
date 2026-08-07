export class SortExplorerFilesUseCase {
  execute(files: any[], sortBy: 'coverage' | 'risk'): any[] {
    return [...files].sort((a, b) => {
      if (sortBy === 'coverage') {
        return (b.metrics?.coverage || 0) - (a.metrics?.coverage || 0);
      }
      return (b.metrics?.risk || 0) - (a.metrics?.risk || 0);
    });
  }
}
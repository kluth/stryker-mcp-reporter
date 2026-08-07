export class SearchExplorerUseCase {
  execute(files: any[], query: string): any[] {
    if (!query) return files;
    const lowerQuery = query.toLowerCase();
    return files.filter(f => f.name?.toLowerCase().includes(lowerQuery));
  }
}
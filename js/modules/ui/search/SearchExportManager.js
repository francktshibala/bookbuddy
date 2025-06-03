// js/modules/ui/search/SearchExportManager.js
export default class SearchExportManager {
    exportResults(results, format) {
        const timestamp = new Date().toISOString().split('T')[0];
        
        switch (format) {
            case 'json':
                return this.exportAsJSON(results, timestamp);
            case 'csv':
                return this.exportAsCSV(results, timestamp);
            case 'txt':
                return this.exportAsText(results, timestamp);
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }

    exportAsJSON(results, timestamp) {
        const content = JSON.stringify(results, null, 2);
        const filename = `book-search-results-${timestamp}.json`;
        this.downloadFile(content, filename, 'application/json');
    }

    exportAsCSV(results, timestamp) {
        const headers = ['Title', 'Authors', 'Publisher', 'Published Date', 'Page Count'];
        const rows = [headers];

        results.forEach(book => {
            const row = [
                this.escapeCSV(book.title || ''),
                this.escapeCSV((book.authors || []).join('; ')),
                this.escapeCSV(book.publisher || ''),
                this.escapeCSV(book.publishedDate || ''),
                book.pageCount || ''
            ];
            rows.push(row);
        });

        const content = rows.map(row => row.join(',')).join('\n');
        const filename = `book-search-results-${timestamp}.csv`;
        this.downloadFile(content, filename, 'text/csv');
    }

    exportAsText(results, timestamp) {
        const content = results.map((book, index) => {
            return `${index + 1}. ${book.title || 'Unknown Title'}
   Authors: ${(book.authors || []).join(', ') || 'Unknown'}
   Publisher: ${book.publisher || 'Unknown'}
   Published: ${book.publishedDate || 'Unknown'}
   Pages: ${book.pageCount || 'Unknown'}
   
`;
        }).join('\n');

        const filename = `book-search-results-${timestamp}.txt`;
        this.downloadFile(content, filename, 'text/plain');
    }

    escapeCSV(value) {
        if (typeof value !== 'string') return value;
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}
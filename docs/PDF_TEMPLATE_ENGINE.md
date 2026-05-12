# PDF Template Engine

`PdfTemplateEngine` is the v3.9.8 document presentation layer for FEG Stage PRO v4-preview.

It renders existing document models from `QuoteDocumentBuilder` into clean HTML templates that can later be printed through the browser or converted to PDF.

## Current templates

- Customer proposal
- Technical sheet
- Warehouse sheets
- Reservation plan
- Stock movement plan
- Warehouse workflow
- Subrent plan
- Calendar draft

## Safety rule

This layer does not change calculations, inventory balances, quote data, prices or legacy v3 behavior. It only renders existing document structures into HTML.

## Next step

A later layer can connect these templates to browser print, jsPDF/html2canvas or a server-side PDF renderer.

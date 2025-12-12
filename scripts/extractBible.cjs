const fs = require('fs');
const PDFParser = require("pdf2json");
const path = require('path');

const pdfPath = path.join(process.cwd(), 'Biblia.pdf');
const outputPath = path.join(process.cwd(), 'src', 'data', 'bible.json');

const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

console.log(`📖 Reading PDF from: ${pdfPath}`);

const pdfParser = new PDFParser(this, 1); // 1 = text content only

pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError));

pdfParser.on("pdfParser_dataReady", pdfData => {
    // Extract text from the raw data
    // pdf2json returns an object with pages -> content -> text
    const rawText = pdfParser.getRawTextContent();
    console.log(`✅ PDF Parsed. Processing text...`);

    const psalms = {};
    const psalmRegex = /Salmo\s+(\d+)([\s\S]*?)(?=Salmo\s+\d+|$)/gi;

    let match;
    let count = 0;
    while ((match = psalmRegex.exec(rawText)) !== null) {
        const number = match[1];
        let content = match[2].trim();

        content = content.replace(/----------------Page \(\d+\) Break----------------/g, " ");
        content = content.replace(/\s+/g, ' ');

        if (content.length > 20) {
            psalms[number] = content;
            count++;
        }
    }

    const bibleData = {
        source: "Biblia.pdf",
        psalms: psalms
    };

    fs.writeFileSync(outputPath, JSON.stringify(bibleData, null, 2));
    console.log(`💾 Saved ${count} Psalms to: ${outputPath}`);
});

pdfParser.loadPDF(pdfPath);

const express = require('express');
const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, TextRun, AlignmentType, spacing } = require('docx');
const router = express.Router();

// Helper function to get alignment for each section
const getSectionAlignment = (sectionNumber) => {
    switch (sectionNumber) {
        case 1: return 'justify';  // Title of the court
        case 2: return 'center';   // Case No. & Year
        case 3: return 'left';     // First Party
        case 4: return 'right';    // Opposite Party
        case 5: return 'right';    // Statutory Sections
        case 6: return 'right';    // Name of Police Station
        case 7: return 'justify';  // Title of the Case
        case 8: return 'center';  // May It Please Your Honour
        case 9: return 'left';   // May It Please Your Honour (repeated)
        case 10: return 'left';   // Advocate Details and date
        default: return 'left';    // Default alignment
    }
};

// Helper function to get DOCX alignment type
const getDocxAlignment = (alignment) => {
    switch (alignment) {
        case 'justify': return AlignmentType.JUSTIFIED;
        case 'center': return AlignmentType.CENTER;
        case 'right': return AlignmentType.RIGHT;
        default: return AlignmentType.LEFT;
    }
};

router.post('/export/pdf', (req, res) => {
    const { sections } = req.body;
    const doc = new PDFDocument();
    const filename = `legal-document-${Date.now()}.pdf`;

    try {
        res.setHeader('Content-disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-type', 'application/pdf');
        doc.pipe(res);

        sections.forEach((section, index) => {
            if (typeof section === 'object' && section.content) {
                doc.fontSize(14).text(section.content, {
                    align: getSectionAlignment(index + 1),
                    paragraphGap: 20,
                });
                
                // Add extra line break after each section
                doc.moveDown();
            } else {
                console.warn('Invalid section structure.');
            }
        });

        doc.end();
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send({ error: 'Failed to generate PDF' });
    }
});

router.post('/export/docx', async (req, res) => {
    const { sections } = req.body;
    const filename = `legal-document-${Date.now()}.docx`;

    const children = [];
    sections.forEach((section, index) => {
        // Add the section content
        children.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: section.content,
                        size: 28, // 14pt * 2 (DOCX uses half-points)
                    }),
                ],
                alignment: getDocxAlignment(getSectionAlignment(index + 1)),
                spacing: {
                    before: 240,  // 12pt * 2
                    after: 240,   // 12pt * 2
                    line: 360,    // 1.5 line spacing
                    lineRule: 'auto',
                }
            })
        );

        // Add an empty paragraph for line break after each section
        children.push(
            new Paragraph({
                children: [new TextRun({ text: "" })],
                spacing: {
                    before: 240,  // 12pt * 2
                    after: 240,   // 12pt * 2
                }
            })
        );
    });

    const doc = new Document({
        sections: [{
            properties: {
                page: {
                    margin: {
                        top: 1440,    // 1 inch (1440 twips)
                        right: 1440,
                        bottom: 1440,
                        left: 1440
                    }
                }
            },
            children: children
        }],
    });

    try {
        const buffer = await Packer.toBuffer(doc);
        res.setHeader('Content-disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.send(buffer);
    } catch (error) {
        console.error('Error generating DOCX:', error);
        res.status(500).send({ error: 'Failed to generate DOCX' });
    }
});

module.exports = router;
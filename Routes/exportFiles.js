const express = require('express');
const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, TextRun } = require('docx');
const router = express.Router();

router.post('/export/pdf', (req, res) => {
    const { sections } = req.body;  

    const doc = new PDFDocument();
    const filename = `exported-file-${Date.now()}.pdf`;

    try {
        res.setHeader('Content-disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-type', 'application/pdf');
        doc.pipe(res);

        sections.forEach((section) => {
            if (typeof section === 'object' && section.content) {
                doc.fontSize(14).text(section.content, {
                    align: 'left',
                    paragraphGap: 10,
                });
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
    const filename = `exported-file-${Date.now()}.docx`;

    const doc = new Document({
        sections: [
            {
                children: sections.map(section => {
                   
                    return new Paragraph({
                        children: [
                            new TextRun({
                                text: section.content,
                                size: 28 
                            }),
                        ],
                    });
                }),
            },
        ],
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

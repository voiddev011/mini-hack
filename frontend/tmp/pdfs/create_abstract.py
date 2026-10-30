from pathlib import Path
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
import pypdfium2 as pdfium

root = Path(__file__).resolve().parents[2]
output = root / 'output' / 'pdf' / 'TrustCarbon_Abstract_Group_39.pdf'
output.parent.mkdir(parents=True, exist_ok=True)

title = ParagraphStyle('Title', fontName='Times-Bold', fontSize=22, leading=27, alignment=TA_CENTER)
subtitle = ParagraphStyle('Subtitle', fontName='Times-Roman', fontSize=13, leading=19, alignment=TA_CENTER)
heading = ParagraphStyle('Heading', fontName='Times-Bold', fontSize=14, leading=20, alignment=TA_CENTER)
body = ParagraphStyle('Body', fontName='Times-Roman', fontSize=11.5, leading=16.5, alignment=TA_JUSTIFY, spaceAfter=11)
keywords = ParagraphStyle('Keywords', fontName='Times-Roman', fontSize=11, leading=16, spaceBefore=5)

paragraphs = [
    'TrustCarbon is a web-based carbon emissions analysis and corporate disclosure platform that connects global climate records, Indian state estimates and company sustainability disclosures in one interactive workspace. Built with React, Vite, Recharts and Supabase, it combines visual exploration with transparent calculations and evidence-linked reporting to support informed sustainability analysis.',
    'A distinctive feature is the <b>Carbon Time Machine</b>, which synchronizes year-by-year playback with an emissions chart, selected-year values, previous-observation changes, baseline comparisons, cumulative net change and historical country rankings. Our World in Data supplies country observations, while Climate TRACE provides Indian state, sector and named-facility estimates. Interactive maps and comparisons connect geographic patterns with sector-level insights, and statistical anomaly screening identifies unusual annual changes for further investigation.',
    'The platform also offers <b>evidence-linked BRSR analysis</b>. Text from Business Responsibility and Sustainability Report PDFs is extracted locally in the browser. Users review and confirm each metric alongside its PDF page, source and reporting column. The Company Monitor brings together Scope 1, Scope 2 and Scope 3 disclosures, reported totals and emissions intensity. This review workflow preserves the connection between a corporate value and its original document, while keeping uploaded PDFs local to the browser.',
    '<b>Configurable threshold alerts</b> evaluate confirmed metrics when company data or rules are loaded or updated. Triggered events retain the observed value, threshold, reporting period and supporting evidence, with private account-based history and duplicate-event protection. <b>Transparent TrustCarbon scoring</b> displays rubric inputs and weights, while corporate pressure scores normalize over available dimensions. User-defined reduction scenarios, benchmark comparisons and restoration-area planning extend the analytical workflow. Source-labelled corporate reports can be downloaded as HTML or printed to PDF.',
    'By bringing historical playback, geographic exploration, document-level evidence and personalized threshold tracking together, TrustCarbon provides a practical workspace for students, researchers and sustainability teams. Its distinguishing contribution is the integration of interactive emissions analysis with traceable corporate disclosures and clearly explained calculations.'
]

story = [Paragraph('TrustCarbon', title), Spacer(1, 5),
         Paragraph('Carbon Emissions Analysis and Corporate Disclosure Platform', subtitle),
         Spacer(1, 20), Paragraph('<b>Group Number: 39</b>', subtitle), Spacer(1, 7),
         Paragraph('Jainam Bhavsar &nbsp; | &nbsp; Adil Khan &nbsp; | &nbsp; Aditya Chavan', subtitle),
         Spacer(1, 26), Paragraph('ABSTRACT', heading), Spacer(1, 13)]
story.extend(Paragraph(text, body) for text in paragraphs)
story.append(Paragraph('<b>Keywords:</b> Carbon Time Machine, emissions analysis, BRSR, evidence-linked reporting, threshold alerts, sustainability.', keywords))

doc = SimpleDocTemplate(str(output), pagesize=A4, rightMargin=55, leftMargin=55,
                        topMargin=45, bottomMargin=45, title='TrustCarbon - Abstract - Group 39',
                        author='Jainam Bhavsar, Adil Khan, Aditya Chavan')
doc.build(story)
pdf = pdfium.PdfDocument(str(output))
assert len(pdf) == 1, 'Abstract should fit on one page'
image = pdf[0].render(scale=1.4).to_pil()
preview = root / 'tmp' / 'pdfs' / 'abstract_preview.png'
image.save(preview)
print(output)
print(preview)

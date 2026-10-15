import fitz
from pathlib import Path

pdf = fitz.open("Hindi_Level2_Picture_MCQ_questions-1.pdf")
output = Path("rendered-pages")
output.mkdir(exist_ok=True)

for page_number, page in enumerate(pdf):
    image = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    image.save(output / f"page-{page_number + 1}.png")

print("PDF pages exported successfully.")
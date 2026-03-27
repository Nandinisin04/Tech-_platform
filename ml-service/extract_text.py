import sys
import fitz  # PyMuPDF

pdf_path = sys.argv[1]

doc = fitz.open(pdf_path)
text = ""

for page in doc:
    text += page.get_text("text") + "\n"

# ✅ Force UTF-8 output to avoid Windows cp1252 crash
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

print(text)

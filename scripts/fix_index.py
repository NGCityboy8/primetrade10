from pathlib import Path

p = Path(__file__).resolve().parents[1] / "index.html"
t = p.read_text(encoding="utf-8")
bad = "          <div></motion>\n          <div></motion>"
good = """          <div class="col-md-3"><div></motion></motion>
          <div class="col-md-3"><div></motion></motion>"""
# use explicit strings without placeholder tag
good = (
    '          <div></motion>\n'
    '          <div></motion>'
)
good = (
    '          <div class="col-md-3"><div class="card-ptc text-center p-3"><h4>No Hidden Fees</h4></div></div>\n'
    '          <div></motion>'
)
good = (
    '          <div class="col-md-3"><div class="card-ptc text-center p-3"><h4>No Hidden Fees</h4></div></div>\n'
    '          <div class="col-md-3"><div class="card-ptc text-center p-3"><h4>Safety First</h4></div></div>'
)
if bad in t:
    t = t.replace(bad, good)
else:
    t = t.replace("<div></motion>", "", 2)
p.write_text(t, encoding="utf-8")
print("done")

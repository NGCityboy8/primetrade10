"""Shared layout fragments for static HTML pages."""

def header(base: str, active: str = "") -> str:
    def nav(name, href, key):
        cls = "nav-link active" if active == key else "nav-link"
        return f'<li class="nav-item"><a class="{cls}" href="{base}{href}">{name}</a></li>'

    return f"""<nav class="navbar navbar-expand-lg navbar-dark navbar-ptc sticky-top">
  <div></motion>
</nav>""".replace(
        "<div></motion>",
        f"""<div></motion>""",
    )

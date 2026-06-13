"""
components.py — Reusable Streamlit UI component helpers.
"""

import streamlit as st
import streamlit.components.v1 as stc
import html as html_lib


def render_output_card(label: str, result: str, error: str | None, output_id: str = "output") -> None:
    """
    Renders a glassmorphic output card with copy-to-clipboard button.
    Shows error styling if `error` is set.
    """
    if error:
        box_class = "output-box error-box"
        display_text = f"⚠ {error}"
    elif result:
        box_class = "output-box success"
        display_text = result
    else:
        box_class = "output-box"
        display_text = ""

    safe_text = html_lib.escape(display_text)
    raw_for_copy = result.replace("\\", "\\\\").replace("`", "\\`").replace("'", "\\'").replace('"', '\\"')

    html_block = f"""<div class="output-label">{html_lib.escape(label)}</div>
<div class="output-box {('success' if (result and not error) else ('error-box' if error else ''))}" id="ob_{output_id}" style="position:relative;">
<button class="copy-btn" onclick="copyText_{output_id}()" id="cbtn_{output_id}" title="Copy to clipboard">
📋 Copy
</button>
<span id="otxt_{output_id}">{safe_text}</span>
</div>
<script>
function copyText_{output_id}() {{
const txt = `{raw_for_copy}`;
if (!txt) return;
navigator.clipboard.writeText(txt).then(() => {{
const btn = document.getElementById('cbtn_{output_id}');
const orig = btn.innerHTML;
btn.innerHTML = '✅ Copied!';
btn.style.background = 'rgba(16,185,129,0.25)';
btn.style.color = '#34d399';
setTimeout(() => {{
btn.innerHTML = orig;
btn.style.background = '';
btn.style.color = '';
}}, 1800);
}});
}}
</script>"""
    st.markdown(html_block, unsafe_allow_html=True)


def render_identifier_results(results: list[dict]) -> None:
    """Render Auto-ID results as styled confidence badge rows."""
    if not results:
        st.markdown(
            '<p style="color:var(--text-muted);font-size:0.85rem;">Enter text and click Analyze to see results.</p>',
            unsafe_allow_html=True
        )
        return

    rows_html = '<div class="badge-container">'
    for r in results:
        conf = r["confidence"]
        scheme = html_lib.escape(r["scheme"])
        desc = html_lib.escape(r["description"])

        if conf >= 80:
            badge_class = "badge-high"
            bar_color = "#10b981"
        elif conf >= 60:
            badge_class = "badge-medium"
            bar_color = "#f59e0b"
        else:
            badge_class = "badge-low"
            bar_color = "#ef4444"

        rows_html += (
            f'<div class="badge-row">'
            f'<span class="badge-scheme">{scheme}</span>'
            f'<div class="conf-bar-wrap">'
            f'<div class="conf-bar" style="width:{conf}%;background:{bar_color};"></div>'
            f'</div>'
            f'<span class="badge-desc">{desc}</span>'
            f'<span class="badge-pct {badge_class}">{conf}%</span>'
            f'</div>'
        )
    rows_html += '</div>'
    st.markdown(rows_html, unsafe_allow_html=True)


def render_header() -> None:
    """Render the top application header."""
    st.markdown("""<div class="app-header">
<h1>🔐 Cipher & Encoding Toolkit</h1>
<p>Encode, decode, hash, and automatically identify ciphertext — all in one place.</p>
<div style="margin-top:1rem;display:flex;flex-wrap:wrap;gap:0.4rem;">
<span class="info-pill">⚡ Base16 / 32 / 48 / 64 / 85</span>
<span class="info-pill">🔒 ROT13 · Caesar · Vigenère</span>
<span class="info-pill">🧮 MD5 · SHA-1 · SHA-256</span>
<span class="info-pill">🔍 Auto-Identification</span>
</div>
</div>""", unsafe_allow_html=True)


def render_section_divider() -> None:
    st.markdown('<hr class="section-divider">', unsafe_allow_html=True)


def panel_title(icon: str, label: str) -> None:
    st.markdown(f'<div class="panel-title">{icon} {label}</div>', unsafe_allow_html=True)

"""
app.py — Main Streamlit entrypoint for the Cipher & Encoding Toolkit.

Layout: Dual-pane (Input | Output) with four mode tabs:
  1. Encoding / Decoding  (Base16/32/48/64/85)
  2. Classic Ciphers      (ROT13, Caesar, Vigenère)
  3. Hash Generator       (MD5, SHA-1, SHA-256)
  4. Auto-Identify        (heuristic cipher identification)
"""

import streamlit as st

# ── page config (must be first Streamlit call) ───────────────────────────────
st.set_page_config(
    page_title="Cipher & Encoding Toolkit",
    page_icon="🔐",
    layout="wide",
    initial_sidebar_state="collapsed",
    menu_items={"Get Help": None, "Report a bug": None, "About": None},
)

# ── local imports (all core modules live inside cypercheif/) ──────────────────
import sys
import os
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from cypercheif.ui.styles import DARK_THEME_CSS
from cypercheif.ui.components import (
    render_header,
    render_output_card,
    render_identifier_results,
    render_section_divider,
    panel_title,
)
from cypercheif.modules.encoders import (
    base16_encode, base16_decode,
    base32_encode, base32_decode,
    base48_encode, base48_decode,
    base64_encode, base64_decode,
    base85_encode, base85_decode,
)
from cypercheif.modules.ciphers import (
    rot13_encode, rot13_decode,
    caesar_encode, caesar_decode,
    vigenere_encode, vigenere_decode,
)
from cypercheif.modules.hashers import md5_hash, sha1_hash, sha256_hash
from cypercheif.modules.identifier import identify

# ── inject CSS ────────────────────────────────────────────────────────────────
st.markdown(DARK_THEME_CSS, unsafe_allow_html=True)

# ── App selection sidebar ─────────────────────────────────────────────────────
app_selection = st.sidebar.radio(
    "Select Application",
    options=["🕹️ Ultimate Multiplayer Gaming Hub", "🔐 Cipher & Encoding Toolkit"],
    index=0
)

if app_selection == "🕹️ Ultimate Multiplayer Gaming Hub":
    import streamlit.components.v1 as components
    import subprocess
    
    # Read the compiled single-file index.html
    html_path = os.path.join(os.path.dirname(__file__), "..", "games", "game", "frontend", "dist", "index.html")
    if os.path.exists(html_path):
        with open(html_path, "r", encoding="utf-8") as f:
            html_content = f.read()
        
        # Display the custom interactive gaming portal iframe
        components.html(html_content, height=880, scrolling=True)
    else:
        st.error("Gaming Hub HTML bundle not found. Run 'npm run build' inside games/game/frontend.")
        
    # Start Node.js backend server in background
    backend_dir = os.path.join(os.path.dirname(__file__), "..", "games", "game", "backend")
    lock_file = os.path.join(backend_dir, "server.lock")
    if not os.path.exists(lock_file):
        try:
            # Create lock file
            with open(lock_file, "w") as lf:
                lf.write("running")
            # Spawn Node.js background process
            log_file = open(os.path.join(backend_dir, "server.log"), "w")
            subprocess.Popen(["node", "server.js"], cwd=backend_dir, shell=True, stdout=log_file, stderr=log_file)
        except Exception as e:
            pass
            
    st.stop()

# ─────────────────────────────────────────────────────────────────────────────
# HEADER
# ─────────────────────────────────────────────────────────────────────────────
render_header()

# ─────────────────────────────────────────────────────────────────────────────
# DUAL-PANE LAYOUT
# ─────────────────────────────────────────────────────────────────────────────
left_col, right_col = st.columns([1, 1], gap="large")

# ══════════════════════════════════════════════
# LEFT PANEL — INPUT
# ══════════════════════════════════════════════
with left_col:
    st.markdown('<div class="panel-card">', unsafe_allow_html=True)
    panel_title("📥", "INPUT PANEL")

    # ── Mode selector ──────────────────────────
    mode = st.radio(
        "Select Mode",
        options=["Encoding / Decoding", "Classic Ciphers", "Hash Generator", "Auto-Identify"],
        key="mode_selector",
        label_visibility="collapsed",
    )

    render_section_divider()

    # ── Text input ─────────────────────────────
    input_text = st.text_area(
        "Input Text",
        placeholder="Paste or type your text here…",
        height=160,
        key="input_text",
        label_visibility="visible",
    )

    render_section_divider()

    # ════════════════════════════════════════════
    # MODE: ENCODING / DECODING
    # ════════════════════════════════════════════
    if mode == "Encoding / Decoding":
        st.markdown('<span class="output-label">Algorithm</span>', unsafe_allow_html=True)
        enc_algo = st.selectbox(
            "Encoding Algorithm",
            options=["Base16", "Base32", "Base48", "Base64", "Base64 (URL-safe)", "Base85"],
            key="enc_algo",
            label_visibility="collapsed",
        )

        enc_action = st.radio(
            "Action",
            options=["Encode", "Decode"],
            horizontal=True,
            key="enc_action",
        )

        process_enc = st.button("⚡ Process", key="btn_enc", use_container_width=True)

    # ════════════════════════════════════════════
    # MODE: CLASSIC CIPHERS
    # ════════════════════════════════════════════
    elif mode == "Classic Ciphers":
        st.markdown('<span class="output-label">Cipher</span>', unsafe_allow_html=True)
        cipher_algo = st.selectbox(
            "Cipher Algorithm",
            options=["ROT13", "Caesar Cipher", "Vigenère Cipher"],
            key="cipher_algo",
            label_visibility="collapsed",
        )

        cipher_action = st.radio(
            "Action",
            options=["Encode", "Decode"],
            horizontal=True,
            key="cipher_action",
        )

        if cipher_algo == "Caesar Cipher":
            caesar_shift = st.number_input(
                "Shift (0–25)",
                min_value=0,
                max_value=25,
                value=13,
                step=1,
                key="caesar_shift",
            )
        elif cipher_algo == "Vigenère Cipher":
            vigenere_key = st.text_input(
                "Cipher Key (letters only)",
                placeholder="e.g. SECRET",
                key="vigenere_key",
            )

        process_cipher = st.button("⚡ Process", key="btn_cipher", use_container_width=True)

    # ════════════════════════════════════════════
    # MODE: HASH GENERATOR
    # ════════════════════════════════════════════
    elif mode == "Hash Generator":
        st.markdown('<span class="output-label">Algorithm</span>', unsafe_allow_html=True)
        hash_algo = st.selectbox(
            "Hash Algorithm",
            options=["MD5", "SHA-1", "SHA-256", "All Three"],
            key="hash_algo",
            label_visibility="collapsed",
        )
        st.markdown(
            '<p style="font-size:0.78rem;color:var(--text-muted);margin:0.5rem 0 0 0;">'
            '⚠ Hashing is one-way — there is no decode operation.'
            '</p>',
            unsafe_allow_html=True,
        )
        process_hash = st.button("🧮 Generate Hash", key="btn_hash", use_container_width=True)

    # ════════════════════════════════════════════
    # MODE: AUTO-IDENTIFY
    # ════════════════════════════════════════════
    elif mode == "Auto-Identify":
        st.markdown(
            '<p style="font-size:0.85rem;color:var(--text-secondary);margin:0 0 1rem 0;">'
            'Paste any encoded or ciphered text above and the engine will analyze character sets, '
            'length patterns, and entropy to suggest the most likely encoding type.'
            '</p>',
            unsafe_allow_html=True,
        )
        process_id = st.button("🔍 Analyze", key="btn_id", use_container_width=True)

    st.markdown('</div>', unsafe_allow_html=True)

# ══════════════════════════════════════════════
# RIGHT PANEL — OUTPUT
# ══════════════════════════════════════════════
with right_col:
    st.markdown('<div class="panel-card">', unsafe_allow_html=True)
    panel_title("📤", "OUTPUT PANEL")

    # ═══════════════════════════════════════════
    # PROCESS: ENCODING / DECODING
    # ═══════════════════════════════════════════
    if mode == "Encoding / Decoding":
        if "btn_enc" in st.session_state and st.session_state.get("btn_enc"):
            txt = st.session_state.get("input_text", "").strip()
            algo = st.session_state.get("enc_algo")
            action = st.session_state.get("enc_action")

            if not txt:
                result, error = "", "Please enter some text in the Input Panel."
            else:
                url_safe = (algo == "Base64 (URL-safe)")
                dispatch = {
                    ("Base16",           "Encode"): lambda: base16_encode(txt),
                    ("Base16",           "Decode"): lambda: base16_decode(txt),
                    ("Base32",           "Encode"): lambda: base32_encode(txt),
                    ("Base32",           "Decode"): lambda: base32_decode(txt),
                    ("Base48",           "Encode"): lambda: base48_encode(txt),
                    ("Base48",           "Decode"): lambda: base48_decode(txt),
                    ("Base64",           "Encode"): lambda: base64_encode(txt, url_safe=False),
                    ("Base64",           "Decode"): lambda: base64_decode(txt, url_safe=False),
                    ("Base64 (URL-safe)","Encode"): lambda: base64_encode(txt, url_safe=True),
                    ("Base64 (URL-safe)","Decode"): lambda: base64_decode(txt, url_safe=True),
                    ("Base85",           "Encode"): lambda: base85_encode(txt),
                    ("Base85",           "Decode"): lambda: base85_decode(txt),
                }
                key = (algo, action)
                if key in dispatch:
                    result, error = dispatch[key]()
                else:
                    result, error = "", f"Unknown combination: {algo} / {action}"

            render_output_card(
                label=f"{algo} {action} Result",
                result=result,
                error=error,
                output_id="enc_out",
            )
        else:
            render_output_card(
                label="Result",
                result="",
                error=None,
                output_id="enc_placeholder",
            )
            st.markdown(
                '<p style="color:var(--text-muted);font-size:0.85rem;margin-top:0.8rem;">'
                'Configure options on the left and click ⚡ Process to see the result here.'
                '</p>',
                unsafe_allow_html=True,
            )

    # ═══════════════════════════════════════════
    # PROCESS: CLASSIC CIPHERS
    # ═══════════════════════════════════════════
    elif mode == "Classic Ciphers":
        if "btn_cipher" in st.session_state and st.session_state.get("btn_cipher"):
            txt    = st.session_state.get("input_text", "").strip()
            algo   = st.session_state.get("cipher_algo")
            action = st.session_state.get("cipher_action")

            if not txt:
                result, error = "", "Please enter some text in the Input Panel."
            elif algo == "ROT13":
                fn = rot13_encode if action == "Encode" else rot13_decode
                result, error = fn(txt)
            elif algo == "Caesar Cipher":
                shift = int(st.session_state.get("caesar_shift", 13))
                fn = caesar_encode if action == "Encode" else caesar_decode
                result, error = fn(txt, shift)
            elif algo == "Vigenère Cipher":
                key_v = st.session_state.get("vigenere_key", "").strip()
                fn = vigenere_encode if action == "Encode" else vigenere_decode
                result, error = fn(txt, key_v)
            else:
                result, error = "", "Unknown cipher."

            render_output_card(
                label=f"{algo} {action} Result",
                result=result,
                error=error,
                output_id="cipher_out",
            )
        else:
            render_output_card("Result", "", None, "cipher_placeholder")
            st.markdown(
                '<p style="color:var(--text-muted);font-size:0.85rem;margin-top:0.8rem;">'
                'Choose a cipher and click ⚡ Process.'
                '</p>',
                unsafe_allow_html=True,
            )

    # ═══════════════════════════════════════════
    # PROCESS: HASH GENERATOR
    # ═══════════════════════════════════════════
    elif mode == "Hash Generator":
        if "btn_hash" in st.session_state and st.session_state.get("btn_hash"):
            txt  = st.session_state.get("input_text", "").strip()
            algo = st.session_state.get("hash_algo")

            if not txt:
                render_output_card("Hash Result", "", "Please enter some text in the Input Panel.", "hash_out")
            elif algo == "All Three":
                for name, fn, oid in [
                    ("MD5",    md5_hash,    "hash_md5"),
                    ("SHA-1",  sha1_hash,   "hash_sha1"),
                    ("SHA-256",sha256_hash, "hash_sha256"),
                ]:
                    r, e = fn(txt)
                    render_output_card(f"{name} Digest", r, e, oid)
                    st.markdown("<div style='height:0.6rem'></div>", unsafe_allow_html=True)
            else:
                fn_map = {"MD5": md5_hash, "SHA-1": sha1_hash, "SHA-256": sha256_hash}
                r, e = fn_map[algo](txt)
                render_output_card(f"{algo} Digest", r, e, "hash_single")
        else:
            render_output_card("Hash Result", "", None, "hash_placeholder")
            st.markdown(
                '<p style="color:var(--text-muted);font-size:0.85rem;margin-top:0.8rem;">'
                'Enter text and click 🧮 Generate Hash.'
                '</p>',
                unsafe_allow_html=True,
            )

    # ═══════════════════════════════════════════
    # PROCESS: AUTO-IDENTIFY
    # ═══════════════════════════════════════════
    elif mode == "Auto-Identify":
        if "btn_id" in st.session_state and st.session_state.get("btn_id"):
            txt = st.session_state.get("input_text", "").strip()
            if not txt:
                st.markdown(
                    '<p style="color:var(--text-muted);">Please enter text to analyze.</p>',
                    unsafe_allow_html=True,
                )
            else:
                results = identify(txt)
                st.markdown(
                    '<p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:0.8rem;">'
                    f'🔍 {len(results)} possible match(es) found for <strong>{len(txt)}</strong> characters of input.</p>',
                    unsafe_allow_html=True,
                )
                render_identifier_results(results)
        else:
            render_identifier_results([])

    st.markdown('</div>', unsafe_allow_html=True)

# ─────────────────────────────────────────────────────────────────────────────
# FOOTER
# ─────────────────────────────────────────────────────────────────────────────
st.markdown("""
<div style="text-align:center;margin-top:2.5rem;padding:1rem 0;
            border-top:1px solid rgba(255,255,255,0.06);">
    <p style="color:var(--text-muted);font-size:0.78rem;margin:0;">
        🔐 Cipher &amp; Encoding Toolkit &nbsp;·&nbsp;
        Built with Streamlit &nbsp;·&nbsp;
        Base16 · Base32 · Base48 · Base64 · Base85 · ROT13 · Caesar · Vigenère · MD5 · SHA-1 · SHA-256
    </p>
</div>
""", unsafe_allow_html=True)

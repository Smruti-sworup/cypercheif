"""
styles.py — Dark glassmorphism CSS theme injected into Streamlit.
"""

DARK_THEME_CSS = """
<style>
/* ── Google Font ── */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

/* ── Root Variables ── */
:root {
    --bg-primary:    #0d0f1a;
    --bg-secondary:  #12162b;
    --bg-card:       rgba(255,255,255,0.04);
    --border:        rgba(255,255,255,0.08);
    --border-glow:   rgba(99,102,241,0.4);
    --accent-1:      #6366f1;
    --accent-2:      #8b5cf6;
    --accent-3:      #06b6d4;
    --text-primary:  #f1f5f9;
    --text-secondary:#94a3b8;
    --text-muted:    #475569;
    --success:       #10b981;
    --warning:       #f59e0b;
    --error:         #ef4444;
    --font-main:     'Inter', sans-serif;
    --font-mono:     'JetBrains Mono', monospace;
}

/* ── Global Reset ── */
html, body, [data-testid="stAppViewContainer"] {
    background: var(--bg-primary) !important;
    font-family: var(--font-main) !important;
    color: var(--text-primary) !important;
}

[data-testid="stSidebar"] { display: none !important; }

/* ── Hide Streamlit chrome ── */
#MainMenu, footer, header { visibility: hidden !important; }
[data-testid="stToolbar"] { display: none !important; }

/* ── Main container ── */
.main .block-container {
    padding: 1.5rem 2rem 3rem !important;
    max-width: 1400px !important;
}

/* ── App Header ── */
.app-header {
    background: linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 50%, rgba(6,182,212,0.08) 100%);
    border: 1px solid var(--border-glow);
    border-radius: 20px;
    padding: 2rem 2.5rem;
    margin-bottom: 2rem;
    backdrop-filter: blur(20px);
    position: relative;
    overflow: hidden;
}
.app-header::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle at 30% 50%, rgba(99,102,241,0.08) 0%, transparent 60%);
    pointer-events: none;
}
.app-header h1 {
    font-size: 2.2rem;
    font-weight: 700;
    background: linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0 0 0.4rem 0;
    letter-spacing: -0.5px;
}
.app-header p {
    color: var(--text-secondary);
    font-size: 0.95rem;
    margin: 0;
}

/* ── Panel cards ── */
.panel-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 1.5rem;
    backdrop-filter: blur(12px);
    height: 100%;
    transition: border-color 0.3s ease;
}
.panel-card:hover {
    border-color: rgba(99,102,241,0.25);
}
.panel-title {
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--accent-1);
    margin-bottom: 1.2rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

/* ── Streamlit widgets override ── */
.stSelectbox > div > div,
.stTextArea > div > div > textarea,
.stTextInput > div > div > input,
.stNumberInput > div > div > input {
    background: rgba(255,255,255,0.04) !important;
    border: 1px solid var(--border) !important;
    border-radius: 10px !important;
    color: var(--text-primary) !important;
    font-family: var(--font-main) !important;
    transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
}
.stSelectbox > div > div:hover,
.stTextArea > div > div > textarea:focus,
.stTextInput > div > div > input:focus {
    border-color: var(--accent-1) !important;
    box-shadow: 0 0 0 3px rgba(99,102,241,0.15) !important;
}

.stSelectbox label, .stTextArea label, .stTextInput label,
.stNumberInput label, .stRadio label {
    color: var(--text-secondary) !important;
    font-size: 0.85rem !important;
    font-weight: 500 !important;
}

/* ── Radio buttons ── */
[data-testid="stRadio"] > div {
    gap: 0.75rem !important;
    flex-direction: column;
}
[data-testid="stRadio"] > div > label {
    background: rgba(255,255,255,0.03) !important;
    border: 1px solid var(--border) !important;
    border-radius: 10px !important;
    padding: 0.6rem 1rem !important;
    transition: all 0.2s ease !important;
    cursor: pointer !important;
}
[data-testid="stRadio"] > div > label:hover {
    border-color: var(--accent-1) !important;
    background: rgba(99,102,241,0.08) !important;
}

/* ── Buttons ── */
.stButton > button {
    background: linear-gradient(135deg, var(--accent-1), var(--accent-2)) !important;
    color: white !important;
    border: none !important;
    border-radius: 10px !important;
    padding: 0.6rem 1.8rem !important;
    font-weight: 600 !important;
    font-family: var(--font-main) !important;
    font-size: 0.9rem !important;
    letter-spacing: 0.03em !important;
    transition: opacity 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease !important;
    width: 100% !important;
    box-shadow: 0 4px 15px rgba(99,102,241,0.3) !important;
}
.stButton > button:hover {
    opacity: 0.9 !important;
    transform: translateY(-1px) !important;
    box-shadow: 0 6px 20px rgba(99,102,241,0.45) !important;
}
.stButton > button:active {
    transform: translateY(0) !important;
}

/* ── Output result box ── */
.output-box {
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 1.2rem;
    font-family: var(--font-mono);
    font-size: 0.875rem;
    color: var(--text-primary);
    word-break: break-all;
    white-space: pre-wrap;
    min-height: 100px;
    position: relative;
    line-height: 1.6;
}
.output-box.success {
    border-color: rgba(16,185,129,0.3);
    background: rgba(16,185,129,0.04);
}
.output-box.error-box {
    border-color: rgba(239,68,68,0.3);
    background: rgba(239,68,68,0.04);
    color: #fca5a5;
}
.output-label {
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 0.5rem;
}

/* ── Copy button ── */
.copy-btn {
    position: absolute;
    top: 0.6rem;
    right: 0.6rem;
    background: rgba(99,102,241,0.2);
    border: 1px solid rgba(99,102,241,0.3);
    border-radius: 6px;
    color: var(--accent-1);
    font-size: 0.72rem;
    font-weight: 600;
    padding: 0.25rem 0.6rem;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: var(--font-main);
}
.copy-btn:hover {
    background: rgba(99,102,241,0.35);
    color: white;
}

/* ── Identifier confidence badges ── */
.badge-container { display: flex; flex-direction: column; gap: 0.6rem; margin-top: 0.5rem; }
.badge-row {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 0.7rem 1rem;
    transition: border-color 0.2s ease;
}
.badge-row:hover { border-color: rgba(99,102,241,0.3); }
.badge-scheme {
    flex: 1;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-primary);
}
.badge-desc {
    flex: 2;
    font-size: 0.78rem;
    color: var(--text-secondary);
}
.badge-pct {
    font-size: 0.8rem;
    font-weight: 700;
    padding: 0.2rem 0.6rem;
    border-radius: 20px;
    min-width: 48px;
    text-align: center;
}
.badge-high   { background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.3); }
.badge-medium { background: rgba(245,158,11,0.15); color: #fbbf24; border: 1px solid rgba(245,158,11,0.3); }
.badge-low    { background: rgba(239,68,68,0.12);  color: #f87171; border: 1px solid rgba(239,68,68,0.3); }

/* ── Progress bar ── */
.conf-bar-wrap { flex: 1.5; height: 5px; background: rgba(255,255,255,0.08); border-radius: 99px; overflow: hidden; }
.conf-bar      { height: 100%; border-radius: 99px; transition: width 0.5s ease; }

/* ── Divider ── */
.section-divider {
    border: none;
    border-top: 1px solid var(--border);
    margin: 1.2rem 0;
}

/* ── Info pills ── */
.info-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    background: rgba(99,102,241,0.12);
    border: 1px solid rgba(99,102,241,0.25);
    border-radius: 20px;
    padding: 0.25rem 0.75rem;
    font-size: 0.75rem;
    color: var(--accent-1);
    font-weight: 500;
    margin: 0.2rem 0.2rem 0.2rem 0;
}

/* ── Scrollbar ── */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.5); }
</style>
"""

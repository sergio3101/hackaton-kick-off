"""Рендер PDF-отчёта по интервью через WeasyPrint.

Шаблон выдержан в фирменном стиле Kick-off Prep: моно-шапка,
зеленый accent, нейтральная палитра. Секции «Голосовые вопросы»
и «Лайв-кодинг» отрисовываются только при наличии данных, чтобы
в PDF не возникали пустые страницы и заголовки без содержимого.
"""

from __future__ import annotations

from html import escape
from typing import Iterable

from weasyprint import HTML

from app.models import InterviewSession, QuestionType, SessionQuestion, Verdict


VERDICT_LABEL = {
    Verdict.correct: "Верно",
    Verdict.partial: "Частично",
    Verdict.incorrect: "Неверно",
    Verdict.skipped: "Пропущено",
}

VERDICT_CLASS = {
    Verdict.correct: "verdict verdict-correct",
    Verdict.partial: "verdict verdict-partial",
    Verdict.incorrect: "verdict verdict-incorrect",
    Verdict.skipped: "verdict verdict-skipped",
}

# Финальный вердикт LLM по итогам сессии (см. SUMMARY_JSON_SCHEMA).
FINAL_VERDICT_LABEL = {
    "ready": "Готов",
    "almost": "Почти готов",
    "needs_practice": "Нужна практика",
    "not_ready": "Не готов",
}
FINAL_VERDICT_CLASS = {
    "ready": "verdict-correct",
    "almost": "verdict-correct",
    "needs_practice": "verdict-partial",
    "not_ready": "verdict-incorrect",
}


def _verdict_badge(v: Verdict | None) -> str:
    if v is None:
        return ""
    label = VERDICT_LABEL.get(v, v.value)
    cls = VERDICT_CLASS.get(v, "verdict verdict-skipped")
    return f'<span class="{cls}">{escape(label)}</span>'


def _block(label: str, content: str, *, kind: str = "neutral") -> str:
    if not content:
        return ""
    return (
        f'<div class="block block-{kind}">'
        f'<div class="block-label">{escape(label)}</div>'
        f'<div class="block-body">{escape(content)}</div>'
        f"</div>"
    )


def _code_block(content: str) -> str:
    if not content:
        return ""
    return f'<pre class="code">{escape(content)}</pre>'


def _items_html(
    items: Iterable[SessionQuestion],
    *,
    kind: QuestionType,
    show_paste_signal: bool = True,
) -> str:
    blocks: list[str] = []
    for it in items:
        if it.type != kind:
            continue
        topic = escape(it.topic or "")
        prompt = escape(it.prompt_text or "")
        verdict_html = _verdict_badge(it.verdict)
        if kind == QuestionType.voice:
            answer = _block("Ответ кандидата", it.answer_text or "(пусто)")
        else:
            answer = _code_block(it.answer_text)
        rationale = _block("Обоснование", it.rationale or "")
        explanation = _block("Что упущено", it.explanation or "", kind="warn")
        paste_block = ""
        if show_paste_signal and kind == QuestionType.coding and (it.paste_chars or 0) > 0:
            code_len = len(it.answer_text or "")
            ratio = (it.paste_chars / code_len) if code_len else 0
            heavy = ratio >= 0.7
            paste_block = (
                f'<div class="block block-{"warn" if not heavy else "bad"}">'
                f'<div class="block-label">Использование буфера обмена</div>'
                f"<div>Вставлено {it.paste_chars} симв из {code_len} "
                f"(~{int(ratio * 100)}%).{ ' Большая часть решения скопирована.' if heavy else ''}</div>"
                f"</div>"
            )
        if kind == QuestionType.coding:
            expected = _code_block(it.expected_answer) if it.expected_answer else ""
            expected_block = (
                f'<div class="block block-good"><div class="block-label">'
                f"Эталонное решение</div>{expected}</div>"
                if expected
                else ""
            )
        else:
            expected_block = _block("Эталонный ответ", it.expected_answer or "", kind="good")
        blocks.append(
            f'<div class="card">'
            f'<div class="card-head">'
            f'<div class="topic">{topic}</div>{verdict_html}</div>'
            f'<div class="prompt">{prompt}</div>'
            f"{answer}{rationale}{explanation}{paste_block}{expected_block}"
            f"</div>"
        )
    return "\n".join(blocks)


# Палитра приведена к sRGB-эквивалентам oklch-токенов проекта (Kick-off Prep v3).
# WeasyPrint в принципе принимает oklch(), но sRGB надёжнее для разных читалок.
CSS = """
@page {
    size: A4;
    margin: 16mm 14mm 18mm;
    @bottom-left  { content: "Kick-off Prep · Interview Report"; font: 8pt 'DejaVu Sans Mono'; color: #94a3b8; }
    @bottom-right { content: "Стр. " counter(page) " / " counter(pages); font: 8pt 'DejaVu Sans Mono'; color: #94a3b8; }
}
* { box-sizing: border-box; }
body {
    font-family: 'DejaVu Sans', sans-serif;
    color: #0f172a;
    line-height: 1.5;
    font-size: 10.5pt;
    margin: 0;
}
h1 {
    font-size: 22pt;
    font-weight: 600;
    margin: 0 0 2mm;
    letter-spacing: -0.01em;
}
h2 {
    font-size: 12pt;
    font-weight: 600;
    margin: 7mm 0 3mm;
    color: #0f172a;
    padding-bottom: 2mm;
    border-bottom: 1px solid #e2e8f0;
    page-break-after: avoid;
}
.muted { color: #64748b; font-size: 9pt; }
.mono  { font-family: 'DejaVu Sans Mono', monospace; }

/* ── Header ────────────────────────────────────────────────────── */
.header {
    border-top: 2pt solid #0f172a;
    padding-top: 4mm;
    margin-bottom: 5mm;
}
.header-eyebrow {
    font-family: 'DejaVu Sans Mono', monospace;
    font-size: 8.5pt;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #2A6F4D;
    margin-bottom: 2mm;
}
.header-meta {
    margin-top: 3mm;
    display: flex;
    flex-direction: column;
    gap: 1.2mm;
    font-size: 9.5pt;
    color: #475569;
}
.header-meta .label {
    color: #94a3b8;
    font-family: 'DejaVu Sans Mono', monospace;
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-right: 1.5mm;
}
.project {
    font-size: 12.5pt;
    font-weight: 500;
    color: #0f172a;
    margin-top: 1mm;
}
.candidate {
    font-size: 11pt;
    color: #475569;
    margin-top: 0.5mm;
}
.candidate::before {
    content: "Кандидат · ";
    font-family: 'DejaVu Sans Mono', monospace;
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #94a3b8;
}

/* ── Summary block ────────────────────────────────────────────── */
.summary {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 3mm;
    padding: 4mm 4mm 4mm;
    margin-bottom: 5mm;
    page-break-inside: avoid;
}
.stats {
    display: flex;
    gap: 3mm;
    margin-bottom: 3mm;
}
.stat {
    flex: 1;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 2mm;
    padding: 3mm 2mm;
    text-align: center;
}
.stat-value {
    font-size: 18pt;
    font-weight: 600;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
}
.stat-label {
    font-size: 8pt;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-top: 1.5mm;
}
.stat-correct   { color: #2A6F4D; }
.stat-partial   { color: #b45309; }
.stat-incorrect { color: #b91c1c; }
.stat-skipped   { color: #64748b; }
.overall {
    background: white;
    border-left: 3pt solid #2A6F4D;
    padding: 3mm 4mm;
    border-radius: 1mm;
    white-space: pre-wrap;
    font-size: 10.5pt;
    color: #0f172a;
    line-height: 1.55;
}

/* ── Q&A cards ────────────────────────────────────────────────── */
/* Никаких page-break-inside: avoid — иначе длинные карточки оставляют
   пустые страницы (заголовок секции на одной, карточка на следующей).
   widows/orphans удерживают минимум 3 строки вместе при разрыве. */
.card {
    border: 1px solid #e2e8f0;
    border-radius: 3mm;
    padding: 4mm;
    margin-bottom: 3.5mm;
    orphans: 3;
    widows: 3;
}
.card-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 3mm;
    margin-bottom: 2mm;
}
.topic {
    font-family: 'DejaVu Sans Mono', monospace;
    font-size: 8.5pt;
    text-transform: uppercase;
    color: #2A6F4D;
    letter-spacing: 0.08em;
    flex: 1;
}
.verdict {
    font-size: 8.5pt;
    padding: 1mm 2.5mm;
    border-radius: 2mm;
    font-weight: 500;
    white-space: nowrap;
}
.verdict-correct   { background: #ecfdf5; color: #2A6F4D; }
.verdict-partial   { background: #fef3c7; color: #b45309; }
.verdict-incorrect { background: #fee2e2; color: #b91c1c; }
.verdict-skipped   { background: #f1f5f9; color: #475569; }

.prompt { font-weight: 500; margin-bottom: 3mm; font-size: 11pt; }

.block {
    margin-top: 3mm;
    padding: 3mm;
    border-radius: 2mm;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
}
.block-warn { background: #fffbeb; border-color: #fcd34d; }
.block-good { background: #ecfdf5; border-color: #6ee7b7; }
.block-bad  { background: #fef2f2; border-color: #fca5a5; }
.block-label {
    font-family: 'DejaVu Sans Mono', monospace;
    font-size: 8pt;
    text-transform: uppercase;
    color: #64748b;
    letter-spacing: 0.06em;
    margin-bottom: 1.5mm;
}
.block-body { white-space: pre-wrap; }

.code {
    font-family: 'DejaVu Sans Mono', monospace;
    background: #0f172a;
    color: #f1f5f9;
    padding: 3mm;
    border-radius: 2mm;
    font-size: 8.5pt;
    white-space: pre-wrap;
    word-break: break-word;
    margin: 3mm 0 0;
    line-height: 1.45;
}

/* ── Final verdict ────────────────────────────────────────────── */
.final {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 2mm;
    padding: 3mm 4mm;
    margin-bottom: 3mm;
}
.final-row {
    display: flex;
    align-items: center;
    gap: 3mm;
    margin-bottom: 2mm;
}
.final-label {
    font-family: 'DejaVu Sans Mono', monospace;
    font-size: 8pt;
    text-transform: uppercase;
    color: #64748b;
    letter-spacing: 0.06em;
}
.final-badge {
    font-size: 11pt;
    padding: 1.5mm 3mm;
    border-radius: 2mm;
    font-weight: 600;
}
.final-recommendation {
    background: #f8fafc;
    border-left: 3pt solid #2A6F4D;
    padding: 2.5mm 3mm;
    border-radius: 1mm;
    white-space: pre-wrap;
    font-size: 10pt;
    color: #0f172a;
}
"""


def render_session_pdf(
    sess: InterviewSession,
    *,
    show_paste_signal: bool = True,
) -> bytes:
    summary = sess.summary
    correct = summary.correct if summary else 0
    partial = summary.partial if summary else 0
    incorrect = summary.incorrect if summary else 0
    skipped = summary.skipped if summary else 0
    overall = (summary.overall if summary else "") or ""
    final_verdict = (summary.final_verdict if summary else "") or ""
    final_recommendation = (summary.final_recommendation if summary else "") or ""

    requirements_title = sess.requirements.title if sess.requirements else ""
    started = sess.started_at.strftime("%d.%m.%Y %H:%M") if sess.started_at else "—"
    finished = sess.finished_at.strftime("%d.%m.%Y %H:%M") if sess.finished_at else "—"

    # ФИО приоритетнее email; если ни того ни другого — пусто (тогда блок не рисуем).
    candidate_name = ""
    if sess.user is not None:
        candidate_name = (sess.user.full_name or "").strip() or sess.user.email or ""

    voice_items = [it for it in sess.items if it.type == QuestionType.voice]
    coding_items = [it for it in sess.items if it.type == QuestionType.coding]

    voice_html = _items_html(voice_items, kind=QuestionType.voice, show_paste_signal=show_paste_signal)
    coding_html = _items_html(coding_items, kind=QuestionType.coding, show_paste_signal=show_paste_signal)

    topics_str = ", ".join(sess.selected_topics or []) or "—"
    project_html = (
        f'<div class="project">{escape(requirements_title)}</div>'
        if requirements_title
        else ""
    )
    candidate_html = (
        f'<div class="candidate">{escape(candidate_name)}</div>'
        if candidate_name
        else ""
    )

    voice_section = (
        f"<h2>Голосовые вопросы · {len(voice_items)}</h2>{voice_html}"
        if voice_html
        else ""
    )
    coding_section = (
        f"<h2>Лайв-кодинг · {len(coding_items)}</h2>{coding_html}"
        if coding_html
        else ""
    )

    summary_block = ""
    if summary or overall or final_verdict:
        overall_html = (
            f'<div class="overall">{escape(overall)}</div>' if overall else ""
        )
        final_block = ""
        if final_verdict and final_verdict in FINAL_VERDICT_LABEL:
            badge_cls = FINAL_VERDICT_CLASS.get(final_verdict, "verdict-skipped")
            badge_label = FINAL_VERDICT_LABEL[final_verdict]
            recommendation_html = (
                f'<div class="final-recommendation">{escape(final_recommendation)}</div>'
                if final_recommendation
                else ""
            )
            final_block = f"""
<div class="final">
    <div class="final-row">
        <span class="final-label">Конечная оценка</span>
        <span class="final-badge {badge_cls}">{escape(badge_label)}</span>
    </div>
    {recommendation_html}
</div>
"""
        summary_block = f"""
<div class="summary">
    {final_block}
    <div class="stats">
        <div class="stat"><div class="stat-value stat-correct">{correct}</div><div class="stat-label">Верно</div></div>
        <div class="stat"><div class="stat-value stat-partial">{partial}</div><div class="stat-label">Частично</div></div>
        <div class="stat"><div class="stat-value stat-incorrect">{incorrect}</div><div class="stat-label">Неверно</div></div>
        <div class="stat"><div class="stat-value stat-skipped">{skipped}</div><div class="stat-label">Пропущено</div></div>
    </div>
    {overall_html}
</div>
"""

    body = f"""<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><title>Отчёт по интервью #{sess.id}</title>
<style>{CSS}</style></head>
<body>
<div class="header">
    <div class="header-eyebrow">Kick-off Prep · Interview Report · #{sess.id}</div>
    <h1>Отчёт #{sess.id} · {escape(sess.selected_level.value)}</h1>
    {project_html}
    {candidate_html}
    <div class="header-meta">
        <div><span class="label">Темы</span> {escape(topics_str)}</div>
        <div><span class="label">Старт</span> {started}</div>
        <div><span class="label">Завершение</span> {finished}</div>
    </div>
</div>

{summary_block}

{voice_section}

{coding_section}

</body></html>"""

    return HTML(string=body).write_pdf()

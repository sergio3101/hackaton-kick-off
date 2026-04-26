"""Рендер PDF-отчёта по интервью через WeasyPrint."""

from __future__ import annotations

from datetime import datetime
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

# Класс для каждого вердикта — соответствующие правила в CSS ниже.
VERDICT_CLASS = {
    Verdict.correct: "verdict verdict-correct",
    Verdict.partial: "verdict verdict-partial",
    Verdict.incorrect: "verdict verdict-incorrect",
    Verdict.skipped: "verdict verdict-skipped",
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
    items: Iterable[SessionQuestion], *, kind: QuestionType, show_paste_signal: bool = True
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


CSS = """
@page { size: A4; margin: 18mm 16mm; }
* { box-sizing: border-box; }
body {
    font-family: 'DejaVu Sans', sans-serif;
    color: #0f172a;
    line-height: 1.45;
    font-size: 11pt;
}
h1 { font-size: 18pt; margin: 0 0 4mm; }
h2 { font-size: 13pt; margin: 6mm 0 3mm; border-bottom: 1px solid #e2e8f0; padding-bottom: 2mm; }
.muted { color: #64748b; font-size: 9pt; }
.summary { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4mm; padding: 4mm; margin-bottom: 5mm; }
.stats { display: flex; gap: 4mm; margin: 3mm 0; }
.stat { flex: 1; background: white; border: 1px solid #e2e8f0; border-radius: 3mm; padding: 3mm; text-align: center; }
.stat-value { font-size: 16pt; font-weight: 600; }
.stat-label { font-size: 9pt; color: #64748b; }
.card { border: 1px solid #e2e8f0; border-radius: 3mm; padding: 4mm; margin-bottom: 4mm; page-break-inside: avoid; }
.card-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2mm; }
.topic { font-size: 9pt; text-transform: uppercase; color: #64748b; letter-spacing: 0.5pt; }
.verdict { font-size: 9pt; padding: 1mm 2mm; border-radius: 2mm; font-weight: 500; }
.verdict-correct { background: #ecfdf5; color: #047857; }
.verdict-partial { background: #fef3c7; color: #b45309; }
.verdict-incorrect { background: #fee2e2; color: #b91c1c; }
.verdict-skipped { background: #f1f5f9; color: #475569; }
.stat-correct { color: #047857; }
.stat-partial { color: #b45309; }
.stat-incorrect { color: #b91c1c; }
.stat-skipped { color: #475569; }
.prompt { font-weight: 500; margin-bottom: 3mm; }
.block { margin-top: 3mm; padding: 3mm; border-radius: 2mm; border: 1px solid #e2e8f0; background: #f8fafc; }
.block-warn { background: #fffbeb; border-color: #fcd34d; }
.block-good { background: #ecfdf5; border-color: #6ee7b7; }
.block-bad { background: #fef2f2; border-color: #fca5a5; }
.block-label { font-size: 9pt; color: #64748b; margin-bottom: 1mm; }
.block-body { white-space: pre-wrap; }
.code { font-family: 'DejaVu Sans Mono', monospace; background: #0f172a; color: #f1f5f9; padding: 3mm; border-radius: 2mm; font-size: 9pt; white-space: pre-wrap; word-break: break-word; margin: 3mm 0 0; }
.footer { margin-top: 8mm; font-size: 9pt; color: #94a3b8; text-align: center; }
"""


def render_session_pdf(
    sess: InterviewSession,
    *,
    total_cost_usd: float = 0.0,
    show_paste_signal: bool = True,
) -> bytes:
    summary = sess.summary
    correct = summary.correct if summary else 0
    partial = summary.partial if summary else 0
    incorrect = summary.incorrect if summary else 0
    skipped = summary.skipped if summary else 0
    overall = (summary.overall if summary else "") or ""

    requirements_title = sess.requirements.title if sess.requirements else ""
    started = sess.started_at.strftime("%Y-%m-%d %H:%M") if sess.started_at else "—"
    finished = sess.finished_at.strftime("%Y-%m-%d %H:%M") if sess.finished_at else "—"

    voice_html = _items_html(sess.items, kind=QuestionType.voice, show_paste_signal=show_paste_signal)
    coding_html = _items_html(sess.items, kind=QuestionType.coding, show_paste_signal=show_paste_signal)

    cost_line = (
        f"<span>Стоимость OpenAI: ${total_cost_usd:.4f}</span>"
        if total_cost_usd > 0
        else ""
    )

    body = f"""<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><title>Отчёт по интервью</title>
<style>{CSS}</style></head>
<body>
<h1>Отчёт по интервью</h1>
<div class="muted">
    Проект: {escape(requirements_title)} • Уровень: {escape(sess.selected_level.value)} •
    Темы: {escape(", ".join(sess.selected_topics or []))}
</div>
<div class="muted">Старт: {started} • Завершение: {finished} {cost_line}</div>

<div class="summary">
    <div class="stats">
        <div class="stat"><div class="stat-value stat-correct">{correct}</div><div class="stat-label">Верно</div></div>
        <div class="stat"><div class="stat-value stat-partial">{partial}</div><div class="stat-label">Частично</div></div>
        <div class="stat"><div class="stat-value stat-incorrect">{incorrect}</div><div class="stat-label">Неверно</div></div>
        <div class="stat"><div class="stat-value stat-skipped">{skipped}</div><div class="stat-label">Пропущено</div></div>
    </div>
    {f'<div class="block-body">{escape(overall)}</div>' if overall else ''}
</div>

<h2>Голосовые вопросы</h2>
{voice_html or '<div class="muted">Нет данных</div>'}

<h2>Лайв-кодинг</h2>
{coding_html or '<div class="muted">Нет данных</div>'}

<div class="footer">Сгенерировано {datetime.now().strftime("%Y-%m-%d %H:%M")}</div>
</body></html>"""

    return HTML(string=body).write_pdf()

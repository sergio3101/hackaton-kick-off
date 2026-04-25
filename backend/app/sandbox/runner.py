"""Простой sandbox-runner для лайв-кодинг задач (Python).

ВНИМАНИЕ: запускает произвольный код пользователя в backend-контейнере через subprocess
с timeout, memory-limit (через resource.setrlimit на Linux) и size-limit. Подходит для
тренажёра в доверенной среде (личный аккаунт), но НЕ для multi-tenant production. Для
production-варианта замените на изолированный runner (Docker-в-Docker, Judge0, gVisor,
Firecracker).
"""

from __future__ import annotations

import logging
import subprocess
import sys
import time
from dataclasses import dataclass

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT_SEC = 5
MAX_OUTPUT_BYTES = 16 * 1024  # 16 KB на каждый из stdout/stderr — обрезаем сверху
MAX_ADDRESS_SPACE_BYTES = 256 * 1024 * 1024  # 256 MB виртуальной памяти на subprocess
MAX_CPU_SECONDS = 6  # на сек больше DEFAULT_TIMEOUT_SEC, как защита от бесконечных циклов


def _apply_rlimits() -> None:
    """preexec_fn для subprocess: ограничиваем память и CPU. Только Linux/macOS."""
    try:
        import resource  # POSIX-only; на Windows модуля нет

        resource.setrlimit(
            resource.RLIMIT_AS,
            (MAX_ADDRESS_SPACE_BYTES, MAX_ADDRESS_SPACE_BYTES),
        )
        resource.setrlimit(resource.RLIMIT_CPU, (MAX_CPU_SECONDS, MAX_CPU_SECONDS))
        # Запрет создания файлов больше 1 МБ.
        resource.setrlimit(resource.RLIMIT_FSIZE, (1024 * 1024, 1024 * 1024))
    except Exception:
        # На Windows resource.setrlimit отсутствует — деградируем до timeout-only режима.
        pass


@dataclass(slots=True)
class RunResult:
    language: str
    exit_code: int
    stdout: str
    stderr: str
    duration_ms: int
    timed_out: bool
    truncated: bool


def _truncate(data: bytes) -> tuple[str, bool]:
    if len(data) <= MAX_OUTPUT_BYTES:
        return data.decode("utf-8", errors="replace"), False
    head = data[:MAX_OUTPUT_BYTES].decode("utf-8", errors="replace")
    return head + "\n... (output truncated)", True


def _execute(
    label: str, args: list[str], code_for_stdin: str | None, *, timeout: int
) -> RunResult:
    """Универсальный запуск subprocess с резурс-лимитами и truncate-обработкой вывода."""
    started = time.monotonic()
    timed_out = False
    preexec = _apply_rlimits if sys.platform != "win32" else None
    try:
        proc = subprocess.run(
            args,
            input=code_for_stdin.encode("utf-8") if code_for_stdin is not None else None,
            capture_output=True,
            timeout=timeout,
            preexec_fn=preexec,
        )
        stdout, t1 = _truncate(proc.stdout or b"")
        stderr, t2 = _truncate(proc.stderr or b"")
        exit_code = proc.returncode
    except subprocess.TimeoutExpired as exc:
        timed_out = True
        stdout, t1 = _truncate(exc.stdout or b"")
        stderr_raw = (exc.stderr or b"") + f"\n[timeout: {timeout}s]".encode()
        stderr, t2 = _truncate(stderr_raw)
        exit_code = -1
    duration_ms = int((time.monotonic() - started) * 1000)
    truncated = t1 or t2
    logger.info(
        "sandbox.run: lang=%s, code_len=%d, exit=%d, timed_out=%s, duration_ms=%d",
        label, len(code_for_stdin or ""), exit_code, timed_out, duration_ms,
    )
    return RunResult(
        language=label,
        exit_code=exit_code,
        stdout=stdout,
        stderr=stderr,
        duration_ms=duration_ms,
        timed_out=timed_out,
        truncated=truncated,
    )


def run_python(code: str, *, timeout: int = DEFAULT_TIMEOUT_SEC) -> RunResult:
    return _execute("python", [sys.executable, "-I", "-c", code], None, timeout=timeout)


def run_node(code: str, *, timeout: int = DEFAULT_TIMEOUT_SEC) -> RunResult:
    # Через stdin, чтобы не зависеть от наличия временных файлов и не светить пути.
    return _execute("javascript", ["node", "--no-warnings", "-"], code, timeout=timeout)


def run(language: str, code: str, *, timeout: int = DEFAULT_TIMEOUT_SEC) -> RunResult:
    """Диспатч по языку. Поддерживаются python и javascript;
    для остальных — UnsupportedLanguageError."""
    lang = (language or "").strip().lower()
    if lang in {"python", "py", "python3"}:
        return run_python(code, timeout=timeout)
    if lang in {"javascript", "js", "node", "nodejs", "typescript", "ts"}:
        # TypeScript исполняем «как JavaScript» — без транспиляции типов; подходит для
        # коротких snippet-ов с типизацией строк/объектов, что покрывает 80% задач.
        return run_node(code, timeout=timeout)
    raise UnsupportedLanguageError(lang)


class UnsupportedLanguageError(Exception):
    def __init__(self, language: str) -> None:
        super().__init__(f"Sandbox-исполнение для языка {language!r} не поддерживается")
        self.language = language

"""Настройка логирования для backend.

По умолчанию пишет в stdout (12-factor / Docker). Если задан LOG_FILE — добавляет
RotatingFileHandler с настраиваемым размером и числом backup-файлов. Это полезно
для долгоживущих staging/standalone-стендов, где stdout некуда складывать.
"""

import logging
import os
from logging.handlers import RotatingFileHandler

DEFAULT_FORMAT = "%(asctime)s %(levelname)-7s %(name)s %(message)s"
DEFAULT_DATEFMT = "%Y-%m-%d %H:%M:%S"
DEFAULT_MAX_BYTES = 10 * 1024 * 1024  # 10 MB
DEFAULT_BACKUP_COUNT = 5


def setup_logging(level: str = "INFO") -> None:
    formatter = logging.Formatter(DEFAULT_FORMAT, datefmt=DEFAULT_DATEFMT)

    handlers: list[logging.Handler] = []
    stream = logging.StreamHandler()
    stream.setFormatter(formatter)
    handlers.append(stream)

    log_file = os.getenv("LOG_FILE", "").strip()
    if log_file:
        max_bytes = int(os.getenv("LOG_MAX_BYTES", str(DEFAULT_MAX_BYTES)))
        backup_count = int(os.getenv("LOG_BACKUP_COUNT", str(DEFAULT_BACKUP_COUNT)))
        rotating = RotatingFileHandler(
            log_file, maxBytes=max_bytes, backupCount=backup_count, encoding="utf-8",
        )
        rotating.setFormatter(formatter)
        handlers.append(rotating)

    logging.basicConfig(level=level, handlers=handlers, force=True)
    logging.getLogger("uvicorn.access").setLevel("WARNING")

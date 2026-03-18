import logging
from logging.handlers import RotatingFileHandler
import os

LOG_DIR = "logs"
os.makedirs(LOG_DIR, exist_ok=True)

def setup_logging():
    # -----------------------------
    # Root logger (console)
    # -----------------------------
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    console_handler = logging.StreamHandler()
    console_formatter = logging.Formatter(
        "%(asctime)s - %(levelname)s - %(name)s - %(message)s"
    )
    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)

    # -----------------------------
    # File logger (app logs)
    # -----------------------------
    file_handler = RotatingFileHandler(
        f"{LOG_DIR}/app.log",
        maxBytes=5_000_000,
        backupCount=5,
    )

    file_formatter = logging.Formatter(
        "%(asctime)s - %(levelname)s - %(name)s - %(message)s"
    )
    file_handler.setFormatter(file_formatter)

    root_logger.addHandler(file_handler)

    # -----------------------------
    # Payload logger (separate file)
    # -----------------------------
    payload_logger = logging.getLogger("payload_logger")
    payload_logger.setLevel(logging.INFO)

    payload_handler = RotatingFileHandler(
        f"{LOG_DIR}/payloads.log",
        maxBytes=5_000_000,
        backupCount=5,
    )

    payload_handler.setFormatter(
        logging.Formatter("%(asctime)s - %(message)s")
    )

    payload_logger.addHandler(payload_handler)
    payload_logger.propagate = False
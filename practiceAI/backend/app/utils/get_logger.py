import logging
import colorlog
import os


def get_logger():

    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'DEFAULT')

    handler = colorlog.StreamHandler()
    formatter = colorlog.ColoredFormatter(
        "%(log_color)s%(asctime)s.%(msecs)03d - %(levelname)s - [%(funcName)s] - %(message)s",
        datefmt='%Y-%m-%d %H:%M:%S',
        log_colors={
            'DEBUG': 'cyan',
            'INFO': 'green',
            'WARNING': 'yellow',
            'ERROR': 'red',
            'CRITICAL': 'red,bg_white',
        }
    )
    handler.setFormatter(formatter)

    logger = colorlog.getLogger("practiceAI")
    if not logger.handlers:
        logger.addHandler(handler)

    LOG_LEVEL_OPTION = {
        'DEBUG': logging.DEBUG,
        'INFO': logging.INFO,
        'WARNING': logging.WARNING,
        'ERROR': logging.ERROR,
        'CRITICAL': logging.CRITICAL,
        'DEFAULT': logging.INFO
    }
    logger.setLevel(LOG_LEVEL_OPTION.get(LOG_LEVEL.upper(), logging.INFO))

    return logger

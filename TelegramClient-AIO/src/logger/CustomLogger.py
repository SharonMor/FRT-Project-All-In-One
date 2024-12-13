import logging
import os
from datetime import datetime

import colorama
from colorama import Fore, Style
from singleton_decorator import singleton

colorama.init(autoreset=True)

LOGS_FOLDER_PATH = "logger/logs/"
DEFAULT_LOG_LEVEL = logging.INFO


@singleton
class CustomLogger:
    """
    A singleton logger class that provides custom logging functionality with colored console output.
    """

    def __init__(self):
        """
        Initializes the CustomLogger instance and sets up the logger.
        """
        self._logger = logging.getLogger('CustomLogger')
        self._ensure_logs_directory_exists()
        self._setup_logger()

    def set_level(self, level=DEFAULT_LOG_LEVEL):
        """
        Sets the logging level for the logger and its handlers.

        Args:
            level (int): The logging level (e.g., logging.DEBUG, logging.INFO).
        """
        self._logger.setLevel(level)
        for handler in self._logger.handlers:
            handler.setLevel(level)

    def _ensure_logs_directory_exists(self):
        """
        Ensures that the logs directory exists; if not, it creates it.
        """
        if not os.path.exists(LOGS_FOLDER_PATH):
            os.makedirs(LOGS_FOLDER_PATH)
            # Optionally set permissions to 777
            os.chmod(LOGS_FOLDER_PATH, 0o777)

    def _setup_logger(self):
        """
        Sets up the logger by adding a file handler with a specified logging level and format.
        """
        if not self._logger.handlers:
            self._logger.setLevel(DEFAULT_LOG_LEVEL)

            log_filename = self._get_log_filename()
            file_handler = logging.FileHandler(log_filename, encoding='utf-8')
            file_handler.setLevel(DEFAULT_LOG_LEVEL)

            formatter = logging.Formatter('[%(asctime)s, %(name)s, %(levelname)s] - %(message)s')
            file_handler.setFormatter(formatter)
            self._logger.addHandler(file_handler)

    def _get_log_filename(self):
        """
        Generates a log filename based on the current date and time.

        Returns:
            str: The generated log filename.
        """
        current_date = datetime.now().strftime("%d-%m-%Y")
        current_time = datetime.now().strftime("%H-%M-%S")
        log_filename = f"Teams_{current_date}-{current_time}.log"
        return os.path.join(LOGS_FOLDER_PATH, log_filename)

    def debug(self, msg):
        """
        Logs a debug message and prints it to the console with cyan color.

        Args:
            msg (str): The message to log.
        """
        if self._logger.isEnabledFor(logging.DEBUG):
            print(f"{Fore.CYAN}DEBUG [{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] :: {msg}{Style.RESET_ALL}")
        self._logger.debug(msg)

    def info(self, msg):
        """
        Logs an info message and prints it to the console with green color.

        Args:
            msg (str): The message to log.
        """
        if self._logger.isEnabledFor(logging.INFO):
            print(f"{Fore.GREEN}INFO [{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] :: {msg}{Style.RESET_ALL}")
        self._logger.info(msg)

    def warning(self, msg):
        """
        Logs a warning message and prints it to the console with yellow color.

        Args:
            msg (str): The message to log.
        """
        if self._logger.isEnabledFor(logging.WARNING):
            print(f"{Fore.YELLOW}WARNING [{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] :: {msg}{Style.RESET_ALL}")
        self._logger.warning(msg)

    def error(self, msg):
        """
        Logs an error message and prints it to the console with red color.

        Args:
            msg (str): The message to log.
        """
        if self._logger.isEnabledFor(logging.ERROR):
            print(f"{Fore.RED}ERROR [{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] :: {msg}{Style.RESET_ALL}")
        self._logger.error(msg)

    def critical(self, msg):
        """
        Logs a critical message and prints it to the console with magenta color.

        Args:
            msg (str): The message to log.
        """
        if self._logger.isEnabledFor(logging.CRITICAL):
            print(f"{Fore.MAGENTA}CRITICAL [{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] :: {msg}{Style.RESET_ALL}")
        self._logger.critical(msg)
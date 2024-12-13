import json
import logging
import os

from singleton_decorator import singleton

from src.annotations.init_logger import init_logger

current_file_directory = os.path.dirname(os.path.abspath(__file__))
src_directory = os.path.dirname(current_file_directory)
PRJ_DIR_PATH = os.path.dirname(src_directory)  # This should be /app
PRJ_CONFIG_FILE_PATH = os.path.join(PRJ_DIR_PATH, "src", "config", "project_config.json")


@singleton
@init_logger(level=logging.INFO)
class Config:
    def __init__(self):
        """
        Initialize the Config singleton instance.
        Loads the configuration file into `project_config`.
        """
        self._init_config()
        self.logger.debug(f"Current file directory: {current_file_directory}")
        self.logger.debug(f"Src directory: {src_directory}")
        self.logger.debug(f"Project directory path: {PRJ_DIR_PATH}")
        self.logger.debug(f"Config file path: {PRJ_CONFIG_FILE_PATH}")

    def _init_config(self):
        """
        Initialize the configuration by reading from the configuration file.
        Sets the `project_config` attribute with the loaded configuration.
        Logs any errors encountered during file reading or JSON parsing.
        """
        try:
            with open(PRJ_CONFIG_FILE_PATH, 'r') as file:
                self.project_config = json.load(file)
                self.logger.info(f"Configuration loaded successfully from {PRJ_CONFIG_FILE_PATH}")
        except FileNotFoundError:
            self.logger.error(f"Configuration file not found: {PRJ_CONFIG_FILE_PATH}")
            self.project_config = {}
        except json.JSONDecodeError:
            self.logger.error(f"Error decoding JSON from the configuration file: {PRJ_CONFIG_FILE_PATH}")
            self.project_config = {}
        except Exception as e:
            self.logger.error(f"Unexpected error loading configuration: {str(e)}")
            self.project_config = {}


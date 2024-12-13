import logging
from functools import wraps


def init_logger(level=logging.INFO):
    def decorator(cls):
        original_init = cls.__init__

        @wraps(original_init)
        def new_init(self, *args, **kwargs):
            from src.logger.CustomLogger import CustomLogger
            self.logger = CustomLogger()
            self.logger.set_level(level)  # Set the log level based on the decorator parameter
            original_init(self, *args, **kwargs)

        cls.__init__ = new_init
        return cls

    return decorator

from singleton_decorator import singleton


@singleton
class StringShortener:
    """
    This class use to contain a full string with a short key
    """

    def __init__(self):
        self.dictionary = {}
        self.counter = 0

    def shorten(self, original_string):
        key = f"{self.counter}"
        self.dictionary[key] = original_string
        self.counter += 1
        return key

    def retrieve_original(self, shortened_string):
        return self.dictionary.get(shortened_string, None)

from abc import ABC, abstractmethod


class Database(ABC):
    @abstractmethod
    def init_db(self):
        """ Initialize the database resources """
        pass

    @abstractmethod
    def close_db(self):
        """ Close and clean up the database resources """
        pass

    @abstractmethod
    def update(self, key, value):
        """ Update an existing entry """
        pass

    @abstractmethod
    def post(self, key, value):
        """ Create a new entry """
        pass

    @abstractmethod
    def get(self, key):
        """ Retrieve an entry """
        pass

    @abstractmethod
    def delete(self, key):
        """ Delete an entry """
        pass

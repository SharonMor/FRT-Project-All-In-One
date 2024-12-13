from abc import ABC, abstractmethod


class BaseEntity(ABC):
    @abstractmethod
    def from_dict(self, data: dict):
        """
        Create the entity instance from a dictionary.

        Returns:
            Object: A instance of entity.
        """
        pass

    @abstractmethod
    def to_dict(self):
        """
        Converts the entity instance to a dictionary.

        Returns:
            dict: A dictionary representation of the entity instance.
        """
        pass

    def __str__(self):
        """
        Provides a human-readable string representation of the entity instance.

        Returns:
            str: A string representation of the entity instance.
        """
        return f"{self.__class__.__name__}({self.to_dict()})"




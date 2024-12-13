from concurrent.futures import ThreadPoolExecutor
from threading import Event
import asyncio
from singleton_decorator import singleton
from src.annotations.init_logger import init_logger
from src.kafka.factory import get_consumer

@singleton
@init_logger()
class Consumer:
    """
    A class to manage Kafka entities consumption in a non-blocking manner using ThreadPoolExecutor.

    Attributes:
    ----------
    topic : str
        The Kafka topic to consume messages from.
    kafka_consumer : KafkaConsumer
        The Kafka consumer instance.
    executor : ThreadPoolExecutor
        The executor to run the blocking Kafka consumer in a separate thread.
    stop_event : Event
        An event to signal stopping the consumer.
    """
    def __init__(self, topic):
        """
        Initializes the Consumer with the specified Kafka topic.

        Parameters:
        ----------
        topic : str
            The Kafka topic to consume messages from.
        """
        self.topic = topic
        self.kafka_consumer = get_consumer(topic)
        self.executor = ThreadPoolExecutor(max_workers=1)
        self.stop_event = Event()

    def consume_sync(self):
        """
        Synchronously consume messages from Kafka.

        Yields:
        -------
        Message
            The Kafka entities consumed.
        """
        try:
            for message in self.kafka_consumer:
                if self.stop_event.is_set():
                    break
                yield message
        except KeyboardInterrupt:
            self.logger.info("Consumer stopped.")
        finally:
            self.kafka_consumer.close()

    async def consume(self):
        """
        Asynchronously consume messages from Kafka by running the synchronous consumer in a separate thread.

        Yields:
        -------
        Message
            The Kafka entities consumed.
        """
        loop = asyncio.get_running_loop()
        queue = asyncio.Queue(maxsize=100)  # Set a reasonable maxsize to avoid memory issues

        def produce():
            for message in self.consume_sync():
                loop.call_soon_threadsafe(queue.put_nowait, message)
            loop.call_soon_threadsafe(queue.put_nowait, None)

        self.executor.submit(produce)

        while True:
            message = await queue.get()
            if message is None:
                break
            yield message

    async def stop(self):
        """
        Stop the Kafka consumer and shut down the executor.
        """
        self.stop_event.set()
        self.executor.shutdown(wait=True)
        self.logger.info("Kafka consumer stopped.")

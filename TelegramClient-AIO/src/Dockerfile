FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY src/ src/
EXPOSE 8019
ENV PYTHONPATH=/app
CMD ["python", "src/bot.py"]
FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY src/ src/
RUN echo "Contents of /app:" && ls -R /app
EXPOSE 8198
ENV PYTHONPATH=/app
CMD ["python", "src/app.py"]
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . /app/

# Expose port
EXPOSE 8000

# Command to run the FastAPI service
CMD ["uvicorn", "predict_service:app", "--host", "0.0.0.0", "--port", "8000"]

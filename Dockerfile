FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY tithe-report/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY tithe-report/ .

# Expose port for Cloud Run
EXPOSE 8080

# Run Streamlit
CMD ["streamlit", "run", "app.py", "--server.port=8080", "--server.address=0.0.0.0", "--server.headless=true"]

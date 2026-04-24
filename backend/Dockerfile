FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies
# libgomp1 is often required for XGBoost / Scikit-Learn
# libpq-dev is required for postgres connection (psycopg2)
RUN apt-get update && apt-get install -y \
    build-essential \
    libgomp1 \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file to container
COPY api/requirements.txt /app/

# Install python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire api folder (which includes app/) to /app in container
COPY api /app

# Since we might have ai-engine resources, let's copy the entire backend directory to a safe path if needed,
# But the backend code predominantly lives in api/app. 
# Your ai-engine folder is adjacent. I'll make sure everything is copied.
COPY ./ /backend_root/

# Expose the API port
EXPOSE 8000

# Command to run backend
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

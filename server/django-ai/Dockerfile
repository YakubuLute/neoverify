FROM python:3.11-slim-bullseye

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /usr/src/app

# Update system packages to fix vulnerabilities
RUN apt-get update && apt-get upgrade -y && apt-get clean

# Install dependencies
COPY server/django-ai/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY server/django-ai/ .

EXPOSE 8000
CMD ["gunicorn", "neoverify.wsgi:application", "--bind", "0.0.0.0:8000"]

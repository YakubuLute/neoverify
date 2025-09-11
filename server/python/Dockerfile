FROM python:3.11
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /usr/src/app

# Install dependencies
COPY server/python/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY server/python/ .

EXPOSE 8000
CMD ["gunicorn", "neoverify.wsgi:application", "--bind", "0.0.0.0:8000"]

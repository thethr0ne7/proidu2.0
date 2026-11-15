FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=/opt/proidu
WORKDIR /opt/proidu
COPY services/api/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt
COPY services/ services/
USER 65532:65532
EXPOSE 8000
CMD ["uvicorn","services.api.app:app","--host","0.0.0.0","--port","8000"]

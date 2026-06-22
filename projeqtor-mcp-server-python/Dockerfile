FROM python:3.12-slim AS runtime
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 MCP_TRANSPORT=http MCP_HTTP_PORT=3000
COPY pyproject.toml README.md .env.example ./
COPY src ./src
RUN pip install --no-cache-dir .
EXPOSE 3000
USER nobody
CMD ["projeqtor-mcp-server-python"]

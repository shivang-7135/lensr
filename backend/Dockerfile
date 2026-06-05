FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml ./
RUN pip install --no-cache-dir -e . || pip install --no-cache-dir \
    fastapi 'uvicorn[standard]' pydantic pydantic-settings \
    langchain langchain-core langchain-community langchain-aws langgraph \
    boto3 httpx trafilatura sqlalchemy 'psycopg[binary]' python-dotenv
COPY app ./app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

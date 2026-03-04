FROM python:3.13-slim 

WORKDIR /app 

RUN pip install poetry 
RUN poetry config virtualenvs.create false 

COPY pyproject.toml poetry.lock* ./ 
RUN poetry install --no-root 

COPY . .

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
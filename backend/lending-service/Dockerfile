# Używamy lekkiego obrazu Pythona
FROM python:3.13-slim

# Wyłączamy buforowanie logów (żeby od razu widzieć printy w konsoli) 
# i zapobiegamy tworzeniu plików .pyc
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Instalujemy Poetry
RUN pip install poetry

# Kopiujemy tylko pliki konfiguracyjne, żeby Docker mógł skeszować ten krok
COPY pyproject.toml poetry.lock* ./

# Instalujemy zależności. 
# Mówimy Poetry: "Nie twórz wirtualnego środowiska, bo sam kontener już nim jest"
RUN poetry config virtualenvs.create false \
    && poetry install --no-root --no-interaction --no-ansi

# Kopiujemy resztę kodu aplikacji
COPY . .

# Wystawiamy port 8000, na którym domyślnie działa Django
EXPOSE 8000

# Odpalamy serwer (w trybie deweloperskim na wszystkie interfejsy 0.0.0.0)
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
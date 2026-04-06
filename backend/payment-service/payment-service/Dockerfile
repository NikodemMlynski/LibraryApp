# Etap 1: Budowanie aplikacji za pomocą Mavena
FROM maven:3.9.6-eclipse-temurin-21-alpine AS build
WORKDIR /app

# Kopiujemy plik konfiguracyjny Mavena i pobieramy zależności offline (przyspiesza kolejne buildy)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Kopiujemy kod źródłowy i budujemy plik .jar z pominięciem testów
COPY src ./src
RUN mvn clean package -DskipTests

# Etap 2: Uruchamianie aplikacji w lekkim środowisku JRE
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Kopiujemy wygenerowany plik .jar z etapu 1
COPY --from=build /app/target/*.jar app.jar

# Wystawiamy port (taki sam jak w application.yml i docker-compose)
EXPOSE 8082

# Komenda startowa
ENTRYPOINT ["java", "-jar", "app.jar"]
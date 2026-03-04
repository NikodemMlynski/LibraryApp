FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

# Vite domyślnie nasłuchuje na localhost. Dodajemy --host, by był dostępny z zewnątrz kontenera na porcie 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
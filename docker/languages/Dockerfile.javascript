FROM node:20-alpine
WORKDIR /app
RUN npm install -g eslint prettier typescript @typescript-eslint/parser
CMD ["node", "--version"]
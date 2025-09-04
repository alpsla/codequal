FROM openjdk:17-slim
WORKDIR /app
RUN apt-get update && apt-get install -y wget unzip && \
    wget https://github.com/spotbugs/spotbugs/releases/download/4.7.3/spotbugs-4.7.3.zip && \
    unzip spotbugs-4.7.3.zip && rm spotbugs-4.7.3.zip
CMD ["java", "--version"]
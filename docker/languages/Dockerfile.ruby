FROM ruby:3.2-slim
WORKDIR /app
RUN apt-get update && apt-get install -y build-essential && \
    gem install brakeman rubocop && \
    apt-get clean && rm -rf /var/lib/apt/lists/*
CMD ["ruby", "--version"]

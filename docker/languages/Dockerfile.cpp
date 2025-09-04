FROM ubuntu:22.04
RUN apt-get update && apt-get install -y cppcheck clang-format
WORKDIR /app
CMD ["cppcheck", "--version"]

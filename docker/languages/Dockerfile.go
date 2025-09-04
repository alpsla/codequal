FROM golang:1.21-alpine
WORKDIR /app
RUN apk add --no-cache git
RUN go install honnef.co/go/tools/cmd/staticcheck@2023.1.7
CMD ["go", "version"]

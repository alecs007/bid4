# syntax=docker/dockerfile:1

FROM eclipse-temurin:25-jdk-alpine AS build
WORKDIR /build
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw
COPY src/ src/
# A cache mount keeps the Maven repository between builds. Without it every
# build re-downloads the whole dependency tree, which is minutes each time; with
# it a source change rebuilds in seconds.
RUN --mount=type=cache,target=/root/.m2 \
    ./mvnw -B -q -DskipTests package && mv target/*.jar app.jar

FROM eclipse-temurin:25-jre-alpine AS runtime
# wget is the health check; the JRE image has no curl.
RUN apk add --no-cache wget \
    && addgroup -S bid4 && adduser -S -G bid4 -H -s /sbin/nologin bid4
WORKDIR /app
COPY --from=build --chown=bid4:bid4 /build/app.jar app.jar
USER bid4
EXPOSE 8080
# Container memory is the limit compose sets, so let the JVM read it rather
# than guess a fixed heap.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError"
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]

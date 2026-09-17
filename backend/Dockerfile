# Build from the repository root so the shared question bank is available:
#   docker build -f backend/Dockerfile -t hirehearsal-api .
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /workspace
COPY shared ./shared
COPY backend/pom.xml backend/pom.xml
COPY backend/.mvn backend/.mvn
RUN mvn -f backend/pom.xml -s backend/.mvn/central-settings.xml -B -q dependency:go-offline || true
COPY backend/src backend/src
RUN mvn -f backend/pom.xml -s backend/.mvn/central-settings.xml -B -q package -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app
RUN useradd --system --uid 1001 hirehearsal && mkdir -p /app/data && chown hirehearsal /app/data
COPY --from=build /workspace/backend/target/hirehearsal-api-1.0.0.jar app.jar
USER hirehearsal
ENV SPRING_PROFILES_ACTIVE=prod
EXPOSE 8085
ENTRYPOINT ["java", "-jar", "/app/app.jar"]

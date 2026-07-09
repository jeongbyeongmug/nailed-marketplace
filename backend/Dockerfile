# ── build stage ──────────────────────────────────────────────
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY . .
# 테스트는 CI에서 MySQL 컨테이너로 별도 실행하므로 이미지 빌드 시엔 스킵
RUN chmod +x mvnw && ./mvnw -B clean package -DskipTests

# ── runtime stage ────────────────────────────────────────────
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]

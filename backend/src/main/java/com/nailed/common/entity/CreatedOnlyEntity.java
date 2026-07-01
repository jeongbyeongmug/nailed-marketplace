package com.nailed.common.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * created_at 만 존재하고 updated_at 이 없는 Entity 전용 베이스 클래스
 *
 * 대상 (DB 스키마 기준 5개 테이블):
 *   - product_images
 *   - reviews
 *   - reports
 *   - member_penalties
 *   - wishlists
 *
 * 사용법: public class Review extends CreatedOnlyEntity { ... }
 *
 * 주의:
 *   - 메인 Application 클래스에 @EnableJpaAuditing 필요
 *   - DB 컬럼명: created_at (snake_case)
 *   - 수정 추적이 필요한 Entity는 BaseEntity 를 사용할 것
 */
@Getter
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class CreatedOnlyEntity {

    @CreatedDate
    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;
}

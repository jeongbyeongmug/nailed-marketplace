package com.nailed.common.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * created_at 과 updated_at 이 모두 존재하는 Entity 전용 베이스 클래스
 *
 * 대상 (DB 스키마 기준 3개 테이블):
 *   - members
 *   - products (단, deleted_at 도 있으므로 SoftDeleteEntity 상속)
 *   - orders
 *
 * 사용법: public class Order extends BaseEntity { ... }
 *
 * 주의:
 *   - 메인 Application 클래스에 @EnableJpaAuditing 필요
 *   - DB 컬럼명: created_at, updated_at (snake_case)
 *   - updated_at 없는 Entity 는 CreatedOnlyEntity 를 사용할 것
 */
@Getter
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseEntity {

    @CreatedDate
    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}

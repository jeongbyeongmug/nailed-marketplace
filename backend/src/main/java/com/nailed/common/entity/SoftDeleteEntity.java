package com.nailed.common.entity;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * Soft Delete가 필요한 Entity의 베이스 클래스
 * 대상: Product (deleted_at 컬럼 보유)
 *
 * 사용법: public class Product extends SoftDeleteEntity { ... }
 *
 * 주의:
 *   - DB 컬럼명: deleted_at (snake_case)
 *   - Product 외에 deleted_at 컬럼이 있는 테이블은 DB에 없음 (단독 사용)
 */
@Getter
@MappedSuperclass
public abstract class SoftDeleteEntity extends BaseEntity {

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
    }

    public boolean isDeleted() {
        return this.deletedAt != null;
    }
}

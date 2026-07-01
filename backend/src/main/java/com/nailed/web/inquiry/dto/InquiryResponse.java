package com.nailed.web.inquiry.dto;

import com.nailed.web.inquiry.entity.Inquiry;
import java.time.LocalDateTime;

public class InquiryResponse {

    // 회원용(Summary/Detail)과 관리자용(AdminSummary/AdminDetail)을 별도 record로 분리해둠
    // - 현재는 memberId 노출 여부 정도만 다르고 나머지 필드는 동일하지만,
    //   향후 한쪽에만 필드가 추가/변경되어도 서로 영향 없도록 의도적으로 중복 정의함

    public record Summary(
            String inquiryId,
            String category,
            String title,
            String inquiryStatus,
            LocalDateTime createdAt,
            LocalDateTime answeredAt
    ) {
        public static Summary from(Inquiry inquiry) {
            return new Summary(
                    inquiry.getInquiryId(),
                    inquiry.getCategory(),
                    inquiry.getTitle(),
                    inquiry.getInquiryStatus().name(),
                    inquiry.getCreatedAt(),
                    inquiry.getAnsweredAt()
            );
        }
    }

    public record Detail(
            String inquiryId,
            String memberId,
            String category,
            String title,
            String content,
            String inquiryStatus,
            String answerContent,
            LocalDateTime createdAt,
            LocalDateTime answeredAt
    ) {
        public static Detail from(Inquiry inquiry) {
            return new Detail(
                    inquiry.getInquiryId(),
                    inquiry.getMember().getMemberId(),
                    inquiry.getCategory(),
                    inquiry.getTitle(),
                    inquiry.getContent(),
                    inquiry.getInquiryStatus().name(),
                    inquiry.getAnswerContent(),
                    inquiry.getCreatedAt(),
                    inquiry.getAnsweredAt()
            );
        }
    }

    public record AdminSummary(
            String inquiryId,
            String memberId,
            String category,
            String title,
            String inquiryStatus,
            LocalDateTime createdAt,
            LocalDateTime answeredAt
    ) {
        public static AdminSummary from(Inquiry inquiry) {
            return new AdminSummary(
                    inquiry.getInquiryId(),
                    inquiry.getMember().getMemberId(),
                    inquiry.getCategory(),
                    inquiry.getTitle(),
                    inquiry.getInquiryStatus().name(),
                    inquiry.getCreatedAt(),
                    inquiry.getAnsweredAt()
            );
        }
    }

    public record AdminDetail(
            String inquiryId,
            String memberId,
            String category,
            String title,
            String content,
            String inquiryStatus,
            String answerContent,
            LocalDateTime createdAt,
            LocalDateTime answeredAt
    ) {
        public static AdminDetail from(Inquiry inquiry) {
            return new AdminDetail(
                    inquiry.getInquiryId(),
                    inquiry.getMember().getMemberId(),
                    inquiry.getCategory(),
                    inquiry.getTitle(),
                    inquiry.getContent(),
                    inquiry.getInquiryStatus().name(),
                    inquiry.getAnswerContent(),
                    inquiry.getCreatedAt(),
                    inquiry.getAnsweredAt()
            );
        }
    }
}

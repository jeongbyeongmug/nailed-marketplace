package com.nailed.web.member.service;

import com.nailed.common.enums.OrderStatus;
import com.nailed.common.enums.SellerGrade;
import com.nailed.web.member.repository.MemberRepository;
import com.nailed.web.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SellerGradeService {

    private final OrderRepository orderRepository;
    private final MemberRepository memberRepository;

    @Transactional
    public void refreshSellerGrade(String sellerId) {
        long completedCount = orderRepository.countBySellerIdAndOrderStatus(
                sellerId,
                OrderStatus.DELIVERED.name()
        );

        SellerGrade sellerGrade = calculateGrade(completedCount);
        memberRepository.updateSellerGrade(sellerId, sellerGrade.name());
    }

    private SellerGrade calculateGrade(long completedCount) {
        if (completedCount >= 3) {
            return SellerGrade.DIAMOND;
        }
        if (completedCount >= 2) {
            return SellerGrade.GOLD;
        }
        if (completedCount >= 1) {
            return SellerGrade.SILVER;
        }
        return SellerGrade.BRONZE;
    }
}

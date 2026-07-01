package com.nailed.web.member.repository;

import com.nailed.web.member.entity.MemberPenalty;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MemberPenaltyRepository extends JpaRepository<MemberPenalty, Long> {

    List<MemberPenalty> findByMemberMemberIdOrderByCreatedAtDescPenaltyIdDesc(String memberId);
}

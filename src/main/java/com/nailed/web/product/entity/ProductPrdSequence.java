package com.nailed.web.product.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "product_prd_sequence")
@Getter
@NoArgsConstructor
public class ProductPrdSequence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "seq_id")
    private Integer seqId;
}

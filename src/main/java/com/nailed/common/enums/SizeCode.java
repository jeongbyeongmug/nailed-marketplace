package com.nailed.common.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.Arrays;

@Getter
@RequiredArgsConstructor
public enum SizeCode {

    // ───────────── 의류 사이즈 ─────────────
    OS   ("OS",  SizeType.CLOTHING),
    XXS  ("XXS", SizeType.CLOTHING),
    XS   ("XS",  SizeType.CLOTHING),
    S    ("S",   SizeType.CLOTHING),
    M    ("M",   SizeType.CLOTHING),
    L    ("L",   SizeType.CLOTHING),
    XL   ("XL",  SizeType.CLOTHING),
    XXL  ("2XL", SizeType.CLOTHING),
    XXXL ("3XL", SizeType.CLOTHING),
    SIZE_24 ("24", SizeType.CLOTHING),
    SIZE_25 ("25", SizeType.CLOTHING),
    SIZE_26 ("26", SizeType.CLOTHING),
    SIZE_27 ("27", SizeType.CLOTHING),
    SIZE_28 ("28", SizeType.CLOTHING),
    SIZE_29 ("29", SizeType.CLOTHING),
    SIZE_30 ("30", SizeType.CLOTHING),
    SIZE_31 ("31", SizeType.CLOTHING),
    SIZE_32 ("32", SizeType.CLOTHING),
    SIZE_33 ("33", SizeType.CLOTHING),
    SIZE_34 ("34", SizeType.CLOTHING),
    SIZE_35 ("35", SizeType.CLOTHING),
    SIZE_36 ("36", SizeType.CLOTHING),
    SIZE_37 ("37", SizeType.CLOTHING),
    SIZE_38 ("38", SizeType.CLOTHING),
    SIZE_39 ("39", SizeType.CLOTHING),
    SIZE_40 ("40", SizeType.CLOTHING),
    ETC     ("기타", SizeType.CLOTHING),

    // ───────────── 신발 사이즈 ─────────────
    SHOE_210("210", SizeType.SHOES),
    SHOE_215("215", SizeType.SHOES),
    SHOE_220("220", SizeType.SHOES),
    SHOE_225("225", SizeType.SHOES),
    SHOE_230("230", SizeType.SHOES),
    SHOE_235("235", SizeType.SHOES),
    SHOE_240("240", SizeType.SHOES),
    SHOE_245("245", SizeType.SHOES),
    SHOE_250("250", SizeType.SHOES),
    SHOE_255("255", SizeType.SHOES),
    SHOE_260("260", SizeType.SHOES),
    SHOE_265("265", SizeType.SHOES),
    SHOE_270("270", SizeType.SHOES),
    SHOE_275("275", SizeType.SHOES),
    SHOE_280("280", SizeType.SHOES),
    SHOE_285("285", SizeType.SHOES),
    SHOE_290("290", SizeType.SHOES),
    SHOE_295("295", SizeType.SHOES),
    SHOE_300("300", SizeType.SHOES);

    private final String value;
    private final SizeType sizeType;

    public enum SizeType {
        CLOTHING, SHOES, OTHER
    }

    public static SizeCode fromValue(String value) {
        return Arrays.stream(values())
                .filter(s -> s.value.equals(value))
                .findFirst()
                .orElse(null);
    }
}

import { useState, useEffect, useRef } from "react";

const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
import { registerProduct, uploadImage, getBrands, getProductCategories, getConditions, getSizes, getProductDetail, updateProduct, deleteProduct } from "../api/productApi";
import { toBrandNameEn } from "../utils/brandName";
import "../styles/sell.css";

function buildCategoryTree(cats) {
  const topList = cats.filter((c) => !c.parentCode);
  return topList.map((top) => ({
    code: top.code,
    label: top.name,
    groups: cats
      .filter((g) => g.parentCode === top.code)
      .map((group) => ({
        code: group.code,
        label: group.name,
        sizeType: group.sizeType,
        items: cats
          .filter((i) => i.parentCode === group.code)
          .map((item) => ({ code: item.code, label: item.name, sizeType: item.sizeType })),
      })),
  }));
}

function navigate(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function findCategoryByPath(path, tree) {
  const parts = (path || "").split(" > ").map((s) => s.trim());
  for (const top of tree) {
    if (top.label !== parts[0]) continue;
    for (const group of top.groups) {
      if (group.label !== parts[1]) continue;
      for (const item of group.items) {
        if (item.label === parts[2]) return { topCode: top.code, groupCode: group.code, itemCode: item.code };
      }
      return { topCode: top.code, groupCode: group.code, itemCode: "" };
    }
    return { topCode: top.code, groupCode: "", itemCode: "" };
  }
  return { topCode: tree[0]?.code ?? "", groupCode: "", itemCode: "" };
}

export default function SellPage({ editProductId }) {
  const [images, setImages]               = useState([]);
  const [title, setTitle]                 = useState("");
  const [description, setDescription]     = useState("");
  const [topCode, setTopCode]             = useState("");
  const [groupCode, setGroupCode]         = useState("");
  const [itemCode, setItemCode]           = useState("");
  const [selectedSize, setSelectedSize]   = useState("");
  const [condition, setCondition]         = useState("");
  const [brandId, setBrandId]             = useState("");
  const [price, setPrice]                 = useState("");
  const [shippingFee, setShippingFee]     = useState("");
  const [hashtags, setHashtags]           = useState("");
  const [brands, setBrands]               = useState([]);
  const [codeToGroupId, setCodeToGroupId] = useState({});
  const [categoryTree, setCategoryTree]   = useState([]);
  const [conditions, setConditions]       = useState([]);
  const [sizeMap, setSizeMap]             = useState({ CLOTHING: [], SHOES: [] });
  const [submitting, setSubmitting]       = useState(false);
  const [errors, setErrors]               = useState({});
  const isEditMode                        = Boolean(editProductId);

  const fileInputRef = useRef();
  const dragItem     = useRef(null);
  const dragOver     = useRef(null);

  useEffect(() => {
    const catPromise = getProductCategories()
      .then((data) => {
        const cats = Array.isArray(data) ? data : [];
        const map = {};
        cats.forEach((c) => { map[c.code] = c.groupId; });
        setCodeToGroupId(map);
        const tree = buildCategoryTree(cats);
        setCategoryTree(tree);
        if (!isEditMode && tree.length > 0) setTopCode(tree[0].code);
        return tree;
      })
      .catch(() => []);

    const brandPromise = getBrands().then((list) => { setBrands(list); return list; }).catch(() => []);

    getConditions().then((list) => setConditions(Array.isArray(list) ? list : [])).catch(() => {});

    getSizes().then((list) => {
      const arr = Array.isArray(list) ? list : [];
      setSizeMap({
        CLOTHING: arr.filter((s) => s.sizeType === "CLOTHING").map((s) => s.value),
        SHOES:    arr.filter((s) => s.sizeType === "SHOES").map((s) => s.value),
      });
    }).catch(() => {});

    if (isEditMode) {
      Promise.all([catPromise, brandPromise, getProductDetail(editProductId)])
        .then(([tree, brandList, product]) => {
          setTitle(product.title);
          setDescription(product.description);
          setPrice(String(product.price));
          setShippingFee(String(product.shippingFee));
          setCondition(product.conditionCode);
          setSelectedSize(product.size || "");
          setHashtags(product.hashtags || "");

          const { topCode: tc, groupCode: gc, itemCode: ic } = findCategoryByPath(product.categoryPath, tree);
          setTopCode(tc);
          setGroupCode(gc);
          setItemCode(ic);

          if (product.brandName) {
            const matched = brandList.find((b) => b.name === product.brandName);
            if (matched) setBrandId(String(matched.groupId));
          }

          if (Array.isArray(product.imageUrls) && product.imageUrls.length > 0) {
            setImages(product.imageUrls.map((url) => ({
              id: genId(),
              preview: url,
              url,
              uploading: false,
            })));
          }
        })
        .catch(() => {});
    }
  }, [editProductId]);

  const topCategory   = categoryTree.find((c) => c.code === topCode);
  const groups        = topCategory?.groups ?? [];
  const selectedGroup = groups.find((g) => g.code === groupCode);
  const items         = selectedGroup?.items ?? [];
  const selectedItem  = items.find((i) => i.code === itemCode);
  const sizeType      = selectedItem?.sizeType ?? null;
  const sizeOptions   =
    sizeType === "ALL"      ? [...(sizeMap.CLOTHING ?? []), ...(sizeMap.SHOES ?? [])] :
    sizeType === "SHOES"    ? (sizeMap.SHOES ?? []) :
    sizeType === "CLOTHING" ? (sizeMap.CLOTHING ?? []) : [];

  const handleTopChange = (code) => {
    setTopCode(code);
    setGroupCode("");
    setItemCode("");
    setSelectedSize("");
    setBrandId("");
    const cat = categoryTree.find((c) => c.code === code);
    if (cat?.groups.length === 1) setGroupCode(cat.groups[0].code);
  };

  const handleGroupChange = (code) => {
    setGroupCode(code);
    setItemCode("");
    setSelectedSize("");
  };

  const handleImageSelect = async (files) => {
    const remaining = 10 - images.length;
    const filesToAdd = Array.from(files).slice(0, remaining);
    if (!filesToAdd.length) return;

    // 같은 파일 재선택 시에도 onChange 발동되도록 인풋 리셋
    if (fileInputRef.current) fileInputRef.current.value = "";

    const newImages = filesToAdd.map((f) => ({
      id: genId(),
      preview: URL.createObjectURL(f),
      url: null,
      uploading: true,
      file: f,
    }));
    setImages((prev) => [...prev, ...newImages]);

    for (const img of newImages) {
      try {
        const url = await uploadImage(img.file);
        setImages((prev) => prev.map((i) => (i.id === img.id ? { ...i, url, uploading: false } : i)));
      } catch {
        setImages((prev) => prev.filter((i) => i.id !== img.id));
      }
    }
  };

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOver.current === null) return;
    const list = [...images];
    const [moved] = list.splice(dragItem.current, 1);
    list.splice(dragOver.current, 0, moved);
    setImages(list);
    dragItem.current = dragOver.current = null;
  };

  const handleSubmit = async () => {
    const errs = {};
    if (images.length === 0)                  errs.images      = "이미지를 최소 1장 등록해주세요.";
    else if (images.some((i) => i.uploading)) errs.images      = "이미지 업로드 중입니다. 잠시 기다려주세요.";
    if (!title.trim())                        errs.title       = "제목을 입력해주세요.";
    if (!description.trim())                  errs.description = "설명을 입력해주세요.";
    if (!itemCode)                            errs.category    = "서브 카테고리를 선택해주세요.";
    if (!condition)                           errs.condition   = "상태를 선택해주세요.";
    if (sizeOptions.length > 0 && !selectedSize) errs.size    = "사이즈를 선택해주세요.";
    if (!price || Number(price) < 1000)       errs.price       = "최소 1,000원 이상 입력해주세요.";

    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);

    const body = {
      title:         title.trim(),
      categoryId:    codeToGroupId[itemCode],
      brandId:       (brandId && brandId !== "NOBRAND") ? Number(brandId) : null,
      price:         Number(price),
      shippingFee:   Number(shippingFee) || 0,
      description:   description.trim(),
      conditionCode: condition,
      size:          selectedSize || null,
      hashtags:      hashtags.trim() || null,
      imageUrls:     images.map((i) => i.url),
    };

    try {
      if (isEditMode) {
        await updateProduct(editProductId, body);
      } else {
        await registerProduct(body);
      }
      navigate("/mypage");
    } catch (e) {
      setErrors({ submit: e.message || (isEditMode ? "수정에 실패했습니다." : "등록에 실패했습니다.") });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("상품을 삭제하시겠습니까? 삭제된 상품은 복구할 수 없습니다.")) return;
    try {
      await deleteProduct(editProductId);
      navigate("/mypage");
    } catch (e) {
      setErrors({ submit: e.message || "삭제에 실패했습니다." });
    }
  };

  return (
    <div className="sell-page">

      {/* ── 상단 헤더 ── */}
      <div className="sell-header">
        <span className="sell-header-title">
          {isEditMode ? "상품 수정" : <>상품 등록 <span className="sell-beta">Beta</span></>}
        </span>
        <div className="sell-header-actions">
          <button className="sell-cancel-btn" onClick={() => window.history.back()}>취소</button>
          {isEditMode && (
            <button className="sell-delete-btn" onClick={handleDelete}>상품 삭제</button>
          )}
          <button className="sell-upload-btn" onClick={handleSubmit} disabled={submitting}>
            {submitting ? (isEditMode ? "수정 중..." : "등록 중...") : (isEditMode ? "수정 완료" : "업로드")}
          </button>
        </div>
      </div>

      <div className="sell-body">

        {/* ── 왼쪽: 사진 ── */}
        <div className="sell-left">
          <div className="sell-section-label">사진</div>
          <div
            className="sell-image-area"
            onClick={() => images.length === 0 && fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleImageSelect(e.dataTransfer.files); }}
          >
            {images.length === 0 ? (
              <div className="sell-image-placeholder">
                <button type="button" className="sell-image-btn"
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                  사진 선택
                </button>
                <p className="sell-image-hint">
                  최대 10장까지 업로드 가능하고 드래그하여 순서를 바꿀 수 있습니다.
                </p>
              </div>
            ) : (
              <div className="sell-image-grid">
                {images.map((img, idx) => (
                  <div key={img.id} className="sell-image-thumb"
                    draggable
                    onDragStart={() => { dragItem.current = idx; }}
                    onDragEnter={() => { dragOver.current = idx; }}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <img src={img.preview} alt="" />
                    {img.uploading && <div className="sell-image-loading">업로드 중</div>}
                    {idx === 0 && <span className="sell-image-badge">대표</span>}
                    <button className="sell-image-remove"
                      onClick={(e) => { e.stopPropagation(); setImages((p) => p.filter((i) => i.id !== img.id)); }}>
                      ×
                    </button>
                  </div>
                ))}
                {images.length < 10 && (
                  <div className="sell-image-add"
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                    <span>+</span>
                    <span className="sell-image-add-count">{images.length}/10</span>
                  </div>
                )}
              </div>
            )}
          </div>
          {errors.images && <p className="sell-error">{errors.images}</p>}
          <input ref={fileInputRef} type="file" accept="image/*" multiple
            style={{ display: "none" }} onChange={(e) => handleImageSelect(e.target.files)} />
          <p className="sell-tip">
            Tip: 다양한 상세 사진을 업로드하고 <span className="sell-tip-link">판매속도를 올려보세요</span>
          </p>
        </div>

        {/* ── 오른쪽: 폼 ── */}
        <div className="sell-right">

          {/* 제목 */}
          <div className="sell-field">
            <div className="sell-field-label">제목</div>
            <div className="sell-input-wrap">
              <input className={`sell-input${errors.title ? " error" : ""}`}
                placeholder="상품 제목 입력" value={title} maxLength={40}
                onChange={(e) => setTitle(e.target.value)} />
              <span className="sell-count">{title.length}/40</span>
            </div>
            {errors.title && <p className="sell-error">{errors.title}</p>}
          </div>

          {/* 설명 */}
          <div className="sell-field">
            <div className="sell-field-label">설명</div>
            <div className="sell-input-wrap">
              <textarea className={`sell-textarea${errors.description ? " error" : ""}`}
                placeholder={"상품 설명은 자세히 적을수록 빠르게 판매할 수 있어요.\n구매 시기, 사용 기간, 하자 여부, 소재, 선물 사이즈 등"}
                value={description} maxLength={300}
                onChange={(e) => setDescription(e.target.value)} />
              <span className="sell-count">{description.length}/300</span>
            </div>
            {errors.description && <p className="sell-error">{errors.description}</p>}
          </div>

          {/* 최상위 카테고리 */}
          <div className="sell-field">
            <div className="sell-field-label">카테고리</div>
            <div className="sell-chips">
              {categoryTree.map((cat) => (
                <button key={cat.code} type="button"
                  className={`sell-chip${topCode === cat.code ? " active" : ""}`}
                  onClick={() => handleTopChange(cat.code)}>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* 서브 카테고리 (그룹) — 그룹이 2개 이상일 때만 표시 */}
          {groups.length > 1 && (
            <div className="sell-field">
              <div className="sell-field-label">서브 카테고리</div>
              <div className="sell-chips">
                {groups.map((g) => (
                  <button key={g.code} type="button"
                    className={`sell-chip${groupCode === g.code ? " active" : ""}`}
                    onClick={() => handleGroupChange(g.code)}>
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 상세 카테고리 (아이템) */}
          {items.length > 0 && (
            <div className="sell-field">
              <div className="sell-field-label">상세 카테고리</div>
              <div className="sell-chips">
                {items.map((item) => (
                  <button key={item.code} type="button"
                    className={`sell-chip${itemCode === item.code ? " active" : ""}`}
                    onClick={() => {
                      setItemCode(item.code);
                      setSelectedSize("");
                      // 럭셔리 상세카테고리 선택 시 동일 code의 브랜드 항목 자동 연결
                      if (item.code.startsWith("LUXURY_")) {
                        const matched = brands.find((b) => b.code === item.code);
                        setBrandId(matched ? String(matched.groupId) : "");
                      }
                    }}>
                    {item.label}
                  </button>
                ))}
              </div>
              {errors.category && <p className="sell-error">{errors.category}</p>}
            </div>
          )}

          {/* 사이즈 */}
          {sizeOptions.length > 0 && (
            <div className="sell-field">
              <div className="sell-field-label">사이즈</div>
              <div className="sell-chips">
                {sizeOptions.map((s) => (
                  <button key={s} type="button"
                    className={`sell-chip${selectedSize === s ? " active" : ""}`}
                    onClick={() => setSelectedSize(selectedSize === s ? "" : s)}>
                    {s}
                  </button>
                ))}
              </div>
              {errors.size && <p className="sell-error">{errors.size}</p>}
            </div>
          )}

          {/* 상태 */}
          <div className="sell-field">
            <div className="sell-field-label">상태</div>
            <div className="sell-chips">
              {conditions.map((c) => (
                <button key={c.code} type="button"
                  className={`sell-chip${condition === c.code ? " active" : ""}`}
                  onClick={() => setCondition(c.code)}>
                  {c.label}
                </button>
              ))}
            </div>
            {errors.condition && <p className="sell-error">{errors.condition}</p>}
          </div>

          {/* 브랜드 */}
          <div className="sell-field">
            <div className="sell-field-label">브랜드</div>
            {topCode === "LUXURY" ? (
              // 럭셔리: 상세카테고리 선택 시 자동 표시 (직접 선택 불가)
              <div className="sell-input sell-brand-readonly">
                {brandId
                  ? toBrandNameEn(brands.find((b) => String(b.groupId) === String(brandId))?.name) ?? "브랜드 선택 안 됨"
                  : "상세 카테고리를 선택하면 자동 입력됩니다"}
              </div>
            ) : (
              // 일반: LUXURY_* 항목 제외한 브랜드 드롭다운
              <select className="sell-select" value={brandId}
                onChange={(e) => setBrandId(e.target.value)}>
                <option value="" disabled hidden>브랜드를 선택해주세요</option>
                {brands
                  .filter((b) => !b.code?.startsWith("LUXURY_"))
                  .map((b) => (
                    <option key={b.groupId} value={b.groupId}>{toBrandNameEn(b.name)}</option>
                  ))
                }
                <option value="NOBRAND">브랜드 없음</option>
              </select>
            )}
          </div>

          {/* 판매가 + 기본 배송비 2열 */}
          <div className="sell-field sell-field-row">
            <div className="sell-field-col">
              <div className="sell-field-label">판매가</div>
              <div className="sell-price-wrap">
                <input type="text" className={`sell-input${errors.price ? " error" : ""}`}
                  placeholder="0" value={price}
                  onChange={(e) => setPrice(e.target.value)} />
                <span className="sell-unit">원</span>
              </div>
              {errors.price && <p className="sell-error">{errors.price}</p>}
            </div>
            <div className="sell-field-col">
              <div className="sell-field-label">기본 배송비</div>
              <div className="sell-price-wrap">
                <input type="text" className="sell-input"
                  placeholder="0" value={shippingFee}
                  onChange={(e) => setShippingFee(e.target.value)} />
                <span className="sell-unit">원</span>
              </div>
            </div>
          </div>


          {/* 해시태그 */}
          <div className="sell-field">
            <div className="sell-field-label">해시태그</div>
            <input className="sell-input" placeholder="# 없이 쉼표로 구분해 입력"
              value={hashtags} maxLength={500}
              onChange={(e) => setHashtags(e.target.value)} />
          </div>

          {errors.submit && <p className="sell-error sell-error-submit">{errors.submit}</p>}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { getProductCategories } from "../api/productApi";
import { buildCategoryTree } from "../data/categories";

// 앱 전체에서 공유하는 캐시 — 여러 컴포넌트가 동시에 마운트해도 API 호출은 한 번만 발생
let cache = null;
let pending = null;

export function useCategories() {
  const [categories, setCategories] = useState(cache || []);

  useEffect(() => {
    if (cache) return;
    if (!pending) {
      pending = getProductCategories()
        .then((flatList) => {
          cache = buildCategoryTree(flatList);
          return cache;
        })
        .catch(() => []);
    }
    pending.then((data) => setCategories(data));
  }, []);

  return categories;
}

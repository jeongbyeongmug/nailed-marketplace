import { API_BASE_URL } from "../api/config";

function toBannerImageUrl(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

const toEditorImageUrl = toBannerImageUrl;

export const banners = [
  {
    id: "menswear",
    imageUrl: toBannerImageUrl("/images/banners/banner_menswear.png"),
    editorImageUrl: toEditorImageUrl("/images/miniBanners/minibanner_menswear.png"),
    link: "/category/menswear",
    label: "menswear",
    title: "Menswear",
    description: "가볍고 시원한 여름 데일리 스타일",
  },
  {
    id: "womenswear",
    imageUrl: toBannerImageUrl("/images/banners/banner_womenswear.png"),
    editorImageUrl: toEditorImageUrl("/images/miniBanners/minibanner_womenswear.png"),
    link: "/category/womenswear",
    label: "womenswear",
    title: "Womenswear",
    description: "부드럽게 빛나는 여름의 실루엣",
  },
  {
    id: "luxury",
    imageUrl: toBannerImageUrl("/images/banners/banner_luxury.png"),
    editorImageUrl: toEditorImageUrl("/images/miniBanners/minibanner_luxury.png"),
    link: "/category/luxury",
    label: "luxury",
    title: "Luxury",
    description: "취향을 완성하는 단 하나의 포인트",
  },
  {
    id: "kawaii",
    imageUrl: toBannerImageUrl("/images/banners/banner_keyring.png"),
    editorImageUrl: toEditorImageUrl("/images/miniBanners/minibanner_keyring.png"),
    link: "/category/accessory?subcategory=keyring",
    label: "kawaii",
    title: "Kawaii",
    description: "귀여움이 세상을 지배한다",
  },
  {
    id: "itTech",
    imageUrl: toBannerImageUrl("/images/banners/banner_it_tech.png"),
    editorImageUrl: toEditorImageUrl("/images/miniBanners/minibanner_it_tech.png"),
    link: "/category/tech",
    label: "itTech",
    title: "IT/Tech",
    description: "필요한 순간 더 빛나는 스마트한 선택",
  },
  {
    id: "backpack",
    imageUrl: toBannerImageUrl("/images/banners/banner_backpack.png"),
    editorImageUrl: toEditorImageUrl("/images/miniBanners/minibanner_backpack.png"),
    link: "/search?keyword=%EB%B0%B1%ED%8C%A9",
    label: "backpack",
    title: "Bag your Back",
    subTitle: "데일리부터 아웃도어까지, 지금 가장 필요한 백팩",
    description: "데일리부터 아웃도어까지, 지금 가장 필요한 백팩",
  },
];

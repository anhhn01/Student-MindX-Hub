export interface CentreItem {
  id: string;
  name: string;
  shortName?: string;
  code?: string;
}

// Danh mục cơ sở chính thống từ hệ thống MindX LMS
export const OFFICIAL_LMS_CENTRES: CentreItem[] = [
  { id: "62d6dcc16e356729147d73a6", name: "HCM - 01 Trường Chinh", shortName: "01TC", code: "TC" },
  { id: "62918d02af37d11e2da237e5", name: "HCM - Khu Tên Lửa", shortName: "174TL", code: "TL" },
  { id: "63034f4a7d1d1e1cb14e4e57", name: "HCM - 322 Tây Thạnh", shortName: "322TT", code: "TT" },
  { id: "62cc07753c1309654f472e60", name: "HCM - 414 Lũy Bán Bích", shortName: "414LBB", code: "LBB" },
  { id: "62d6dc936e356729147d7399", name: "HCM - 01 Tô Ký", shortName: "01TK", code: "TK" },
  { id: "609bf4149535070ca5e3edc0", name: "HCM - Phan Văn Trị", shortName: "672A28PVT", code: "APVT" },
  { id: "62b0234675379306da49f051", name: "HCM - 261-263 Phan Xích Long", shortName: "261-263PXL", code: "PXL" },
  { id: "63034f877d1d1e1cb14e4e5f", name: "HCM - 01 Quang Trung", shortName: "01QT", code: "QT" },
  { id: "60dc9c0f67b97226e3f75881", name: "HCM - 343 Phạm Ngũ Lão", shortName: "343PNL", code: "PNL" },
  { id: "62918d34af37d11e2da237f1", name: "HCM - Phú Mỹ Hưng", shortName: "490 PTB", code: "PTB" },
  { id: "62b023b875379306da49f059", name: "HCM - 165-167 Nguyễn Thị Thập", shortName: "165-167NTT", code: "HL" },
  { id: "63034f0d7d1d1e1cb14e4e4c", name: "HCM - 618 Đường 3/2", shortName: "6183/2", code: "3/2" },
  { id: "62d6dc096e356729147d737c", name: "HCM - 39 Hải Thượng Lãn Ông", shortName: "39HTLO", code: "HTLO" },
  { id: "62d6dc436e356729147d7386", name: "HCM - 223 Nguyễn Xí", shortName: "223NX", code: "NX" },
  { id: "5c7feee8568ccae9b6e3861a", name: "HN - 22C Thành Công", shortName: "22CTC", code: "CTC" },
  { id: "65167eb347530b6c8968e0be", name: "MindX - Online - HN", shortName: "HN-ONLINE", code: "HNONLINE" },
  { id: "5fa97e4d7d99b9046207a21e", name: "MindX - Online", shortName: "HCM-Online", code: "ONL" },
  { id: "68f7567e00e152ef27681640", name: "Mindx - Online 3", shortName: "HCM-Online 3", code: "HCMOnline" },
  { id: "6687c1121c9ad0001cf28068", name: "Trường mầm non Chào bạn nhỏ (Redbean)", shortName: "MN-HCM-NDT-01", code: "MNHCMNDT" },
  { id: "68ef6940981108cf9a5baae3", name: "Trường Mầm non Kokoro Cityland", shortName: "MN-HCM-CTLGV", code: "MNHCMCTLGV" }
];

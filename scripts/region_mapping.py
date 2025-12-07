# Health Region Mapping
# Note: Input provinces from extraction might be in Thai (e.g. "นนทบุรี") or "Bangkok" (special case)

HEALTH_REGIONS = {
    1: ["เชียงราย", "น่าน", "พะเยา", "แพร่", "เชียงใหม่", "แม่ฮ่องสอน", "ลำปาง", "ลำพูน"],
    2: ["ตาก", "พิษณุโลก", "เพชรบูรณ์", "สุโขทัย", "อุตรดิตถ์"],
    3: ["ชัยนาท", "กำแพงเพชร", "พิจิตร", "นครสวรรค์", "อุทัยธานี"],
    4: ["นนทบุรี", "ปทุมธานี", "พระนครศรีอยุธยา", "สระบุรี", "ลพบุรี", "สิงห์บุรี", "อ่างทอง", "นครนายก"],
    5: ["กาญจนบุรี", "นครปฐม", "ราชบุรี", "สุพรรณบุรี", "ประจวบคีรีขันธ์", "เพชรบุรี", "สมุทรสงคราม", "สมุทรสาคร"],
    6: ["ฉะเชิงเทรา", "ปราจีนบุรี", "สระแก้ว", "สมุทรปราการ", "จันทบุรี", "ชลบุรี", "ตราด", "ระยอง"],
    7: ["กาฬสินธุ์", "ขอนแก่น", "มหาสารคาม", "ร้อยเอ็ด"],
    8: ["บึงกาฬ", "เลย", "หนองคาย", "หนองบัวลำภู", "อุดรธานี", "นครพนม", "สกลนคร"],
    9: ["ชัยภูมิ", "นครราชสีมา", "บุรีรัมย์", "สุรินทร์"],
    10: ["มุกดาหาร", "ยโสธร", "ศรีสะเกษ", "อุบลราชธานี", "อำนาจเจริญ"],
    11: ["ชุมพร", "นครศรีธรรมราช", "สุราษฎร์ธานี", "กระบี่", "พังงา", "ภูเก็ต", "ระนอง"],
    12: ["พัทลุง", "ตรัง", "นราธิวาส", "ปัตตานี", "ยะลา", "สงขลา", "สตูล"],
    13: ["กรุงเทพมหานคร", "Bangkok"] # Coping with extracted "Bangkok" or Thai variants
}

# Reverse map for easy lookup
PROVINCE_TO_REGION = {}
for region, provinces in HEALTH_REGIONS.items():
    for p in provinces:
        PROVINCE_TO_REGION[p] = f"เขตสุขภาพที่ {region}"

def get_region(province):
    # province here is the one extracted from process_data.py
    # In process_data: 
    #   if "กทม" or "กรุงเทพ" -> "Bangkok"
    #   else -> Thai name extracted after "จ."
    
    # We need to ensure we match the keys in PROVINCE_TO_REGION
    return PROVINCE_TO_REGION.get(province, "Unknown Region")

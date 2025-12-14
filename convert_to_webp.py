import os
from PIL import Image
import sys

def convert_to_webp(input_path, output_path, quality=85):
    """PNG 이미지를 WebP로 변환"""
    try:
        img = Image.open(input_path)
        # RGBA 모드인 경우 처리
        if img.mode in ('RGBA', 'LA'):
            img.save(output_path, 'WEBP', quality=quality, method=6)
        else:
            img = img.convert('RGB')
            img.save(output_path, 'WEBP', quality=quality, method=6)
        
        original_size = os.path.getsize(input_path)
        new_size = os.path.getsize(output_path)
        reduction = ((original_size - new_size) / original_size) * 100
        
        print(f"✓ {os.path.basename(input_path)} -> {os.path.basename(output_path)}")
        print(f"  크기: {original_size / 1024:.1f}KB -> {new_size / 1024:.1f}KB ({reduction:.1f}% 감소)")
        return True
    except Exception as e:
        print(f"✗ 오류: {input_path} - {e}")
        return False

def process_folder(folder_path):
    """폴더 내의 모든 PNG 파일을 WebP로 변환"""
    if not os.path.exists(folder_path):
        print(f"폴더를 찾을 수 없습니다: {folder_path}")
        return
    
    converted = 0
    for filename in os.listdir(folder_path):
        if filename.lower().endswith('.png'):
            input_path = os.path.join(folder_path, filename)
            output_filename = os.path.splitext(filename)[0] + '.webp'
            output_path = os.path.join(folder_path, output_filename)
            
            if convert_to_webp(input_path, output_path):
                converted += 1
    
    print(f"\n{converted}개 파일 변환 완료: {folder_path}")

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    pc_folder = os.path.join(base_dir, "images", "pc")
    mob_folder = os.path.join(base_dir, "images", "mob")
    
    print("이미지 WebP 변환 시작...\n")
    print("=" * 50)
    print("PC 폴더 변환:")
    print("=" * 50)
    process_folder(pc_folder)
    
    print("\n" + "=" * 50)
    print("MOB 폴더 변환:")
    print("=" * 50)
    process_folder(mob_folder)
    
    print("\n모든 변환 완료!")


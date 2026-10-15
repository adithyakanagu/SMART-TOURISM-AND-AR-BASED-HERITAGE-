import os
from PIL import Image, ImageOps

base_dir = r"C:\Users\adith\Downloads\ar-smart-tourism-heritage-app"
logo_path = os.path.join(base_dir, "public", "nilgiris-logo.png")
res_dir = os.path.join(base_dir, "android", "app", "src", "main", "res")

if not os.path.exists(logo_path):
    print(f"Error: logo not found at {logo_path}")
    exit(1)

img = Image.open(logo_path).convert("RGBA")

# Mipmap dimensions
mipmap_sizes = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192
}

foreground_sizes = {
    "mipmap-mdpi": 108,
    "mipmap-hdpi": 162,
    "mipmap-xhdpi": 216,
    "mipmap-xxhdpi": 324,
    "mipmap-xxxhdpi": 432
}

for folder, size in mipmap_sizes.items():
    folder_path = os.path.join(res_dir, folder)
    os.makedirs(folder_path, exist_ok=True)
    
    # Square ic_launcher.png
    resized = img.resize((size, size), Image.Resampling.LANCZOS)
    resized.save(os.path.join(folder_path, "ic_launcher.png"))
    resized.save(os.path.join(folder_path, "ic_launcher_round.png"))
    
    # Adaptive foreground (icon inside canvas with margin)
    fg_size = foreground_sizes[folder]
    fg_img = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
    inner_size = int(fg_size * 0.65)
    inner_resized = img.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
    offset = (fg_size - inner_size) // 2
    fg_img.paste(inner_resized, (offset, offset), inner_resized)
    fg_img.save(os.path.join(folder_path, "ic_launcher_foreground.png"))
    print(f"Updated icons for {folder}")

# Splash screen dimensions
splash_sizes = {
    "drawable": (512, 512),
    "drawable-port-mdpi": (320, 480),
    "drawable-port-hdpi": (480, 800),
    "drawable-port-xhdpi": (720, 1280),
    "drawable-port-xxhdpi": (960, 1600),
    "drawable-port-xxxhdpi": (1280, 1920),
    "drawable-land-mdpi": (480, 320),
    "drawable-land-hdpi": (800, 480),
    "drawable-land-xhdpi": (1280, 720),
    "drawable-land-xxhdpi": (1600, 960),
    "drawable-land-xxxhdpi": (1920, 1280)
}

for folder, (w, h) in splash_sizes.items():
    folder_path = os.path.join(res_dir, folder)
    os.makedirs(folder_path, exist_ok=True)
    
    # White background with centered logo
    splash_bg = Image.new("RGBA", (w, h), (255, 255, 255, 255))
    logo_max = min(w, h) // 2
    logo_resized = img.resize((logo_max, logo_max), Image.Resampling.LANCZOS)
    pos = ((w - logo_max) // 2, (h - logo_max) // 2)
    splash_bg.paste(logo_resized, pos, logo_resized)
    splash_bg.save(os.path.join(folder_path, "splash.png"))
    print(f"Updated splash for {folder}")

print("All Android app thumbnails and splash screens updated successfully!")

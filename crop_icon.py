from PIL import Image, ImageDraw

src = r'D:\Downloads\1781348173.png'
img = Image.open(src).convert('RGBA')
w, h = img.size

# Create rounded rectangle mask (corner radius ~15% of size)
radius = int(w * 0.18)
mask = Image.new('L', (w, h), 0)
draw = ImageDraw.Draw(mask)
draw.rounded_rectangle([(0, 0), (w-1, h-1)], radius=radius, fill=255)

# Apply mask
output = Image.new('RGBA', (w, h), (0, 0, 0, 0))
output.paste(img, (0, 0), mask)

out_path = r'D:\Downloads\1781348173_rounded.png'
output.save(out_path)
print(f"Saved: {out_path} ({w}x{h}, radius={radius})")

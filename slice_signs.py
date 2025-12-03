import os
from PIL import Image

def slice_image(image_path, output_dir):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    img = Image.open(image_path)
    width, height = img.size
    
    # Assuming a standard grid layout for 26 letters.
    # Usually these charts are 5 rows x 6 cols or similar.
    # Let's try to detect rows and cols or just assume a common layout.
    # If it's the standard "Sign_language_alphabet_(58).png" from Wikipedia/common sources,
    # it might be 7 cols x 4 rows (28 slots) or similar.
    # Let's assume a 7 columns x 4 rows grid for now as a best guess for 26 letters + maybe space/delimiters.
    # Or 6 cols x 5 rows.
    
    # Let's try to be smart: Detect whitespace to find grid lines?
    # For now, let's try a 6x5 grid (30 slots) which fits 26 letters.
    # Actually, let's just do a simple 6x5 split and see.
    
    rows = 5
    cols = 6
    
    cell_width = width // cols
    cell_height = height // rows
    
    letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    
    for i, letter in enumerate(letters):
        row = i // cols
        col = i % cols
        
        left = col * cell_width
        top = row * cell_height
        right = left + cell_width
        bottom = top + cell_height
        
        # Crop
        cell = img.crop((left, top, right, bottom))
        
        # Save
        cell.save(f"{output_dir}/{letter}.png")
        print(f"Saved {letter}.png")

if __name__ == "__main__":
    try:
        slice_image("public/signs.png", "public/signs")
        print("Slicing complete.")
    except ImportError:
        print("Pillow not installed. Please install it.")
    except Exception as e:
        print(f"Error: {e}")

def convert264(img_path):
    import PIL.Image
    import io
    import base64
    path = '/Users/felixgonzalez/Desktop/Il Violino Dish Images/'
    full_img_path = path + img_path
    dish_name = img_path.split('.')[0]
    img = PIL.Image.open(full_img_path)
    w, h = img.size
    img = img.resize((512, 512*h//w))
    buffer = io.BytesIO()
    img.save(buffer, format='jpeg')
    b64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
    return b64

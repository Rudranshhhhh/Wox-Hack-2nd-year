import requests
import base64

def test_vision_api():
    try:
        # Open and read the image file
        with open('test_image.jpg', 'rb') as image_file:
            # Convert image to base64
            image_data = base64.b64encode(image_file.read()).decode('utf-8')
            
            # Send request to local server
            response = requests.post(
                'http://127.0.0.1:5000/scan_image',
                json={'image': image_data}
            )
            
            print("Status Code:", response.status_code)
            print("Response:", response.json())
            
    except FileNotFoundError:
        print("Error: test_image.jpg not found. Please add a test image to the backend folder.")
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to server. Make sure the Flask server is running on http://127.0.0.1:5000")
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    test_vision_api()
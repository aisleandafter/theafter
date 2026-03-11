"""
Backend API tests for iteration 8 new features:
1. QR code generator for countdown page (GET /api/countdown/{event_code}/qr)
2. Promo codes validation in payment flow
3. Photo upload with circular crop
4. Notification system
"""

import pytest
import requests
import os
from io import BytesIO

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://love-at-aisle.preview.emergentagent.com').rstrip('/')

# Test credentials
GUEST_EMAIL = "alice@demo.com"
GUEST_PASSWORD = "demo123"
HOST_EMAIL = "testhost@demo.com"
HOST_PASSWORD = "demo123"
EVENT_CODE = "EULF18"


# ============ QR CODE ENDPOINT TESTS ============
class TestQRCodeEndpoint:
    """QR code generation endpoint tests - PUBLIC endpoint (no auth required)"""
    
    def test_qr_code_valid_event(self):
        """Test GET /api/countdown/EULF18/qr - should return 200 with image/png content type"""
        response = requests.get(f"{BASE_URL}/api/countdown/{EVENT_CODE}/qr")
        
        assert response.status_code == 200, f"QR code endpoint failed: {response.status_code} - {response.text}"
        
        # Verify content type is PNG image
        content_type = response.headers.get('content-type', '')
        assert 'image/png' in content_type.lower(), f"Expected image/png content-type, got: {content_type}"
        
        # Verify we got actual image data (PNG starts with specific bytes)
        assert len(response.content) > 100, f"QR code image too small: {len(response.content)} bytes"
        
        # PNG files start with specific magic bytes: 89 50 4E 47
        png_header = response.content[:4]
        assert png_header == b'\x89PNG', f"Response doesn't look like a PNG image"
        
        print(f"✓ QR code generated for event {EVENT_CODE}: content-type={content_type}, size={len(response.content)} bytes")
    
    def test_qr_code_invalid_event(self):
        """Test GET /api/countdown/INVALID/qr - should return 404 for non-existent event"""
        response = requests.get(f"{BASE_URL}/api/countdown/INVALIDCODE/qr")
        
        assert response.status_code == 404, f"Expected 404 for invalid event, got {response.status_code}"
        print("✓ QR code endpoint correctly returns 404 for invalid event code")
    
    def test_countdown_endpoint_returns_event_code(self):
        """Test GET /api/countdown/EULF18 - verify it returns event_code field"""
        response = requests.get(f"{BASE_URL}/api/countdown/{EVENT_CODE}")
        
        assert response.status_code == 200, f"Countdown endpoint failed: {response.text}"
        data = response.json()
        
        # Verify event_code is returned
        assert "event_code" in data, f"Missing event_code in response: {data}"
        assert data["event_code"] == EVENT_CODE.upper(), f"Event code mismatch: {data['event_code']}"
        
        print(f"✓ Countdown endpoint returns event_code: {data['event_code']}")


# ============ PROMO CODE VALIDATION TESTS ============
class TestPromoCodeValidation:
    """Promo code validation endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for testing"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": GUEST_EMAIL,
            "password": GUEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Could not get auth token")
    
    def test_promo_love2026_returns_correct_discount(self, auth_token):
        """Test POST /api/promo/validate with LOVE2026 - should return 50% discount"""
        response = requests.post(
            f"{BASE_URL}/api/promo/validate",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"code": "LOVE2026"}
        )
        
        assert response.status_code == 200, f"Promo validation failed: {response.text}"
        data = response.json()
        
        # Validate all expected fields
        assert data["valid"] == True, f"Expected valid=true, got: {data['valid']}"
        assert data["discount_percent"] == 50, f"Expected 50% discount, got: {data['discount_percent']}"
        assert data["final_price"] == 25.0, f"Expected final_price=25.0, got: {data['final_price']}"
        assert data["original_price"] == 49.99, f"Expected original_price=49.99, got: {data['original_price']}"
        assert data["description"] == "50% off", f"Expected description='50% off', got: {data['description']}"
        
        print(f"✓ LOVE2026 promo: {data['discount_percent']}% off, final=${data['final_price']}")
    
    def test_promo_wedding_returns_correct_discount(self, auth_token):
        """Test POST /api/promo/validate with WEDDING - should return 25% discount"""
        response = requests.post(
            f"{BASE_URL}/api/promo/validate",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"code": "WEDDING"}
        )
        
        assert response.status_code == 200, f"Promo validation failed: {response.text}"
        data = response.json()
        
        assert data["valid"] == True
        assert data["discount_percent"] == 25
        assert data["final_price"] == 37.49
        
        print(f"✓ WEDDING promo: {data['discount_percent']}% off, final=${data['final_price']}")
    
    def test_promo_freeaisle_returns_100_percent(self, auth_token):
        """Test POST /api/promo/validate with FREEAISLE - should return 100% discount"""
        response = requests.post(
            f"{BASE_URL}/api/promo/validate",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"code": "FREEAISLE"}
        )
        
        assert response.status_code == 200, f"Promo validation failed: {response.text}"
        data = response.json()
        
        assert data["valid"] == True
        assert data["discount_percent"] == 100
        assert data["final_price"] == 0
        
        print(f"✓ FREEAISLE promo: FREE!")
    
    def test_promo_invalid_returns_404(self, auth_token):
        """Test POST /api/promo/validate with INVALID - should return 404"""
        response = requests.post(
            f"{BASE_URL}/api/promo/validate",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"code": "INVALID"}
        )
        
        assert response.status_code == 404, f"Expected 404 for invalid promo, got {response.status_code}"
        print("✓ Invalid promo code returns 404")


# ============ FREE PROMO CHECKOUT TEST ============
class TestFreePromoCheckout:
    """Test checkout with FREEAISLE promo code (bypasses Stripe)"""
    
    def test_checkout_with_freeaisle_returns_paid_free(self):
        """Test POST /api/payments/checkout with promo_code=FREEAISLE for new host
        Should return paid_free=true (no Stripe redirect)
        """
        # Register a fresh host for this test
        import uuid
        unique_email = f"testhost_{uuid.uuid4().hex[:8]}@test.com"
        
        # Register new host
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "demo123",
            "name": "Test Host",
            "is_host": True
        })
        
        if reg_response.status_code != 200:
            pytest.skip(f"Could not create test host: {reg_response.text}")
        
        token = reg_response.json()["token"]
        
        # Try checkout with FREEAISLE promo
        checkout_response = requests.post(
            f"{BASE_URL}/api/payments/checkout",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "origin_url": "https://love-at-aisle.preview.emergentagent.com",
                "promo_code": "FREEAISLE"
            }
        )
        
        assert checkout_response.status_code == 200, f"Checkout failed: {checkout_response.text}"
        data = checkout_response.json()
        
        # Verify paid_free is true
        assert data.get("paid_free") == True, f"Expected paid_free=true, got: {data}"
        assert data.get("checkout_url") is None, "checkout_url should be None for free promo"
        assert data.get("session_id") is None, "session_id should be None for free promo"
        
        print(f"✓ FREEAISLE checkout: paid_free=true (Stripe bypassed)")


# ============ PHOTO UPLOAD TESTS ============
class TestPhotoUpload:
    """Photo upload endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": GUEST_EMAIL,
            "password": GUEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Could not get auth token")
    
    def test_photo_upload_returns_url_and_file_id(self, auth_token):
        """Test POST /api/photos/upload - upload test image, should return photo_url and file_id"""
        # Create a test image using PIL
        try:
            from PIL import Image
            img = Image.new('RGB', (200, 200), color='coral')
            img_bytes = BytesIO()
            img.save(img_bytes, format='JPEG')
            img_bytes.seek(0)
        except ImportError:
            pytest.skip("PIL not available for test image generation")
        
        files = {'file': ('test_photo.jpg', img_bytes, 'image/jpeg')}
        response = requests.post(
            f"{BASE_URL}/api/photos/upload",
            headers={"Authorization": f"Bearer {auth_token}"},
            files=files
        )
        
        # May get 503 if object storage is temporarily unavailable
        if response.status_code == 500:
            data = response.json()
            if "Failed to upload" in str(data.get("detail", "")):
                pytest.skip("Object storage temporarily unavailable")
        
        assert response.status_code == 200, f"Photo upload failed: {response.status_code} - {response.text}"
        data = response.json()
        
        assert "photo_url" in data, f"Missing photo_url: {data}"
        assert "file_id" in data, f"Missing file_id: {data}"
        assert data["photo_url"].startswith("/api/photos/"), f"photo_url format wrong: {data['photo_url']}"
        
        print(f"✓ Photo uploaded: photo_url={data['photo_url']}, file_id={data['file_id']}")
        
        # Store file_id for serve test
        return data["file_id"]
    
    def test_photo_serve_returns_image(self, auth_token):
        """Test GET /api/photos/{file_id} - should serve uploaded photo as image/png"""
        # First upload a photo
        try:
            from PIL import Image
            img = Image.new('RGB', (100, 100), color='blue')
            img_bytes = BytesIO()
            img.save(img_bytes, format='JPEG')
            img_bytes.seek(0)
        except ImportError:
            pytest.skip("PIL not available")
        
        # Upload
        files = {'file': ('test.jpg', img_bytes, 'image/jpeg')}
        upload_response = requests.post(
            f"{BASE_URL}/api/photos/upload",
            headers={"Authorization": f"Bearer {auth_token}"},
            files=files
        )
        
        if upload_response.status_code != 200:
            pytest.skip("Could not upload test photo")
        
        file_id = upload_response.json()["file_id"]
        
        # Now serve it
        serve_response = requests.get(f"{BASE_URL}/api/photos/{file_id}")
        
        assert serve_response.status_code == 200, f"Photo serve failed: {serve_response.status_code}"
        
        content_type = serve_response.headers.get('content-type', '')
        assert 'image' in content_type.lower(), f"Expected image content-type, got: {content_type}"
        
        print(f"✓ Photo served: content-type={content_type}, size={len(serve_response.content)} bytes")


# ============ NOTIFICATION TESTS ============
class TestNotifications:
    """Notification endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": GUEST_EMAIL,
            "password": GUEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Could not get auth token")
    
    def test_get_notifications_returns_array(self, auth_token):
        """Test GET /api/notifications - should return notifications array"""
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Get notifications failed: {response.text}"
        data = response.json()
        
        assert "notifications" in data, f"Missing notifications: {data}"
        assert "unread_count" in data, f"Missing unread_count: {data}"
        assert isinstance(data["notifications"], list)
        assert isinstance(data["unread_count"], int)
        
        print(f"✓ Notifications: {len(data['notifications'])} items, {data['unread_count']} unread")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

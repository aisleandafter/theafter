"""
Backend API tests for iteration 7 new features:
1. Photo upload with circular cropping (POST /api/photos/upload, GET /api/photos/{file_id})
2. Promo codes for Stripe payment (POST /api/promo/validate)
3. In-app notification system (GET /api/notifications, POST /api/notifications/read-all)
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
EXISTING_PHOTO_FILE_ID = "26b784a5-ae03-40e4-a80e-9d2ceaf579d7"


# ============ PHOTO UPLOAD TESTS ============
class TestPhotoUpload:
    """Photo upload and serving endpoint tests"""
    
    @pytest.fixture
    def guest_token(self):
        """Get auth token for guest user (alice@demo.com)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": GUEST_EMAIL,
            "password": GUEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Could not get guest token")
    
    def test_photo_upload_success(self, guest_token):
        """Test POST /api/photos/upload - upload an image file
        Should return photo_url starting with /api/photos/ and file_id
        """
        # Create a test image using PIL
        try:
            from PIL import Image
            img = Image.new('RGB', (200, 200), color='coral')
            img_bytes = BytesIO()
            img.save(img_bytes, format='JPEG')
            img_bytes.seek(0)
        except ImportError:
            # Fallback: use a minimal JPEG bytes
            pytest.skip("PIL not available for test image generation")
        
        # Upload the image
        files = {'file': ('test_photo.jpg', img_bytes, 'image/jpeg')}
        response = requests.post(
            f"{BASE_URL}/api/photos/upload",
            headers={"Authorization": f"Bearer {guest_token}"},
            files=files
        )
        
        assert response.status_code == 200, f"Photo upload failed: {response.status_code} - {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "photo_url" in data, f"Response missing photo_url: {data}"
        assert "file_id" in data, f"Response missing file_id: {data}"
        
        # Verify photo_url format
        assert data["photo_url"].startswith("/api/photos/"), f"photo_url should start with /api/photos/, got: {data['photo_url']}"
        
        # Verify file_id is a valid UUID-like string
        assert len(data["file_id"]) > 10, f"file_id seems too short: {data['file_id']}"
        
        print(f"✓ Photo upload success: photo_url={data['photo_url']}, file_id={data['file_id']}")
        return data["file_id"]
    
    def test_photo_serve_existing_file(self):
        """Test GET /api/photos/{file_id} - serve uploaded photo (PUBLIC endpoint)
        Should return 200 with content-type image/png
        """
        response = requests.get(f"{BASE_URL}/api/photos/{EXISTING_PHOTO_FILE_ID}")
        
        assert response.status_code == 200, f"Photo serve failed: {response.status_code} - {response.text}"
        
        # Verify content type is image
        content_type = response.headers.get('content-type', '')
        assert 'image' in content_type.lower(), f"Expected image content-type, got: {content_type}"
        
        # Verify some content was returned
        assert len(response.content) > 0, "Photo response has no content"
        
        print(f"✓ Photo serve success: content-type={content_type}, size={len(response.content)} bytes")
    
    def test_photo_serve_invalid_file_id(self):
        """Test GET /api/photos/{invalid_id} - should return 404"""
        response = requests.get(f"{BASE_URL}/api/photos/invalid-file-id-12345")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid photo file_id correctly returns 404")
    
    def test_photo_upload_non_image_rejected(self, guest_token):
        """Test POST /api/photos/upload rejects non-image files"""
        # Create a text file
        text_bytes = BytesIO(b"This is not an image")
        files = {'file': ('test.txt', text_bytes, 'text/plain')}
        
        response = requests.post(
            f"{BASE_URL}/api/photos/upload",
            headers={"Authorization": f"Bearer {guest_token}"},
            files=files
        )
        
        assert response.status_code == 400, f"Expected 400 for non-image, got {response.status_code}"
        print("✓ Non-image file correctly rejected with 400")


# ============ PROMO CODE TESTS ============
class TestPromoCodes:
    """Promo code validation endpoint tests"""
    
    @pytest.fixture
    def guest_token(self):
        """Get auth token for guest user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": GUEST_EMAIL,
            "password": GUEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Could not get guest token")
    
    @pytest.fixture
    def host_token(self):
        """Get auth token for host user (testhost@demo.com)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": HOST_EMAIL,
            "password": HOST_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Could not get host token")
    
    def test_promo_love2026_50_percent(self, guest_token):
        """Test POST /api/promo/validate with code LOVE2026
        Should return valid=true, discount_percent=50, final_price=25.0
        """
        response = requests.post(
            f"{BASE_URL}/api/promo/validate",
            headers={"Authorization": f"Bearer {guest_token}"},
            json={"code": "LOVE2026"}
        )
        
        assert response.status_code == 200, f"Promo validation failed: {response.text}"
        data = response.json()
        
        # Verify response structure and values
        assert data["valid"] == True
        assert data["discount_percent"] == 50
        assert data["final_price"] == 25.0  # 49.99 * 0.5 rounded
        assert data["original_price"] == 49.99
        
        print(f"✓ LOVE2026 promo validated: {data['discount_percent']}% off, final=${data['final_price']}")
    
    def test_promo_wedding_25_percent(self, guest_token):
        """Test POST /api/promo/validate with code WEDDING
        Should return valid=true, discount_percent=25, final_price=37.49
        """
        response = requests.post(
            f"{BASE_URL}/api/promo/validate",
            headers={"Authorization": f"Bearer {guest_token}"},
            json={"code": "WEDDING"}
        )
        
        assert response.status_code == 200, f"Promo validation failed: {response.text}"
        data = response.json()
        
        # Verify response
        assert data["valid"] == True
        assert data["discount_percent"] == 25
        assert data["final_price"] == 37.49  # 49.99 * 0.75 rounded
        
        print(f"✓ WEDDING promo validated: {data['discount_percent']}% off, final=${data['final_price']}")
    
    def test_promo_freeaisle_100_percent(self, guest_token):
        """Test POST /api/promo/validate with code FREEAISLE
        Should return valid=true, discount_percent=100, final_price=0
        """
        response = requests.post(
            f"{BASE_URL}/api/promo/validate",
            headers={"Authorization": f"Bearer {guest_token}"},
            json={"code": "FREEAISLE"}
        )
        
        assert response.status_code == 200, f"Promo validation failed: {response.text}"
        data = response.json()
        
        # Verify response
        assert data["valid"] == True
        assert data["discount_percent"] == 100
        assert data["final_price"] == 0
        
        print(f"✓ FREEAISLE promo validated: 100% off, FREE!")
    
    def test_promo_invalid_code_404(self, guest_token):
        """Test POST /api/promo/validate with invalid code returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/promo/validate",
            headers={"Authorization": f"Bearer {guest_token}"},
            json={"code": "INVALIDCODE"}
        )
        
        assert response.status_code == 404, f"Expected 404 for invalid promo, got {response.status_code}"
        print("✓ Invalid promo code correctly returns 404")
    
    def test_promo_case_insensitive(self, guest_token):
        """Test that promo codes are case-insensitive (love2026 == LOVE2026)"""
        response = requests.post(
            f"{BASE_URL}/api/promo/validate",
            headers={"Authorization": f"Bearer {guest_token}"},
            json={"code": "love2026"}  # lowercase
        )
        
        assert response.status_code == 200, f"Lowercase promo failed: {response.text}"
        data = response.json()
        assert data["valid"] == True
        assert data["code"] == "LOVE2026"  # Should be normalized to uppercase
        
        print("✓ Promo codes are case-insensitive")
    
    def test_payment_checkout_with_freeaisle_promo(self, host_token):
        """Test POST /api/payments/checkout with promo_code=FREEAISLE
        Should return paid_free=true (no Stripe redirect needed)
        Note: May return 400 if host already has an active event package
        """
        response = requests.post(
            f"{BASE_URL}/api/payments/checkout",
            headers={"Authorization": f"Bearer {host_token}"},
            json={
                "origin_url": "https://love-at-aisle.preview.emergentagent.com",
                "promo_code": "FREEAISLE"
            }
        )
        
        if response.status_code == 400:
            data = response.json()
            # This is expected if host already has an active event package
            print(f"⚠ Host already has active package: {data.get('detail')}")
            return
        
        assert response.status_code == 200, f"Checkout with FREEAISLE failed: {response.text}"
        data = response.json()
        
        # When using 100% discount, should get paid_free=true
        assert data.get("paid_free") == True, f"Expected paid_free=true, got: {data}"
        assert data.get("checkout_url") is None
        assert data.get("session_id") is None
        
        print("✓ FREEAISLE promo checkout: paid_free=true (no Stripe redirect)")


# ============ NOTIFICATION TESTS ============
class TestNotifications:
    """Notification system endpoint tests"""
    
    @pytest.fixture
    def guest_token(self):
        """Get auth token for guest user (alice@demo.com)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": GUEST_EMAIL,
            "password": GUEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Could not get guest token")
    
    def test_get_notifications(self, guest_token):
        """Test GET /api/notifications - should return notifications array and unread_count"""
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {guest_token}"}
        )
        
        assert response.status_code == 200, f"Get notifications failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "notifications" in data, f"Missing notifications key: {data}"
        assert "unread_count" in data, f"Missing unread_count key: {data}"
        
        # Verify types
        assert isinstance(data["notifications"], list)
        assert isinstance(data["unread_count"], int)
        
        print(f"✓ Notifications endpoint: {len(data['notifications'])} notifications, {data['unread_count']} unread")
        
        # If there are notifications, verify structure
        if len(data["notifications"]) > 0:
            notif = data["notifications"][0]
            assert "id" in notif
            assert "user_id" in notif
            assert "type" in notif
            assert "title" in notif
            assert "message" in notif
            assert "read" in notif
            assert "created_at" in notif
            print(f"  Sample notification: type={notif['type']}, title={notif['title']}")
    
    def test_mark_notifications_read(self, guest_token):
        """Test POST /api/notifications/read-all - should mark all as read"""
        # First, get current unread count
        get_response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {guest_token}"}
        )
        initial_unread = get_response.json().get("unread_count", 0)
        
        # Mark all as read
        response = requests.post(
            f"{BASE_URL}/api/notifications/read-all",
            headers={"Authorization": f"Bearer {guest_token}"}
        )
        
        assert response.status_code == 200, f"Mark read failed: {response.text}"
        data = response.json()
        assert data.get("status") == "ok", f"Expected status=ok, got: {data}"
        
        # Verify unread count is now 0
        verify_response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {guest_token}"}
        )
        verify_data = verify_response.json()
        assert verify_data["unread_count"] == 0, f"Expected 0 unread after marking all read, got: {verify_data['unread_count']}"
        
        print(f"✓ Mark notifications read: {initial_unread} -> 0 unread")
    
    def test_notifications_requires_auth(self):
        """Test that notifications endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/notifications")
        # Should return 403 (Forbidden) without auth
        assert response.status_code == 403, f"Expected 403 without auth, got {response.status_code}"
        print("✓ Notifications endpoint correctly requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

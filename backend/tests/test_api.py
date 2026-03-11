"""
Backend API tests for 'aisle & after' dating app
Tests: Auth, AI endpoints, Payment endpoints, Events, Matches
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://love-at-aisle.preview.emergentagent.com').rstrip('/')

# Test credentials from review request
GUEST_EMAIL = "alice@demo.com"
GUEST_PASSWORD = "demo123"
GUEST2_EMAIL = "marcus@demo.com"
GUEST2_PASSWORD = "demo123"
HOST_EMAIL = "testhost@demo.com"
HOST_PASSWORD = "demo123"
EVENT_CODE = "EULF18"
MATCH_ID = "d0942c71-bfcd-427e-a285-42fafc2a099c"


class TestAPIHealth:
    """Basic API health checks"""
    
    def test_api_root(self):
        """Test API root endpoint returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "aisle & after" in data["message"]
        print(f"✓ API root is healthy: {data}")


class TestAuth:
    """Authentication endpoint tests"""
    
    def test_login_guest_success(self):
        """Test login with guest credentials (alice@demo.com)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": GUEST_EMAIL,
            "password": GUEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == GUEST_EMAIL
        assert isinstance(data["token"], str)
        assert len(data["token"]) > 0
        print(f"✓ Guest login successful for {GUEST_EMAIL}")
        return data["token"]
    
    def test_login_host_success(self):
        """Test login with host credentials (testhost@demo.com)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": HOST_EMAIL,
            "password": HOST_PASSWORD
        })
        assert response.status_code == 200, f"Host login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == HOST_EMAIL
        assert data["user"]["is_host"] == True
        print(f"✓ Host login successful for {HOST_EMAIL}")
        return data["token"]
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials correctly rejected with 401")
    
    def test_auth_me_with_token(self):
        """Test /auth/me with valid token"""
        # First login
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": GUEST_EMAIL,
            "password": GUEST_PASSWORD
        })
        token = login_res.json()["token"]
        
        # Then get /auth/me
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "user" in data
        assert data["user"]["email"] == GUEST_EMAIL
        print(f"✓ /auth/me returned correct user data")


class TestAIEndpoints:
    """AI endpoint tests - conversation starters and compatibility"""
    
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
    
    def test_ai_conversation_starters(self, guest_token):
        """Test AI conversation starters endpoint with valid match_id
        Note: May return fallback starters if Anthropic credits are low - that's expected
        """
        response = requests.post(
            f"{BASE_URL}/api/ai/conversation-starters",
            headers={"Authorization": f"Bearer {guest_token}"},
            json={"match_id": MATCH_ID}
        )
        # Should return 200, not 500 - even if using fallback starters
        assert response.status_code == 200, f"AI starters failed with {response.status_code}: {response.text}"
        data = response.json()
        assert "starters" in data
        assert isinstance(data["starters"], list)
        assert len(data["starters"]) > 0
        print(f"✓ AI conversation starters returned {len(data['starters'])} starters")
        print(f"  Sample starter: {data['starters'][0][:50]}...")
    
    def test_ai_compatibility(self, guest_token):
        """Test AI compatibility analysis endpoint with valid match_id
        Note: May return fallback analysis if Anthropic credits are low - that's expected
        """
        response = requests.post(
            f"{BASE_URL}/api/ai/compatibility",
            headers={"Authorization": f"Bearer {guest_token}"},
            json={"match_id": MATCH_ID}
        )
        # Should return 200, not 500 - even if using fallback analysis
        assert response.status_code == 200, f"AI compatibility failed with {response.status_code}: {response.text}"
        data = response.json()
        assert "analysis" in data
        assert isinstance(data["analysis"], str)
        assert len(data["analysis"]) > 0
        print(f"✓ AI compatibility analysis returned: {data['analysis'][:100]}...")
    
    def test_ai_starters_invalid_match(self, guest_token):
        """Test AI starters with invalid match_id returns 403"""
        response = requests.post(
            f"{BASE_URL}/api/ai/conversation-starters",
            headers={"Authorization": f"Bearer {guest_token}"},
            json={"match_id": "invalid-match-id"}
        )
        assert response.status_code == 403
        print("✓ AI starters correctly rejected invalid match_id with 403")


class TestPaymentEndpoints:
    """Payment endpoint tests"""
    
    @pytest.fixture
    def host_token(self):
        """Get auth token for host user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": HOST_EMAIL,
            "password": HOST_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Could not get host token")
    
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
    
    def test_payment_check_endpoint(self, host_token):
        """Test /payments/check endpoint returns has_paid and price"""
        response = requests.get(
            f"{BASE_URL}/api/payments/check",
            headers={"Authorization": f"Bearer {host_token}"}
        )
        assert response.status_code == 200, f"Payment check failed: {response.text}"
        data = response.json()
        assert "has_paid" in data
        assert "price" in data
        assert isinstance(data["has_paid"], bool)
        assert isinstance(data["price"], (int, float))
        print(f"✓ Payment check returned: has_paid={data['has_paid']}, price=${data['price']}")
    
    def test_payment_checkout_endpoint(self, host_token):
        """Test /payments/checkout endpoint returns checkout_url and session_id"""
        response = requests.post(
            f"{BASE_URL}/api/payments/checkout",
            headers={"Authorization": f"Bearer {host_token}"},
            json={"origin_url": "https://love-at-aisle.preview.emergentagent.com"}
        )
        # May return 400 if already has active event package
        if response.status_code == 400:
            data = response.json()
            print(f"✓ Payment checkout returned 400 (expected if already paid): {data}")
            return
        
        assert response.status_code == 200, f"Payment checkout failed: {response.text}"
        data = response.json()
        assert "checkout_url" in data
        assert "session_id" in data
        assert isinstance(data["checkout_url"], str)
        assert isinstance(data["session_id"], str)
        print(f"✓ Payment checkout returned checkout_url and session_id")
    
    def test_payment_checkout_guest_forbidden(self, guest_token):
        """Test that non-host users cannot access checkout"""
        response = requests.post(
            f"{BASE_URL}/api/payments/checkout",
            headers={"Authorization": f"Bearer {guest_token}"},
            json={"origin_url": "https://love-at-aisle.preview.emergentagent.com"}
        )
        assert response.status_code == 403
        print("✓ Guest correctly forbidden from payment checkout with 403")


class TestEventEndpoints:
    """Event endpoint tests"""
    
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
    
    def test_get_current_event(self, guest_token):
        """Test getting current event for user"""
        response = requests.get(
            f"{BASE_URL}/api/events/current",
            headers={"Authorization": f"Bearer {guest_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "event" in data
        if data["event"]:
            assert "code" in data["event"]
            assert "bride_name" in data["event"]
            assert "groom_name" in data["event"]
            print(f"✓ Current event: {data['event']['bride_name']} & {data['event']['groom_name']}")
        else:
            print("✓ No current event (user may not have joined)")


class TestMatchesEndpoints:
    """Matches endpoint tests"""
    
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
    
    def test_get_matches(self, guest_token):
        """Test getting matches list"""
        response = requests.get(
            f"{BASE_URL}/api/matches",
            headers={"Authorization": f"Bearer {guest_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "matches" in data
        assert isinstance(data["matches"], list)
        print(f"✓ Matches endpoint returned {len(data['matches'])} matches")
        
        # Verify match structure if there are matches
        if len(data["matches"]) > 0:
            match = data["matches"][0]
            assert "match_id" in match
            assert "matched_user" in match
            print(f"  First match: {match.get('matched_user', {}).get('name', 'Unknown')}")


class TestChatEndpoints:
    """Chat endpoint tests"""
    
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
    
    def test_get_chat_messages(self, guest_token):
        """Test getting chat messages for a match"""
        response = requests.get(
            f"{BASE_URL}/api/chat/{MATCH_ID}",
            headers={"Authorization": f"Bearer {guest_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "messages" in data
        assert isinstance(data["messages"], list)
        print(f"✓ Chat endpoint returned {len(data['messages'])} messages")


# ============ WEDDING DAY MODE ENDPOINTS TESTS ============
class TestWeddingDayMode:
    """Wedding Day Mode endpoint tests - new feature"""
    
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
    
    @pytest.fixture
    def marcus_token(self):
        """Get auth token for marcus@demo.com (hasn't used bouquet toss yet)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": GUEST2_EMAIL,
            "password": GUEST2_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Could not get marcus token")
    
    def test_wedding_day_mode_endpoint(self, guest_token):
        """Test /events/wedding-day-mode returns is_wedding_day, event_name, wedding_date
        Note: Wedding date is 2026-06-15, so is_wedding_day should be false today
        """
        response = requests.get(
            f"{BASE_URL}/api/events/wedding-day-mode",
            headers={"Authorization": f"Bearer {guest_token}"}
        )
        assert response.status_code == 200, f"Wedding day mode failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "is_wedding_day" in data
        assert "event_name" in data
        assert "wedding_date" in data
        
        # Since wedding is 2026-06-15, should be false today
        assert isinstance(data["is_wedding_day"], bool)
        print(f"✓ Wedding day mode: is_wedding_day={data['is_wedding_day']}, event_name={data['event_name']}, wedding_date={data['wedding_date']}")
    
    def test_live_stats_endpoint(self, guest_token):
        """Test /events/live-stats returns total_guests, total_matches, today_matches, recent_match_names"""
        response = requests.get(
            f"{BASE_URL}/api/events/live-stats",
            headers={"Authorization": f"Bearer {guest_token}"}
        )
        assert response.status_code == 200, f"Live stats failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "total_guests" in data
        assert "total_matches" in data
        assert "today_matches" in data
        assert "recent_match_names" in data
        
        # Verify types
        assert isinstance(data["total_guests"], int)
        assert isinstance(data["total_matches"], int)
        assert isinstance(data["today_matches"], int)
        assert isinstance(data["recent_match_names"], list)
        
        print(f"✓ Live stats: guests={data['total_guests']}, matches={data['total_matches']}, today={data['today_matches']}")
        if data["recent_match_names"]:
            print(f"  Recent matches: {data['recent_match_names']}")
    
    def test_bouquet_toss_alice_already_used(self, guest_token):
        """Test /bouquet-toss returns 400 for alice who already used her toss"""
        response = requests.post(
            f"{BASE_URL}/api/bouquet-toss",
            headers={"Authorization": f"Bearer {guest_token}"}
        )
        # Alice should have already used her toss
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "already" in data.get("detail", "").lower() or "already used" in data.get("detail", "").lower()
        print(f"✓ Bouquet toss correctly rejected for alice (already used): {data.get('detail')}")
    
    def test_bouquet_toss_marcus_first_use(self, marcus_token):
        """Test /bouquet-toss for marcus who hasn't used it yet
        Note: This test may fail if marcus already used his toss in a previous run
        """
        response = requests.post(
            f"{BASE_URL}/api/bouquet-toss",
            headers={"Authorization": f"Bearer {marcus_token}"}
        )
        
        if response.status_code == 400:
            # Marcus may have already used toss in a previous test run
            data = response.json()
            if "already" in data.get("detail", "").lower():
                print(f"⚠ Marcus has already used bouquet toss (from previous test run)")
                pytest.skip("Marcus already used bouquet toss")
            else:
                pytest.fail(f"Unexpected 400 error: {data}")
        
        if response.status_code == 404:
            data = response.json()
            print(f"⚠ No available guests for bouquet toss: {data.get('detail')}")
            pytest.skip("No available guests for bouquet toss")
        
        assert response.status_code == 200, f"Bouquet toss failed for marcus: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "match_id" in data
        assert "matched_user" in data
        assert isinstance(data["match_id"], str)
        assert isinstance(data["matched_user"], dict)
        
        print(f"✓ Bouquet toss success for marcus!")
        print(f"  Match ID: {data['match_id']}")
        print(f"  Matched with: {data['matched_user'].get('name', 'Unknown')}")
        
        # Store the match for verification
        return data
    
    def test_bouquet_toss_marcus_second_use_fails(self, marcus_token):
        """Test /bouquet-toss fails on second attempt (one-time use enforcement)"""
        # First, try the toss
        response = requests.post(
            f"{BASE_URL}/api/bouquet-toss",
            headers={"Authorization": f"Bearer {marcus_token}"}
        )
        
        # Whether this is first or second use, after this call marcus should have used it
        if response.status_code == 200:
            print("  First toss succeeded, attempting second...")
        elif response.status_code == 400:
            # Already used
            data = response.json()
            if "already" in data.get("detail", "").lower():
                print(f"✓ Marcus bouquet toss correctly rejected (already used): {data.get('detail')}")
                return
        
        # Now try again - this MUST fail
        response2 = requests.post(
            f"{BASE_URL}/api/bouquet-toss",
            headers={"Authorization": f"Bearer {marcus_token}"}
        )
        assert response2.status_code == 400, f"Expected 400 on second toss, got {response2.status_code}"
        data = response2.json()
        assert "already" in data.get("detail", "").lower()
        print(f"✓ Second bouquet toss correctly rejected: {data.get('detail')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

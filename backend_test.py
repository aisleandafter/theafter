import requests
import sys
import json
from datetime import datetime

class WeddingAppTester:
    def __init__(self, base_url="https://love-at-rsvp.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.host_token = None
        self.guest_token = None
        self.event_code = None
        self.event_id = None
        self.match_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text[:200]}")
                self.failed_tests.append(f"{name}: Expected {expected_status}, got {response.status_code}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append(f"{name}: {str(e)}")
            return False, {}

    def test_host_registration(self):
        """Test host registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        success, response = self.run_test(
            "Host Registration",
            "POST",
            "auth/register",
            200,
            data={
                "name": f"Host User {timestamp}",
                "email": f"host_{timestamp}@test.com",
                "password": "TestPass123!",
                "is_host": True
            }
        )
        if success and 'token' in response:
            self.host_token = response['token']
            return True
        return False

    def test_guest_registration(self):
        """Test guest registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        success, response = self.run_test(
            "Guest Registration",
            "POST",
            "auth/register",
            200,
            data={
                "name": f"Guest User {timestamp}",
                "email": f"guest_{timestamp}@test.com",
                "password": "TestPass123!",
                "is_host": False
            }
        )
        if success and 'token' in response:
            self.guest_token = response['token']
            return True
        return False

    def test_create_event(self):
        """Test event creation by host"""
        if not self.host_token:
            return False
            
        success, response = self.run_test(
            "Create Event",
            "POST",
            "events/create",
            200,
            data={
                "bride_name": "Sarah",
                "groom_name": "Michael",
                "wedding_date": "2024-12-25",
                "venue": "Grand Ballroom"
            },
            token=self.host_token
        )
        if success and 'event' in response:
            self.event_code = response['event']['code']
            self.event_id = response['event']['id']
            print(f"Event code: {self.event_code}")
            return True
        return False

    def test_join_event(self):
        """Test guest joining event"""
        if not self.guest_token or not self.event_code:
            return False
            
        success, response = self.run_test(
            "Join Event",
            "POST",
            "events/join",
            200,
            data={"event_code": self.event_code},
            token=self.guest_token
        )
        return success

    def test_profile_update(self):
        """Test profile update"""
        if not self.guest_token:
            return False
            
        success, response = self.run_test(
            "Update Profile",
            "PUT",
            "profile",
            200,
            data={
                "bio": "Love dancing and good wine!",
                "age": 28,
                "gender": "female",
                "looking_for": "men",
                "interests": ["Dancing", "Music", "Travel"],
                "relationship_to_couple": "Friend of Bride",
                "fun_fact": "I can salsa dance!"
            },
            token=self.guest_token
        )
        return success

    def test_discover_profiles(self):
        """Test discovering profiles"""
        if not self.guest_token:
            return False
            
        success, response = self.run_test(
            "Discover Profiles",
            "GET",
            "discover",
            200,
            token=self.guest_token
        )
        return success

    def test_swipe_action(self):
        """Test swipe action (create dummy user first)"""
        if not self.guest_token:
            return False
            
        # Create another guest to swipe on
        timestamp = datetime.now().strftime('%H%M%S')
        reg_success, reg_response = self.run_test(
            "Create Target User",
            "POST",
            "auth/register",
            200,
            data={
                "name": f"Target User {timestamp}",
                "email": f"target_{timestamp}@test.com",
                "password": "TestPass123!",
                "is_host": False
            }
        )
        
        if not reg_success:
            return False
            
        target_token = reg_response['token']
        target_user_id = reg_response['user']['id']
        
        # Join event with target user
        self.run_test(
            "Target Join Event",
            "POST",
            "events/join",
            200,
            data={"event_code": self.event_code},
            token=target_token
        )
        
        # Update target profile
        self.run_test(
            "Target Update Profile",
            "PUT",
            "profile",
            200,
            data={
                "bio": "Love hiking and coffee!",
                "age": 30,
                "gender": "male",
                "looking_for": "women",
                "interests": ["Sports", "Nature", "Coffee"],
                "relationship_to_couple": "Friend of Groom"
            },
            token=target_token
        )
        
        # Now test swipe
        success, response = self.run_test(
            "Swipe Like",
            "POST",
            "swipe",
            200,
            data={
                "target_user_id": target_user_id,
                "action": "like"
            },
            token=self.guest_token
        )
        return success

    def test_get_matches(self):
        """Test getting matches"""
        if not self.guest_token:
            return False
            
        success, response = self.run_test(
            "Get Matches",
            "GET",
            "matches",
            200,
            token=self.guest_token
        )
        return success

    def test_ai_conversation_starters(self):
        """Test AI conversation starters (requires match)"""
        if not self.guest_token:
            return False
            
        # This will likely fail without a real match, but we test the endpoint
        success, response = self.run_test(
            "AI Conversation Starters",
            "POST",
            "ai/conversation-starters",
            403,  # Expect 403 without valid match
            data={"match_id": "dummy-match-id"},
            token=self.guest_token
        )
        return success

    def test_event_stats(self):
        """Test event statistics for host"""
        if not self.host_token or not self.event_id:
            return False
            
        success, response = self.run_test(
            "Event Statistics",
            "GET",
            f"events/{self.event_id}/stats",
            200,
            token=self.host_token
        )
        return success

def main():
    print("🚀 Starting Wedding App Backend Tests...")
    tester = WeddingAppTester()
    
    # Test sequence
    tests = [
        ("Host Registration", tester.test_host_registration),
        ("Guest Registration", tester.test_guest_registration),
        ("Create Event", tester.test_create_event),
        ("Join Event", tester.test_join_event),
        ("Profile Update", tester.test_profile_update),
        ("Discover Profiles", tester.test_discover_profiles),
        ("Swipe Action", tester.test_swipe_action),
        ("Get Matches", tester.test_get_matches),
        ("Event Statistics", tester.test_event_stats),
        ("AI Conversation Starters", tester.test_ai_conversation_starters),
    ]
    
    for test_name, test_func in tests:
        try:
            test_func()
        except Exception as e:
            print(f"❌ {test_name} crashed: {str(e)}")
            tester.failed_tests.append(f"{test_name}: Crashed - {str(e)}")
    
    # Print results
    print(f"\n📊 Test Results:")
    print(f"Tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Tests failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success rate: {(tester.tests_passed / tester.tests_run * 100):.1f}%")
    
    if tester.failed_tests:
        print(f"\n❌ Failed tests:")
        for failure in tester.failed_tests:
            print(f"  - {failure}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())